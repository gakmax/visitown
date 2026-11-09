#!/usr/bin/env node
'use strict';
// Visitown 읽기 전용 MCP 서버(stdio, 의존성 없음). Claude Code·Cursor 같은 MCP 클라이언트가 "지금 접속자 몇 명?"에 답하게 한다.
// 설정(환경 변수): VISITOWN_API 수집 서버 주소(기본 http://localhost:8787) · VISITOWN_SITE 사이트 id(기본 site_demo) · VISITOWN_TOKEN 대시보드 토큰(로컬 dev, 배포는 로그인 토큰) · ROLLUP_TZ 하루 경계(기본 Asia/Seoul)
// 프로토콜: JSON-RPC 2.0을 한 줄에 한 메시지로. initialize → notifications/initialized → tools/list → tools/call. 쓰기 도구는 없다(설정 변경은 대시보드에서)
const readline = require('node:readline');
const API = (process.env.VISITOWN_API || 'http://localhost:8787').replace(/\/$/, '');
const SITE = process.env.VISITOWN_SITE || 'site_demo'; const TOKEN = process.env.VISITOWN_TOKEN || 'dev';
const TZ = process.env.ROLLUP_TZ || 'Asia/Seoul';
const VERSION = require('./package.json').version;
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SYSTEM = new Set(['session_start', 'page_view', 'heartbeat', 'page_leave', 'note', 'web_vital', 'greet']);

async function get(path, params = {}) {
  const u = new URL(`${API}/api/sites/${encodeURIComponent(SITE)}/${path}`); for (const [k, v] of Object.entries(params)) if (v !== undefined) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { Authorization: 'Bearer ' + TOKEN } });
  if (!r.ok) { let msg = r.statusText; try { msg = (await r.json()).error || msg; } catch {} throw new Error(`${path} ${r.status}: ${msg}`); } return r.json();
}
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function localParts(t) { const o = {}; for (const p of fmt.formatToParts(new Date(t))) o[p.type] = p.value; return o; }
function dayStart(now = Date.now()) { const o = localParts(now); return now - ((+o.hour * 60 + +o.minute) * 60 + +o.second) * 1000 - (now % 1000); } // TZ 기준 오늘 0시(DST 없는 시간대 기준)
// 설정의 건물 목록으로 원래 경로를 건물 키로 바꾼다(server/store.js resolvePath와 같은 규칙)
function resolver(pages) { const rules = (pages || []).map(p => ({ path: p.path, name: p.name || p.path, re: p.pattern ? new RegExp(p.pattern) : null })); return p => { for (const r of rules) if (r.re ? r.re.test(p) : r.path === p) return r; return { path: '/other', name: '기타' }; }; }
const buildingList = async () => (await get('pages')).pages || []; // 건물 설정(경로·이름·패턴)
const bump = (m, k, n = 1) => { if (k === undefined || k === null || k === '') return; m[k] = (m[k] || 0) + n; };
const sorted = m => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));

// 이벤트 구간을 사람 기준으로 요약한다(봇 제외). 메모리 로그는 page_path가 건물 키라 원래 경로는 path에 있다
function summarize(events, from, to, truncated) {
  const sessions = new Set(), bots = new Set(), devices = {}, referrers = {}, countries = {}, hours = {}, custom = {}, campaigns = {}; let views = 0, returning = 0, revenue = 0, errors = 0;
  for (const e of events) { const p = e.properties || {}; if (p.bot) { bots.add(e.session_id); continue; } const t = e.event_type;
    if (t === 'session_start') { if (!sessions.has(e.session_id)) { sessions.add(e.session_id); bump(devices, p.device); bump(referrers, p.referrer); bump(countries, p.country); bump(hours, localParts(Date.parse(e.timestamp)).hour + '시'); if (p.returning === true) returning++; if (p.utm_campaign) bump(campaigns, p.utm_campaign); } }
    else if (t === 'page_view') views++; else if (t === 'js_error') errors++;
    else if (!SYSTEM.has(t)) { bump(custom, t); if (typeof p.amount === 'number') revenue += p.amount; } }
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString(), timezone: TZ, sessions: sessions.size, pageViews: views, returning, bots: bots.size, jsErrors: errors, revenue, devices: sorted(devices), referrers: sorted(referrers), countries: sorted(countries), campaigns: sorted(campaigns), customEvents: sorted(custom), entriesByHour: hours, truncated: !!truncated, note: '원본 이벤트는 보관 기간(기본 7일) 안의 것만 있어요. 구간은 최대 24시간이에요' };
}

