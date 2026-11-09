'use strict';
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');
const { SiteStore, KINDS, MAX_BUILDINGS, normalizePages, MAX_TYPES, normalizeEventConfig, VITALS, GREET_EMOJI, unsafeRegex } = require('./store'); const { detectBot } = require('./bots'); const { Persister } = require('./persist'); const { makeAuth } = require('./auth'); const { Supabase } = require('./supabase'); const geo = require('./geo'); const maintenance = require('./maintenance'); const { Unlocks } = require('./unlocks'); const { badgeSvg } = require('./badge'); const { Alerts, normalizeWebhook } = require('./alerts'); const embedView = require('./embed').view;
const { Ring, frame } = require('./sse'); const { Peers, supabaseWsUrl } = require('./peers');
// .env 읽기 (의존성 없이). 이미 있는 환경 변수는 덮어쓰지 않는다
try { for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}

const PORT = +(process.env.PORT || 8787);
// 대시보드 API를 부를 수 있는 출처(S-28). 비우면 요청한 출처를 그대로(개발), 쉼표로 여럿(운영 + 로컬 개발 `https://visitown.vercel.app,http://localhost:5173`). 목록에 없는 출처에는 첫 값을 돌려줘 브라우저가 막는다
const DASH_ORIGINS = (process.env.ALLOWED_DASHBOARD_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const dashOrigin = origin => (!DASH_ORIGINS.length ? (origin || '*') : (origin && DASH_ORIGINS.includes(origin) ? origin : DASH_ORIGINS[0]));
const SESSION_TTL = +(process.env.SESSION_TTL_MS || 45000);
const TRAIL_WINDOW = 2 * 3600000; // 발자국을 다시 만들 때 보는 구간. 반감기 30분이라 2시간 전 이동은 1/16만 남는다
const supabase = new Supabase({ url: process.env.SUPABASE_URL, serviceKey: process.env.SUPABASE_SERVICE_KEY, jwtSecret: process.env.JWT_SECRET, anonKey: process.env.SUPABASE_ANON_KEY });
const authenticate = makeAuth({ supabase, devToken: process.env.DEV_TOKEN || 'dev' });
const persister = new Persister({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY });
const SDK_PATH = path.join(__dirname, '..', 'sdk', 'visitown.js');
const DASHBOARD_URL = (process.env.DASHBOARD_URL || 'https://visitown.vercel.app').replace(/\/$/, ''); // 미니 위젯이 iframe으로 여는 마을(SDK가 ?api=&site=&embed= 를 붙이고, 웹 앱이 /embed/[key]로 rewrite한다)
// 수평 확장(로드맵 46, server/peers.js): PEER_WS_URL 또는 PEERS=1(+Supabase Realtime)이면 다른 인스턴스와 이벤트·설정 변경을 주고받는다. 각 인스턴스가 모든 이벤트로 같은 상태를 계산하고,
// DB 저장은 받은 인스턴스만, 집계·웹훅·아침 요약처럼 "한 번만" 할 일은 리더(DB 임대 vt_lease, 10초마다 갱신)만 한다. 혼자 돌면 항상 리더
const INSTANCE = process.env.INSTANCE_ID || process.env.FLY_MACHINE_ID || Math.random().toString(36).slice(2, 8);
const PEER_URL = process.env.PEER_WS_URL || (process.env.PEERS === '1' && supabase.enabled ? supabaseWsUrl(supabase.url, process.env.SUPABASE_SERVICE_KEY) : null);
let leader = !PEER_URL; const isLeader = () => leader;
async function renewLease() { if (!PEER_URL) return; if (!supabase.enabled) { leader = true; return; } try { const ok = await supabase.lease('leader', INSTANCE, 30); leader = ok === null ? true : !!ok; } catch (e) { console.warn('lease', e.message); } }
if (PEER_URL) { renewLease(); setInterval(renewLease, 10000).unref(); }

// SSE 구독자 (register()에서 스토어 리스너를 건다). 사이트로 보내는 것은 전부 broadcast()를 거쳐 링버퍼(server/sse.js)에 남고, 재접속하면 빈 구간만 다시 받는다(로드맵 44)
var subscribers = new Map(); // siteId → Set<res> (주인·멤버, 티켓으로 연결)
// 보안 S-34: 임베드 키로 연결한 구독자는 따로 둔다. 링버퍼·대기 버퍼도 따로라 embedView(server/embed.js)가 거른 프레임만 받고, resume도 임베드 링버퍼 기준이다
var embedSubs = new Map(); // siteId → Set<res> (임베드 키)
const rings = new Map(), embedRings = new Map(); function ring(siteId, embed = false) { const m = embed ? embedRings : rings; let r = m.get(siteId); if (!r) { r = new Ring(); m.set(siteId, r); } return r; }
const subCount = siteId => (subscribers.get(siteId)?.size || 0) + (embedSubs.get(siteId)?.size || 0);
function sendSse(res, event, data, id) { res.write(frame(event, data, id)); }
// 같은 틱에 생긴 프레임(한 POST 배치의 이벤트 20건 등)은 구독자마다 한 번의 write로 보낸다(docs/load.md: 구독자 × 프레임 수만큼의 write가 병목). 새 구독자를 더하기 전에는 flush해서 스냅샷·resume과 순서가 어긋나지 않게 한다
const pending = new Map(), pendingEmbed = new Map(); // siteId → 아직 안 쓴 프레임 문자열
function flush(siteId) { const buf = pending.get(siteId), eb = pendingEmbed.get(siteId); if (buf !== undefined) { pending.delete(siteId); for (const res of subscribers.get(siteId) || []) res.write(buf); } if (eb !== undefined) { pendingEmbed.delete(siteId); for (const res of embedSubs.get(siteId) || []) res.write(eb); } }
function broadcast(siteId, event, data) { const r = ring(siteId); const line = r.line(r.push(event, data)); if (!pending.has(siteId) && !pendingEmbed.has(siteId)) setImmediate(flush, siteId); pending.set(siteId, (pending.get(siteId) || '') + line);
  const ed = embedView(event, data); if (ed !== null) { const er = ring(siteId, true); pendingEmbed.set(siteId, (pendingEmbed.get(siteId) || '') + er.line(er.push(event, ed))); } }

// 사이트 설정: sites.json(로컬 전용, DB에 기록 안 함) + Supabase sites 테이블. 둘 다 같은 모양을 쓴다.
const sites = new Map(); const stores = new Map();
function register(s) { sites.set(s.id, s); if (!stores.has(s.id)) { const st = new SiteStore(s, { ttl: SESSION_TTL }); stores.set(s.id, st);
    st.unlocks = new Unlocks(s.unlocks, { createdAt: s.created_at }); if (!s.local && supabase.enabled && !s.unlocks) backfillUnlocks(s, st);
    st.on(msg => { if (msg.event.event_type === 'page_leave' && !s.local) persister.push(msg.event, !!(msg.session && msg.session.bot)); broadcast(s.id, 'event', msg.event); });     if (!s.local && supabase.enabled) supabase.recentPaths(s.id).then(rows => { for (const r of rows || []) if (r.page_path !== '/other') st.notePath(r.page_path, Date.parse(r.occurred_at) || 0); }).catch(e => console.warn('recent paths', s.id, e.message));
    if (!s.local && supabase.enabled) supabase.recentTypes(s.id).then(rows => { for (const r of (rows || []).reverse()) { const at = Date.parse(r.occurred_at) || 0; if (st.allowType(r.event_type, at)) st.types.get(r.event_type).n++; } }).catch(e => console.warn('recent types', s.id, e.message));
  } else { const st = stores.get(s.id); if (JSON.stringify(st.pages) !== JSON.stringify(normalizePages(s.pages))) st.setPages(s.pages); st.setEventConfig(s.event_config); } }
// 멤버·초대: 주인(sites.owner_id) 외에 사이트를 같이 보는 사람. viewer는 보기만, editor는 설정까지. 로컬 사이트는 메모리에만(서버 재시작하면 사라짐)
// 테마 해금(server/unlocks.js): 사람 방문을 볼 때마다 진행도를 올리고, 새로 열리면 SSE 'unlocks'로 알린다. DB 저장은 10초마다 바뀐 사이트만
function observeUnlock(site, st, ev, bot) { const sess = st.sessions.get(ev.session_id); if (sess && sess.props.me) return;
  const opened = st.unlocks.observe(ev); if (opened.length) pushUnlocks(site.id, st, opened);
  if (ev.event_type === 'session_start' && !bot) st.unlocks.observeOnline(st.counts().online); } // 동시 접속 최고 기록(21)
function pushUnlocks(siteId, st, opened = []) { broadcast(siteId, 'unlocks', { ...st.unlocks.view(), opened }); }
// 기록 갱신(로드맵 21): 판정기가 쌓아 둔 것을 SSE 'milestone'으로 보내고, 웹훅이 있으면 같은 문장을 보낸다. 해금 상태(sites.unlocks)에 같이 저장된다
function pushMilestones(site, st) { const list = st.unlocks.takeMilestones(); if (!list.length) return; for (const m of list) { broadcast(site.id, 'milestone', m);
    if (leader && site.webhook && site.webhook.url && site.webhook.milestone !== false) alerts.post(site.webhook.url, `🏆 ${site.domain || site.name} · ${m.text}`).then(err => { if (err) console.warn('milestone webhook', site.id, err); }); } }
function saveUnlocks() { for (const [id, st] of stores) { const s = sites.get(id); if (!st.unlocks.dirty || !s || s.local || !supabase.enabled) continue; st.unlocks.dirty = false;
  supabase.setUnlocks(id, st.unlocks.toJSON()).catch(e => { st.unlocks.dirty = true; console.warn('unlocks', id, e.message); }); } }
setInterval(saveUnlocks, 10000).unref();
// 처음 해금 상태가 생기는 사이트(마이그레이션 직후·새 사이트)는 남아 있는 기록으로 진행도를 채운다: 원본 events(보관 기간 안) + 일별 집계의 방문 날짜(60일)
async function backfillUnlocks(s, st) {
  try { const now = Date.now(), un = st.unlocks;
    const since = now - maintenance.RETENTION_DAYS * 86400000;
    for (let t = since; t < now; t += 86400000) { const { events } = await supabase.eventsBetween(s.id, t, Math.min(now, t + 86400000 - 1)); for (const ev of events) { const at = Date.parse(ev.timestamp) || t; un.judge(ev, at); un.observe(ev, at); } }
    // 원본이 지워진 날의 방문 수는 사이트 일별 집계(site_daily.sessions)로 보탠다(2026-11-02부터 쌓인 것만 있음)
    const sinceDay = new Date(since).toISOString().slice(0, 10); for (const r of await supabase.siteDaily(s.id, 400) || []) if (String(r.day).slice(0, 10) < sinceDay) un.state.progress.visits += (+r.sessions || 0);
    const days = new Set(un.state.progress.days); for (const r of await supabase.daily(s.id, 60) || []) if (r.views > 0 || r.sessions > 0) days.add(String(r.day).slice(0, 10));
    un.state.progress.days = [...days].sort().slice(-60); un.sess.clear(); const opened = un.check(); un.dirty = true;
    console.log(`해금 진행도 채움 ${s.id}: 나라 ${un.state.progress.countries.length} · 날짜 ${un.state.progress.days.length} · 방문 ${un.state.progress.visits} · 열린 테마 ${Object.keys(un.state.unlocked).join(',') || '없음'}`);
    if (opened.length) pushUnlocks(s.id, st, opened);
  } catch (e) { console.warn('unlocks backfill', s.id, e.message); } }
const members = new Map();  // siteId → Map(userId → { role, name, created_at })
const invites = new Map();  // token → { site_id, role, created_by, created_at, expires_at, uses }
const INVITE_TTL = 7 * 86400000, ROLES = ['viewer', 'editor'];
function memberMap(siteId) { if (!members.has(siteId)) members.set(siteId, new Map()); return members.get(siteId); }
function roleOf(site, user) { if (!user) return null; if (site.local ? user.userId === 'dev' : site.owner_id === user.userId) return 'owner'; const m = members.get(site.id)?.get(user.userId); return m ? m.role : null; }
const canEdit = role => role === 'owner' || role === 'editor';
async function loadMembers() { if (!supabase.enabled) return; const rows = await supabase.loadMembers(); if (rows) { for (const [id, s] of sites) if (!s.local) members.delete(id); for (const r of rows) memberMap(r.site_id).set(r.user_id, { role: r.role, name: r.name || '', created_at: r.created_at }); }
  const inv = await supabase.loadInvites(); if (inv) { for (const [t, v] of invites) if (!sites.get(v.site_id)?.local) invites.delete(t); for (const r of inv) invites.set(r.token, r); } }
function activeInvites(siteId) { const now = Date.now(); return [...invites.entries()].filter(([, v]) => v.site_id === siteId && Date.parse(v.expires_at) > now).map(([token, v]) => ({ token, role: v.role, created_at: v.created_at, expires_at: v.expires_at, uses: v.uses || 0 })); }
function loadLocalSites() { try { const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'sites.json'), 'utf8')); for (const s of cfg.sites) register({ ...s, local: true }); } catch (e) { console.warn('sites.json 없음'); } }
async function loadDbSites() { if (!supabase.enabled) return; try { const rows = await supabase.loadSites(); const ids = new Set(rows.map(s => s.id)); for (const s of rows) register(s); for (const [id, s] of sites) if (!s.local && !ids.has(id)) { sites.delete(id); stores.delete(id); } await loadMembers(); } catch (e) { console.error('sites 로드 실패:', e.message); } }
loadLocalSites(); loadDbSites(); setInterval(loadDbSites, 60000).unref();
// 웹훅·SSE 알림(server/alerts.js): 알림 켠 이벤트, 접속자 기준, 조용함, 이상 감지, 아침 요약
const alerts = new Alerts({ sites, stores, subscribers, sendSse, broadcast, supabase, tz: maintenance.ROLLUP_TZ, isLeader }); alerts.schedule();
maintenance.schedule(supabase, console, isLeader); // 일별 집계 + 원본 정리(EVENT_RETENTION_DAYS, 기본 7일): 2분 뒤 한 번, 그 뒤 매시간. 리더만
// 다른 인스턴스가 보낸 것: 이벤트는 이미 정규화·판정된 모양이라 바로 적용(저장·속도 제한은 받은 쪽이 했다), 설정은 메모리에 반영하고 그 인스턴스의 대시보드에도 SSE로 알린다
function onPeer(type, d) { const site = sites.get(d && d.site); const st = site && stores.get(site.id); if (!st) return;
  if (type === 'events') { for (const ev of d.events || []) { if (!ev || typeof ev !== 'object') continue;
      if (ev.event_type === 'web_vital') { const pr = ev.properties || {}; if (st.vital(String(ev.page_path || '/').split('?')[0], pr.name, +pr.value)) broadcast(site.id, 'vitals', st.vitalsView()); continue; }
      if (ev.event_type === 'greet' && !GREET_EMOJI.includes(ev.properties && ev.properties.emoji)) continue;
      const r = st.apply(ev); if (!r.ok) continue; observeUnlock(site, st, ev, !!d.bot); alerts.onEvent(site, st, ev, !!d.bot); for (const ae of r.auto || []) alerts.onEvent(site, st, ae, false); }
    pushMilestones(site, st); }
  else if (type === 'note') broadcast(site.id, 'event', d.ev);
  else if (type === 'config') { if (d.key === 'pages') { site.pages = d.value; st.setPages(d.value); broadcast(site.id, 'pages', d.value); } else if (d.key === 'event_config') { site.event_config = d.value; st.setEventConfig(d.value); broadcast(site.id, 'eventtypes', d.value); } else if (['embed_key', 'webhook', 'public', 'widget'].includes(d.key)) site[d.key] = d.value; }
  else if (type === 'unlocks') { st.unlocks = new Unlocks(d.state, { createdAt: site.created_at }); pushUnlocks(site.id, st, d.opened || []); } }
