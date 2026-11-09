'use strict';
// 사이트 하나의 활성 세션 상태. 대시보드의 TownStore와 같은 규칙(중복 무시, 역행 방지, 하트비트 만료)을 서버에서 지킨다.
// 건물 종류(kind)는 대시보드 테마와 무관한 의미 id, slot은 지도 위 자리(0=광장, 1~5 안쪽, 6~11 바깥). 대시보드 src/p2.js·p3.js와 같은 값
const KINDS = ['plaza', 'shop', 'library', 'community', 'home', 'checkout', 'cafe', 'school', 'clinic', 'post', 'factory', 'park'];
const MAX_BUILDINGS = 12;
const LEGACY = { '/': ['plaza', 0], '/checkout': ['checkout', 1], '/products': ['shop', 2], '/search': ['library', 3], '/mypage': ['home', 4], '/community': ['community', 5] }; // 예전 6건물 키 → 종류·자리
const DEFAULT_PAGES = Object.entries(LEGACY).map(([path, [kind, slot]]) => ({ path, kind, slot, name: '', pattern: '' }));
const OTHER = '/other';
// 매핑 목록을 { path, name, pattern, kind, slot } 모양으로 맞춘다. kind/slot이 없는 예전 행은 키로 추정하고, 남는 자리는 순서대로 준다
function normalizePages(pages) {
  const list = (pages && pages.length ? pages : DEFAULT_PAGES).map(p => (typeof p === 'string' ? { path: p } : { ...p }));
  const used = new Set();
  for (const p of list) { const lg = LEGACY[p.path]; if (!KINDS.includes(p.kind)) p.kind = lg ? lg[0] : 'shop'; if (p.path === '/' || p.kind === 'plaza') { p.kind = 'plaza'; p.slot = 0; } if (!Number.isInteger(p.slot) || p.slot < 0 || p.slot >= MAX_BUILDINGS || used.has(p.slot)) p.slot = (lg && !used.has(lg[1])) ? lg[1] : undefined; if (p.slot !== undefined) used.add(p.slot); p.name = p.name || ''; p.pattern = p.pattern || ''; }
  for (const p of list) if (p.slot === undefined) { let i = 1; while (used.has(i)) i++; p.slot = i; used.add(i); }
  if (!list.some(p => p.slot === 0)) list.unshift({ path: '/', name: '', pattern: '^/$', kind: 'plaza', slot: 0 });
  return list.filter(p => p.slot < MAX_BUILDINGS).sort((a, b) => a.slot - b.slot);
}
// 이벤트 이름: 시스템 4종 말고는 사이트가 자유롭게 정한다(SDK와 같은 규칙). 사이트당 서로 다른 이름은 MAX_TYPES개까지(설정에 적은 이름은 항상 허용)
const SYSTEM_TYPES = new Set(['session_start', 'page_view', 'heartbeat', 'page_leave']);
const TYPE_RE = /^[a-z_]{2,32}$/; const MAX_TYPES = 50;
// 이벤트 표현 설정(sites.event_config). 대시보드 src/p4.js의 EV_EFFECTS·EV_SOUNDS와 같은 값
const EFFECTS = ['star', 'coin', 'firework', 'heart', 'cart', 'mail', 'search', 'bolt', 'fire', 'none']; const SOUNDS = ['none', 'coin', 'chime', 'blip'];
function normalizeEventConfig(list) {
  const out = [], seen = new Set();
  for (const c of Array.isArray(list) ? list : []) { if (!c || !TYPE_RE.test(c.type) || seen.has(c.type) || out.length >= MAX_TYPES) continue; seen.add(c.type);
    const e = { type: c.type, label: String(c.label || '').trim().slice(0, 20) }; if (EFFECTS.includes(c.effect)) e.effect = c.effect; if (SOUNDS.includes(c.sound)) e.sound = c.sound;
    // auto(로드맵 13): 이 정규식에 맞는 주소를 보면 코드 없이 이 이벤트를 세션당 한 번 만든다(예: 결제 완료 ^/order/complete)
    if (typeof c.auto === 'string' && c.auto.trim()) { const a = c.auto.trim().slice(0, 300); try { new RegExp(a); if (!unsafeRegex(a)) e.auto = a; } catch { /* 잘못된 정규식은 버린다. 중첩 반복(ReDoS)도 버린다 */ } }
    for (const k of ['notify', 'value', 'feed']) if (typeof c[k] === 'boolean') e[k] = c[k]; out.push(e); }
  return out;
}
const ALLOWED_PROPS = { device: 'string', referrer: 'string', returning: 'boolean', plan: 'string', amount: 'number', me: 'boolean', bot: 'string', ua: 'string', reason: 'string', country: 'string', tz: 'string', lang: 'string', utm_source: 'string', utm_medium: 'string', utm_campaign: 'string', first: 'string' }; // first: 첫 방문 날짜 YYYY-MM-DD(리텐션 코호트, 로드맵 49)
const PROP_KEY = /^[a-z_][a-z0-9_]{0,31}$/; const MAX_EXTRA_PROPS = 10; // 커스텀 이벤트에만 붙는 임의 속성
// 값이 정해진 속성은 그 값만 받는다(대시보드가 그대로 그리므로 임의 문자열을 넣지 못하게. docs/security.md S-02)
const ENUM_PROPS = { device: ['desktop', 'mobile', 'tablet'], referrer: ['direct', 'search', 'social', 'ad'] };
// 개인정보 마스킹(약관 4절, docs/security.md S-10): 커스텀 속성 문자열의 이메일·전화번호 꼴은 저장 전에 가린다. 주문번호 같은 숫자만 있는 값은 건드리지 않는다
const maskPii = s => s.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '<email>').replace(/\+\d{1,3}[\s-]?\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{4}|\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b|\b\d{3}[-.\s]\d{3,4}[-.\s]\d{4}\b/g, '<phone>');
// ReDoS 휴리스틱(docs/security.md S-06): 반복이 든 그룹에 다시 반복이 붙는 꼴((a+)+, (\d*\s)*, (x{2,})+)만 막는다. 완전하지 않지만 흔한 폭발 패턴은 잡는다
function unsafeRegex(src) { const st = []; let q = false; for (let i = 0; i < src.length; i++) { const c = src[i];
    if (c === '\\') { i++; continue; } if (c === '[') { while (i < src.length && src[i] !== ']') { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '(') { st.push(q); q = false; continue; }
    if (c === ')') { const inner = q; q = st.pop() || inner; if (inner && /[+*{]/.test(src[i + 1] || '')) return true; continue; }
    if (c === '+' || c === '*' || c === '{') q = true; }
  return false; }
// 날씨(로드맵 35) 기준: 최근 10분 사람 오류(js_error)가 rainErrors건 이상이면 비, 접속자가 sunnyOnline명 이상이면 쨍쨍, 그 밖에는 맑음
const WEATHER = { window: 600000, rainErrors: +(process.env.WEATHER_RAIN_ERRORS || 3), sunnyOnline: +(process.env.WEATHER_SUNNY_ONLINE || 8) };
const VITALS = { names: ['LCP', 'INP', 'CLS'], keep: 60, min: 5 }; // 건물마다 바이탈별 최근 60개, 5개부터 판정
function p75(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * .75))]; }
// 방문자 인사(로드맵 37): 미니 위젯의 이모지 버튼. 정해진 것만 받는다
const GREET_EMOJI = ['👋', '❤️', '😂', '👍', '🎉', '😮'];
const geo = require('./geo');