const TOOLS = [
  { name: 'online', description: '지금 이 사이트에 있는 방문자 수와 건물(페이지)별 인원, 봇 수, 날씨(오류가 많으면 비, 사람이 많으면 쨍쨍), 접속 중인 세션 목록(최대 50). 실시간 상태.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => { const [s, pg] = await Promise.all([get('state'), buildingList()]); const names = Object.fromEntries(pg.map(p => [p.path, p.name || p.path]));
      const buildings = Object.entries(s.counts.pages).filter(([, n]) => n > 0).map(([path, n]) => ({ path, name: names[path] || (path === '/other' ? '기타' : path), online: n })).sort((a, b) => b.online - a.online || a.path.localeCompare(b.path));
      const sessions = s.sessions.filter(x => !(x.properties || {}).bot).map(x => { const p = x.properties || {}; return { session: x.session_id, building: x.page_path, path: x.path, since: new Date(x.started_at).toISOString(), device: p.device, country: p.country, referrer: p.referrer, returning: p.returning, rare: p.rare, owner: p.me || undefined }; });
      return { at: s.at, online: s.counts.online, bots: s.counts.bots, buildings, weather: s.weather && s.weather.kind, lastEventAt: s.lastEventAt ? new Date(s.lastEventAt).toISOString() : null, sessions: sessions.slice(0, 50) }; } },
  { name: 'today', description: `오늘(${TZ} 기준 0시부터 지금까지) 방문 요약: 세션 수, 페이지 뷰, 재방문, 봇, 기기·유입·나라·캠페인 분포, 시간대별 입장, 커스텀 이벤트 수와 매출(amount 합), JS 오류 수.`,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => { const from = dayStart(), to = Date.now(); const r = await get('events', { from: new Date(from).toISOString(), to: new Date(to).toISOString() }); return summarize(r.events, from, to, r.truncated); } },
  { name: 'top_pages', description: '많이 본 페이지. hours(1~24, 기본 24)면 원본 이벤트로 경로별 페이지 뷰·세션을 세고, days(2~365)면 일별 집계(page_daily, DB 있는 사이트만)로 센다. 각 경로가 어느 건물인지도 준다.',
    inputSchema: { type: 'object', properties: { hours: { type: 'integer', minimum: 1, maximum: 24, description: '최근 N시간(기본 24). days와 같이 쓰지 않는다' }, days: { type: 'integer', minimum: 2, maximum: 365, description: '최근 N일을 일별 집계로' }, limit: { type: 'integer', minimum: 1, maximum: 50, description: '상위 몇 개(기본 10)' } }, additionalProperties: false },
    run: async ({ hours, days, limit = 10 } = {}) => { const res = resolver(await buildingList()); const acc = {};
      const add = (path, views, sess) => { const a = acc[path] || (acc[path] = { path, building: res(path).name, views: 0, sessions: new Set(), sessionCount: 0 }); a.views += views; if (sess instanceof Set) for (const s of sess) a.sessions.add(s); else a.sessionCount += sess; };
      if (days) { const d = await get('daily', { days }); for (const r of d.rows || []) add(r.page_path, +r.views || 0, +r.sessions || 0); if (!(d.rows || []).length) return { window: `${days}일`, pages: [], note: 'DB가 없는 로컬 사이트는 일별 집계가 비어 있어요. hours로 물어보세요' }; }
      else { const h = Math.min(24, Math.max(1, +hours || 24)); const to = Date.now(), from = to - h * 3600000; const r = await get('events', { from: new Date(from).toISOString(), to: new Date(to).toISOString() });
        for (const e of r.events) { const p = e.properties || {}; if (p.bot || (e.event_type !== 'page_view' && e.event_type !== 'session_start')) continue; const path = e.path || e.page_path; add(path, e.event_type === 'page_view' ? 1 : 0, new Set([e.session_id])); } }
      const pages = Object.values(acc).map(a => ({ path: a.path, building: a.building, views: a.views, sessions: a.sessions.size || a.sessionCount })).sort((x, y) => y.views - x.views || y.sessions - x.sessions).slice(0, Math.min(50, Math.max(1, +limit || 10)));
      return { window: days ? `${days}일` : `${Math.min(24, Math.max(1, +hours || 24))}시간`, pages }; } },
  { name: 'records', description: '기록과 수집 현황: 누적 방문 번호, 동시 접속 최고, 첫 해외 방문자, 나라 수 기록 로그, 희귀 방문자(첫 손님·기념 손님·개척자·올빼미) 만난 횟수, 열린 테마와 해금 진행도, 남은 선물.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => { const u = await get('unlocks'); return { visits: u.visits, maxOnline: u.records.maxOnline, firstForeign: u.records.firstForeign, log: u.records.log, rares: u.rares.map(r => ({ key: r.key, name: r.name, n: r.n, first: r.first, last: r.last })), themes: { free: u.free, unlocked: Object.keys(u.unlocked), progress: u.rules.map(r => ({ theme: r.key, text: r.text, value: r.value, goal: r.goal, unlocked_at: r.unlocked_at, gift: r.gift })), giftsLeft: u.gifts.left, nextGiftAt: u.gifts.next_at } }; } },
  { name: 'funnel', description: '최근 2시간 건물 간 이동(발자국): 입구→건물, 건물→건물, 건물→퇴장의 가중치. 이동 1번 = 1을 반감기 30분으로 줄인 값이라 최근 이동일수록 크다. 어디로 들어와 어디로 가고 어디서 나가는지 본다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => { const [t, pg] = await Promise.all([get('trails'), buildingList()]); const names = Object.fromEntries(pg.map(p => [p.path, p.name || p.path])); const nm = k => (k === null ? null : names[k] || (k === '/other' ? '기타' : k));
      const moves = (t.moves || []).map(m => ({ from: m.from, fromName: m.from === null ? '입구' : nm(m.from), to: m.to, toName: m.to === null ? '퇴장' : nm(m.to), weight: m.w })).sort((a, b) => b.weight - a.weight);
      return { at: new Date(t.at).toISOString(), halfLifeSeconds: t.halfLife, entries: moves.filter(m => m.from === null), between: moves.filter(m => m.from !== null && m.to !== null), exits: moves.filter(m => m.to === null) }; } },
];

