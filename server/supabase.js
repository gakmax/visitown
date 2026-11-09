'use strict';
const crypto = require('node:crypto');
// 보안 S-32: DB 행은 service role만 쓰지만(docs/supabase.sql의 revoke) 심층 방어로 읽을 때도 PUT과 같은 검증을 거친다. 허용 목록 밖 주소면 웹훅 없음으로 본다
function webhookFromDb(raw) { if (!raw || typeof raw !== 'object') return null; const { cfg } = require('./alerts').normalizeWebhook(raw); return cfg || null; }
// Supabase REST/Auth 헬퍼. 서버는 service role 키로 쓴다(RLS 우회). 대시보드는 anon 키 + 사용자 JWT.
class Supabase {
  constructor({ url, serviceKey, jwtSecret, anonKey, log = console }) { this.url = url && url.replace(/\/$/, ''); this.key = serviceKey; this.jwtSecret = jwtSecret; this.anonKey = anonKey; this.log = log; this.jwks = null; this.jwksAt = 0; this.enabled = !!(url && serviceKey); }
  async rest(path, { method = 'GET', body, prefer } = {}) {
    const r = await fetch(`${this.url}/rest/v1/${path}`, { method, headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error(`supabase ${method} ${path} → ${r.status} ${(await r.text()).slice(0, 200)}`);
    const txt = await r.text(); return txt ? JSON.parse(txt) : null;
  }
  // 사이트 + 건물 매핑을 한 번에 읽어 서버 메모리 모양으로 바꾼다
  async loadSites() {
    const sites = await this.rest('sites?select=*&order=created_at');
    const maps = await this.rest('page_mappings?select=*&order=sort');
    if (!this.kindCols) { this.kindCols = maps.length ? ('building_kind' in maps[0]) : await this.probeKindCols(); if (!this.kindCols && !this.warned) this.warned = true, this.log.warn('page_mappings에 building_kind/slot 컬럼이 없어요. docs/supabase.sql 아래쪽 마이그레이션을 SQL Editor에서 실행해 주세요 (그 전까지 건물 종류·자리는 저장되지 않아요)'); }
    return sites.map(s => ({ id: s.id, owner_id: s.owner_id, name: s.name, domain: s.domain, allowed_origins: s.allowed_origins || [], embed_key: s.embed_key || null, event_config: Array.isArray(s.event_config) ? s.event_config : [], unlocks: s.unlocks || null, webhook: webhookFromDb(s.webhook), widget: !!s.widget, public: !!s.public, created_at: s.created_at,
      pages: maps.filter(m => m.site_id === s.id).map(m => ({ path: m.building_key, name: m.building_name, pattern: m.path_pattern, kind: m.building_kind || undefined, slot: Number.isInteger(m.slot) ? m.slot : undefined })) }));
  }
  // 2026-10 마이그레이션(building_kind, slot) 적용 여부. 없으면 예전 컬럼만으로 저장한다
  async probeKindCols() { try { await this.rest('page_mappings?select=building_kind,slot&limit=1'); return true; } catch { return false; } }
  async createSite({ ownerId, name, domain }) {
    const id = 'site_' + crypto.randomBytes(5).toString('hex');
    const host = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
    const origins = new Set([`https://${host}`, `http://${host}`]); if (!host.startsWith('www.')) { origins.add(`https://www.${host}`); } if (host.startsWith('www.')) origins.add(`https://${host.slice(4)}`); origins.add('http://localhost:3000');
    await this.rest('sites', { method: 'POST', body: { id, owner_id: ownerId, name, domain: host, allowed_origins: [...origins] }, prefer: 'return=minimal' });
    const DEF = [['/', '^/$', 'plaza', 0, ''], ['/products', '^/(products|shop|store|item)(/|$)', 'shop', 2, ''], ['/search', '^/search', 'library', 3, ''], ['/community', '^/(community|blog|posts|forum)(/|$)', 'community', 5, ''], ['/mypage', '^/(mypage|account|profile|my)(/|$)', 'home', 4, ''], ['/checkout', '^/(checkout|cart|order|pay)(/|$)', 'checkout', 1, '']];
    await this.savePages(id, DEF.map(([path, pattern, kind, slot, name]) => ({ path, pattern, kind, slot, name })));
    return (await this.loadSites()).find(s => s.id === id);
  }
  // 건물 매핑 전체 교체 (설정 화면 저장). 행 수가 작아 삭제 후 삽입으로 충분하다. 반환값: 마이그레이션 전이면 경고 문구
  async savePages(siteId, pages) {
    if (!this.kindCols) this.kindCols = await this.probeKindCols(); // 켜진 뒤에 마이그레이션을 돌렸을 수 있으니 없다고 알고 있으면 다시 확인
    await this.rest(`page_mappings?site_id=eq.${encodeURIComponent(siteId)}`, { method: 'DELETE', prefer: 'return=minimal' });
    if (pages.length) await this.rest('page_mappings', { method: 'POST', body: pages.map((p, i) => ({ site_id: siteId, path_pattern: p.pattern || '', building_key: p.path, building_name: p.name || '', sort: i, ...(this.kindCols ? { building_kind: p.kind, slot: p.slot } : {}) })), prefer: 'return=minimal' });
    return this.kindCols ? null : 'DB에 건물 종류·자리 컬럼이 아직 없어서 이름·패턴만 저장됐어요. 서버를 다시 켜면 종류·자리는 기본값으로 돌아가요. docs/supabase.sql 아래쪽 마이그레이션을 Supabase SQL Editor에서 실행해 주세요.';
  }
  // 임베드 키 저장(회전). sites.embed_key 컬럼은 docs/supabase.sql 아래쪽 마이그레이션
  async setEmbedKey(siteId, key) { try { await this.rest(`sites?id=eq.${encodeURIComponent(siteId)}`, { method: 'PATCH', body: { embed_key: key }, prefer: 'return=minimal' }); } catch (e) { if (/embed_key/.test(e.message)) throw new Error('DB에 embed_key 컬럼이 없어요. docs/supabase.sql 아래쪽 마이그레이션을 Supabase SQL Editor에서 실행해 주세요.'); throw e; } }
  // 이벤트 표현 설정 저장. sites.event_config 컬럼은 docs/supabase.sql 아래쪽 마이그레이션
  async setEventConfig(siteId, list) { try { await this.rest(`sites?id=eq.${encodeURIComponent(siteId)}`, { method: 'PATCH', body: { event_config: list }, prefer: 'return=minimal' }); } catch (e) { if (/event_config/.test(e.message)) throw new Error('DB에 event_config 컬럼이 없어요. docs/supabase.sql 아래쪽 마이그레이션을 Supabase SQL Editor에서 실행해 주세요.'); throw e; } }
  // 웹훅 설정·미니 위젯 켬/끔 저장. 컬럼은 docs/supabase.sql 아래쪽(2026-11-02)
  async setWebhook(siteId, cfg) { try { await this.rest(`sites?id=eq.${encodeURIComponent(siteId)}`, { method: 'PATCH', body: { webhook: cfg }, prefer: 'return=minimal' }); } catch (e) { if (/webhook/.test(e.message)) throw new Error('DB에 webhook 컬럼이 없어요. docs/supabase.sql 아래쪽(웹훅 알림)을 Supabase SQL Editor에서 실행해 주세요.'); throw e; } }
  async setPublic(siteId, on) { try { await this.rest(`sites?id=eq.${encodeURIComponent(siteId)}`, { method: 'PATCH', body: { public: !!on }, prefer: 'return=minimal' }); } catch (e) { if (/public/.test(e.message)) throw new Error('DB에 public 컬럼이 없어요. docs/supabase.sql 아래쪽(공개 마을)을 Supabase SQL Editor에서 실행해 주세요.'); throw e; } }
  // 계정 삭제(로드맵 법적 문서 할 일): 소유 사이트(연쇄 삭제: 매핑·이벤트·집계·멤버·초대) → 다른 사이트의 멤버 자격 → auth 사용자 순
  async deleteSite(siteId) { await this.rest(`sites?id=eq.${encodeURIComponent(siteId)}`, { method: 'DELETE', prefer: 'return=minimal' }); }
  async removeUserMemberships(userId) { try { await this.rest(`site_members?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', prefer: 'return=minimal' }); } catch (e) { if (!/site_members|PGRST205/.test(e.message)) throw e; } }
  async deleteUser(userId) { const r = await fetch(`${this.url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE', headers: { apikey: this.key, Authorization: `Bearer ${this.key}` } }); if (!r.ok && r.status !== 404) throw new Error(`auth user delete → ${r.status} ${(await r.text()).slice(0, 200)}`); }
  async setWidget(siteId, on) { try { await this.rest(`sites?id=eq.${encodeURIComponent(siteId)}`, { method: 'PATCH', body: { widget: !!on }, prefer: 'return=minimal' }); } catch (e) { if (/widget/.test(e.message)) throw new Error('DB에 widget 컬럼이 없어요. docs/supabase.sql 아래쪽(미니 위젯)을 Supabase SQL Editor에서 실행해 주세요.'); throw e; } }
  // 테마 해금 상태 저장(server/unlocks.js). sites.unlocks 컬럼은 docs/supabase.sql 아래쪽 마이그레이션. 없으면 한 번만 안내하고 저장을 멈춘다
  async setUnlocks(siteId, state) { if (this.noUnlocks) return; try { await this.rest(`sites?id=eq.${encodeURIComponent(siteId)}`, { method: 'PATCH', body: { unlocks: state }, prefer: 'return=minimal' }); } catch (e) { if (/unlocks/.test(e.message)) { this.noUnlocks = true; this.log.warn('DB에 sites.unlocks 컬럼이 없어요. docs/supabase.sql 아래쪽(테마 해금)을 Supabase SQL Editor에서 실행해 주세요. 그 전까지 해금은 서버 메모리에만 있어요.'); return; } throw e; } }
  // ---- 멤버·초대 (docs/supabase.sql의 site_members / site_invites). 테이블이 없으면 안내 오류
  memberErr(e) { if (/site_members|site_invites|PGRST205/.test(e.message)) return new Error('DB에 site_members/site_invites 테이블이 없어요. docs/supabase.sql 아래쪽(멤버 초대)을 Supabase SQL Editor에서 실행해 주세요.'); return e; }
  async loadMembers() { try { return await this.rest('site_members?select=site_id,user_id,role,name,created_at'); } catch (e) { if (!this.memberWarned) { this.memberWarned = true; this.log.warn(this.memberErr(e).message); } return null; } }
  async loadInvites() { try { return await this.rest('site_invites?select=token,site_id,role,created_by,created_at,expires_at,uses'); } catch { return null; } }
  async addMember(siteId, userId, role, name) { try { await this.rest('site_members?on_conflict=site_id,user_id', { method: 'POST', body: { site_id: siteId, user_id: userId, role, name }, prefer: 'resolution=merge-duplicates,return=minimal' }); } catch (e) { throw this.memberErr(e); } }
  async removeMember(siteId, userId) { try { await this.rest(`site_members?site_id=eq.${encodeURIComponent(siteId)}&user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', prefer: 'return=minimal' }); } catch (e) { throw this.memberErr(e); } }
  async createInvite(row) { try { await this.rest('site_invites', { method: 'POST', body: row, prefer: 'return=minimal' }); } catch (e) { throw this.memberErr(e); } }
  async deleteInvite(token) { try { await this.rest(`site_invites?token=eq.${encodeURIComponent(token)}`, { method: 'DELETE', prefer: 'return=minimal' }); } catch (e) { throw this.memberErr(e); } }
  async bumpInvite(token, uses) { try { await this.rest(`site_invites?token=eq.${encodeURIComponent(token)}`, { method: 'PATCH', body: { uses }, prefer: 'return=minimal' }); } catch (e) { this.log.warn('invite uses', e.message); } }
  // 사용자 표시 이름(주인처럼 멤버 표에 이름을 저장하지 않은 경우). Auth admin API, 10분 캐시
  async userName(id) { this.names = this.names || new Map(); const c = this.names.get(id); if (c && Date.now() - c.at < 600000) return c.name;
    let name = ''; try { const r = await fetch(`${this.url}/auth/v1/admin/users/${encodeURIComponent(id)}`, { headers: { apikey: this.key, Authorization: `Bearer ${this.key}` } }); if (r.ok) { const u = await r.json(); const md = u.user_metadata || {}; name = String(md.user_name || md.preferred_username || md.full_name || md.name || u.email || '').slice(0, 40); } } catch {}
    this.names.set(id, { name, at: Date.now() }); return name; }
  // 서버가 켜질 때 '받은 이벤트 이름' 목록을 채우기 위한 최근 커스텀 이벤트 (최신 1000건)
  async recentTypes(siteId) { return this.rest(`events?site_id=eq.${encodeURIComponent(siteId)}&event_type=not.in.(session_start,page_view,heartbeat,page_leave,note)&select=event_type,occurred_at&order=occurred_at.desc&limit=1000`); }
  // 리플레이용 구간 조회. PostgREST는 한 번에 1000행이라 끊어서 읽고, 10000건을 넘으면 truncated
  async eventsBetween(siteId, from, to) {
    const out = []; let truncated = false;
    for (let off = 0; off < 10000; off += 1000) {
      const rows = await this.rest(`events?site_id=eq.${encodeURIComponent(siteId)}&occurred_at=gte.${new Date(from).toISOString()}&occurred_at=lte.${new Date(to).toISOString()}&select=id,session_id,event_type,page_path,properties,is_bot,occurred_at&order=occurred_at.asc,id.asc&limit=1000&offset=${off}`);
      for (const r of rows) { const props = r.properties || {}; if (r.is_bot && !props.bot) props.bot = 'BOT'; out.push({ event_id: r.id, site_id: siteId, session_id: r.session_id, event_type: r.event_type, page_path: r.page_path, timestamp: r.occurred_at, properties: props }); }
      if (rows.length < 1000) break; if (off === 9000) truncated = true;
    }
    return { events: out, truncated };
  }
  // 일별 집계·원본 정리: docs/supabase.sql의 vt_rollup / vt_prune 함수를 rpc로 부른다. 함수가 없으면 한 번만 안내하고 null
  async rollup(days, tz) { return this.rpc('vt_rollup', { p_days: days, p_tz: tz }); }
  // 리더 임대(로드맵 46): true면 이 인스턴스가 리더. 함수가 없으면 null(호출 쪽이 혼자라고 보고 리더로 간주)
  async lease(name, holder, ttl) { return this.rpc('vt_lease', { p_name: name, p_holder: holder, p_ttl: ttl }); }
  async prune(days) { return this.rpc('vt_prune', { p_days: days }); }
  async rpc(fn, args) { try { return await this.rest(`rpc/${fn}`, { method: 'POST', body: args }); } catch (e) { if (/→ 404|PGRST202|Could not find the function/.test(e.message)) { if (!this.rpcWarned) { this.rpcWarned = true; this.log.warn(`DB에 ${fn} 함수가 없어요. docs/supabase.sql 아래쪽(vt_rollup/vt_prune)을 Supabase SQL Editor에서 실행해 주세요. 그 전까지 일별 집계·원본 정리는 건너뛰어요.`); } return null; } throw e; } }
  // 통계 추이용 일별 집계 (최근 N일, 경로별)
  async daily(siteId, days) { return this.rest(`page_daily?site_id=eq.${encodeURIComponent(siteId)}&day=gte.${new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)}&select=day,page_path,views,sessions,bots&order=day.asc,views.desc&limit=5000`); }
  // 사이트 단위 일별 집계(site_daily, 2026-11-02 마이그레이션). 표가 없으면 한 번만 안내하고 빈 목록
  async siteDaily(siteId, days) { if (this.noSiteDaily) return []; try { return await this.rest(`site_daily?site_id=eq.${encodeURIComponent(siteId)}&day=gte.${new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)}&select=day,sessions,views,revisits,bots,countries,devices,referrers,campaigns,events,revenue,cohorts&order=day.asc&limit=400`); }
    catch (e) { if (/site_daily|PGRST205/.test(e.message)) { this.noSiteDaily = true; this.log.warn('DB에 site_daily 표가 없어요. docs/supabase.sql 아래쪽(사이트 단위 일별 집계)을 Supabase SQL Editor에서 실행해 주세요.'); return []; } throw e; } }
  // 서버가 켜질 때 '본 경로' 목록을 채우기 위한 최근 이벤트 (봇 제외, 최신 1000건)
  async recentPaths(siteId) { return this.rest(`events?site_id=eq.${encodeURIComponent(siteId)}&event_type=in.(session_start,page_view)&is_bot=is.false&select=page_path,occurred_at&order=occurred_at.desc&limit=1000`); }
  // 레거시 anon 키가 .env에 없으면 JWT secret으로 직접 만든다 (서명 검증이 되는 경우에만)
  anon() {
    if (this.anonKey) return this.anonKey; if (!this.jwtSecret) return null;
    // 게이트웨이가 발급 시각까지 비교하므로 service 키와 같은 iat/exp로 만든다
    let sp = {}; try { sp = JSON.parse(Buffer.from(this.key.split('.')[1], 'base64url').toString()); } catch { return null; } if (!sp.ref || !sp.iat) return null;
    const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const head = b64({ alg: 'HS256', typ: 'JWT' }), body = b64({ iss: 'supabase', ref: sp.ref, role: 'anon', iat: sp.iat, exp: sp.exp });
    const sig = crypto.createHmac('sha256', this.jwtSecret).update(`${head}.${body}`).digest('base64url'); return (this.anonKey = `${head}.${body}.${sig}`);
  }
  // 사용자 JWT 검증: ES256/RS256은 JWKS, HS256은 JWT secret. 둘 다 안 되면 /auth/v1/user로 확인(느리지만 확실)
  async verifyUser(token) {
    const parts = token.split('.'); if (parts.length !== 3) { this.log.warn('auth: token is not a JWT (length', token.length + ')'); return null; }
    let header, payload; try { header = JSON.parse(Buffer.from(parts[0], 'base64url')); payload = JSON.parse(Buffer.from(parts[1], 'base64url')); } catch { return null; }
    if (payload.exp && payload.exp * 1000 < Date.now()) { this.log.warn('auth: token expired', new Date(payload.exp * 1000).toISOString()); return null; }
    const signed = Buffer.from(`${parts[0]}.${parts[1]}`), sig = Buffer.from(parts[2], 'base64url');
    try {
      if (header.alg === 'HS256' && this.jwtSecret) { const h = crypto.createHmac('sha256', this.jwtSecret).update(signed).digest(); if (h.length === sig.length && crypto.timingSafeEqual(h, sig)) return payload; return null; }
      if (header.alg === 'ES256' || header.alg === 'RS256') { const jwk = await this.jwk(header.kid); if (jwk) { const key = crypto.createPublicKey({ key: jwk, format: 'jwk' }); const ok = crypto.verify('sha256', signed, header.alg === 'ES256' ? { key, dsaEncoding: 'ieee-p1363' } : key, sig); return ok ? payload : null; } }
    } catch (e) { this.log.warn('jwt verify error', e.message); }
    const r = await fetch(`${this.url}/auth/v1/user`, { headers: { apikey: this.key, Authorization: `Bearer ${token}` } }); return r.ok ? payload : null;
  }
  async jwk(kid) { if (!this.jwks || Date.now() - this.jwksAt > 600000 || !this.jwks.find(k => k.kid === kid)) { try { const r = await fetch(`${this.url}/auth/v1/.well-known/jwks.json`); if (r.ok) { this.jwks = (await r.json()).keys; this.jwksAt = Date.now(); } } catch (e) { this.log.warn('auth: jwks fetch failed', e.message); } } return (this.jwks || []).find(k => k.kid === kid) || null; }
}
module.exports = { Supabase };