const peers = PEER_URL ? new Peers({ url: PEER_URL, channel: process.env.PEER_CHANNEL || 'visitown', id: INSTANCE, onMessage: onPeer }) : null; if (peers) peers.connect();
const share = (type, data) => { if (peers) peers.send(type, data); };
setInterval(() => { for (const st of stores.values()) st.expire(); }, 1000).unref();
// 날씨(로드맵 35): 10초마다 보는 사람이 있는 사이트만 다시 계산해 바뀌었을 때 SSE 'weather'
setInterval(() => { for (const id of new Set([...subscribers.keys(), ...embedSubs.keys()])) { if (!subCount(id)) continue; const st = stores.get(id); if (!st) continue; const w = st.weather(); if (w.kind === st.lastWeather) continue; st.lastWeather = w.kind; broadcast(id, 'weather', w); } }, 10000).unref();

// 속도 제한(docs/security.md S-04): 세션당 분당 60, 사이트당 분당 6000, IP당 분당 EVENTS_PER_IP_MIN(기본 1200. 회사망처럼 한 IP를 여럿이 쓰는 곳을 생각해 넉넉히),
// 인증 실패(토큰·임베드 키 틀림)는 IP당 분당 AUTH_FAIL_PER_IP_MIN(기본 60)을 넘으면 그 IP의 인증 요청을 1분간 429로 막는다. SSE 구독은 사이트당 MAX_SSE_PER_SITE(기본 200)
const rate = new Map(); setInterval(() => rate.clear(), 60000).unref();
function limited(key, max) { const n = (rate.get(key) || 0) + 1; rate.set(key, n); return n > max; }
const SSE_MAX_AGE = +(process.env.SSE_MAX_AGE_MS || 0);
// 연결 폭주(서버 재시작 뒤 대시보드 전부 재접속, TV 모드 여러 대)에 대비해 스냅샷 프레임은 사이트당 SNAPSHOT_CACHE_MS 동안 재사용하고 그 뒤 생긴 이벤트는 링버퍼에서 이어 붙인다. 발자국(trails)은 TRAILS_CACHE_MS 캐시. 부하 테스트(docs/load.md)에서 찾은 병목. 0이면 끔
const SNAPSHOT_CACHE = +(process.env.SNAPSHOT_CACHE_MS || 1000), TRAILS_CACHE = +(process.env.TRAILS_CACHE_MS || 60000); /* 0이면 끊지 않음. 주면 그 시간 뒤 스트림을 닫아 브라우저가 Last-Event-ID로 다시 붙게 한다(프록시 유휴 타임아웃 선제 대응·재접속 경로 검증) */
const SITE_EVENTS = +(process.env.SITE_EVENTS_PER_MIN || 6000), IP_EVENTS = +(process.env.EVENTS_PER_IP_MIN || 1200), IP_AUTH_FAIL = +(process.env.AUTH_FAIL_PER_IP_MIN || 60), MAX_SSE = +(process.env.MAX_SSE_PER_SITE || 200);
function authBlocked(req, res) { if ((rate.get(`auth:${geo.clientIp(req)}`) || 0) < IP_AUTH_FAIL) return false; json(res, 429, { error: '인증 실패가 너무 많아요. 1분 뒤 다시 시도해 주세요' }, { 'Retry-After': '60' }); return true; }
function authFailed(req) { limited(`auth:${geo.clientIp(req)}`, IP_AUTH_FAIL); }

