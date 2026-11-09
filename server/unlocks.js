'use strict';
// 테마 해금: 사이트에 실제로 일어난 일로 테마를 연다. 사람 방문만 센다(봇·주인 본인 vt_me 제외). 한 번 열리면 계속 열려 있다.
// 상태는 sites.unlocks(jsonb)에 둔다. 원본 events는 보관 기간이 지나면 지워지므로 진행도(나라·날짜·횟수)도 같이 저장한다.
// 작은 사이트도 열 수 있게 '처음 일어난 일'·'누적'만 쓰고 연속 조건은 없다. 그래도 막히면 사이트를 만든 지 14일마다 하나씩 골라 연다(선물).
// 대시보드 테마 키(src/p3.js·src/themes/*.js)와 같은 값. cozy는 처음부터 열려 있다
const FREE = ['cozy'];
const GIFT_EVERY = 14 * 86400000;
const TZ = process.env.ROLLUP_TZ || 'Asia/Seoul'; // 시각 조건(업무 시간·새벽)과 날짜 경계. 일별 집계와 같은 시간대
// goal: 진행도 목표, prog(state): 지금 값. 대시보드는 이 표를 그대로 받아 자물쇠·진행도를 그린다
const RULES = [
  { key: 'office', text: '평일 업무 시간(9~18시)에 방문자 3명', goal: 3, prog: s => s.office },
  { key: 'hanok', text: '한국에서 온 방문자 1명', goal: 1, prog: s => (s.countries.includes('KR') ? 1 : 0) },
  { key: 'candy', text: '한 방문자가 서로 다른 페이지 3곳을 둘러봄', goal: 3, prog: s => s.pages },
  { key: 'forest', text: '다시 찾아온 방문자 1명', goal: 1, prog: s => s.returning },
  { key: 'rpg', text: '한 방문자가 5분 이상 머묾', goal: 5, prog: s => s.stay },
  { key: 'cyber', text: '자정~새벽 5시에 방문자 1명', goal: 1, prog: s => s.night },
  { key: 'west', text: '서로 다른 나라 2곳에서 방문', goal: 2, prog: s => s.countries.length },
  { key: 'farm', text: '방문자가 있었던 날 7일', goal: 7, prog: s => s.days.length },
  { key: 'space', text: '서로 다른 나라 3곳에서 방문', goal: 3, prog: s => s.countries.length },
];
const KEYS = RULES.map(r => r.key);
// 희귀 방문자(로드맵 36): 사람 세션이 새로 시작할 때 서버가 한 번 판정해 session_start의 properties.rare(종류)·visit_no(누적 번호)에 얹는다.
// 대시보드는 그 세션에 반짝임·머리 위 표시를 그리고, 도감 '희귀' 탭은 아래 목록과 view().rares(만난 횟수·처음·마지막)를 쓴다. 우선순위는 목록 순서
const RARES = [
  { key: 'first', name: '첫 손님', text: '이 사이트의 첫 번째 방문자', icon: 'heart' },
  { key: 'milestone', name: '기념 손님', text: '100 · 500 · 1,000 · 7,777번째처럼 특별한 번호의 방문자', icon: 'star' },
  { key: 'pioneer', name: '개척자', text: '처음 보는 나라에서 온 첫 방문자', icon: 'firework' },
  { key: 'owl', name: '올빼미', text: '새벽 3시대에 들어온 방문자', icon: 'moon' },
];
const RARE_KEYS = RARES.map(r => r.key);
const MILESTONES = new Set([100, 500, 777, 1000, 5000, 7777, 10000, 50000, 77777, 100000, 500000, 1000000]);
// 기록 갱신(로드맵 21): N번째 방문자·동시 접속 최고·첫 해외 방문자·나라 수. 서버는 판정해 SSE 'milestone'(+웹훅)만 보내고 카드 이미지는 대시보드가 만든다. 최근 30건을 state.records.log에 둔다
const RECORD_KINDS = ['visits', 'online', 'foreign', 'countries'];
const COUNTRY_MARKS = new Set([5, 10, 20, 50, 100]);
const ONLINE_MIN = +(process.env.RECORD_ONLINE_MIN || 5); // 동시 접속 기록은 이 인원부터 알린다(작은 숫자가 갱신될 때마다 울리지 않게)
function recordText(m) { const n = (m.n || 0).toLocaleString('ko-KR');
  return m.kind === 'visits' ? `${n}번째 방문자가 왔어요!` : m.kind === 'online' ? `동시 접속 최고 기록 ${n}명!` : m.kind === 'foreign' ? `첫 해외 방문자가 왔어요 · ${m.country}` : `${n}개 나라에서 찾아왔어요!`; }