class SiteStore {
  constructor(site, { ttl = 45000, now = () => Date.now() } = {}) {
    this.site = site; this.ttl = ttl; this.now = now;
    this.sessions = new Map(); this.seen = new Set(); this.seenQ = [];
    this.listeners = new Set(); this.totalEvents = 0; this.duplicates = 0; this.stale = 0; this.lastEventAt = null;
    this.paths = new Map(); // 실제로 본 경로 → { n, last }. 설정 화면의 체크리스트 재료. 봇 제외, 상위 300개만 유지
    this.log = [];          // 내보낸 이벤트 최근 5000건. DB가 없는 로컬 사이트의 리플레이 재료 (DB가 있으면 events 테이블을 쓴다)
    this.types = new Map(); this.dropped = new Set(); // 받은 커스텀 이벤트 이름 → { n, last }, 한도에 걸려 버린 이름(최대 20개)
    this.vitals = new Map(); // 건물 키 → { LCP:[], INP:[], CLS:[] } 최근 표본(로드맵 28). 메모리에만 둔다
    this.setPages(site.pages, true); this.setEventConfig(site.event_config);
  }
  setEventConfig(list) { this.eventConfig = normalizeEventConfig(list); this.autoRules = []; for (const c of this.eventConfig) if (c.auto && !SYSTEM_TYPES.has(c.type)) { try { this.autoRules.push({ type: c.type, re: new RegExp(c.auto) }); } catch {} } }
  // 커스텀 이벤트 이름을 받을지 정한다. 처음 보는 이름은 한도 안에서만 등록
  allowType(type, at) {
    if (!TYPE_RE.test(type)) return false; const e = this.types.get(type); if (e) { if (at > e.last) e.last = at; return true; }
    if (this.types.size >= MAX_TYPES && !this.eventConfig.some(c => c.type === type)) { if (this.dropped.size < 20) this.dropped.add(type); return false; }
    this.types.set(type, { n: 0, last: at }); return true;
  }
  seenTypes() { return [...this.types].map(([type, v]) => ({ type, n: v.n, last: v.last })).sort((a, b) => b.n - a.n); }
  setPages(pages, silent) {
    this.pages = normalizePages(pages);
    if (silent) return;
    // 매핑이 바뀌면 접속 중인 세션을 새 매핑으로 다시 배정하고, 건물이 바뀐 세션은 page_view로 알린다
    const now = this.now();
    for (const s of this.sessions.values()) { const to = this.resolvePath(s.path || s.page); if (to === s.page) continue; s.page = to;
      this.emit({ kind: 'event', event: { event_id: `remap_${s.id}_${now}`, site_id: this.site.id, session_id: s.id, event_type: 'page_view', page_path: to, path: s.path || to, timestamp: new Date().toISOString(), properties: {} }, session: s }); }
  }
  notePath(p, at) { const e = this.paths.get(p); if (e) { e.n++; if (at > e.last) e.last = at; return; } this.paths.set(p, { n: 1, last: at }); if (this.paths.size > 400) this.paths = new Map([...this.paths].sort((a, b) => b[1].n - a[1].n).slice(0, 300)); }
  seenPaths() { return [...this.paths].map(([path, v]) => ({ path, n: v.n, last: v.last, building: this.resolvePath(path) })).sort((a, b) => b.n - a.n); }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(msg) { if (msg.kind === 'event' && msg.event.event_type !== 'heartbeat') { this.log.push(msg.event); if (this.log.length > 5000) this.log.shift(); } for (const fn of this.listeners) { try { fn(msg); } catch (e) { /* 리스너 오류는 무시 */ } } }
  eventsBetween(from, to) { return this.log.filter(e => { const t = Date.parse(e.timestamp); return t >= from && t <= to; }); }
  // 리플레이 메모(event_type 'note'): "배포", "광고 시작" 같은 표시. 세션을 만들지 않고 기록·전파만 한다. 대시보드는 피드 줄과 리플레이 시간축 눈금으로 그린다
  note(text, by, at = this.now()) { const ev = { event_id: 'note_' + at.toString(36) + '_' + Math.random().toString(36).slice(2, 8), site_id: this.site.id, session_id: 'note', event_type: 'note', page_path: '/', timestamp: new Date(at).toISOString(), properties: { text: String(text).slice(0, 80), by: String(by || '').slice(0, 40) } };
    this.log.push(ev); if (this.log.length > 5000) this.log.shift(); return ev; }
  resolvePath(p) { for (const page of this.pages) { if (page.pattern ? new RegExp(page.pattern).test(p) : page.path === p) return page.path; } return OTHER; }
  remember(id) { this.seen.add(id); this.seenQ.push(id); if (this.seenQ.length > 20000) this.seen.delete(this.seenQ.shift()); }
  // 외부에서 온 이벤트를 안전한 형태로 다듬는다. 실패하면 null.
  normalize(raw, ctx = {}) {
    if (!raw || typeof raw !== 'object') return null;
    const { event_id, session_id, event_type, page_path } = raw;
    if (typeof event_id !== 'string' || event_id.length > 80) return null;
    if (typeof session_id !== 'string' || session_id.length > 80) return null;
    const system = SYSTEM_TYPES.has(event_type); if (!system && !this.allowType(event_type, this.now())) return null;
    let path = typeof page_path === 'string' ? page_path : '/';
    path = path.split('?')[0].split('#')[0]; if (!path.startsWith('/') || path.length > 256) return null;
    const props = {}; const src = raw.properties && typeof raw.properties === 'object' ? raw.properties : {};
    for (const [k, t] of Object.entries(ALLOWED_PROPS)) if (typeof src[k] === t && (t !== 'number' || Number.isFinite(src[k]))) props[k] = t === 'string' ? String(src[k]).slice(0, 64) : src[k];
    for (const [k, list] of Object.entries(ENUM_PROPS)) if (k in props && !list.includes(props[k])) delete props[k];
    if ('first' in props && !/^\d{4}-\d{2}-\d{2}$/.test(props.first)) delete props.first;
    if (!system) { let extra = 0; for (const [k, v] of Object.entries(src)) { if (extra >= MAX_EXTRA_PROPS) break; if (k in ALLOWED_PROPS || !PROP_KEY.test(k)) continue; const t = typeof v;
      if (t === 'string') props[k] = maskPii(v.slice(0, 100)); else if ((t === 'number' && Number.isFinite(v)) || t === 'boolean') props[k] = v; else continue; extra++; } }
    if (ctx.bot) props.bot = ctx.bot; else delete props.bot;
    // 나라: 서버가 안 것(프록시 헤더·GeoIP) → SDK가 보낸 시간대 → 언어. 시간대·언어 자체는 저장하지 않는다
    const country = geo.code(ctx.country) || geo.code(props.country) || geo.fromTz(props.tz) || geo.fromLang(props.lang); delete props.tz; delete props.lang; if (country) props.country = country; else delete props.country;
    const ts = Date.parse(raw.timestamp); const timestamp = Number.isFinite(ts) ? new Date(Math.min(ts, Date.now() + 5000)).toISOString() : new Date().toISOString();
    return { event_id, site_id: this.site.id, session_id, event_type, page_path: path, timestamp, properties: props };
  }
  apply(ev) {
    if (this.seen.has(ev.event_id)) { this.duplicates++; return { ok: false, reason: 'duplicate' }; }
    this.remember(ev.event_id); this.totalEvents++; this.lastEventAt = Date.now();
    const ts = Date.parse(ev.timestamp); const now = this.now();
    let s = this.sessions.get(ev.session_id); const type = ev.event_type; const out = [];
    // 늦게 온 이벤트(SDK 오프라인 큐, 로드맵 45): ttl보다 오래됐고 살아 있는 세션이 없으면 세션을 되살리지 않고 기록(persist)만 남긴다. 살아 있는 세션의 것이면 그대로(역행 검사가 막는다)
    if (!s && Number.isFinite(ts) && now - ts > this.ttl) { this.late = (this.late || 0) + 1; if (!SYSTEM_TYPES.has(type)) { const e = this.types.get(type); if (e) e.n++; } return { ok: true, changes: 0, persist: type !== 'heartbeat' && type !== 'page_leave', auto: [], late: true }; }
    if ((type === 'session_start' || type === 'page_view') && !ev.properties.bot) this.notePath(ev.page_path, now);
    const create = () => { s = { id: ev.session_id, page: this.resolvePath(ev.page_path), path: ev.page_path, startedAt: now, lastSeen: now, lastTs: ts, props: ev.properties, bot: ev.properties.bot || null }; this.sessions.set(s.id, s); out.push({ ...ev, event_type: 'session_start', page_path: s.page, path: ev.page_path }); };
    // page_leave 는 바로 지우지 않고 2.5초 유예한다. 일반 링크로 페이지를 옮기면 pagehide → 새 로드 순으로 오기 때문에,
    // 바로 지우면 캐릭터가 나갔다 들어오는 깜빡임이 생긴다. 유예 중 같은 세션의 이벤트가 오면 취소된다.
    if (type === 'page_leave') { if (s) { s.leaveAt = now; s.leaveEvent = { ...ev, page_path: s.page }; } }
    else if (type === 'session_start' || type === 'page_view' || type === 'heartbeat') {
      if (!s) create();
      else if (type !== 'heartbeat') {
        if (ts < s.lastTs) this.stale++;
        else { s.path = ev.page_path; const to = this.resolvePath(ev.page_path); if (to !== s.page) { s.page = to; out.push({ ...ev, event_type: 'page_view', page_path: to, path: ev.page_path }); } }
      }
    } else { if (!s) create(); out.push({ ...ev, page_path: s.page }); const e = this.types.get(type); if (e) e.n++; }
    if (s && this.sessions.has(s.id)) { s.lastSeen = now; s.lastTs = Math.max(s.lastTs, ts); if (ev.properties.me) s.props.me = true; if (type !== 'page_leave') { s.leaveAt = null; s.leaveEvent = null; } }
    // 구매 자동 감지(로드맵 13): 사람 세션의 주소가 설정의 auto 패턴에 맞으면 그 이벤트를 세션당 한 번 만든다. 저장·알림은 index.js가 auto 목록으로 처리한다
    const auto = [];
    if ((type === 'session_start' || type === 'page_view') && s && !ev.properties.bot && this.autoRules.length) { s.autoFired = s.autoFired || new Set();
      for (const r of this.autoRules) { if (s.autoFired.has(r.type) || !r.re.test(ev.page_path)) continue; s.autoFired.add(r.type); if (!this.allowType(r.type, now)) continue; const t = this.types.get(r.type); if (t) t.n++;
        const ae = { event_id: ev.event_id + '_auto_' + r.type, site_id: this.site.id, session_id: ev.session_id, event_type: r.type, page_path: s.page, path: ev.page_path, timestamp: ev.timestamp, properties: { ...ev.properties, auto: true } }; delete ae.properties.me; this.remember(ae.event_id); auto.push(ae); out.push(ae); } }
    for (const e of out) this.emit({ kind: 'event', event: e });
    return { ok: true, changes: out.length, persist: type !== 'heartbeat' && type !== 'page_leave', auto };
  }
  expire() {
    const now = this.now();
    for (const s of [...this.sessions.values()]) {
      if (s.leaveAt && now - s.leaveAt > 2500) { this.sessions.delete(s.id); this.emit({ kind: 'event', event: s.leaveEvent, session: s }); continue; }
      if (now - s.lastSeen > this.ttl) {
        this.sessions.delete(s.id);
        this.emit({ kind: 'event', event: { event_id: `exp_${s.id}_${now}`, site_id: this.site.id, session_id: s.id, event_type: 'page_leave', page_path: s.page, timestamp: new Date().toISOString(), properties: { reason: 'timeout' } }, session: s });
      }
    }
  }
  // 발자국: 이벤트 구간에서 사람 세션의 건물 간 이동(null = 입구)을 뽑아 (from,to)별 가중치로 합친다. 가중치는 이동 1번 = 1을
  // 지금까지 반감기 halfLife(초)로 감쇠한 값. 대시보드는 이 값으로 길 위에 발자국을 찍으므로 새로고침·탭·기기와 상관없이 같다.
  trails(events, now, halfLife = 1800) {
    const pos = new Map(), acc = new Map(), tau = halfLife / Math.LN2 * 1000;
    const add = (from, to, t) => { if (from === to) return; const k = `${from || ''}\n${to || ''}`; acc.set(k, (acc.get(k) || 0) + Math.exp(-Math.max(0, now - t) / tau)); };
    for (const ev of events) {
      if ((ev.properties && ev.properties.bot) || ev.event_type === 'note') continue;
      const t = Date.parse(ev.timestamp) || now, type = ev.event_type, cur = pos.get(ev.session_id);
      if (type === 'page_leave') { if (cur !== undefined) { add(cur, null, t); pos.delete(ev.session_id); } continue; }
      if (type === 'heartbeat') continue;
      const to = (type === 'session_start' || type === 'page_view') ? this.resolvePath(ev.path || ev.page_path) : cur; // 메모리 로그는 page_path가 이미 건물 키라 원래 경로(path)로 다시 푼다
      if (cur === undefined) { if (type === 'session_start') add(null, to || OTHER, t); pos.set(ev.session_id, to || OTHER); } // 구간 앞에서 시작한 세션은 입구에서 걸어오지 않는다
      else if (to !== cur) { add(cur, to, t); pos.set(ev.session_id, to); }
    }
    return [...acc].map(([k, w]) => { const [from, to] = k.split('\n'); return { from: from || null, to: to || null, w: Math.round(w * 1000) / 1000 }; }).filter(m => m.w >= 0.01);
  }
  // 대시보드가 처음 붙거나 재연결할 때 보내는 스냅샷: 세션마다 session_start 하나로 복원된다.
  snapshot() {
    const now = new Date().toISOString();
    return { site_id: this.site.id, at: now, sessions: [...this.sessions.values()].map(s => ({ event_id: `snap_${s.id}_${Date.now()}`, site_id: this.site.id, session_id: s.id, event_type: 'session_start', page_path: s.page, path: s.path, timestamp: new Date(s.lastTs).toISOString(), properties: s.props, started_at: s.startedAt })) };
  }
  counts() { const c = {}; for (const p of this.pages) c[p.path] = 0; c[OTHER] = 0; let bots = 0; for (const s of this.sessions.values()) { if (s.bot) { bots++; continue; } c[s.page] = (c[s.page] || 0) + 1; } return { pages: c, online: this.sessions.size - bots, bots }; }
  // 웹 바이탈(로드맵 28): SDK data-vitals가 보낸 web_vital(name·value)을 건물별로 모아 p75를 낸다. 표본 5개부터 판정, 느리면(poor) 대시보드가 그 건물에 연기를 그린다
  vital(pagePath, name, value) { const key = this.resolvePath(pagePath); let v = this.vitals.get(key); if (!v) { v = { LCP: [], INP: [], CLS: [] }; this.vitals.set(key, v); if (this.vitals.size > 40) this.vitals.delete(this.vitals.keys().next().value); }
    const before = this.vitalLevel(v); v[name].push(value); if (v[name].length > VITALS.keep) v[name].shift(); return this.vitalLevel(v) !== before; }
  vitalLevel(v) { const p = n => p75(v[n]); if ([v.LCP, v.INP, v.CLS].every(a => a.length < VITALS.min)) return null;
    const bad = (n, t) => v[n].length >= VITALS.min && p(n) > t; if (bad('LCP', 4000) || bad('INP', 500) || bad('CLS', .25)) return 'poor'; if (bad('LCP', 2500) || bad('INP', 200) || bad('CLS', .1)) return 'ok'; return 'good'; }
  vitalsView() { const out = {}; for (const [k, v] of this.vitals) out[k] = { LCP: { p75: p75(v.LCP), n: v.LCP.length }, INP: { p75: p75(v.INP), n: v.INP.length }, CLS: { p75: p75(v.CLS), n: v.CLS.length }, level: this.vitalLevel(v) }; return out; }
  // 날씨: 서버가 정하고 대시보드는 스냅샷·SSE 'weather'로 받아 그리기만 한다(탭·기기마다 같게). 오류는 메모리 로그 끝에서 10분치만 센다
  weather(now = this.now()) { let errs = 0; for (let i = this.log.length - 1, k = 0; i >= 0 && k < 3000; i--, k++) { const e = this.log[i]; if (now - Date.parse(e.timestamp) > WEATHER.window) continue; if (e.event_type === 'js_error' && !(e.properties && e.properties.bot)) errs++; }
    const online = this.counts().online; return { kind: errs >= WEATHER.rainErrors ? 'rain' : online >= WEATHER.sunnyOnline ? 'sunny' : 'clear', errors: errs, online, at: now }; }
}
module.exports = { SiteStore, DEFAULT_PAGES, OTHER, KINDS, MAX_BUILDINGS, normalizePages, SYSTEM_TYPES, MAX_TYPES, normalizeEventConfig, WEATHER, VITALS, GREET_EMOJI, unsafeRegex, maskPii, ENUM_PROPS };
