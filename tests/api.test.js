'use strict';
// 실제 서버(server/index.js)를 DB 없이 띄워 수집 → 상태 → SSE 계약을 확인한다. 포트는 빈 것을 받아 쓴다
const { test, before, after } = require('node:test'); const assert = require('node:assert/strict');
const { startServer, streamTicket } = require('./helpers');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const ORIGIN = 'http://localhost:3000'; // server/sites.json의 site_demo가 허용하는 origin
let srv, base;
const post = (body, headers = {}) => fetch(base + '/api/events', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: ORIGIN, 'User-Agent': UA, ...headers }, body: JSON.stringify(body) });
const state = () => fetch(base + '/api/sites/site_demo/state?token=dev').then(r => r.json());
let n = 0; const ev = (type, sid, page_path = '/', props = {}) => ({ event_id: `api${++n}`, site_id: 'site_demo', session_id: sid, event_type: type, page_path, timestamp: new Date().toISOString(), properties: props });

before(async () => { srv = await startServer({ SESSION_TTL_MS: '2000' }); base = srv.base; });
after(() => { srv && srv.proc.kill(); });

test('healthz와 SDK 파일을 준다', async () => {
  assert.deepEqual((await (await fetch(base + '/healthz')).json()).ok, true);
  const sdk = await fetch(base + '/visitown.js'); assert.equal(sdk.status, 200); assert.match(await sdk.text(), /window\.visitown|visitown/);
});

test('수집: 허용 origin·사람 UA는 받고, 모르는 사이트·다른 origin·잘못된 JSON은 거절', async () => {
  const r = await post([ev('session_start', 'u1', '/products'), ev('page_view', 'u1', '/products/1')]); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { accepted: 2, rejected: 0, duplicates: 0 });
  assert.equal((await post([{ ...ev('session_start', 'x'), site_id: 'nope' }])).status, 403);
  assert.equal((await post([ev('session_start', 'x')], { Origin: 'http://evil.example' })).status, 403);
  assert.equal((await fetch(base + '/api/events', { method: 'POST', headers: { Origin: ORIGIN }, body: '{' })).status, 400);
  assert.equal((await post([])).status, 400); assert.equal((await post({ events: [] })).status, 400);
  const opt = await fetch(base + '/api/events', { method: 'OPTIONS', headers: { Origin: ORIGIN } }); assert.equal(opt.status, 204); assert.equal(opt.headers.get('access-control-allow-origin'), ORIGIN);
});

test('상태: 토큰이 있어야 보이고, 중복·역행·봇이 집계에 반영된다', async () => {
  assert.equal((await fetch(base + '/api/sites/site_demo/state')).status, 401);
  let s = await state(); assert.equal(s.counts.online, 1); assert.equal(s.counts.pages['/products'], 1); assert.equal(s.sessions.length, 1); assert.equal(s.sessions[0].session_id, 'u1');
  const dup = ev('page_view', 'u1', '/checkout'); await post([dup]); const r = await post([dup]); assert.deepEqual(await r.json(), { accepted: 0, rejected: 0, duplicates: 1 });
  s = await state(); assert.equal(s.counts.pages['/checkout'], 1); assert.equal(s.totals.duplicates, 1);
  await post([{ ...ev('page_view', 'u1', '/search'), timestamp: new Date(Date.now() - 60000).toISOString() }]); s = await state(); assert.equal(s.counts.pages['/checkout'], 1, '과거 이벤트는 무시'); assert.equal(s.totals.stale, 1);
  await post([ev('session_start', 'bot1', '/')], { 'User-Agent': 'Googlebot/2.1' }); s = await state(); assert.equal(s.counts.bots, 1); assert.equal(s.counts.online, 1);
  assert.ok(s.sessions.find(x => x.session_id === 'bot1').properties.bot === 'GOOGLE');
});

