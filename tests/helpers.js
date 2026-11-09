'use strict';
// 테스트 공용 도구: 가짜 시계, 이벤트 생성기, 스토어 생성
const { SiteStore } = require('../server/store');

// 시계를 손으로 돌린다. store.now()·unlocks.now()에 넣는다
function clock(start = Date.UTC(2026, 10, 4, 1, 0, 0)) { let t = start; const fn = () => t; fn.set = v => { t = v; }; fn.tick = ms => { t += ms; return t; }; return fn; }

const SITE = { id: 'site_test', name: 'test', pages: [
  { path: '/', name: '광장' }, { path: '/products', name: '상점', pattern: '^/products(/|$)' }, { path: '/search', name: '도서관' },
  { path: '/community', name: '커뮤니티', pattern: '^/community(/|$)' }, { path: '/mypage', name: '집' }, { path: '/checkout', name: '계산대' } ] };

function makeStore(opts = {}, site = SITE) { const now = opts.now || clock(); const st = new SiteStore({ ...site, ...(opts.site || {}) }, { ttl: opts.ttl || 45000, now }); st.clock = now; const emitted = []; st.on(m => emitted.push(m)); st.emitted = emitted; return st; }

let seq = 0;
// 서버가 normalize한 뒤 모양의 이벤트. ts는 ms(숫자) 또는 ISO 문자열
function ev(type, sid, path = '/', ts = Date.UTC(2026, 10, 4, 1, 0, 0), props = {}, id) {
  return { event_id: id || `e${++seq}`, site_id: 'site_test', session_id: sid, event_type: type, page_path: path, timestamp: typeof ts === 'number' ? new Date(ts).toISOString() : ts, properties: { ...props } };
}
// 세션별 건물 인원 합 = 사람 접속자 수. 봇은 따로 센다
function sumPages(st) { const c = st.counts(); return Object.values(c.pages).reduce((a, b) => a + b, 0); }
// 실제 서버(server/index.js)를 DB 없이 빈 포트에 띄운다. { proc, base, logs() }. 끝나면 proc.kill()
async function startServer(env = {}) {
  const { spawn } = require('node:child_process'); const net = require('node:net'); const path = require('node:path');
  const port = await new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
  const base = 'http://127.0.0.1:' + port; let logs = '';
  const proc = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(port), SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '', JWT_SECRET: '', DEV_TOKEN: 'dev', ALLOWED_DASHBOARD_ORIGIN: '', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', d => { logs += d; }); proc.stderr.on('data', d => { logs += d; });
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/healthz')).ok) return { proc, base, logs: () => logs }; } catch {} await new Promise(r => setTimeout(r, 50)); }
  proc.kill(); throw new Error('서버가 뜨지 않았어요\n' + logs);
}
// 수평 확장(server/peers.js) 테스트용 phoenix 흉내 릴레이: 의존성 없는 WebSocket 서버(텍스트 프레임만). phx_join·heartbeat에 ok로 답하고 broadcast는 보낸 소켓 말고 전부에게 전달한다
async function startRelay() {
  const http = require('node:http'), crypto = require('node:crypto'); const socks = new Set(); let relayed = 0;
  const frame = text => { const b = Buffer.from(text); const h = b.length < 126 ? Buffer.from([0x81, b.length]) : Buffer.from([0x81, 126, b.length >> 8, b.length & 255]); return Buffer.concat([h, b]); };
  const server = http.createServer((req, res) => { res.writeHead(404); res.end(); });
  server.on('upgrade', (req, sock) => {
    const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n'); socks.add(sock); let buf = Buffer.alloc(0);
    sock.on('data', d => { buf = Buffer.concat([buf, d]);
      for (;;) { if (buf.length < 2) return; const op = buf[0] & 15; let len = buf[1] & 127, off = 2; if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; } else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        const masked = buf[1] & 128; if (buf.length < off + (masked ? 4 : 0) + len) return; let payload = buf.subarray(off + (masked ? 4 : 0), off + (masked ? 4 : 0) + len); if (masked) { const k = buf.subarray(off, off + 4); payload = Buffer.from(payload.map((b, i) => b ^ k[i % 4])); } buf = buf.subarray(off + (masked ? 4 : 0) + len);
        if (op === 8) { sock.end(); return; } if (op === 9) { sock.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload])); continue; } if (op !== 1) continue;
        let m; try { m = JSON.parse(payload.toString()); } catch { continue; }
        if (m.event === 'phx_join' || m.event === 'heartbeat') sock.write(frame(JSON.stringify({ topic: m.topic, event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: m.ref })));
        else if (m.event === 'broadcast') { relayed++; const out = frame(JSON.stringify({ topic: m.topic, event: 'broadcast', payload: m.payload, ref: null })); for (const s of socks) if (s !== sock && !s.destroyed) s.write(out); } } });
    sock.on('close', () => socks.delete(sock)); sock.on('error', () => socks.delete(sock)); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { url: 'ws://127.0.0.1:' + server.address().port + '/socket/websocket', relayed: () => relayed, clients: () => socks.size, close: () => { for (const s of socks) s.destroy(); server.close(); } };
}
// 스트림 티켓(S-29, 로드맵 55): Bearer 토큰으로 30초짜리 일회용 티켓을 받는다. 스트림 URL에는 ?token= 대신 이것만 넣는다
async function streamTicket(base, token = 'dev', site = 'site_demo') { const r = await fetch(`${base}/api/sites/${site}/stream-ticket`, { method: 'POST', headers: { Authorization: 'Bearer ' + token } }); if (!r.ok) throw new Error('ticket ' + r.status); return (await r.json()).ticket; }
// 웹 앱(apps/web, Next 16, 로드맵 56)을 빈 포트에 띄운다. npm run build 뒤에만(apps/web/.next). { proc, base, logs() }. 끝나면 proc.kill()
async function startWeb() {
  const { spawn } = require('node:child_process'); const net = require('node:net'); const path = require('node:path'); const fs = require('node:fs');
  const root = path.join(__dirname, '..'), app = path.join(root, 'apps', 'web');
  if (!fs.existsSync(path.join(app, '.next', 'BUILD_ID'))) throw new Error('apps/web/.next가 없어요. npm run build 먼저');
  const port = await new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
  const base = 'http://127.0.0.1:' + port; let logs = '';
  const proc = spawn(process.execPath, [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: app, env: { ...process.env, NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', d => { logs += d; }); proc.stderr.on('data', d => { logs += d; });
  for (let i = 0; i < 300; i++) { try { if ((await fetch(base + '/app')).ok) return { proc, base, logs: () => logs }; } catch {} await new Promise(r => setTimeout(r, 100)); }
  proc.kill(); throw new Error('웹 앱이 뜨지 않았어요\n' + logs);
}
module.exports = { startWeb, streamTicket, clock, SITE, makeStore, ev, sumPages, startServer, startRelay };