async function handle(req) {
  const params = req.params || {};
  switch (req.method) {
    case 'initialize': return { protocolVersion: PROTOCOLS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOLS[0], capabilities: { tools: {} }, serverInfo: { name: 'visitown', version: VERSION }, instructions: `Visitown 사이트 ${SITE}의 방문자 데이터를 읽는 도구예요(${API}). 모두 읽기 전용이고, 숫자는 사람 방문 기준이에요(봇은 따로).` };
    case 'ping': return {};
    case 'tools/list': return { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) };
    case 'tools/call': { const t = TOOLS.find(x => x.name === params.name); if (!t) throw Object.assign(new Error('unknown tool: ' + params.name), { code: -32602 });
      try { const data = await t.run(params.arguments || {}); return { content: [{ type: 'text', text: JSON.stringify(data, null, 1) }], structuredContent: data }; }
      catch (e) { return { content: [{ type: 'text', text: '읽지 못했어요: ' + e.message }], isError: true }; } }
    default: throw Object.assign(new Error('method not found: ' + req.method), { code: -32601 });
  }
}
function serve(input = process.stdin, output = process.stdout) {
  const send = msg => output.write(JSON.stringify(msg) + '\n');
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  rl.on('line', async line => { line = line.trim(); if (!line) return; let req; try { req = JSON.parse(line); } catch { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); }
    if (req.id === undefined || req.id === null) return; // 알림(notifications/*)은 응답하지 않는다
    try { send({ jsonrpc: '2.0', id: req.id, result: await handle(req) }); } catch (e) { send({ jsonrpc: '2.0', id: req.id, error: { code: e.code || -32603, message: e.message } }); } });
  rl.on('close', () => process.exit(0));
}
if (require.main === module) serve();
module.exports = { TOOLS, handle, summarize, dayStart, serve };
