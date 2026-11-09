'use strict';
// 속도 제한·연결 상한·응답 헤더(docs/security.md S-04·S-05·S-06·S-08). 한도를 아주 작게 준 서버를 따로 띄운다. 순서가 중요하다: 인증 실패 차단·IP 한도 테스트는 뒤에 둔다(같은 IP라서)
const { test, before, after } = require('node:test'); const assert = require('node:assert/strict');
const { startServer, streamTicket } = require('./helpers');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const ORIGIN = 'http://localhost:3000';
let srv, base;
const post = body => fetch(base + '/api/events', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: ORIGIN, 'User-Agent': UA }, body: JSON.stringify(body) });
let n = 0; const ev = (type, sid) => ({ event_id: `lim${++n}`, site_id: 'site_demo', session_id: sid, event_type: type, page_path: '/', timestamp: new Date().toISOString(), properties: {} });
const put = pages => fetch(base + '/api/sites/site_demo/pages?token=dev', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pages }) });

before(async () => { srv = await startServer({ EVENTS_PER_IP_MIN: '3', AUTH_FAIL_PER_IP_MIN: '2', MAX_SSE_PER_SITE: '1' }); base = srv.base; });
after(() => { srv && srv.proc.kill(); });

test('S-08: JSON·SDK·배지 응답에 nosniff, 배지 SVG에는 CSP가 붙는다', async () => {
  assert.equal((await fetch(base + '/healthz')).headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await fetch(base + '/visitown.js')).headers.get('x-content-type-options'), 'nosniff');
  const { key } = await (await fetch(base + '/api/sites/site_demo/embed?token=dev', { method: 'POST' })).json(); assert.match(key, /^emb_[0-9a-f]{24}$/);
  const badge = await fetch(base + `/api/sites/site_demo/badge?embed=${key}&label=<script>x</script>`); assert.equal(badge.status, 200);
  assert.equal(badge.headers.get('x-content-type-options'), 'nosniff'); assert.match(badge.headers.get('content-security-policy'), /default-src 'none'/);
  assert.doesNotMatch(await badge.text(), /<script>/, 'label은 이스케이프된다');
});

test('S-06: 건물 패턴에 중첩 반복이 있으면 400', async () => {
  const bad = await put([{ path: '/', name: '광장', kind: 'plaza', slot: 0 }, { path: '/x', name: 'x', pattern: '^/(a+)+$' }]); assert.equal(bad.status, 400); assert.match((await bad.json()).error, /중첩 반복/);
  const ok = await put([{ path: '/', name: '광장', kind: 'plaza', slot: 0 }, { path: '/x', name: 'x', pattern: '^/x(/|$)' }]); assert.equal(ok.status, 200);
});

test('S-05: SSE 구독은 사이트당 상한을 넘으면 503', async () => {
  const ac = new AbortController(); const first = await fetch(base + '/api/sites/site_demo/stream?ticket=' + await streamTicket(base), { signal: ac.signal }); assert.equal(first.status, 200);
  const second = await fetch(base + '/api/sites/site_demo/stream?ticket=' + await streamTicket(base)); assert.equal(second.status, 503); assert.equal(second.headers.get('retry-after'), '30');
  ac.abort(); await new Promise(r => setTimeout(r, 150));
  const ac2 = new AbortController(); const third = await fetch(base + '/api/sites/site_demo/stream?ticket=' + await streamTicket(base), { signal: ac2.signal }); assert.equal(third.status, 200, '끊긴 자리는 다시 쓸 수 있다'); ac2.abort();
});

test('S-04: 인증 실패가 IP당 한도를 넘으면 그 IP는 1분간 429(올바른 토큰·임베드 키도)', async () => {
  const st = t => fetch(base + '/api/sites/site_demo/state?token=' + t).then(r => r.status);
  assert.equal(await st('nope'), 401); assert.equal(await st('nope'), 401); assert.equal(await st('nope'), 429);
  assert.equal(await st('dev'), 429, '한도를 넘긴 IP는 올바른 토큰도 막힌다');
  assert.equal(await fetch(base + '/api/sites?token=dev').then(r => r.status), 429);
  assert.equal(await fetch(base + '/api/sites/site_demo/badge?embed=emb_000000000000000000000000').then(r => r.status), 429);
});

test('S-04: IP당 이벤트 요청 한도를 넘으면 429(수집은 인증 차단과 별개)', async () => {
  for (let i = 0; i < 3; i++) assert.equal((await post([ev('heartbeat', 's' + i)])).status, 200, '요청 ' + (i + 1));
  const r = await post([ev('heartbeat', 's9')]); assert.equal(r.status, 429); assert.equal(r.headers.get('retry-after'), '60'); assert.deepEqual(await r.json(), { error: 'ip rate limit' });
});

// ---- 보안 S-32: 웹훅 주소는 저장(PUT) 때만이 아니라 보내기 직전에도 허용 목록을 본다(DB 행을 직접 고친 경우·옛 행)
test('보안 S-32: Alerts.post는 허용 목록 밖 주소(내부망·http)로 보내지 않는다', async () => {
  const { Alerts, normalizeWebhook } = require('../server/alerts'); const a = new Alerts({ sites: new Map(), stores: new Map(), subscribers: new Map(), sendSse() {}, broadcast() {} });
  for (const u of ['http://10.0.0.5/hook', 'https://169.254.169.254/latest', 'https://evil.example/hooks.slack.com/x', 'https://hooks.slack.com/']) assert.equal(await a.post(u, 'x'), '허용되지 않은 웹훅 주소예요', u);
  assert.equal(normalizeWebhook({ url: 'http://10.0.0.5/hook' }).cfg, undefined); assert.ok(normalizeWebhook({ url: 'https://hooks.slack.com/services/T/B/x' }).cfg);
});