test('SSE: 붙으면 먼저 snapshot, 그 뒤 새 이벤트가 event로 온다', async () => {
  const ac = new AbortController(); const res = await fetch(base + '/api/sites/site_demo/stream?ticket=' + await streamTicket(base), { signal: ac.signal, headers: { Accept: 'text/event-stream' } });
  assert.equal(res.headers.get('content-type'), 'text/event-stream');
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''; const frames = [];
  const next = async pred => { for (;;) { const i = buf.indexOf('\n\n'); if (i >= 0) { const f = buf.slice(0, i); buf = buf.slice(i + 2); const m = /^(?:id: \S+\n)?event: (\w+)\ndata: (.*)$/s.exec(f); if (m) { const fr = { event: m[1], data: JSON.parse(m[2]) }; frames.push(fr); if (pred(fr)) return fr; } continue; }
    const { value, done } = await reader.read(); if (done) throw new Error('stream ended'); buf += dec.decode(value, { stream: true }); } };
  const snap = await next(f => f.event === 'snapshot'); assert.equal(snap.data.site_id, 'site_demo'); assert.equal(snap.data.sessions.length, 2); assert.ok(Array.isArray(snap.data.pages)); assert.ok(snap.data.weather);
  await post([ev('session_start', 'u2', '/community/3')]);
  const e = await next(f => f.event === 'event' && f.data.session_id === 'u2'); assert.equal(e.data.event_type, 'session_start'); assert.equal(e.data.page_path, '/community');
  ac.abort();
});

test('S-29 스트림 티켓: 헤더로 받은 30초 일회용 티켓으로만 열리고, URL 토큰·재사용·위조·만료는 401', async () => {
  assert.equal((await fetch(base + '/api/sites/site_demo/stream-ticket', { method: 'POST' })).status, 401, '로그인 없이는 못 받는다');
  assert.equal((await fetch(base + '/api/sites/site_demo/stream-ticket', { method: 'POST', headers: { Authorization: 'Bearer dev:bob' } })).status, 403, '멤버가 아니면 못 받는다');
  assert.equal((await fetch(base + '/api/sites/site_demo/stream-ticket', { headers: { Authorization: 'Bearer dev' } })).status, 405);
  const r = await fetch(base + '/api/sites/site_demo/stream-ticket', { method: 'POST', headers: { Authorization: 'Bearer dev' } }); assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store');
  const { ticket, expiresIn } = await r.json(); assert.equal(expiresIn, 30); assert.match(ticket, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/); assert.ok(!ticket.includes('dev'), '티켓에 토큰이 들어 있지 않다');
  assert.equal((await fetch(base + '/api/sites/site_demo/stream?token=dev')).status, 401, 'URL의 장기 토큰은 더 이상 받지 않는다');
  const ac = new AbortController(); const ok = await fetch(base + '/api/sites/site_demo/stream?ticket=' + ticket, { signal: ac.signal }); assert.equal(ok.status, 200); assert.equal(ok.headers.get('content-type'), 'text/event-stream'); ac.abort();
  assert.equal((await fetch(base + '/api/sites/site_demo/stream?ticket=' + ticket)).status, 401, '한 번 쓴 티켓은 다시 못 쓴다');
  const forged = ticket.slice(0, -2) + (ticket.endsWith('AA') ? 'BB' : 'AA'); assert.equal((await fetch(base + '/api/sites/site_demo/stream?ticket=' + forged)).status, 401, '서명이 다르면 거절');
  const [body] = ticket.split('.'); const other = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), s: 'site_other' })).toString('base64url'); assert.equal((await fetch(base + '/api/sites/site_demo/stream?ticket=' + other + '.' + ticket.split('.')[1])).status, 401, '본문을 바꾸면 서명이 안 맞는다');
  const short = await startServer({ STREAM_TICKET_TTL_MS: '200' }); try { const t = await streamTicket(short.base); await new Promise(r => setTimeout(r, 350)); assert.equal((await fetch(short.base + '/api/sites/site_demo/stream?ticket=' + t)).status, 401, '만료된 티켓'); } finally { short.proc.kill(); }
  assert.ok(!srv.logs().includes(ticket), '서버 로그에 티켓이 남지 않는다');
});

test('세션은 SESSION_TTL_MS 뒤 timeout으로 나간다', async () => {
  await post([ev('session_start', 'short', '/mypage')]); assert.equal((await state()).counts.pages['/mypage'], 1);
  await new Promise(r => setTimeout(r, 3300)); const s = await state(); assert.equal(s.counts.pages['/mypage'], 0); assert.equal(s.counts.online, 0);
});