// 시간대 기준 날짜·시·요일. Intl은 느려서 분 단위로 캐시
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' });
const partsCache = new Map();
function local(t) {
  const k = Math.floor(t / 60000); let v = partsCache.get(k); if (v) return v;
  const o = {}; for (const p of fmt.formatToParts(new Date(t))) o[p.type] = p.value;
  v = { day: `${o.year}-${o.month}-${o.day}`, hour: +o.hour, weekday: !['Sat', 'Sun'].includes(o.weekday) };
  if (partsCache.size > 2000) partsCache.clear(); partsCache.set(k, v); return v;
}

// 저장된 값을 안전한 모양으로. 모르는 키는 버린다
function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}; const p = r.progress && typeof r.progress === 'object' ? r.progress : {};
  const num = (v, max) => (Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);
  const unlocked = {}; for (const k of KEYS) if (r.unlocked && typeof r.unlocked[k] === 'string') unlocked[k] = r.unlocked[k];
  const rare = {}; for (const k of RARE_KEYS) { const v = r.rare && r.rare[k]; if (v && typeof v === 'object') rare[k] = { n: num(v.n, 1e9), first: typeof v.first === 'string' ? v.first : null, last: typeof v.last === 'string' ? v.last : null }; }
  const rc = r.records && typeof r.records === 'object' ? r.records : {}; const iso = v => (typeof v === 'string' ? v : null);
  const records = { onlineMarked: num(rc.onlineMarked, 1e7), maxOnline: { n: num(rc.maxOnline && rc.maxOnline.n, 1e7), at: iso(rc.maxOnline && rc.maxOnline.at) }, firstForeign: rc.firstForeign && typeof rc.firstForeign === 'object' && /^[A-Z]{2}$/.test(rc.firstForeign.country || '') ? { country: rc.firstForeign.country, at: iso(rc.firstForeign.at) } : null,
    log: (Array.isArray(rc.log) ? rc.log : []).filter(m => m && RECORD_KINDS.includes(m.kind)).map(m => ({ kind: m.kind, n: num(m.n, 1e9), country: /^[A-Z]{2}$/.test(m.country || '') ? m.country : undefined, at: iso(m.at) })).slice(-30) };
  return {
    unlocked, rare, records,
    gifts: Array.isArray(r.gifts) ? r.gifts.filter(k => KEYS.includes(k)) : [],   // 선물로 연 테마(순서대로)
    progress: {
      countries: Array.isArray(p.countries) ? [...new Set(p.countries.filter(c => /^[A-Z]{2}$/.test(c)))].slice(0, 300) : [],
      days: Array.isArray(p.days) ? [...new Set(p.days.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort().slice(-60) : [], // 목표가 7일이라 최근 60일만 둔다
      office: num(p.office, 1e6), pages: num(p.pages, 100), returning: num(p.returning, 1e6), stay: num(p.stay, 1e4), night: num(p.night, 1e6),
      visits: num(p.visits, 1e12), // 누적 사람 방문(세션) 수. 희귀 방문자(36)·기록 갱신(21)·마을 성장(34)이 같이 쓴다
    },
  };
}

// 사이트 하나의 해금 판정기. observe()에 이벤트를 넣으면 진행도를 올리고, 새로 열린 테마 키 목록을 돌려준다
class Unlocks {
  constructor(saved, { createdAt, now = () => Date.now() } = {}) {
    this.state = normalize(saved); this.createdAt = Date.parse(createdAt) || now(); this.now = now;
    this.sess = new Map(); // 세션 id → { start, paths:Set, office, night, stay }. 같은 세션을 두 번 세지 않으려고 둔다. 6시간 지나면 버린다
    this.dirty = false; this.pending = []; // 아직 안 내보낸 기록 갱신(takeMilestones)
  }
  // 기록 갱신 한 건을 남기고 내보낼 목록에 넣는다
  record(kind, at, extra = {}) { const m = { kind, at: new Date(at).toISOString(), ...extra, text: '' }; m.text = recordText(m); const log = this.state.records.log; log.push({ kind: m.kind, n: m.n, country: m.country, at: m.at }); if (log.length > 30) log.shift(); this.dirty = true; this.pending.push(m); return m; }
  takeMilestones() { const out = this.pending; this.pending = []; return out; }
  // 동시 접속 최고 기록. 사람 세션이 들어온 뒤 index.js가 부른다
  // 알림은 띄엄띄엄: 마지막으로 알린 기록의 1.3배·+2 이상일 때만(5 → 7 → 10 → 13 → 17 → 23…). 최고치 자체는 매번 갱신한다
  observeOnline(online, at = this.now()) { const R = this.state.records; if (online <= R.maxOnline.n) return; R.maxOnline = { n: online, at: new Date(at).toISOString() }; this.dirty = true;
    const last = R.onlineMarked || 0; if (online >= ONLINE_MIN && online >= Math.max(last * 1.3, last + 2)) { R.onlineMarked = online; this.record('online', at, { n: online }); } }
  // 희귀 방문자 판정. st.apply 전에 불러 session_start의 properties에 rare·visit_no를 얹는다(그래야 SSE 이벤트·스냅샷의 세션 props에 들어간다).
  // 새 사람 세션(6시간 안에 못 본 id)의 session_start만 센다. 봇·주인(me)은 제외. 돌려주는 값은 { kind, no } 또는 null
  judge(ev, at = this.now()) {
    const props = ev.properties || (ev.properties = {}); delete props.rare; delete props.visit_no; // 클라이언트가 보낸 값은 믿지 않는다
    if (props.bot || props.me || ev.event_type !== 'session_start' || this.sess.has(ev.session_id)) return null;
    const P = this.state.progress; P.visits++; const no = P.visits; this.dirty = true;
    const s = { start: at, last: at, paths: new Set(), office: false, night: false, stay: 0, pending: true }; this.sess.set(ev.session_id, s); this.gc(at); // observe()가 이어서 쓴다(pending = 아직 진행도에 안 넣음)
    const c = props.country; let kind = null;
    if (no === 1) kind = 'first'; else if (MILESTONES.has(no)) kind = 'milestone';
    else if (c && /^[A-Z]{2}$/.test(c) && !P.countries.includes(c) && P.visits > 1) kind = 'pioneer';
    else if (local(at).hour === 3) kind = 'owl';
    if (!kind) return null;
    const R = this.state.rare[kind] || (this.state.rare[kind] = { n: 0, first: null, last: null }); const iso = new Date(at).toISOString(); R.n++; if (!R.first) R.first = iso; R.last = iso;
    props.rare = kind; props.visit_no = no; if (kind === 'milestone') this.record('visits', at, { n: no }); return { kind, no };
  }
  // ev: 서버가 다듬은 이벤트(normalize 결과). at: 판정 시각(라이브는 서버 수신 시각, 백필은 이벤트 시각)
  observe(ev, at = this.now()) {
    const props = ev.properties || {}; if (props.bot) return [];
    const type = ev.event_type; const P = this.state.progress; let changed = false;
    let s = this.sess.get(ev.session_id); const fresh = !s || !!s.pending; if (s) s.pending = false;
    if (!s) { if (type === 'page_leave') return []; s = { start: at, last: at, paths: new Set(), office: false, night: false, stay: 0 }; this.sess.set(ev.session_id, s); this.gc(at); }
    if (s.me) return []; if (props.me) { s.me = true; return []; }
    s.last = Math.max(s.last, at);
    const c = props.country; if (c && /^[A-Z]{2}$/.test(c) && !P.countries.includes(c)) { P.countries.push(c); changed = true;
      const R = this.state.records, nc = P.countries.length; if (nc >= 2 && !R.firstForeign) { R.firstForeign = { country: c, at: new Date(at).toISOString() }; this.record('foreign', at, { country: c }); } if (COUNTRY_MARKS.has(nc)) this.record('countries', at, { n: nc }); }
    const L = local(at);
    if (!P.days.includes(L.day)) { P.days.push(L.day); P.days.sort(); if (P.days.length > 60) P.days.shift(); changed = true; }
    // 재방문: SDK는 페이지를 불러올 때마다 returning을 다시 계산하므로 일반 링크 이동이면 같은 세션 두 번째 페이지부터 true다. 새 세션의 첫 시작만 본다
    if (fresh && type === 'session_start' && props.returning === true) { P.returning++; changed = true; }
    if (!s.office && L.weekday && L.hour >= 9 && L.hour < 18) { s.office = true; P.office++; changed = true; }
    if (!s.night && L.hour < 5) { s.night = true; P.night++; changed = true; }
    if ((type === 'session_start' || type === 'page_view') && ev.page_path && s.paths.size < 20) { s.paths.add(ev.page_path); if (s.paths.size > P.pages) { P.pages = s.paths.size; changed = true; } }
    const mins = Math.floor((s.last - s.start) / 60000); if (mins > s.stay) { s.stay = mins; if (mins > P.stay) { P.stay = mins; changed = true; } }
    if (changed) this.dirty = true;
    return this.check(at);
  }
  gc(at) { if (this.sess.size < 2000 && this.sess.size % 100) return; for (const [id, s] of this.sess) if (at - s.last > 6 * 3600000) this.sess.delete(id); }
  // 목표에 닿은 테마를 연다. 새로 열린 키 목록
  check(at = this.now()) {
    const out = []; for (const r of RULES) if (!this.state.unlocked[r.key] && r.prog(this.state.progress) >= r.goal) { this.state.unlocked[r.key] = new Date(at).toISOString(); out.push(r.key); }
    if (out.length) this.dirty = true; return out;
  }
  // 선물: 사이트를 만든 뒤 14일마다 하나. 받은 개수 - 쓴 개수 = 남은 개수
  giftsEarned(at = this.now()) { return Math.max(0, Math.floor((at - this.createdAt) / GIFT_EVERY)); }
  giftsLeft(at = this.now()) { return Math.max(0, this.giftsEarned(at) - this.state.gifts.length); }
  useGift(key, at = this.now()) {
    if (!KEYS.includes(key)) return { error: '그런 테마가 없어요' };
    if (this.state.unlocked[key]) return { error: '이미 열린 테마예요' };
    if (this.giftsLeft(at) < 1) return { error: '아직 선물이 없어요' };
    this.state.gifts.push(key); this.state.unlocked[key] = new Date(at).toISOString(); this.dirty = true; return { ok: true };
  }
  // 대시보드에 주는 모양. 열린 테마(FREE 포함), 테마별 조건·진행도, 선물
  view(at = this.now()) {
    const P = this.state.progress;
    return {
      free: FREE, unlocked: { ...this.state.unlocked },
      rules: RULES.map(r => ({ key: r.key, text: r.text, goal: r.goal, value: Math.min(r.goal, r.prog(P)), unlocked_at: this.state.unlocked[r.key] || null, gift: this.state.gifts.includes(r.key) })),
      gifts: { left: this.giftsLeft(at), next_at: new Date(this.createdAt + (this.giftsEarned(at) + 1) * GIFT_EVERY).toISOString(), every_days: GIFT_EVERY / 86400000 },
      visits: P.visits, rares: RARES.map(r => { const v = this.state.rare[r.key]; return { ...r, n: v ? v.n : 0, first: v ? v.first : null, last: v ? v.last : null }; }),
      records: { maxOnline: this.state.records.maxOnline, firstForeign: this.state.records.firstForeign, log: [...this.state.records.log].reverse().map(m => ({ ...m, text: recordText(m) })) },
    };
  }
  // 저장할 값(sites.unlocks)
  toJSON() { return this.state; }
}
module.exports = { Unlocks, RULES, FREE, KEYS, GIFT_EVERY, normalize, local, RARES, MILESTONES, RECORD_KINDS, recordText };
