#!/usr/bin/env node
'use strict';
// 부하 테스트(로드맵 43). 의존성 없이 수집 서버를 띄우고(또는 --url로 기존 서버) SSE 구독자 S개를 열어 둔 채 초당 E건을 D초 동안 넣는다.
// 잰다: 이벤트 → SSE 도착 지연 p50/p95/p99(ms, 이벤트 timestamp 기준, 표본 구독자), 유실률(구독자별 받은 건수 / 가장 많이 받은 구독자), 서버 RSS·CPU(5초마다), 재접속 복구(--reconnect).
// 구독자는 worker_threads로 나눠 든다(생성기 쪽 CPU가 병목이 되지 않게). 결과는 마지막 줄에 JSON, 그 위에 docs/load.md용 표.
// 사용: node tests/load/run.js --subs 1000 --rate 500 --secs 600 [--sessions 2000] [--reconnect 0.1] [--heartbeat 0.66] [--workers 4] [--url http://host:port --token dev]
// --heartbeat: 이벤트 중 하트비트 비율(기본 0.66 = SDK의 실제 믹스에 가깝게). 하트비트는 세션 상태를 바꾸지 않아 SSE로 나가지 않으므로, 0으로 두면 모든 이벤트가 이동(page_view)이 되어 팬아웃 최악 조건이 된다
const http = require('node:http'); const path = require('node:path'); const fs = require('node:fs'); const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1'] : null).filter(Boolean));
const SUBS = +(args.subs || 1000), RATE = +(args.rate || 500), SECS = +(args.secs || 600), SESSIONS = +(args.sessions || 2000), RECONNECT = +(args.reconnect || 0), HB = args.heartbeat == null ? 0.66 : +args.heartbeat, WORKERS = +(args.workers || 4), TOKEN = args.token || 'dev', SITE = args.site || 'site_demo';
const PROBES = 10; // 지연을 재는 표본 구독자 수(이들만 JSON을 파싱한다)

// ---- 구독자 워커: 연결을 열고 'event: event' 프레임을 세고, 표본은 지연도 잰다. 메인이 'reconnect'를 보내면 일부를 끊고 Last-Event-ID로 다시 붙는다
if (!isMainThread) {
  const { base, count, probes, token, site } = workerData; const agent = new http.Agent({ keepAlive: true, maxSockets: Infinity });
  const subs = []; const lat = []; let stats = { frames: 0, snapshots: 0, resumes: 0, errors: 0 };
  // 스트림 티켓(S-29): 연결마다 Bearer 토큰으로 일회용 티켓을 받아 그것으로 연다(대시보드와 같은 경로. 왕복 하나가 연결 비용에 더해진다)
  async function ticketFor() { const r = await fetch(`${base}/api/sites/${site}/stream-ticket`, { method: 'POST', headers: { Authorization: 'Bearer ' + token } }); if (!r.ok) throw new Error('ticket ' + r.status); return (await r.json()).ticket; }
  async function connect(i, lastId) {
    const s = subs[i] || (subs[i] = { frames: 0, lastId: null, tail: '' }); const headers = lastId ? { 'Last-Event-ID': lastId } : {};
    let ticket; try { ticket = await ticketFor(); } catch { stats.errors++; return; }
    const req = http.request(`${base}/api/sites/${site}/stream?ticket=${ticket}`, { agent, headers }, res => {
      if (res.statusCode !== 200) { stats.errors++; res.resume(); return; } res.setEncoding('utf8');
      res.on('data', chunk => { const text = s.tail + chunk; const cut = text.lastIndexOf('\n\n'); const whole = cut >= 0 ? text.slice(0, cut + 2) : ''; s.tail = cut >= 0 ? text.slice(cut + 2) : text;
        if (!whole) return; let k = -1; while ((k = whole.indexOf('event: event\n', k + 1)) >= 0) { s.frames++; stats.frames++;
          if (s.probe) { const d = whole.indexOf('data: ', k); const e = whole.indexOf('\n\n', d); try { const ev = JSON.parse(whole.slice(d + 6, e)); const t = Date.parse(ev.timestamp); if (t) lat.push(Date.now() - t); } catch {} } }
        if (whole.includes('event: snapshot\n')) stats.snapshots++; if (whole.includes('event: resume\n')) stats.resumes++;
        const padded = '\n' + whole, idAt = padded.lastIndexOf('\nid: '); if (idAt >= 0) s.lastId = padded.slice(idAt + 5, padded.indexOf('\n', idAt + 5)); }); // 프레임이 쓰기 단위로 오므로 청크가 id:로 시작할 수 있다
      res.on('error', () => { if (!req.closing) stats.errors++; });
    });
    req.on('error', () => { if (!req.closing) stats.errors++; }); req.end(); s.req = req; if (probes > i) s.probe = true;
  }
  for (let i = 0; i < count; i++) connect(i);
  parentPort.on('message', m => {
    if (m.type === 'reconnect') { const n = Math.floor(count * m.frac); for (let i = count - n; i < count; i++) { const s = subs[i]; s.req.closing = true; s.req.destroy(); s.tail = ''; connect(i, s.lastId); } }
    if (m.type === 'report') { parentPort.postMessage({ type: 'report', stats, frames: subs.map(s => s.frames), lat }); }
  });
  return;
}

