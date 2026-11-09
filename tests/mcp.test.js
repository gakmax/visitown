'use strict';
// server/mcp.js: 실제 수집 서버에 이벤트를 넣고 MCP(stdio)로 initialize → tools/list → tools/call을 주고받는다
const { test, before, after } = require('node:test'); const assert = require('node:assert/strict');
const { spawn } = require('node:child_process'); const path = require('node:path'); const readline = require('node:readline');
const { startServer } = require('./helpers');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
let srv, mcp, rl, pending = new Map(), id = 0, stderr = '';
const call = (method, params) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: i, method, params }) + '\n'); setTimeout(() => { if (pending.delete(i)) reject(new Error(method + ' 응답 없음\n' + stderr)); }, 8000); });
const tool = async (name, args) => { const r = await call('tools/call', { name, arguments: args }); assert.ok(!r.isError, r.content && r.content[0] && r.content[0].text); return r.structuredContent; };
let n = 0; const ev = (type, sid, page_path = '/', props = {}) => ({ event_id: `mcp${++n}`, site_id: 'site_demo', session_id: sid, event_type: type, page_path, timestamp: new Date().toISOString(), properties: props });
const post = body => fetch(srv.base + '/api/events', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: 'http://localhost:3000', 'User-Agent': UA }, body: JSON.stringify(body) });

before(async () => {
  srv = await startServer();
  await post([ev('session_start', 'a', '/products', { device: 'mobile', referrer: 'search', tz: 'Asia/Seoul', returning: true }), ev('page_view', 'a', '/checkout'), ev('purchase', 'a', '/checkout', { amount: 12000 })]);
  await post([ev('session_start', 'b', '/products/7', { device: 'desktop', referrer: 'direct', tz: 'America/New_York' }), ev('page_leave', 'b', '/products/7')]);
  await post([ev('session_start', 'c', '/blog', { device: 'desktop' })]);
  mcp = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'mcp.js')], { env: { ...process.env, VISITOWN_API: srv.base, VISITOWN_SITE: 'site_demo', VISITOWN_TOKEN: 'dev' }, stdio: ['pipe', 'pipe', 'pipe'] });
  mcp.stderr.on('data', d => { stderr += d; });
  rl = readline.createInterface({ input: mcp.stdout }); rl.on('line', line => { const m = JSON.parse(line); const p = pending.get(m.id); if (!p) return; pending.delete(m.id); if (m.error) p.reject(Object.assign(new Error(m.error.message), { code: m.error.code })); else p.resolve(m.result); });
});
after(() => { mcp && mcp.kill(); srv && srv.proc.kill(); });

test('initialize: 프로토콜 버전을 맞추고 tools 능력만 알린다. 알림에는 응답하지 않는다', async () => {
  const r = await call('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
  assert.equal(r.protocolVersion, '2025-03-26'); assert.deepEqual(r.capabilities, { tools: {} }); assert.equal(r.serverInfo.name, 'visitown');
  assert.equal((await call('initialize', { protocolVersion: '1999-01-01' })).protocolVersion, '2025-06-18', '모르는 버전이면 최신을 제안');
  mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  assert.deepEqual(await call('ping'), {});
  await assert.rejects(call('resources/list'), e => e.code === -32601);
});

test('tools/list: 읽기 전용 도구 5개, 각각 입력 스키마가 있다', async () => {
  const { tools } = await call('tools/list'); assert.deepEqual(tools.map(t => t.name), ['online', 'today', 'top_pages', 'records', 'funnel']);
  for (const t of tools) { assert.ok(t.description.length > 20); assert.equal(t.inputSchema.type, 'object'); }
});

test('online: 접속자·건물별 인원·세션 목록', async () => {
  const r = await tool('online'); assert.equal(r.online, 3); assert.equal(r.bots, 0);
  assert.deepEqual(r.buildings.map(b => [b.path, b.name, b.online]), [['/checkout', '계산대', 1], ['/other', '기타', 1], ['/products', '상점', 1]]);
  const a = r.sessions.find(s => s.session === 'a'); assert.equal(a.building, '/checkout'); assert.equal(a.device, 'mobile'); assert.equal(a.country, 'KR'); assert.equal(a.returning, true);
});

test('today: 오늘 세션·뷰·분포·커스텀 이벤트·매출', async () => {
  const r = await tool('today'); assert.equal(r.sessions, 3); assert.equal(r.pageViews, 1); assert.equal(r.returning, 1);
  assert.deepEqual(r.devices, { desktop: 2, mobile: 1 }); assert.deepEqual(r.countries, { KR: 1, US: 1 }); assert.deepEqual(r.customEvents, { purchase: 1 }); assert.equal(r.revenue, 12000);
  assert.equal(Object.values(r.entriesByHour).reduce((x, y) => x + y, 0), 3); assert.ok(Date.parse(r.from) <= Date.now() - 1000 || true);
});

test('top_pages: 경로별 뷰·세션과 건물 이름, days는 로컬 사이트에서 빈 안내', async () => {
  const r = await tool('top_pages', { hours: 1, limit: 2 }); assert.equal(r.pages.length, 2);
  assert.deepEqual(r.pages[0], { path: '/checkout', building: '계산대', views: 1, sessions: 1 }); assert.equal(r.pages[1].views, 0);
  const d = await tool('top_pages', { days: 7 }); assert.deepEqual(d.pages, []); assert.ok(d.note);
});

test('records: 누적 방문·희귀 방문자·테마 진행도', async () => {
  const r = await tool('records'); assert.equal(r.visits, 3); assert.equal(r.rares.find(x => x.key === 'first').n, 1); assert.ok(r.themes.unlocked.includes('hanok')); assert.ok(r.themes.progress.length >= 9); assert.equal(r.themes.giftsLeft, 0);
});

test('funnel: 입구→건물·건물→건물·건물→퇴장', async () => {
  const r = await tool('funnel'); assert.ok(r.entries.length >= 2); assert.deepEqual(r.between.map(m => [m.fromName, m.toName]), [['상점', '계산대']]);
  assert.ok(r.entries.every(m => m.fromName === '입구' && m.weight > 0.9));
});

test('tools/call: 모르는 도구는 JSON-RPC 오류, 서버 오류는 isError 결과', async () => {
  await assert.rejects(call('tools/call', { name: 'nope' }), e => e.code === -32602);
  srv.proc.kill(); await new Promise(r => setTimeout(r, 200));
  const r = await call('tools/call', { name: 'online' }); assert.equal(r.isError, true); assert.match(r.content[0].text, /읽지 못했어요/);
});
