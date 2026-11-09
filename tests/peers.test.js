'use strict';
// 수평 확장(로드맵 46, server/peers.js): 인스턴스 둘을 phoenix 흉내 릴레이(tests/helpers.js startRelay)로 묶어, 한쪽에 넣은 이벤트·설정이 다른 쪽 상태·SSE에도 똑같이 나타나는지 본다
const { test, before, after } = require('node:test'); const assert = require('node:assert/strict');
const { startServer, startRelay, streamTicket } = require('./helpers');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const ORIGIN = 'http://localhost:3000';
let relay, A, B;
const post = (base, body) => fetch(base + '/api/events', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: ORIGIN, 'User-Agent': UA }, body: JSON.stringify(body) });
let n = 0; const ev = (type, sid, page_path = '/', props = {}, id) => ({ event_id: id || `pr${++n}`, site_id: 'site_demo', session_id: sid, event_type: type, page_path, timestamp: new Date().toISOString(), properties: props });
const state = base => fetch(base + '/api/sites/site_demo/state?token=dev').then(r => r.json());
const health = base => fetch(base + '/healthz').then(r => r.json());
const until = async (fn, ms = 4000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timeout'); await new Promise(r => setTimeout(r, 50)); } };
const pagesOf = st => Object.fromEntries(st.sessions.map(s => [s.session_id, s.page_path]).sort());
// SSE 구독: event 이름 목록만 모은다
function subscribe(base) { const ac = new AbortController(); const got = []; streamTicket(base).then(t => fetch(base + '/api/sites/site_demo/stream?ticket=' + t, { signal: ac.signal })).then(async r => { const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = ''; for (;;) { const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i; while ((i = buf.indexOf('\n\n')) >= 0) { const f = buf.slice(0, i); buf = buf.slice(i + 2); const m = /event: (\w+)\n(?:data: (.*))?/s.exec(f); if (m) got.push({ event: m[1], data: m[2] ? JSON.parse(m[2]) : null }); } } }).catch(() => {}); return { got, close: () => ac.abort() }; }

before(async () => { relay = await startRelay(); [A, B] = await Promise.all([startServer({ PEER_WS_URL: relay.url, INSTANCE_ID: 'inst_a' }), startServer({ PEER_WS_URL: relay.url, INSTANCE_ID: 'inst_b' })]);
  await until(async () => (await health(A.base)).peers.joined && (await health(B.base)).peers.joined); });
after(() => { A && A.proc.kill(); B && B.proc.kill(); relay && relay.close(); });

test('A에 넣은 이벤트가 B의 상태·SSE에도 똑같이 나타난다(세션·건물·커스텀 이벤트), 둘 다 DB 없이 리더', async () => {
  const sseB = subscribe(B.base); await until(() => sseB.got.some(f => f.event === 'snapshot')); // 티켓 왕복이 있어 고정 대기 대신 스냅샷을 기다린다
  const r = await (await post(A.base, [ev('session_start', 'p1', '/products', { device: 'mobile', referrer: 'search' }), ev('session_start', 'p2', '/'), ev('purchase', 'p1', '/products', { amount: 3000 })])).json(); assert.equal(r.accepted, 3);
  const sb = await until(async () => { const s = await state(B.base); return s.sessions.length === 2 ? s : null; }); const sa = await state(A.base);
  assert.deepEqual(pagesOf(sb), pagesOf(sa)); assert.deepEqual(sb.counts, sa.counts); assert.equal(sb.sessions.find(s => s.session_id === 'p1').properties.device, 'mobile');
  assert.equal(sb.totals.events, 3); assert.equal(sb.totals.peer.received, 1, 'B는 묶음 하나를 받았다'); assert.equal(sa.totals.peer.sent, 1);
  await until(async () => sseB.got.filter(f => f.event === 'event').length >= 3); assert.deepEqual(sseB.got.filter(f => f.event === 'event').map(f => f.data.event_type), ['session_start', 'session_start', 'purchase']);
  const h = await health(A.base); assert.equal(h.leader, true, 'DB 임대가 없으면 각자 리더(혼자라고 본다)'); sseB.close();
});

test('B에 넣은 이동이 A에 반영되고, 같은 event_id를 양쪽에 보내도 한 번만 적용된다', async () => {
  await post(B.base, [ev('page_view', 'p1', '/checkout')]);
  await until(async () => (await state(A.base)).sessions.find(s => s.session_id === 'p1').page_path === '/checkout');
  const dup = ev('page_view', 'p2', '/search', {}, 'dup_1'); const [ra, rb] = await Promise.all([post(A.base, [dup]).then(r => r.json()), post(B.base, [dup]).then(r => r.json())]);
  assert.equal(ra.accepted + rb.accepted + ra.duplicates + rb.duplicates, 2);
  await new Promise(r => setTimeout(r, 300)); const sa = await state(A.base), sb = await state(B.base);
  assert.equal(sa.sessions.find(s => s.session_id === 'p2').page_path, '/search'); assert.deepEqual(pagesOf(sa), pagesOf(sb)); assert.equal(sa.totals.events, sb.totals.events, '적용 수 동일');
});

test('설정 변경(건물·이벤트 설정·임베드 키·메모)이 다른 인스턴스 메모리와 SSE에 반영된다', async () => {
  const sseB = subscribe(B.base); await until(() => sseB.got.some(f => f.event === 'snapshot')); // 티켓 왕복이 있어 고정 대기 대신 스냅샷을 기다린다
  const pages = [{ path: '/', name: '광장', kind: 'plaza', slot: 0 }, { path: '/products', name: '새 상점', pattern: '^/products(/|$)' }];
  assert.equal((await fetch(A.base + '/api/sites/site_demo/pages?token=dev', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pages }) })).status, 200);
  await until(async () => { const j = await (await fetch(B.base + '/api/sites/site_demo/pages?token=dev')).json(); return j.pages.find(p => p.path === '/products')?.name === '새 상점'; });
  await until(() => sseB.got.some(f => f.event === 'pages')).catch(() => assert.fail('B의 대시보드도 pages 프레임을 받는다')); // 스트림 파서가 한 턴 늦을 수 있어 바로 단정하지 않는다
  const { key } = await (await fetch(A.base + '/api/sites/site_demo/embed?token=dev', { method: 'POST' })).json();
  await until(async () => (await fetch(B.base + `/api/sites/site_demo/badge?embed=${key}&format=json`)).status === 200, 3000); // B도 새 키를 안다
  await fetch(A.base + '/api/sites/site_demo/eventtypes?token=dev', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: [{ type: 'purchase', label: '결제', effect: 'coin' }] }) });
  await until(async () => (await (await fetch(B.base + '/api/sites/site_demo/eventtypes?token=dev')).json()).config.find(c => c.type === 'purchase')?.label === '결제');
  await fetch(A.base + '/api/sites/site_demo/notes?token=dev', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '배포' }) });
  await until(async () => sseB.got.some(f => f.event === 'event' && f.data.event_type === 'note' && f.data.properties.text === '배포'));
  sseB.close(); assert.ok(relay.relayed() >= 6, '릴레이를 거친 메시지 ' + relay.relayed());
});