function json(res, code, body, extra = {}) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...extra }); res.end(JSON.stringify(body)); }
function cors(res, origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); }
function readBody(req, limit = 65536) { return new Promise((resolve, reject) => { let size = 0; const chunks = []; req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); }); req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); req.on('error', reject); }); }
const safeEq = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
// 일회용 스트림 티켓(S-29, 로드맵 55): EventSource는 헤더를 못 붙여 대시보드가 토큰을 URL에 실었는데, 그러면 서버·프록시 로그, 브라우저 기록, Referer에 장기 토큰이 남는다.
// 그래서 Authorization 헤더로 30초짜리 티켓을 받아 그것만 URL에 둔다. 모양은 base64url(JSON{s:사이트,u:사용자,r:역할,e:만료,n:nonce}) + '.' + HMAC-SHA256.
// 서명 검증이라 인스턴스끼리 나눌 상태가 없고(PEERS는 STREAM_TICKET_SECRET을 같이 둔다), 한 번 쓴 nonce는 이 인스턴스가 만료까지 기억해 재사용을 막는다
const TICKET_TTL = +(process.env.STREAM_TICKET_TTL_MS || 30000); const TICKET_SECRET = process.env.STREAM_TICKET_SECRET || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'); const usedTickets = new Map(); // nonce → 만료
function makeTicket(siteId, user, role) { const body = Buffer.from(JSON.stringify({ s: siteId, u: user.userId, r: role, e: Date.now() + TICKET_TTL, n: crypto.randomBytes(8).toString('hex') })).toString('base64url'); return body + '.' + crypto.createHmac('sha256', TICKET_SECRET).update(body).digest('base64url'); }
function readTicket(ticket, siteId) { if (typeof ticket !== 'string' || ticket.length > 400) return null; const i = ticket.indexOf('.'); if (i < 0) return null; const body = ticket.slice(0, i);
  if (!safeEq(ticket.slice(i + 1), crypto.createHmac('sha256', TICKET_SECRET).update(body).digest('base64url'))) return null;
  let t; try { t = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; } const now = Date.now();
  if (!t || t.s !== siteId || !(t.e > now) || typeof t.n !== 'string' || usedTickets.has(t.n)) return null;
  usedTickets.set(t.n, t.e); if (usedTickets.size > 5000) for (const [n, e] of usedTickets) if (e <= now) usedTickets.delete(n); return t; }
