'use strict';
// 탭이 닫혀 있어도 받는 알림. 사이트별 웹훅(sites.webhook: 슬랙·디스코드 URL + 종류별 켬/끔)으로 보내고, 열린 대시보드에는 SSE 'alert'로도 준다.
// 종류: event(이벤트 설정에서 '알림'을 켠 이벤트, 기본은 구매) · online(접속자 N명 도달) · quiet(30분 넘게 이벤트 없음 = 스크립트 빠짐)
//      · anomaly(지난 6일 같은 시간 평균 대비 급증·급감) · daily(아침 9시, 어제 요약). 웹훅 주소는 https + 슬랙·디스코드 호스트만 받는다(SSRF 방지)
const HOSTS = /^(hooks\.slack\.com|discord\.com|discordapp\.com|canary\.discord\.com|ptb\.discord\.com)$/i;
const KINDS = ['events', 'quiet', 'anomaly', 'daily', 'milestone']; // milestone: 기록 갱신(로드맵 21, server/index.js pushMilestones)
const QUIET_MS = +(process.env.QUIET_MS || 30 * 60000);
const DEFAULT_LABEL = { search: '검색', product_click: '상품 클릭', sign_up: '회원가입', purchase: '구매', js_error: '오류' };
const SYSTEM = new Set(['session_start', 'page_view', 'heartbeat', 'page_leave', 'note']);
function validUrl(u) { try { const x = new URL(u); return x.protocol === 'https:' && HOSTS.test(x.hostname) && x.pathname.length > 1; } catch { return false; } }
// 저장할 모양으로. url이 비면 null(웹훅 없음). 잘못된 주소는 error 문자열
function normalizeWebhook(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}; const url = String(r.url || '').trim();
  if (!url) return { cfg: null }; if (!validUrl(url)) return { error: '웹훅 주소는 https://hooks.slack.com/… 또는 https://discord.com/api/webhooks/… 만 쓸 수 있어요' };
  const cfg = { url }; for (const k of KINDS) cfg[k] = r[k] !== false; cfg.online = Math.max(0, Math.min(9999, Math.floor(+r.online || 0))); return { cfg };
}
function sessionCode(id) { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return String.fromCharCode(65 + h % 26) + String(h % 100).padStart(2, '0'); }
async function post(url, text) {
  if (!validUrl(url)) return '허용되지 않은 웹훅 주소예요'; // 보안 S-32: 저장 경로를 거치지 않은 값(DB 직접 수정 등)이라도 내부망으로 보내지 않는다
  const discord = /discord/i.test(new URL(url).hostname); const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
  try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(discord ? { content: text } : { text }), signal: ctl.signal, redirect: 'error' }); return r.ok ? null : `HTTP ${r.status}`; }
  catch (e) { return e.name === 'AbortError' ? '응답이 없어요(6초)' : e.message; } finally { clearTimeout(t); }
}
class Alerts {
  constructor({ sites, stores, subscribers, sendSse, broadcast, supabase, tz = 'Asia/Seoul', log = console, post: poster = post, isLeader = () => true }) {
    Object.assign(this, { sites, stores, subscribers, sendSse, supabase, tz, log, post: poster, isLeader }); /* isLeader: 인스턴스 여러 대면 리더만 웹훅을 보낸다(로드맵 46). SSE는 각자 */
    this.broadcast = broadcast || ((siteId, ev, data) => { for (const res of subscribers.get(siteId) || []) sendSse(res, ev, data); }); /* 서버는 링버퍼를 거치는 broadcast를 준다(로드맵 44) */ this.state = new Map(); // siteId → { quietWarned, lastOnlineAt, lastEventAt(kind별), anomalyAt:{up,down}, dailyDay }
    this.fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  }
  st(id) { let s = this.state.get(id); if (!s) { s = { quietWarned: false, lastOnlineAt: 0, lastKind: {}, anomalyAt: { up: 0, down: 0 }, dailyDay: '' }; this.state.set(id, s); } return s; }
  local(t = Date.now()) { const o = {}; for (const p of this.fmt.formatToParts(new Date(t))) o[p.type] = p.value; return { day: `${o.year}-${o.month}-${o.day}`, hour: +o.hour, minute: +o.minute }; }
  // 대시보드(SSE)와 웹훅으로 보낸다. kind별로 웹훅 설정이 꺼져 있으면 SSE만. 결과는 { sse, webhook: null|오류 }
  async fire(site, kind, text, extra = {}) {
    const msg = { kind, text, at: Date.now(), ...extra }; this.broadcast(site.id, 'alert', msg);
    const cfg = site.webhook; const key = kind === 'event' ? 'events' : kind === 'online' ? 'online' : kind;
    if (!cfg || !cfg.url || (key === 'online' ? !(cfg.online > 0) : cfg[key] === false) || !this.isLeader()) return { sse: true, webhook: undefined };
    const err = await this.post(cfg.url, text); if (err) this.log.warn('webhook', site.id, kind, err); return { sse: true, webhook: err };
  }
  // 수집 서버가 이벤트를 받아들일 때마다. 알림을 켠 이벤트 → 웹훅, 접속자 기준 도달 → 웹훅(10분에 한 번), 조용함 경고 해제
  onEvent(site, st, ev, bot) {
    const s = this.st(site.id); s.quietWarned = false; if (bot) return;
    const type = ev.event_type;
    if (!SYSTEM.has(type)) { const c = st.eventConfig.find(x => x.type === type); const notify = c && typeof c.notify === 'boolean' ? c.notify : type === 'purchase';
      if (notify && site.webhook && site.webhook.events !== false) { const now = Date.now(); if (now - (s.lastKind[type] || 0) >= 3000) { s.lastKind[type] = now; // 같은 이벤트가 몰려도 3초에 한 번
        const label = (c && c.label) || DEFAULT_LABEL[type] || type, amt = typeof ev.properties.amount === 'number' ? ` ${ev.properties.amount.toLocaleString('ko-KR')}` : '';
        const sess = st.sessions.get(ev.session_id), where = sess ? ` · ${st.pages.find(p => p.path === sess.page)?.name || sess.page}` : '';
        this.fire(site, 'event', `${type === 'purchase' ? '💰' : '🔔'} ${label}${amt} · 방문자 #${sessionCode(ev.session_id)}${where} · ${site.domain || site.name}`, { type }); } } }
    const n = site.webhook && site.webhook.online > 0 ? st.counts().online : 0;
    if (n && n >= site.webhook.online && (s.lastOnline || 0) < site.webhook.online && Date.now() - s.lastOnlineAt > 600000) { s.lastOnlineAt = Date.now(); this.fire(site, 'online', `👥 접속자가 ${n}명이에요 (기준 ${site.webhook.online}명) · ${site.domain || site.name}`, { online: n }); }
    if (site.webhook) s.lastOnline = n;
  }
  // 1분마다: 조용함(스크립트 빠짐) · 아침 요약. 15분마다: 이상 감지
  async tick(now = Date.now()) {
    for (const [id, site] of this.sites) { const st = this.stores.get(id); if (!st) continue; const s = this.st(id);
      if (st.lastEventAt && now - st.lastEventAt >= QUIET_MS && !s.quietWarned) { s.quietWarned = true; const mins = Math.floor((now - st.lastEventAt) / 60000);
        this.fire(site, 'quiet', `⚠️ ${mins >= 60 ? Math.floor(mins / 60) + '시간째' : mins + '분째'} 이벤트가 없어요. 추적 스크립트가 빠진 것 같아요 · ${site.domain || site.name}`, { since: st.lastEventAt }); }
      const l = this.local(now); if (l.hour === 9 && l.minute < 5 && s.dailyDay !== l.day && site.webhook && site.webhook.daily !== false && site.webhook.url && !site.local && this.supabase.enabled) { s.dailyDay = l.day; this.daily(site).catch(e => this.log.warn('daily', id, e.message)); } }
  }
  async daily(site) {
    const [rows, pages] = await Promise.all([this.supabase.siteDaily(site.id, 2), this.supabase.daily(site.id, 2)]);
    const y = this.local(Date.now() - 86400000).day, r = (rows || []).find(x => String(x.day).slice(0, 10) === y); if (!r) return;
    const top = (pages || []).filter(p => String(p.day).slice(0, 10) === y && p.views > 0).sort((a, b) => b.views - a.views)[0];
    const ref = Object.entries(r.referrers || {}).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${{ search: '검색', social: 'SNS', direct: '직접', ad: '광고' }[k] || k} ${v}`).join(', ');
    const parts = [`☀️ 어제(${y}) ${site.domain || site.name}: 방문 ${r.sessions}명`, r.revisits ? `재방문 ${r.revisits}` : '', `조회 ${r.views}`, top ? `가장 많이 본 페이지 ${top.page_path} (${top.views})` : '', ref ? `유입 ${ref}` : '', +r.revenue ? `매출 ${Number(r.revenue).toLocaleString('ko-KR')}` : ''].filter(Boolean);
    return this.fire(site, 'daily', parts.join(' · '), { day: y });
  }
  // 이상 감지: 최근 1시간에 시작한 사람 세션 수를 지난 6일 같은 시간(원본 보관 기간 안)의 평균과 비교. 급증 ≥ max(10, 3배), 급감 ≤ 1/4 (평소 10명 이상일 때). 방향별 3시간에 한 번
  async anomaly(now = Date.now()) {
    for (const [id, site] of this.sites) { const st = this.stores.get(id); if (!st || !st.lastEventAt) continue; const s = this.st(id);
      const cur = this.startsBetween(st.eventsBetween(now - 3600000, now)); const wantUp = cur >= 10 && now - s.anomalyAt.up > 3 * 3600000, wantDown = now - s.anomalyAt.down > 3 * 3600000;
      if (!wantUp && !wantDown) continue; if (site.local || !this.supabase.enabled) continue;
      let sum = 0, days = 0; try { for (let d = 1; d <= 6; d++) { const { events } = await this.supabase.eventsBetween(id, now - d * 86400000 - 3600000, now - d * 86400000); if (!events.length && d > 1) continue; sum += this.startsBetween(events); days++; } } catch (e) { this.log.warn('anomaly', id, e.message); continue; }
      if (!days) continue; const base = Math.round(sum / days);
      if (wantUp && cur >= Math.max(10, base * 3)) { s.anomalyAt.up = now; const evs = st.eventsBetween(now - 3600000, now).filter(e => e.event_type === 'session_start' && !(e.properties && e.properties.bot));
        const top = (k, name) => Object.entries(evs.reduce((m, e) => { const v = e.properties && e.properties[k]; if (v) m[v] = (m[v] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([v, n]) => `${name[v] || v} ${n}`).join(', ');
        const src = [top('referrer', { search: '검색', social: 'SNS', direct: '직접', ad: '광고' }), top('utm_campaign', {})].filter(Boolean).join(' · ');
        this.fire(site, 'anomaly', `📈 지금 1시간 접속 ${cur}명, 평소 같은 시간 ${base}명. 어디서 퍼졌어요${src ? ': ' + src : ''} · ${site.domain || site.name}`, { dir: 'up', cur, base }); }
      else if (wantDown && base >= 10 && cur <= base / 4) { s.anomalyAt.down = now; this.fire(site, 'anomaly', `📉 지금 1시간 접속 ${cur}명, 평소 같은 시간 ${base}명. 장애일 수 있어요 · ${site.domain || site.name}`, { dir: 'down', cur, base }); } }
  }
  startsBetween(events) { const ids = new Set(); for (const e of events) if (e.event_type === 'session_start' && !(e.properties && e.properties.bot)) ids.add(e.session_id); return ids.size; }
  schedule() { setInterval(() => this.tick().catch(e => this.log.warn('alerts', e.message)), 60000).unref(); setInterval(() => this.anomaly().catch(e => this.log.warn('anomaly', e.message)), 15 * 60000).unref(); }
}
module.exports = { Alerts, normalizeWebhook, validUrl, sessionCode, QUIET_MS };
