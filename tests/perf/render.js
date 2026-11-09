// 로드맵 47(렌더를 Worker로) 기준 측정: 빌드된 웹 앱(apps/web, next start)의 /demo를 10초 돌리며 50ms 넘는 긴 작업 수·프레임 시간·메인 스레드 점유(CDP Performance)를 잰다. 사용: node tests/perf/render.js. 전환 뒤 같은 스크립트로 비교한다
const pw = require('playwright'); const { startWeb } = require('../helpers');
(async () => {
  const web = await startWeb(); const base = web.base;
  const browser = await pw.chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable');
  await page.goto(base + '/demo'); await page.waitForTimeout(1500);
  await page.evaluate(() => { window.__lt = []; window.__ft = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: false }); let last = performance.now(); const tick = t => { window.__ft.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const m0 = (await cdp.send('Performance.getMetrics')).metrics; const t0 = Date.now(); await page.waitForTimeout(10000); const m1 = (await cdp.send('Performance.getMetrics')).metrics; const secs = (Date.now() - t0) / 1000;
  const g = (m, n) => m.find(x => x.name === n).value; const task = g(m1, 'TaskDuration') - g(m0, 'TaskDuration'), script = g(m1, 'ScriptDuration') - g(m0, 'ScriptDuration'), layout = g(m1, 'LayoutDuration') - g(m0, 'LayoutDuration');
  const { lt, ft } = await page.evaluate(() => ({ lt: window.__lt, ft: window.__ft })); ft.sort((a, b) => a - b); const p = q => ft[Math.floor(ft.length * q)];
  console.log(JSON.stringify({ secs, frames: ft.length, fps: +(ft.length / secs).toFixed(1), frameMs: { p50: +p(0.5).toFixed(1), p95: +p(0.95).toFixed(1), max: +ft[ft.length - 1].toFixed(1) }, longTasks: lt.length, longTaskMaxMs: Math.max(0, ...lt), mainThreadBusyPct: +(task / secs * 100).toFixed(1), scriptPct: +(script / secs * 100).toFixed(1), layoutPct: +(layout / secs * 100).toFixed(1) }));
  await browser.close(); web.proc.kill();
})();