function originAllowed(site, origin) { if (!origin) return site.allowed_origins.includes('null'); return site.allowed_origins.includes(origin); }

setInterval(() => { for (const m of [subscribers, embedSubs]) for (const subs of m.values()) for (const res of subs) res.write(': ping\n\n'); }, 25000).unref();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`); const p = url.pathname; const origin = req.headers.origin;
  try {
    if (p === '/healthz') { let subs = 0; for (const m of [subscribers, embedSubs]) for (const s of m.values()) subs += s.size; return json(res, 200, { ok: true, sites: sites.size, uptime: process.uptime(), subscribers: subs, rss: process.memoryUsage().rss, instance: INSTANCE, leader, peers: peers ? { joined: peers.open, sent: peers.sent, received: peers.received } : null }); } // rss·subscribers는 부하 테스트(로드맵 43)가 읽는다
    // wt.js는 예전 이름. 이미 설치된 사이트가 쓰므로 유지
    if (p === '/visitown.js' || p === '/wt.js') { res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' }); return res.end(fs.readFileSync(SDK_PATH)); }

    // ---- 이벤트 수집 (고객 사이트에서 옴)
    if (p === '/api/events') {
      if (req.method === 'OPTIONS') { cors(res, origin || '*'); res.writeHead(204); return res.end(); }
      if (req.method !== 'POST') return json(res, 405, { error: 'method' });
      let body; try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'bad json' }); }
      const events = Array.isArray(body) ? body : Array.isArray(body.events) ? body.events : [body];
      if (!events.length || events.length > 20) return json(res, 400, { error: 'batch size 1~20' });
      const siteId = body.site_id || events[0].site_id; const site = sites.get(siteId);
      if (!site) return json(res, 403, { error: 'unknown site' });
      if (!originAllowed(site, origin)) return json(res, 403, { error: 'origin not allowed' });
      cors(res, origin || '*');
      if (limited(`site:${siteId}`, SITE_EVENTS)) return json(res, 429, { error: 'site rate limit' });
      if (limited(`ip:${geo.clientIp(req)}`, IP_EVENTS)) return json(res, 429, { error: 'ip rate limit' }, { 'Retry-After': '60' });
      const st = stores.get(siteId); const bot = detectBot(req.headers['user-agent']); let accepted = 0, rejected = 0, duplicates = 0; const shared = []; // 다른 인스턴스에 보낼 것(정규화·판정 뒤)
      const country = await geo.countryOf(req, events); // 나라 코드만 쓰고 IP는 남기지 않는다 (server/geo.js)
      for (const raw of events) {
        // 웹 바이탈(로드맵 28): 세션을 만들지도, 저장하지도 않는다. 건물별 p75만 모으고 느림 판정이 바뀌면 SSE 'vitals'
        if (raw && raw.event_type === 'web_vital') { const pr = raw.properties || {}; const v = +pr.value; if (bot || typeof raw.page_path !== 'string' || !VITALS.names.includes(pr.name) || !Number.isFinite(v) || v < 0 || v > 120000) { rejected++; continue; }
          accepted++; shared.push(raw); if (st.vital(raw.page_path.split('?')[0].split('#')[0], pr.name, v)) { broadcast(siteId, 'vitals', st.vitalsView()); } continue; }
        const ev = st.normalize(raw, { bot, country }); if (!ev) { rejected++; continue; }
        if (limited(`sess:${ev.session_id}`, 60)) { rejected++; continue; }
        // 방문자 인사(로드맵 37): 정해진 이모지만, 세션당 분당 12번. 기록에는 남기지 않는다(화면에만)
        const greet = ev.event_type === 'greet'; if (greet && (bot || !GREET_EMOJI.includes(ev.properties.emoji) || limited(`greet:${ev.session_id}`, 12))) { rejected++; continue; }
        if (!st.seen.has(ev.event_id)) st.unlocks.judge(ev); // 희귀 방문자·누적 방문 번호를 session_start props에 얹는다(중복 이벤트는 건너뜀)
        const r = st.apply(ev); if (!r.ok) { duplicates++; continue; } accepted++; shared.push(ev); if (r.persist && !site.local && !greet) persister.push(ev, !!bot); observeUnlock(site, st, ev, !!bot); alerts.onEvent(site, st, ev, !!bot);
        for (const ae of r.auto || []) { if (!site.local) persister.push(ae, false); alerts.onEvent(site, st, ae, false); } // URL 패턴으로 만든 자동 이벤트(로드맵 13)도 저장·알림
      }
      pushMilestones(site, st); if (shared.length) share('events', { site: siteId, bot: bot || null, events: shared });
      return json(res, 200, { accepted, rejected, duplicates });
    }

    // ---- 공개 마을 목록(로드맵 23): 주인이 '공개'를 켠 사이트만. 임베드 키가 있어야 구경 링크를 만들 수 있다. 누구나 읽는다
    if (p === '/api/public/sites') { cors(res, origin || '*'); const list = [...sites.values()].filter(s => s.public && s.embed_key).map(s => ({ id: s.id, name: s.name, domain: s.domain, embed: s.embed_key, online: stores.get(s.id).counts().online, lastEventAt: stores.get(s.id).lastEventAt })).sort((a, b) => b.online - a.online);
      return json(res, 200, { sites: list }, { 'Cache-Control': 'no-store' }); }
    // ---- 계정 삭제: 로그인한 본인만. 소유 사이트(방문자 데이터까지 연쇄 삭제) → 멤버 자격 → 로그인 계정 순으로 지운다. 로컬 개발 서버(dev)는 메모리만 비운다
    if (p === '/api/account') {
      cors(res, dashOrigin(origin));
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      if (req.method !== 'DELETE') return json(res, 405, { error: 'method' });
      if (authBlocked(req, res)) return; const user = await authenticate(req); if (!user) { authFailed(req); return json(res, 401, { error: 'unauthorized' }); }
      const owned = [...sites.values()].filter(s => !s.local && s.owner_id === user.userId);
      try {
        for (const s of owned) { if (supabase.enabled && !user.dev) await supabase.deleteSite(s.id); for (const m of [subscribers, embedSubs]) { for (const sub of m.get(s.id) || []) { try { sub.end(); } catch {} } m.delete(s.id); } rings.delete(s.id); embedRings.delete(s.id); pending.delete(s.id); pendingEmbed.delete(s.id); sites.delete(s.id); stores.delete(s.id); members.delete(s.id); for (const [t, v] of invites) if (v.site_id === s.id) invites.delete(t); }
        if (supabase.enabled && !user.dev) await supabase.removeUserMemberships(user.userId); for (const m of members.values()) m.delete(user.userId);
        if (supabase.enabled && !user.dev) await supabase.deleteUser(user.userId);
      } catch (e) { console.error('account delete', user.userId, e.message); return json(res, 500, { error: '계정을 지우지 못했어요: ' + e.message }); }
      console.log(`계정 삭제 ${user.userId} (${user.email || ''}) · 사이트 ${owned.length}개`); return json(res, 200, { ok: true, sites: owned.length });
    }
    // ---- 대시보드 공개 설정 (anon 키는 공개값)
    if (p === '/api/config') { cors(res, origin || '*'); return json(res, 200, { supabaseUrl: supabase.enabled ? supabase.url : null, supabaseAnonKey: supabase.enabled ? supabase.anon() : null, devAuth: !supabase.enabled }); }

    // ---- 내 사이트 목록 / 등록
    if (p === '/api/sites') {
      cors(res, dashOrigin(origin));
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      if (authBlocked(req, res)) return; const user = await authenticate(req); if (!user) { authFailed(req); console.warn(new Date().toISOString(), 'auth failed on', p, 'token?', !!(req.headers.authorization || url.searchParams.get('token'))); return json(res, 401, { error: 'unauthorized' }); }
      const mine = [...sites.values()].map(s => [s, roleOf(s, user)]).filter(([, r]) => r).map(([s, role]) => ({ id: s.id, name: s.name, domain: s.domain, local: !!s.local, role, widget: !!s.widget, public: !!s.public, lastEventAt: stores.get(s.id).lastEventAt, online: stores.get(s.id).counts().online }));
      if (req.method === 'GET') return json(res, 200, { user: { id: user.userId, email: user.email, name: user.name || '' }, sites: mine });
      if (req.method === 'POST') {
        if (!supabase.enabled || user.dev) return json(res, 400, { error: 'Supabase 설정이 없어 사이트를 등록할 수 없어요' });
        let body; try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'bad json' }); }
        const name = String(body.name || '').trim().slice(0, 60), domain = String(body.domain || '').trim().slice(0, 120);
        if (!name || !/^[a-z0-9.-]+(:\d+)?$/i.test(domain.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))) return json(res, 400, { error: '이름과 도메인(예: my-shop.com)을 확인해 주세요' });
        if (mine.filter(s => s.role === 'owner' && !s.local).length >= 5) return json(res, 400, { error: '사이트는 5개까지 등록할 수 있어요' });
        try { const s = await supabase.createSite({ ownerId: user.userId, name, domain }); register(s); return json(res, 201, { site: { id: s.id, name: s.name, domain: s.domain, allowed_origins: s.allowed_origins } }); }
        catch (e) { console.error(e); return json(res, 500, { error: '등록에 실패했어요: ' + e.message }); }
      }
      return json(res, 405, { error: 'method' });
    }

    // ---- 초대 링크: 확인(GET)과 참여(POST …/accept). 로그인한 누구나. 만료 7일, 주인이 끊으면 바로 무효
    const im = p.match(/^\/api\/invites\/([A-Za-z0-9_-]{8,64})(\/accept)?$/);
    if (im) {
      cors(res, dashOrigin(origin));
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      if (authBlocked(req, res)) return; const user = await authenticate(req); if (!user) { authFailed(req); return json(res, 401, { error: 'unauthorized' }); }
      if (limited(`inv:${user.userId}`, 30)) return json(res, 429, { error: 'too many' });
      const inv = invites.get(im[1]); const site = inv && sites.get(inv.site_id);
      if (!inv || !site || Date.parse(inv.expires_at) <= Date.now()) return json(res, 404, { error: '초대 링크가 없거나 만료됐어요. 사이트 주인에게 새 링크를 받아 주세요.' });
      const cur = roleOf(site, user);
      if (!im[2]) { if (req.method !== 'GET') return json(res, 405, { error: 'method' }); return json(res, 200, { site: { id: site.id, name: site.name, domain: site.domain }, role: inv.role, expires_at: inv.expires_at, current: cur }); }
      if (req.method !== 'POST') return json(res, 405, { error: 'method' });
      if (cur === 'owner') return json(res, 200, { site_id: site.id, role: 'owner', already: true });
      if (cur === 'editor' && inv.role === 'viewer') return json(res, 200, { site_id: site.id, role: 'editor', already: true }); // 이미 더 높은 역할이면 내리지 않는다
      if (cur === inv.role) return json(res, 200, { site_id: site.id, role: cur, already: true });
      const row = { role: inv.role, name: user.name || user.email || '', created_at: new Date().toISOString() };
      if (!site.local) { try { await supabase.addMember(site.id, user.userId, row.role, row.name); } catch (e) { console.error(e); return json(res, 500, { error: e.message }); } }
      memberMap(site.id).set(user.userId, row); inv.uses = (inv.uses || 0) + 1; if (!site.local) supabase.bumpInvite(im[1], inv.uses);
      return json(res, 200, { site_id: site.id, role: inv.role });
    }

    // ---- 대시보드 API (주인·멤버 인증)
    const m = p.match(/^\/api\/sites\/([^/]+)\/(state|stream|stream-ticket|pages|events|eventtypes|embed|daily|members|invites|unlocks|badge|notes|webhook|widget|trails|public)$/);
    if (m) {
      cors(res, dashOrigin(origin));
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      const site = sites.get(m[1]); if (!site) return json(res, 404, { error: 'unknown site' });
      // 임베드(공개 iframe·OBS·배지)는 스트림·배지만, 사이트별 임베드 키로. 그 밖에는 소유자 인증
      const embedKey = url.searchParams.get('embed');
      let role = 'embed', user = null;
      // 미니 위젯 정보(공개, SDK가 사이트 방문자 브라우저에서 읽는다): 주인이 위젯을 켠 사이트만 임베드 키와 대시보드 주소를 준다
      if (m[2] === 'widget' && req.method === 'GET') { cors(res, origin || '*'); if (!site.widget || !site.embed_key) return json(res, 404, { error: 'widget off' }); return json(res, 200, { embed: site.embed_key, dashboard: DASHBOARD_URL, name: site.name, online: stores.get(site.id).counts().online }, { 'Cache-Control': 'no-store' }); }
      if (authBlocked(req, res)) return;
      if ((m[2] === 'stream' || m[2] === 'badge') && embedKey) { if (!site.embed_key || !safeEq(embedKey, site.embed_key)) { authFailed(req); return json(res, 401, { error: 'bad embed key' }); } }
      // 스트림은 임베드 키 아니면 일회용 티켓(S-29)으로만. URL의 ?token=은 받지 않는다(헤더 Bearer는 curl·테스트용으로 그대로)
      else if (m[2] === 'stream' && url.searchParams.get('ticket')) { const t = readTicket(url.searchParams.get('ticket'), site.id); if (!t) { authFailed(req); return json(res, 401, { error: 'bad ticket' }); } user = { userId: t.u }; role = t.r; }
      else if (m[2] === 'stream' && url.searchParams.get('token')) return json(res, 401, { error: 'stream needs a ticket: POST /api/sites/:id/stream-ticket' });
      else { user = await authenticate(req); if (!user) { authFailed(req); return json(res, 401, { error: 'unauthorized' }); } role = roleOf(site, user); if (!role) return json(res, 403, { error: 'forbidden' }); }
      const st = stores.get(site.id);
      // 스트림 티켓 발급(S-29): 로그인한 멤버가 Authorization 헤더로 받는다. 비용이 HMAC 하나라 따로 제한하지 않는다(연결 수는 S-05가 막는다)
      if (m[2] === 'stream-ticket') { if (req.method !== 'POST') return json(res, 405, { error: 'method' }); return json(res, 200, { ticket: makeTicket(site.id, user, role), expiresIn: Math.round(TICKET_TTL / 1000) }, { 'Cache-Control': 'no-store' }); }
      // 배지: README·블로그에 붙이는 "지금 N명 보는 중" SVG(server/badge.js). ?format=json 은 랜딩·위젯이 숫자만 읽을 때. 누구나 볼 수 있으니 짧게 캐시
      if (m[2] === 'badge') { const online = st.counts().online;
        if (url.searchParams.get('format') === 'json') return json(res, 200, { online, name: site.name }, { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
        res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=30, s-maxage=30', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" }); return res.end(badgeSvg(online, url.searchParams.get('label'), url.searchParams.get('lang'))); } // SVG를 직접 열어도 스크립트가 돌지 않게(S-08)
      // 멤버 목록(멤버 누구나) / 내보내기·나가기(주인은 누구든, 멤버는 자기만)
      if (m[2] === 'members') {
        if (req.method === 'GET') { const list = [...memberMap(site.id)].map(([user_id, v]) => ({ user_id, role: v.role, name: v.name, created_at: v.created_at }));
          const ownerName = site.local ? 'dev' : (supabase.enabled ? await supabase.userName(site.owner_id) : ''); return json(res, 200, { owner: { id: site.local ? 'dev' : site.owner_id, name: ownerName }, members: list, me: { id: user.userId, role }, invites: role === 'owner' ? activeInvites(site.id) : undefined }); }
        if (req.method !== 'DELETE') return json(res, 405, { error: 'method' });
        const target = url.searchParams.get('user') || ''; if (!memberMap(site.id).has(target)) return json(res, 404, { error: '그런 멤버가 없어요' });
        if (role !== 'owner' && target !== user.userId) return json(res, 403, { error: '주인만 다른 멤버를 내보낼 수 있어요' });
        if (!site.local) { try { await supabase.removeMember(site.id, target); } catch (e) { console.error(e); return json(res, 500, { error: e.message }); } }
        memberMap(site.id).delete(target); return json(res, 200, { ok: true });
      }
      // 초대 링크 만들기·끊기 (주인만). 같은 역할의 링크는 하나만 두고, 새로 만들면 예전 것은 끊긴다
      if (m[2] === 'invites') {
        if (role !== 'owner') return json(res, 403, { error: '주인만 초대할 수 있어요' });
        if (req.method === 'GET') return json(res, 200, { invites: activeInvites(site.id) });
        if (req.method === 'DELETE') { const t = url.searchParams.get('token') || ''; const inv = invites.get(t); if (!inv || inv.site_id !== site.id) return json(res, 404, { error: '그런 링크가 없어요' });
          if (!site.local) { try { await supabase.deleteInvite(t); } catch (e) { console.error(e); return json(res, 500, { error: e.message }); } } invites.delete(t); return json(res, 200, { ok: true }); }
        if (req.method !== 'POST') return json(res, 405, { error: 'method' });
        let body = {}; try { body = JSON.parse((await readBody(req)) || '{}'); } catch { return json(res, 400, { error: 'bad json' }); }
        const r = ROLES.includes(body.role) ? body.role : 'viewer';
        for (const [t, v] of invites) if (v.site_id === site.id && v.role === r) { if (!site.local) { try { await supabase.deleteInvite(t); } catch (e) { console.error(e); return json(res, 500, { error: e.message }); } } invites.delete(t); }
        const token = 'inv_' + crypto.randomBytes(12).toString('hex'); const row = { token, site_id: site.id, role: r, created_by: user.userId, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + INVITE_TTL).toISOString(), uses: 0 };
        if (!site.local) { try { await supabase.createInvite(row); } catch (e) { console.error(e); return json(res, 500, { error: e.message }); } }
        invites.set(token, row); return json(res, 200, { invite: { token, role: r, created_at: row.created_at, expires_at: row.expires_at, uses: 0 } });
      }
      // 그 밖의 쓰기(건물·이벤트 설정 저장, 임베드 키)는 주인·editor만. 임베드 키는 보기만 해도 공개 링크가 되니 조회도 막는다
      if (role === 'viewer' && (req.method !== 'GET' || m[2] === 'embed' || m[2] === 'webhook')) return json(res, 403, { error: '보기 권한만 있어요. 설정은 사이트 주인이나 편집 멤버가 바꿀 수 있어요.' });
      // 공개 마을 목록에 올리기(주인만: 접속자 수 같은 트래픽 규모가 드러난다). GET은 멤버 누구나
      if (m[2] === 'public') {
        if (req.method === 'GET') return json(res, 200, { on: !!site.public });
        if (req.method !== 'PUT') return json(res, 405, { error: 'method' }); if (role !== 'owner') return json(res, 403, { error: '공개 여부는 사이트 주인만 바꿀 수 있어요' });
        let body; try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'bad json' }); }
        const on = !!body.on; if (on && !site.embed_key) return json(res, 400, { error: '먼저 임베드 링크를 만들어 주세요. 구경 링크는 그 키로 열려요' });
        if (!site.local) { try { await supabase.setPublic(site.id, on); } catch (e) { console.error(e); return json(res, 500, { error: e.message }); } }
        site.public = on; share('config', { site: site.id, key: 'public', value: on }); return json(res, 200, { on });
      }
      // 미니 위젯 켬/끔(주인·editor). 켜면 SDK data-widget이 붙은 페이지 구석에 마을 버튼이 뜬다. 임베드 키가 있어야 한다
      if (m[2] === 'widget') {
        if (req.method !== 'PUT') return json(res, 405, { error: 'method' });
        let body; try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'bad json' }); }
        const on = !!body.on; if (on && !site.embed_key) return json(res, 400, { error: '먼저 임베드 링크를 만들어 주세요. 위젯은 그 키로 마을을 보여 줘요' });
        if (!site.local) { try { await supabase.setWidget(site.id, on); } catch (e) { console.error(e); return json(res, 500, { error: e.message }); } }
        site.widget = on; share('config', { site: site.id, key: 'widget', value: on }); return json(res, 200, { on });
      }
      // 웹훅(주인·editor): 슬랙·디스코드 주소와 종류. GET 조회, PUT 저장(url 비우면 끔), POST 시험 메시지
      if (m[2] === 'webhook') {
        if (req.method === 'GET') return json(res, 200, { webhook: site.webhook || null });
        if (req.method === 'POST') { if (!site.webhook || !site.webhook.url) return json(res, 400, { error: '먼저 웹훅 주소를 저장해 주세요' }); const err = await alerts.post(site.webhook.url, `🔔 Visitown 웹훅 테스트 · ${site.domain || site.name} · 잘 받았으면 설정 끝이에요`); return err ? json(res, 502, { error: '보내지 못했어요: ' + err }) : json(res, 200, { ok: true }); }
        if (req.method !== 'PUT') return json(res, 405, { error: 'method' });
        let body; try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'bad json' }); }
        const { cfg, error } = normalizeWebhook(body.webhook); if (error) return json(res, 400, { error });
        if (!site.local) { try { await supabase.setWebhook(site.id, cfg); } catch (e) { console.error(e); return json(res, 500, { error: e.message }); } }
        site.webhook = cfg; share('config', { site: site.id, key: 'webhook', value: cfg }); return json(res, 200, { webhook: cfg });
      }
      // 임베드 키 조회·발급(회전). 로컬 사이트는 메모리에만 둔다(sites.json에 embed_key를 적으면 고정)
      if (m[2] === 'embed') {
        if (req.method === 'GET') return json(res, 200, { key: site.embed_key || null });
        if (req.method !== 'POST') return json(res, 405, { error: 'method' });
        const key = 'emb_' + crypto.randomBytes(12).toString('hex');
        if (!site.local) { try { await supabase.setEmbedKey(site.id, key); } catch (e) { console.error(e); return json(res, 500, { error: e.message }); } }
        site.embed_key = key; share('config', { site: site.id, key: 'embed_key', value: key }); return json(res, 200, { key });
      }
      // 리플레이 메모(주인·editor): 지난 24시간 안의 시각(at, 없으면 지금)에 글 한 줄. DB에는 note 이벤트로 남고(집계·발자국·해금에서는 제외), 열린 대시보드에는 SSE로 바로 간다
      if (m[2] === 'notes') {
        if (req.method !== 'POST') return json(res, 405, { error: 'method' });
        let body; try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'bad json' }); }
        const text = String(body.text || '').trim().slice(0, 80); if (!text) return json(res, 400, { error: '메모 내용을 적어 주세요' });
        const now = Date.now(); let at = Date.parse(body.at); if (!Number.isFinite(at) || at > now + 60000 || at < now - 86400000) at = now;
        const ev = st.note(text, user.name || user.email || '', at); if (!site.local) persister.push(ev, false);
        broadcast(site.id, 'event', ev); share('note', { site: site.id, ev });
        return json(res, 200, { note: ev });
      }
      if (m[2] === 'pages') {
        if (req.method === 'GET') return json(res, 200, { site: { id: site.id, name: site.name, domain: site.domain, allowed_origins: site.allowed_origins, local: !!site.local }, pages: st.pages, seen: st.seenPaths().slice(0, 200) });
        if (req.method !== 'PUT') return json(res, 405, { error: 'method' });
        let body; try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'bad json' }); }
        const pages = Array.isArray(body.pages) ? body.pages : null; if (!pages || !pages.length || pages.length > MAX_BUILDINGS) return json(res, 400, { error: `건물은 1~${MAX_BUILDINGS}개여야 해요` });
        const clean = []; const keys = new Set(), slots = new Set();
        for (const p of pages) { if (!p || typeof p.path !== 'string' || !/^\/[a-z0-9_-]{0,30}$/i.test(p.path) || keys.has(p.path)) return json(res, 400, { error: '건물 키가 잘못됐거나 겹쳐요' }); keys.add(p.path);
          const name = String(p.name || '').trim().slice(0, 30), pattern = String(p.pattern || '').trim().slice(0, 300);
          if (pattern) { try { new RegExp(pattern); } catch { return json(res, 400, { error: `패턴이 올바른 정규식이 아니에요: ${pattern}` }); } if (unsafeRegex(pattern)) return json(res, 400, { error: `패턴에 중첩 반복((a+)+ 꼴)이 있어 쓸 수 없어요: ${pattern}` }); }
          const kind = KINDS.includes(p.kind) ? p.kind : undefined, slot = Number.isInteger(p.slot) ? p.slot : undefined;
          if (slot !== undefined) { if (slot < 0 || slot >= MAX_BUILDINGS || slots.has(slot)) return json(res, 400, { error: '자리 번호가 잘못됐거나 겹쳐요' }); slots.add(slot); }
          if ((slot === 0) !== (kind === 'plaza') && slot !== undefined && kind !== undefined) return json(res, 400, { error: '자리 0은 광장이어야 하고, 광장은 자리 0에만 둘 수 있어요' });
          clean.push({ path: p.path, name, pattern, kind, slot }); }
        const norm = normalizePages(clean); let warning = null;
        if (!site.local) { try { warning = await supabase.savePages(site.id, norm); } catch (e) { console.error(e); return json(res, 500, { error: '저장에 실패했어요: ' + e.message }); } }
        site.pages = norm; st.setPages(norm);
        broadcast(site.id, 'pages', norm); share('config', { site: site.id, key: 'pages', value: norm });
        return json(res, 200, { pages: norm, ...(warning ? { warning } : {}) });
      }
      // 이벤트 표현 설정(이름표·이펙트·소리·알림·매출 집계·피드) + 실제로 받은 이벤트 이름
      if (m[2] === 'eventtypes') {
        if (req.method === 'GET') return json(res, 200, { config: st.eventConfig, seen: st.seenTypes(), dropped: [...st.dropped], limit: MAX_TYPES });
        if (req.method !== 'PUT') return json(res, 405, { error: 'method' });
        let body; try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'bad json' }); }
        if (!Array.isArray(body.config) || body.config.length > MAX_TYPES) return json(res, 400, { error: `이벤트 설정은 ${MAX_TYPES}개까지예요` });
        const clean = normalizeEventConfig(body.config);
        if (!site.local) { try { await supabase.setEventConfig(site.id, clean); } catch (e) { console.error(e); return json(res, 500, { error: e.message }); } }
        site.event_config = clean; st.setEventConfig(clean);
        broadcast(site.id, 'eventtypes', clean); share('config', { site: site.id, key: 'event_config', value: clean });
        return json(res, 200, { config: clean });
      }
      // 테마 해금: 조회(누구나) / 선물로 하나 열기(POST { theme }, 주인·editor)
      if (m[2] === 'unlocks') {
        if (req.method === 'GET') return json(res, 200, st.unlocks.view());
        if (req.method !== 'POST') return json(res, 405, { error: 'method' });
        let body; try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'bad json' }); }
        const r = st.unlocks.useGift(String(body.theme || '')); if (r.error) return json(res, 400, { error: r.error });
        if (!site.local) saveUnlocks(); pushUnlocks(site.id, st, [body.theme]); share('unlocks', { site: site.id, state: st.unlocks.toJSON(), opened: [body.theme] }); return json(res, 200, st.unlocks.view());
      }
      // 리플레이용 이벤트 구간 (기본 최근 1시간, 최대 24시간). DB가 있으면 events 테이블, 없으면 메모리 로그
      // 통계 추이용 일별 집계 (page_daily, 기본 30일·최대 365일). DB 없는 로컬 사이트는 빈 목록
      if (m[2] === 'daily') { const days = Math.min(365, Math.max(1, +url.searchParams.get('days') || 30));
        let rows = [], siteRows = []; if (!site.local && supabase.enabled) { try { [rows, siteRows] = await Promise.all([supabase.daily(site.id, days), supabase.siteDaily(site.id, days)]); } catch (e) { console.error(e); return json(res, 500, { error: '집계를 읽지 못했어요: ' + e.message }); } }
        return json(res, 200, { days, retentionDays: maintenance.RETENTION_DAYS, rows, site: siteRows }); }
      if (m[2] === 'events') {
        const to = Date.parse(url.searchParams.get('to')) || Date.now(); const from = Date.parse(url.searchParams.get('from')) || to - 3600000;
        if (!(from < to) || to - from > 24 * 3600000 + 60000) return json(res, 400, { error: '구간은 최대 24시간이에요' });
        let r; try { r = (!site.local && supabase.enabled) ? await supabase.eventsBetween(site.id, from, to) : { events: st.eventsBetween(from, to), truncated: false }; } catch (e) { console.error(e); return json(res, 500, { error: '기록을 읽지 못했어요: ' + e.message }); }
        return json(res, 200, { from, to, ...r });
      }
      if (m[2] === 'state') return json(res, 200, { ...st.snapshot(), counts: st.counts(), totals: { events: st.totalEvents, duplicates: st.duplicates, stale: st.stale, late: st.late || 0, sse: st.sse || { snapshots: 0, resumed: 0, recovered: 0 }, peer: peers ? { instance: INSTANCE, leader, sent: peers.sent, received: peers.received } : null }, lastEventAt: st.lastEventAt, weather: st.weather(), vitals: st.vitalsView() });
      // 발자국 재료(건물 간 이동 가중치)를 지금 시각 기준으로 다시 계산해 준다. 퍼널 탭(로드맵 30)이 연 시점에 읽는다
      if (m[2] === 'trails') { const now = Date.now(), from = now - TRAIL_WINDOW; let evs; try { evs = (!site.local && supabase.enabled) ? (await supabase.eventsBetween(site.id, from, now)).events : st.eventsBetween(from, now); } catch (e) { return json(res, 500, { error: '기록을 읽지 못했어요: ' + e.message }); }
        return json(res, 200, { at: now, halfLife: 1800, moves: st.trails(evs, now) }); }
      // SSE. 사이트당 구독 상한(S-05)을 넘으면 503
      if (subCount(site.id) >= MAX_SSE) return json(res, 503, { error: '이 마을을 보는 연결이 너무 많아요. 잠시 뒤 다시 열어 주세요' }, { 'Retry-After': '30' });
      // 재접속 무손실(로드맵 44, server/sse.js): Last-Event-ID 뒤가 전부 링버퍼에 있으면 'resume' + 빈 구간만 보내고, 아니면 스냅샷 전체. 구독자 등록까지 동기라 그 사이에 새는 이벤트는 없다
      // 보안 S-34: 임베드 키 연결은 임베드용 구독자 집합·링버퍼·스냅샷(embedView로 거른 것)을 쓴다
      const embed = role === 'embed', subs = embed ? embedSubs : subscribers;
      flush(site.id); const r = ring(site.id, embed), sse = st.sse || (st.sse = { snapshots: 0, resumed: 0, recovered: 0 }); const missed = r.after(req.headers['last-event-id'] || url.searchParams.get('lastEventId'));
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 3000\n\n');
      if (!subs.has(site.id)) subs.set(site.id, new Set()); subs.get(site.id).add(res);
      req.on('close', () => { subs.get(site.id)?.delete(res); }); if (SSE_MAX_AGE) setTimeout(() => { if (!res.writableEnded) res.end(); }, SSE_MAX_AGE).unref();
      const weather = st.weather(); st.lastWeather = weather.kind;
      if (missed) { sse.resumed++; sse.recovered += missed.length; sendSse(res, 'resume', { count: missed.length, to: r.id() }); for (const e of missed) res.write(r.line(e)); sendSse(res, 'weather', weather); return; } // 날씨는 보는 사람이 없는 동안 계산하지 않아 버퍼에 없을 수 있다
      sse.snapshots++; // 스냅샷에도 id를 줘서 직후에 끊겨도 이어받는다. 캐시된 스냅샷이면 그 id 뒤의 이벤트를 링버퍼에서 이어 붙여 상태가 같아지게 한다
      const now = Date.now(); const cacheKey = embed ? 'embedSnapCache' : 'snapCache'; let snap = st[cacheKey]; if (!snap || now - snap.at >= SNAPSHOT_CACHE || !r.after(snap.id)) { const id = r.id(); const full = { ...st.snapshot(), pages: st.pages, eventTypes: st.eventConfig, unlocks: st.unlocks.view(), lastEventAt: st.lastEventAt, weather, vitals: st.vitalsView() }; snap = { at: now, id, frame: frame('snapshot', embed ? embedView('snapshot', full) : full, id) }; st[cacheKey] = snap; }  // 대시보드가 같은 경로 매핑으로 건물을 정하고 이름표를 붙인다
      res.write(snap.frame); for (const e of r.after(snap.id) || []) res.write(r.line(e));
      // 발자국은 스냅샷 뒤에 따로 보낸다(DB 조회가 느려도 마을은 바로 뜬다). 최근 2시간, 반감기 30분. 계산 결과는 사이트당 캐시
      let tc = st.trailsCache; if (!tc || now - tc.at >= TRAILS_CACHE) { const from = now - TRAIL_WINDOW; tc = st.trailsCache = { at: now, promise: ((!site.local && supabase.enabled) ? supabase.eventsBetween(site.id, from, now).then(r => r.events) : Promise.resolve(st.eventsBetween(from, now))).then(evs => ({ at: now, halfLife: 1800, moves: st.trails(evs, now) })) }; }
      tc.promise.then(t => { if (!res.writableEnded) sendSse(res, 'trails', t); }).catch(e => console.warn('trails', site.id, e.message));
      return;
    }
    json(res, 404, { error: 'not found' });
  } catch (e) { console.error(e); if (!res.headersSent) json(res, 500, { error: 'server' }); }
});
server.listen(PORT, () => console.log(`visitown server on http://localhost:${PORT} (${supabase.enabled ? 'supabase on' : 'no db'}, auth ${supabase.enabled ? 'supabase jwt' : 'dev token'})`));