// ---- 메인: 서버 띄우기 → 구독자 → 이벤트 생성 → 샘플링 → 집계
async function main() {
  let proc = null, base = args.url, pid = null;
  if (!base) {
    const net = require('node:net'); const port = await new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
    base = 'http://127.0.0.1:' + port;
    proc = require('node:child_process').spawn(process.execPath, [path.join(__dirname, '..', '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(port), SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '', JWT_SECRET: '', DEV_TOKEN: TOKEN, EVENTS_PER_IP_MIN: '1000000000', SITE_EVENTS_PER_MIN: '1000000000', MAX_SSE_PER_SITE: '1000000' }, stdio: ['ignore', 'pipe', 'pipe'] });
    pid = proc.pid; let logs = ''; proc.stdout.on('data', d => { logs += d; }); proc.stderr.on('data', d => { logs += d; });
    for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/healthz')).ok) break; } catch {} await new Promise(r => setTimeout(r, 50)); }
    process.on('exit', () => { try { proc.kill(); } catch {} });
  }
  const health = async () => { try { return await (await fetch(base + '/healthz')).json(); } catch { return {}; } };
  const cpuTicks = () => { try { const f = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' '); return (+f[11] + +f[12]); } catch { return null; } }; // utime+stime, 1/100초
  // 구독자
  const workers = []; const per = Math.ceil(SUBS / WORKERS);
  for (let w = 0; w < WORKERS; w++) { const count = Math.min(per, SUBS - w * per); if (count <= 0) break; workers.push(new Worker(__filename, { workerData: { base, count, probes: w === 0 ? Math.min(PROBES, count) : 0, token: TOKEN, site: SITE } })); }
  // 전부 붙을 때까지 기다린다(연결 폭주 처리 시간 = rampMs도 측정값). 3분 안에 못 붙으면 그대로 시작
  const rampT0 = Date.now(); let h0; for (;;) { h0 = await health(); if ((h0.subscribers || 0) >= SUBS || Date.now() - rampT0 > 180000) break; await new Promise(r => setTimeout(r, 200)); } const rampMs = Date.now() - rampT0;
  const cpu0 = cpuTicks(); const t0 = Date.now();
  console.error(`구독자 ${h0.subscribers}/${SUBS} 연결됨(${(rampMs / 1000).toFixed(1)}초) · RSS ${(h0.rss / 1048576).toFixed(0)}MB · 초당 ${RATE}건 × ${SECS}초 시작`);
  // 이벤트 생성: 40ms마다 RATE/25건(최대 20건 한 배치). 세션 풀을 돌며 session_start → page_view(이동) → heartbeat. 세션당 분당 60 한도를 넘지 않게 세션 수를 충분히
  const PAGES = ['/', '/products', '/products/1', '/search', '/community', '/mypage', '/checkout', '/blog/x'];
  let seq = 0, sent = 0, accepted = 0, rejected = 0, posts = 0, postErr = 0, cursor = 0; const sess = Array.from({ length: SESSIONS }, (_, i) => ({ id: 'load_' + i, started: false, n: 0 }));
  const mk = s => { s.n++; const type = !s.started ? (s.started = true, 'session_start') : Math.random() < HB ? 'heartbeat' : 'page_view'; if (type === 'page_view') s.p = (s.p || 0) + 1; return { event_id: `l${++seq}`, site_id: SITE, session_id: s.id, event_type: type, page_path: PAGES[(s.p || 0) % PAGES.length], timestamp: new Date().toISOString(), properties: type === 'session_start' ? { device: 'desktop', referrer: 'direct' } : {} }; };
  const batchN = Math.max(1, Math.min(20, Math.round(RATE / 25))); const tickMs = Math.max(1, Math.round(1000 / (RATE / batchN)));
  const samples = []; let lastCpu = cpu0, lastT = t0;
  const sampler = setInterval(async () => { const h = await health(); const c = cpuTicks(), now = Date.now(); const cpu = c != null && lastCpu != null ? ((c - lastCpu) / 100) / ((now - lastT) / 1000) * 100 : null; lastCpu = c; lastT = now;
    samples.push({ t: Math.round((now - t0) / 1000), rss: h.rss, subs: h.subscribers, cpu }); console.error(`${Math.round((now - t0) / 1000)}s 보냄 ${sent} 받음(서버) ${accepted} · RSS ${(h.rss / 1048576).toFixed(0)}MB · CPU ${cpu == null ? '-' : cpu.toFixed(0) + '%'} · 구독자 ${h.subscribers}`); }, 5000);
  const recon = RECONNECT > 0 ? setInterval(() => { for (const w of workers) w.postMessage({ type: 'reconnect', frac: RECONNECT }); }, 30000) : null;
  await new Promise(resolve => { const tick = setInterval(async () => {
    if (Date.now() - t0 >= SECS * 1000) { clearInterval(tick); resolve(); return; }
    const batch = []; for (let i = 0; i < batchN; i++) batch.push(mk(sess[cursor++ % SESSIONS])); sent += batch.length; posts++;
    try { const r = await fetch(base + '/api/events', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: 'http://localhost:3000', 'User-Agent': 'Mozilla/5.0 load' }, body: JSON.stringify(batch) }); if (r.ok) { const j = await r.json(); accepted += j.accepted; rejected += j.rejected + j.duplicates; } else { postErr++; r.body?.cancel(); } } catch { postErr++; }
  }, tickMs); });
  clearInterval(sampler); if (recon) clearInterval(recon);
  await new Promise(r => setTimeout(r, 3000)); // 마지막 이벤트가 구독자에게 닿을 시간
  const reports = await Promise.all(workers.map(w => new Promise(res => { w.once('message', res); w.postMessage({ type: 'report' }); })));
  const state = await (await fetch(`${base}/api/sites/${SITE}/state?token=${TOKEN}`)).json(); const h1 = await health();
  for (const w of workers) w.terminate(); if (proc) proc.kill();
  // 집계
  const frames = reports.flatMap(r => r.frames); const max = Math.max(...frames); const lost = frames.map(f => 1 - f / max); const lat = reports.flatMap(r => r.lat).sort((a, b) => a - b);
  const pct = p => lat.length ? lat[Math.min(lat.length - 1, Math.floor(lat.length * p))] : null;
  const avg = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const cpuS = samples.map(s => s.cpu).filter(x => x != null), rssS = samples.map(s => s.rss).filter(Boolean);
  const out = { subs: SUBS, rate: RATE, secs: SECS, sessions: SESSIONS, reconnect: RECONNECT, heartbeat: HB, rampMs, sent, accepted, rejected, posts, postErr,
    emitted: max, latencyMs: { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: lat[lat.length - 1] ?? null, samples: lat.length },
    loss: { avg: avg(lost), max: Math.max(...lost), subsWithLoss: lost.filter(x => x > 0).length }, rssMB: { start: h0.rss / 1048576, end: h1.rss / 1048576, max: Math.max(...rssS) / 1048576 }, cpuPct: { avg: avg(cpuS), max: Math.max(...cpuS) },
    sse: state.totals && state.totals.sse, snapshots: reports.reduce((a, r) => a + r.stats.snapshots, 0), resumes: reports.reduce((a, r) => a + r.stats.resumes, 0), subErrors: reports.reduce((a, r) => a + r.stats.errors, 0), online: state.counts && state.counts.online, node: process.version };
  const f = (x, d = 0) => x == null ? '-' : (+x).toFixed(d);
  console.log(`| 구독자 ${SUBS} · 초당 ${RATE}건(하트비트 ${Math.round(HB * 100)}%) · ${SECS}초 | 연결 완료 ${f(rampMs / 1000, 1)}초 | 보냄 ${sent} / 서버 수락 ${accepted} / 구독자당 받음(최대) ${max} | p50 ${f(out.latencyMs.p50)} · p95 ${f(out.latencyMs.p95)} · p99 ${f(out.latencyMs.p99)} ms | 유실 평균 ${f(out.loss.avg * 100, 2)}% · 최대 ${f(out.loss.max * 100, 2)}% (${out.loss.subsWithLoss}개 구독자) | RSS ${f(out.rssMB.start)} → ${f(out.rssMB.end)} MB (최대 ${f(out.rssMB.max)}) | CPU 평균 ${f(out.cpuPct.avg)}% · 최대 ${f(out.cpuPct.max)}% | 재접속 ${out.sse ? `복구 ${out.sse.recovered}건 · resume ${out.sse.resumed}회 · 스냅샷 ${out.sse.snapshots}회` : '-'} |`);
  console.log(JSON.stringify(out));
}
main().catch(e => { console.error(e); process.exit(1); });
