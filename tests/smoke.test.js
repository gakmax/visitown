'use strict';
// 스모크(로드맵 40·56): 빌드된 웹 앱(apps/web, `next start`)을 헤드리스 Chromium으로 열어 콘솔 error·pageerror·CSP 위반이 0건인지 본다.
// 수집 서버가 필요한 테스트(보안·랜딩·임베드·공개 마을·재접속)는 DB 없는 실제 서버(server/index.js)를 빈 포트에 띄운다. SDK 브라우저 테스트는 저장소 루트 정적 서버(/sdk/visitown.js)
const { test, before, after } = require('node:test'); const assert = require('node:assert/strict');
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const ROOT = path.join(__dirname, '..'); const { startServer, startWeb } = require('./helpers');
// playwright: 루트 node_modules → PLAYWRIGHT_MODULE 환경 변수 → npx 캐시(이 PC의 기존 설치) 순으로 찾는다
function loadPlaywright() { const cands = ['playwright', process.env.PLAYWRIGHT_MODULE].filter(Boolean);
  try { for (const d of fs.readdirSync(path.join(os.homedir(), '.npm', '_npx'))) cands.push(path.join(os.homedir(), '.npm', '_npx', d, 'node_modules', 'playwright')); } catch {}
  for (const c of cands) { try { return require(c); } catch {} } throw new Error('playwright를 찾지 못했어요. npm i 또는 PLAYWRIGHT_MODULE=<경로>'); }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json' };
let web, base, sdkServer, sdkBase, browser;
before(async () => {
  web = await startWeb(); base = web.base;
  sdkServer = http.createServer((req, res) => { const p = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)); let f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<!doctype html><title>sdk</title>'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => sdkServer.listen(0, '127.0.0.1', r)); sdkBase = 'http://127.0.0.1:' + sdkServer.address().port;
  browser = await loadPlaywright().chromium.launch();
  // 화면 언어(로드맵 60)는 Accept-Language로 정해진다. 헤드리스 기본은 en-US라 기존 테스트는 한국어로 고정하고, 영어 화면은 아래 i18n 테스트가 locale을 따로 준다
  const newContext = browser.newContext.bind(browser); browser.newContext = (o = {}) => newContext({ locale: 'ko-KR', ...o });
});
after(async () => { await browser?.close(); sdkServer?.close(); web?.proc.kill(); });

// 페이지를 열고 콘솔 error·pageerror·4xx·요청 실패·CSP 위반(securitypolicyviolation)을 모은다
async function open(url, ms = 4000) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); const errors = [];
  await page.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sourceFile || '') + ':' + e.lineNumber)); });
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text() + (m.location().url ? ' @ ' + m.location().url : '')); });
  page.on('response', r => { if (r.status() >= 400) errors.push('http ' + r.status() + ': ' + r.url()); }); page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => { if (!/favicon|sw\.js/.test(r.url())) errors.push('request: ' + r.url() + ' ' + r.failure()?.errorText); });
  await page.goto(base + url, { waitUntil: 'load' }); await page.waitForTimeout(ms);
  const clean = async (ignore) => { assert.deepEqual(await page.evaluate(() => window.__csp), [], 'CSP 위반'); assert.deepEqual(errors.filter(e => !(ignore && ignore.test(e))), []); };
  return { page, ctx, errors, clean };
}
const postEvents = (api, evs) => fetch(api + '/api/events', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: 'http://localhost:3000', 'User-Agent': 'Mozilla/5.0 Chrome/131.0' }, body: JSON.stringify(evs) });
const mkEv = (id, type, sid, p, props = {}) => ({ event_id: id, site_id: 'site_demo', session_id: sid, event_type: type, page_path: p, timestamp: new Date().toISOString(), properties: props });
// 접근성(로드맵 57): axe-core를 page.evaluate로 넣어(CDP라 nonce CSP에 안 걸린다) 지금 화면의 위반을 모은다. 숨긴(hidden) 패널은 axe가 보지 않으므로 모달은 열어 놓고 잰다
const AXE = fs.readFileSync(path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
// exclude: 임베드의 건물 이름표(.labels)는 pointer-events:none이라 axe의 elementsFromPoint가 이름표 바탕을 못 보고, 임베드는 body가 투명(OBS)이라 흰 바탕으로 계산해 1:1이 나온다. 실제로는 #fff8ea 글자가 캔버스 위 78% 어두운 바탕에 있다(대시보드는 #stage 바탕이 있어 통과)
async function axeRun(page, label, exclude) { await page.evaluate(AXE); const v = await page.evaluate(async ex => (await axe.run(ex ? { exclude: [ex] } : document, { resultTypes: ['violations'] })).violations.map(x => `${x.id}(${x.impact}) x${x.nodes.length}: ${x.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), exclude || null); assert.deepEqual(v, [], label + ' axe 위반'); }

test('/demo: 콘솔 오류·CSP 위반 0, 캔버스가 그려지고 방문자가 걸어 다닌다, 픽셀 드롭다운·통계 모달이 뜬다', async () => {
  const { page, ctx, clean } = await open('/demo');
  assert.equal(await page.evaluate(() => document.getElementById('gate')?.hidden ?? true), true, '데모에서는 진입 화면이 숨겨진다');
  const d = await page.evaluate(() => { const c = document.querySelector('canvas'); const vt = window.__vt; return { w: c && c.width, chars: vt.world.chars.size, feed: document.querySelectorAll('#feed li').length, pxs: document.querySelectorAll('.pxs-btn').length }; });
  assert.ok(d.w > 0); assert.ok(d.chars > 0, '캐릭터'); assert.ok(d.feed > 0, '피드'); assert.ok(d.pxs >= 3, '드롭다운');
  await page.keyboard.press('d'); await page.waitForTimeout(400);
  await page.evaluate(() => window.__vt.showStats('now')); await page.waitForTimeout(500);
  assert.ok(await page.evaluate(() => document.querySelectorAll('#stBody .st-row .tag').length) > 0, '통계 "지금" 줄의 속성 태그(propTags)');
  await clean(); await ctx.close();
});

test('/app: 파라미터 없이 열면 진입 화면이 보이고 오류가 없다', async () => {
  const { page, ctx, clean } = await open('/app', 1500);
  assert.equal(await page.evaluate(() => document.getElementById('gate')?.hidden), false); await clean(); await ctx.close();
});

test('/design-system: 오류 없이 뜨고 드롭다운·확인창 예시가 동작한다', async () => {
  const { page, ctx, clean } = await open('/design-system#/select', 1500);
  assert.ok(await page.evaluate(() => document.querySelectorAll('#nav a').length) >= 5);
  await page.click('.pxs-btn >> nth=0'); await page.waitForTimeout(300); assert.ok(await page.evaluate(() => document.querySelectorAll('.pxs-list li').length) >= 2, '드롭다운 목록');
  await clean(); await ctx.close();
});

// SDK 브라우저 동작: 서버 없이 /api/events를 가로채 받은 묶음을 본다
async function sdkPage(html, ms = 1800) { // 1초 묶음 전송(로드맵 45) 뒤에 본다
  const ctx = await browser.newContext(); const page = await ctx.newPage(); const posts = []; const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await ctx.route('**/api/events', r => { posts.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"accepted":1}' }); });
  await page.goto(sdkBase + '/sdk/'); await page.setContent(html.replace(/\{BASE\}/g, sdkBase), { waitUntil: 'load' }); await page.waitForTimeout(ms); return { page, ctx, posts, errors };
}
test('SDK: <script data-site>면 바로 session_start·page_view를 보낸다', async () => {
  const { page, ctx, posts, errors } = await sdkPage('<script src="{BASE}/sdk/visitown.js" data-site="site_demo" data-api="{BASE}"></script>');
  assert.deepEqual(errors, []); const evs = posts.flatMap(p => p.events); assert.deepEqual(evs.map(e => e.event_type), ['session_start', 'page_view']); assert.equal(posts[0].site_id, 'site_demo');
  assert.equal(await page.evaluate(() => window.visitown.__loaded), true); await page.evaluate(() => window.visitown.track('purchase', { amount: 1 })); await page.waitForTimeout(200);
  assert.equal(posts.flatMap(p => p.events).at(-1).event_type, 'purchase'); await ctx.close();
});
test('SDK: data-site 없이 불러오면 기다렸다가 init(cfg)으로 시작한다 (번들러 경로)', async () => {
  const { page, ctx, posts, errors } = await sdkPage('<script src="{BASE}/sdk/visitown.js"></script>', 600);
  assert.deepEqual(errors, []); assert.equal(posts.length, 0, 'init 전에는 아무것도 보내지 않는다'); assert.equal(await page.evaluate(() => typeof window.visitown.init), 'function');
  await page.evaluate(b => window.visitown.init({ site: 'site_demo', api: b + '/', consent: 'wait' }), sdkBase); await page.waitForTimeout(400); assert.equal(posts.length, 0, 'consent wait');
  await page.evaluate(() => window.visitown.consent(true)); await page.waitForTimeout(1500);
  const evs = posts.flatMap(p => p.events); assert.deepEqual(evs.map(e => e.event_type), ['session_start', 'page_view']); assert.equal(evs[0].site_id, 'site_demo');
  await page.evaluate(() => window.visitown.init({ site: 'other' })); assert.equal(await page.evaluate(() => window.visitown.sessionId.startsWith('sess_')), true, '두 번째 init은 무시');
  await ctx.close();
});

// ---- 보안(docs/security.md S-01·S-02): 건물 이름(편집 멤버가 정함)·방문자 경로·속성(누구나 보낼 수 있음)에 든 HTML이 대시보드에서 실행되지 않는다. 실제 서버에 넣고 대시보드를 token=dev로 연다
test('보안: 건물 이름·방문자 경로·속성의 HTML이 이스케이프되어 실행되지 않는다', async () => {
  const srv = await startServer(); const api = srv.base, X = '<img src=x onerror="window.__xss=1">';
  try {
    const put = await fetch(api + '/api/sites/site_demo/pages?token=dev', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pages: [{ path: '/', name: '광장' + X, kind: 'plaza', slot: 0 }, { path: '/products', name: '상점', pattern: '^/products(/|$)' }] }) }); assert.equal(put.status, 200);
    const mk = (id, type, extra = {}) => mkEv(id, type, 'sess_xss', '/products/' + X, { device: X, referrer: X, plan: X, ...extra });
    const r = await postEvents(api, [mk('x1', 'session_start'), mk('x2', 'page_view'), mk('x3', 'purchase', { amount: 1, note: X })]);
    assert.equal((await r.json()).accepted, 3);
    const { page, ctx, clean } = await open(`/app?api=${encodeURIComponent(api)}&site=site_demo&token=dev`, 3000);
    const out = await page.evaluate(async () => { const tick = () => new Promise(r => setTimeout(r, 300)); const store = window.__vt.store; // 정보 패널은 React가 store.selectedId를 보고 그린다(로드맵 53)
      const s = store.sessions.get('sess_xss'); if (s) store.select('sess_xss'); await tick(); const charHtml = document.getElementById('infoBody').innerHTML;
      store.select('/'); await tick(); const bHtml = document.getElementById('infoBody').innerHTML;
      return { hasSession: !!s, charHtml, bHtml, labels: document.getElementById('labels').innerHTML, feed: document.getElementById('feed')?.innerHTML || '', xss: window.__xss, imgs: document.querySelectorAll('img[src="x"]').length };
    });
    assert.equal(out.hasSession, true, '방문자 세션이 대시보드에 들어왔다'); assert.equal(out.xss, undefined, 'onerror가 실행되지 않았다'); assert.equal(out.imgs, 0, '주입된 img 요소가 없다');
    for (const [k, h] of Object.entries({ charHtml: out.charHtml, bHtml: out.bHtml, labels: out.labels, feed: out.feed })) assert.doesNotMatch(h, /<img src=x/, k + '에 원본 HTML이 없다');
    assert.match(out.labels, /&lt;img src=x/, '건물 이름표는 글자로 보인다'); assert.match(out.charHtml, /&lt;img src=x/, '방문자 경로는 글자로 보인다');
    await clean(/favicon/);
    await ctx.close();
  } finally { srv.proc.kill(); }
});

// ---- 보안 S-30·S-31: ?api=는 허용 목록(DEFAULT_API 또는 로컬 페이지의 localhost 서버)만. 대시보드는 그 주소로 토큰을 보내고 랜딩은 그 주소의 SDK를 실행하므로 아무 주소나 받으면 링크 하나로 계정이 넘어간다
test('보안 S-30·S-31: 대시보드·랜딩이 ?api=의 낯선 주소로 요청·스크립트 로드를 하지 않고, 저장된 주소도 고쳐 쓴다', async () => {
  const EVIL = 'https://evil.invalid'; const hits = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); page.on('request', r => { if (r.url().startsWith(EVIL)) hits.push(r.url()); });
  await page.route(EVIL + '/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"sites":[],"supabaseUrl":"https://evil.invalid","supabaseAnonKey":"k"}' })); // 요청이 가면 바로 '응답'해 토큰이 실리는지 본다
  // 이미 오염된 브라우저: vt_conn.api가 낯선 주소이고 로그인 토큰(vt_auth)이 있다
  await page.addInitScript(() => { try { localStorage.setItem('vt_conn', JSON.stringify({ api: 'https://evil.invalid', site: 'site_demo' })); localStorage.setItem('vt_auth', JSON.stringify({ token: 'eyJ.fake.token', refresh: 'r', exp: Date.now() + 3600e3 })); } catch {} });
  await page.goto(base + '/app?api=' + encodeURIComponent(EVIL) + '&site=site_demo', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const conn = await page.evaluate(() => JSON.parse(localStorage.getItem('vt_conn') || '{}').api); assert.notEqual(conn, EVIL, '저장된 주소가 허용 목록으로 고쳐졌다'); assert.deepEqual(hits, [], '대시보드가 낯선 주소로 요청하지 않았다');
  await page.goto(base + '/?api=' + encodeURIComponent(EVIL), { waitUntil: 'load' }); await page.waitForTimeout(2000);
  const src = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(u => /visitown\.js/.test(u))); assert.ok(src.length && src.every(u => !u.startsWith(EVIL)), 'SDK를 낯선 주소에서 부르지 않는다: ' + src.join(','));
  assert.deepEqual(hits, [], '랜딩이 낯선 주소로 요청하지 않았다'); await ctx.close();
  // 허용 규칙 자체(apps/web/lib/api.ts clientApi): 서버 렌더링(/town)도 같은 함수를 쓴다
  const { transformSync } = require('esbuild'); const m = { exports: {} }; new Function('module', 'exports', 'process', transformSync(fs.readFileSync(path.join(ROOT, 'apps', 'web', 'lib', 'api.ts'), 'utf8'), { loader: 'ts', format: 'cjs' }).code)(m, m.exports, { env: {} });
  const { clientApi, embedApi, DEFAULT_API, LOCAL_API } = m.exports;
  assert.equal(clientApi(EVIL, 'visitown.vercel.app'), DEFAULT_API); assert.equal(clientApi(EVIL, 'localhost'), LOCAL_API); assert.equal(clientApi('http://localhost:8788', 'visitown.vercel.app'), DEFAULT_API, '배포된 페이지는 localhost 서버도 안 받는다');
  assert.equal(clientApi('http://localhost:8788', '127.0.0.1'), 'http://localhost:8788'); assert.equal(clientApi(DEFAULT_API + '/', 'visitown.vercel.app'), DEFAULT_API); assert.equal(clientApi(null, 'visitown.vercel.app'), DEFAULT_API);
  assert.equal(embedApi(EVIL, 'visitown.vercel.app'), EVIL, '임베드(토큰 없음, iframe 넣는 쪽이 주소를 정함)만 예외');
});

// ---- CSP·보안 헤더·옛 주소(S-03·S-07·S-24, 로드맵 56): script-src에 'unsafe-inline' 없이 요청마다 다른 nonce + 'strict-dynamic'. 임베드·공개 마을만 iframe 허용. index.html?… 주소는 새 라우트로
test('헤더: nonce CSP(unsafe-inline 없음)·HSTS·nosniff, 임베드·공개 마을만 frame 허용, 옛 index.html 주소는 redirect·rewrite로 산다', async () => {
  const h = async u => { const r = await fetch(base + u, { redirect: 'manual' }); return { status: r.status, loc: r.headers.get('location'), csp: r.headers.get('content-security-policy') || '', xfo: r.headers.get('x-frame-options'), hsts: r.headers.get('strict-transport-security'), nosniff: r.headers.get('x-content-type-options'), body: await r.text() }; };
  const app = await h('/app'), app2 = await h('/app');
  assert.match(app.csp, /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/); assert.doesNotMatch(app.csp.match(/script-src[^;]*/)[0], /unsafe-inline/); assert.match(app.csp, /frame-ancestors 'self'/); assert.match(app.csp, /worker-src 'self'/);
  assert.ok(app.body.includes(`nonce="${app.csp.match(/'nonce-([^']+)'/)[1]}"`), 'HTML의 스크립트에 같은 nonce'); assert.notEqual(app.csp, app2.csp, '요청마다 다른 nonce');
  assert.equal(app.xfo, 'SAMEORIGIN'); assert.match(app.hsts, /max-age=63072000/); assert.equal(app.nosniff, 'nosniff');
  const emb = await h('/embed/emb_x?site=site_demo'); assert.equal(emb.status, 200); assert.doesNotMatch(emb.csp, /frame-ancestors/); assert.equal(emb.xfo, null, '임베드는 고객 사이트 iframe에 들어간다');
  const town = await h('/town/site_x'); assert.doesNotMatch(town.csp, /frame-ancestors/); assert.equal(town.xfo, null);
  const legal = await h('/legal/privacy.html'); assert.equal(legal.status, 200); assert.match(legal.csp, /script-src 'self';/); assert.equal(legal.nosniff, 'nosniff');
  for (const [u, to] of [['/index.html?demo=1', /^\/demo/], ['/index.html?api=http%3A%2F%2Fx&site=s1&token=dev', /^\/app\?api=http%3A%2F%2Fx&site=s1&token=dev$/], ['/landing', /^\/$/]]) { const r = await h(u); assert.ok([307, 308].includes(r.status), u + ' ' + r.status); assert.match(r.loc, to, u); }
  const rw = await h('/index.html?api=x&site=site_demo&embed=emb_abc&me=sess_1'); assert.equal(rw.status, 200); assert.ok(rw.body.includes('vt-embed-page'), '임베드 주소는 rewrite(주소 그대로)'); assert.equal(rw.xfo, null);
  const rw2 = await h('/?embed=emb_abc&site=site_demo'); assert.equal(rw2.status, 200); assert.ok(rw2.body.includes('vt-embed-page'));
  const nf = await h('/town/site_nope'); assert.equal(nf.status, 404);
});

test('랜딩(/): CSP 아래에서 오류 없이 뜨고 수집 서버의 SDK·마을 iframe(/embed)·배지가 연결된다', async () => {
  const srv = await startServer(); try {
    const api = 'http://localhost:' + new URL(srv.base).port;
    const { key } = await (await fetch(srv.base + '/api/sites/site_demo/embed?token=dev', { method: 'POST' })).json();
    const { page, ctx, clean } = await open(`/?api=${encodeURIComponent(api)}&site=site_demo&key=${key}`, 3000);
    const out = await page.evaluate(() => ({ sdk: !!(window.visitown && window.visitown.sessionId), iframe: document.getElementById('town').src, count: document.getElementById('count').textContent, badge: document.getElementById('badgeImg').src, start: document.getElementById('ctaStart').getAttribute('href') }));
    assert.equal(out.sdk, true, '수집 서버의 SDK가 로드됐다(strict-dynamic: nonce 스크립트가 만든 스크립트)'); assert.match(out.iframe, /\/embed\/emb_[a-z0-9]+\?api=.*&me=sess_/); assert.match(out.count, /지금 \d+명/); assert.match(out.badge, /\/badge\?embed=emb_/); assert.match(out.start, /^\/app\?api=/);
    // 웹 앱 포트는 site_demo의 allowed_origins에 없어 SDK 전송은 403이 맞다(origin 검사). 그 밖의 오류는 0
    await clean(/favicon|\/api\/events/);
    await ctx.close();
  } finally { srv.proc.kill(); }
});

test('랜딩(/): 마을 연결이 사이트당 SSE 상한(503)에 막히면 데모 마을로 바꾼다(로드맵 61, 레딧 몰림)', async () => {
  const srv = await startServer({ MAX_SSE_PER_SITE: '0' }); try {
    const api = 'http://localhost:' + new URL(srv.base).port;
    const { key } = await (await fetch(srv.base + '/api/sites/site_demo/embed?token=dev', { method: 'POST' })).json();
    const { page, ctx, clean } = await open(`/?api=${encodeURIComponent(api)}&site=site_demo&key=${key}`, 1000);
    await page.waitForFunction(() => /\/demo$/.test(document.getElementById('town').src), null, { timeout: 15000 });
    assert.match(await page.textContent('#liveLine'), /DEMO.*사람이 많아/);
    await clean(/favicon|\/api\/events|\/stream|503/);
    await ctx.close();
  } finally { srv.proc.kill(); }
});

// ---- 임베드(로드맵 19·56 /embed/[key], 엔진만)와 공개 마을(/town/[slug], 서버 렌더링 + OG)
test('임베드·공개 마을: /embed/[key]가 엔진만으로 마을을 그리고(ME·이름표·브랜드), 옛 ?embed= 주소도 같은 화면, /town/[slug]는 이름·접속자 수를 OG로 준다', async () => {
  const srv = await startServer(); try {
    const api = srv.base; const { key } = await (await fetch(api + '/api/sites/site_demo/embed?token=dev', { method: 'POST' })).json();
    await fetch(api + '/api/sites/site_demo/public?token=dev', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"on":true}' });
    await postEvents(api, [mkEv('em1', 'session_start', 'sess_em', '/products', { country: 'KR' })]);
    const { page, ctx, clean } = await open(`/embed/${key}?api=${encodeURIComponent(api)}&site=site_demo&me=sess_em`, 2500);
    const d = await page.evaluate(() => { const c = document.querySelector('.vt-embed canvas'); const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const colors = new Set(); for (let i = 0; i < px.length; i += 4 * 97) colors.add(px[i] + ',' + px[i + 1] + ',' + px[i + 2]);
      return { s: +getComputedStyle(document.querySelector('.vt-embed')).getPropertyValue('--s'), labels: document.querySelectorAll('.vt-embed .label').length, brand: !!document.querySelector('.vt-embed .brand'), err: document.querySelector('.vt-embed .err').hidden, colors: colors.size, bodyBg: getComputedStyle(document.body).backgroundColor, panels: document.querySelectorAll('#feed,#side,#ctl').length }; });
    await axeRun(page, '/embed', '.vt-embed .labels'); assert.ok(d.s > 0.5, '배율'); assert.ok(d.labels >= 5, '건물 이름표'); assert.equal(d.brand, true); assert.equal(d.err, true, '스트림 연결'); assert.ok(d.colors > 20, '캔버스에 마을이 그려졌다'); assert.equal(d.bodyBg, 'rgba(0, 0, 0, 0)', '배경 투명'); assert.equal(d.panels, 0, '패널 없음');
    await clean(); await ctx.close();
    const old = await open(`/index.html?api=${encodeURIComponent(api)}&site=site_demo&embed=${key}&brand=0&labels=0`, 1500);
    const o = await old.page.evaluate(() => ({ url: location.pathname, embed: !!document.querySelector('.vt-embed'), brand: !!document.querySelector('.vt-embed .brand'), labels: document.querySelector('.vt-embed .labels').hidden }));
    assert.equal(o.url, '/index.html', '주소는 그대로(rewrite)'); assert.equal(o.embed, true); assert.equal(o.brand, false, 'brand=0'); assert.equal(o.labels, true, 'labels=0'); await old.clean(); await old.ctx.close();
    const t = await open(`/town/site_demo?api=${encodeURIComponent(api)}`, 2000);
    const td = await t.page.evaluate(() => ({ title: document.title, og: document.querySelector('meta[property="og:title"]')?.content, desc: document.querySelector('meta[property="og:description"]')?.content, canvas: !!document.querySelector('.vt-embed canvas'), labels: document.querySelectorAll('.vt-embed .label').length }));
    assert.match(td.title, /마을 · Visitown/); assert.match(td.og, /마을 · Visitown/); assert.match(td.desc, /지금 \d+명/); assert.equal(td.canvas, true); assert.ok(td.labels >= 5);
    await axeRun(t.page, '/town', '.vt-embed .labels'); await t.clean(); await t.ctx.close();
  } finally { srv.proc.kill(); }
});

// ---- SSE 재접속 무손실(로드맵 44·54·55): 서버가 스트림을 끊으면(SSE_MAX_AGE_MS) useSiteStream 훅이 새 티켓 + lastEventId로 다시 붙고, 서버는 스냅샷 대신 놓친 이벤트만 준다
test('재접속 무손실·리플레이 중 라이브 유지: 끊겼다 붙으면 놓친 이벤트만 복구하고, 리플레이 동안 들어온 방문자가 끝낸 뒤 바로 보인다', async () => {
  const srv = await startServer({ SSE_MAX_AGE_MS: '1500' }); const api = srv.base;
  try {
    const mk = (id, type, sid, p) => mkEv(id, type, sid, p);
    await postEvents(api, [mk('rc1', 'session_start', 'rc_a', '/')]);
    const { page, ctx, clean } = await open(`/app?api=${encodeURIComponent(api)}&site=site_demo&token=dev`, 1000);
    assert.equal(await page.evaluate(() => window.__vt.store.sessions.size), 1, '스냅샷으로 1명 복원');
    await page.waitForFunction(() => window.__vt.live.status === 'connecting' && window.__vt.store.frozen === true, null, { timeout: 5000 }); // 1.5초 뒤 서버가 끊음: 끊긴 동안은 로컬 만료를 멈춘다
    await postEvents(api, [mk('rc2', 'session_start', 'rc_b', '/products'), mk('rc3', 'page_view', 'rc_a', '/checkout')]); // 끊긴 동안 일어난 일
    await page.waitForFunction(() => /놓친 2건/.test(document.getElementById('feed').innerText), null, { timeout: 10000 }); // 백오프 뒤 새 티켓 + lastEventId로 다시 붙는다
    const out = await page.evaluate(() => { const { live, store } = window.__vt; return { text: live._text, n: store.sessions.size, pages: [...store.sessions.values()].map(s => s.page).sort(), dups: store.duplicates, frozen: store.frozen }; });
    assert.match(out.text, /실시간/, out.text); assert.equal(out.n, 2); assert.deepEqual(out.pages, ['/checkout', '/products']); assert.equal(out.dups, 0, '중복 적용 0'); assert.equal(out.frozen, false);
    const st = await (await fetch(api + '/api/sites/site_demo/state?token=dev')).json(); assert.equal(st.totals.sse.snapshots, 1, '스냅샷 재전송 0회'); assert.equal(st.totals.sse.recovered, 2, '복구 2건'); assert.ok(st.totals.sse.resumed >= 1);
    // 리플레이 중 라이브 유지(로드맵 54): 리플레이는 따로 만든 스토어를 보고(view), 라이브 스토어는 스트림을 계속 받아 쌓인다. 끝내면 다시 연결하지 않고 바로 현재 상태
    await page.evaluate(() => window.__vt.startReplay()); await page.waitForFunction(() => window.__vt.replay.active, null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => window.__vt.view !== window.__vt.store), true, '리플레이 스토어');
    await postEvents(api, [mk('rc4', 'session_start', 'rc_c', '/mypage')]); await page.waitForFunction(() => window.__vt.store.sessions.has('rc_c'), null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => window.__vt.view.sessions.has('rc_c')), false, '리플레이 화면에는 안 들어온다');
    await page.evaluate(() => window.__vt.exitReplay()); await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ view: window.__vt.view === window.__vt.store, n: window.__vt.store.sessions.size, chars: window.__vt.world.chars.size, c: window.__vt.world.chars.has('rc_c') }));
    assert.deepEqual(after, { view: true, n: 3, chars: 3, c: true }); const st2 = await (await fetch(api + '/api/sites/site_demo/state?token=dev')).json(); assert.equal(st2.totals.sse.snapshots, 1, '리플레이를 끝내도 다시 연결하지 않는다');
    await clean(/favicon|ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|\/stream\?/); // 오프라인 동안의 네트워크 실패 말고는 오류 0
    await ctx.close();
  } finally { srv.proc.kill(); }
});

// ---- SDK 오프라인 큐·배치(로드맵 45): /api/events를 막았다 풀면 지수 백오프로 다시 보내고, 막힌 채 페이지를 떠나도 localStorage(vt_q)에 남아 다음 로드가 보낸다
async function sdkQueuePage() {
  const ctx = await browser.newContext(); const page = await ctx.newPage(); const got = new Map(); const errors = []; const net = { blocked: false, posts: 0, aborted: 0 };
  page.on('pageerror', e => errors.push(e.message));
  await ctx.route('**/api/events', r => { if (net.blocked) { net.aborted++; return r.abort('failed'); } net.posts++; for (const e of JSON.parse(r.request().postData()).events) got.set(e.event_id, e); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"accepted":1}' }); });
  const load = async () => { await page.goto(sdkBase + '/sdk/?q=' + Math.random()); await page.setContent(`<script src="${sdkBase}/sdk/visitown.js" data-site="site_demo" data-api="${sdkBase}"></script>`, { waitUntil: 'load' }); };
  return { page, ctx, got, errors, net, load, types: () => [...got.values()].map(e => e.event_type) };
}
test('SDK 큐: 전송이 실패하면 버리지 않고 백오프로 다시 보낸다(1초 묶음, 같은 요청 하나)', async () => {
  const { page, ctx, errors, net, load, types } = await sdkQueuePage(); await load(); await page.waitForTimeout(1800);
  assert.equal(net.posts, 1, 'session_start·page_view는 한 요청에 묶인다'); assert.deepEqual(types(), ['session_start', 'page_view']);
  net.blocked = true; await page.evaluate(() => { window.visitown.track('purchase', { amount: 1 }); window.visitown.track('sign_up'); }); await page.waitForTimeout(700);
  assert.ok(net.aborted >= 1, '막힌 동안 시도는 했다'); assert.equal(types().length, 2, '아직 못 받았다');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('vt_q') || '[]').map(e => e.event_type)); assert.deepEqual(stored, ['purchase', 'sign_up'], '못 보낸 것만 vt_q에 남는다');
  net.blocked = false; await page.waitForFunction(() => !localStorage.getItem('vt_q'), null, { timeout: 8000 }); // 백오프 1~1.5초 → 재시도 성공
  assert.deepEqual(types(), ['session_start', 'page_view', 'purchase', 'sign_up']); assert.deepEqual(errors, []); await ctx.close();
});
test('SDK 큐: 막힌 채 페이지를 떠나도 이탈 이벤트가 다음 로드에서 도착한다(이탈 이벤트 유실률 0%)', async () => {
  const { page, ctx, got, errors, net, load, types } = await sdkQueuePage(); await load(); await page.waitForTimeout(1800);
  net.blocked = true; await page.evaluate(() => { window.visitown.track('purchase', { amount: 2 }); }); await page.waitForTimeout(300);
  const sid = await page.evaluate(() => window.visitown.sessionId);
  await load(); // pagehide → page_leave가 큐에 남고(비컨은 막힘) 새 로드는 아직 막힌 상태라 vt_q가 그대로다
  await page.waitForTimeout(1500); const sentWhileBlocked = ['purchase', 'page_leave'];
  const before = sentWhileBlocked.filter(t => types().includes(t)).length; assert.equal(before, 0, '막힌 동안 보낸 것은 아직 0건');
  net.blocked = false; await page.waitForFunction(() => !localStorage.getItem('vt_q'), null, { timeout: 8000 });
  const leaveEv = [...got.values()].find(e => e.event_type === 'page_leave'); assert.ok(leaveEv && leaveEv.session_id === sid, '이전 페이지의 page_leave가 도착했다');
  assert.ok([...got.values()].some(e => e.event_type === 'purchase' && e.properties.amount === 2), '막힌 동안의 구매도 도착했다');
  const lost = sentWhileBlocked.filter(t => !types().includes(t)).length; assert.equal(lost / sentWhileBlocked.length, 0, '이탈 이벤트 유실률 0%');
  assert.deepEqual(errors, []); await ctx.close();
});

// ---- 리텐션 탭(로드맵 49): 데모 데이터로 코호트 표가 그려지고 오류가 없다
test('통계 모달 리텐션 탭: 코호트 표(첫 방문 주·신규·D1·D7)가 그려진다', async () => {
  const { page, ctx, clean } = await open('/demo', 1500);
  await page.evaluate(() => window.__vt.showStats('retention')); await page.waitForTimeout(600);
  const out = await page.evaluate(() => ({ rows: document.querySelectorAll('#stBody table.rt tbody tr').length, head: [...document.querySelectorAll('#stBody table.rt th')].map(t => t.textContent), tiles: [...document.querySelectorAll('#stBody .st-tile')].map(t => t.textContent), pct: [...document.querySelectorAll('#stBody table.rt td')].filter(td => /\d+%/.test(td.textContent)).length }));
  assert.ok(out.rows >= 7, '주 단위 코호트 ' + out.rows); assert.deepEqual(out.head, ['첫 방문 주', '신규', 'D1', 'D7']); assert.match(out.tiles.join(' '), /D1 평균\d+%/); assert.ok(out.pct >= 7, '비율 칸');
  await clean(); await ctx.close();
});

// ---- 접근성(로드맵 57): axe 위반 0, 마을(#stage, role=application) 키보드 순회(← → 방문자, ↑ ↓ 건물, Enter 따라가기, Esc 해제 → 선택은 selectedId 하나), 30초 피드 요약(role=status), prefers-reduced-motion이면 캔버스 꾸밈 움직임 0
test('접근성: axe 위반 0(/demo 밝게·어둡게·통계·도감, /app, /, /design-system), 키보드로 방문자·건물 순회, 피드 요약 aria-live, 동작 줄이기', async () => {
  const { page, ctx, clean } = await open('/demo', 2500);
  await page.evaluate(() => { window.__vt.sim.running = false; }); await page.waitForTimeout(500); // 새 피드 줄의 페이드인 중간(반투명 글자)을 재지 않게 시뮬레이터를 멈추고 애니메이션이 끝난 뒤 잰다
  await axeRun(page, '/demo');
  await page.evaluate(() => window.__vt.showStats('now')); await page.waitForTimeout(400); await axeRun(page, '/demo 통계');
  await page.evaluate(() => window.__vt.showDex()); await page.waitForTimeout(400); await axeRun(page, '/demo 도감');
  assert.equal(await page.evaluate(() => document.querySelectorAll('#sitePanel [data-tk] [tabindex], #sitePanel [data-tk][tabindex]').length), 0, '도감 카드는 포커스를 받지 않는다(표지 버튼이 키보드 길)');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300); await page.keyboard.press('d'); await page.waitForTimeout(300); await axeRun(page, '/demo 어둡게');
  // 키보드 순회. 선택은 캔버스 클릭·피드 클릭과 같은 길(view.select)이라 정보 패널(aria-live)에 나온다
  await page.focus('#stage'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  const k1 = await page.evaluate(() => ({ sel: window.__vt.view.selectedId, char: window.__vt.world.chars.has(window.__vt.view.selectedId), follow: document.querySelector('#btnFollow')?.getAttribute('aria-pressed'), info: document.getElementById('infoBody').innerText }));
  assert.ok(k1.char, '→: 방문자 하나가 골라진다 ' + k1.sel); assert.equal(k1.follow, 'true', '고르면 따라가기'); assert.match(k1.info, /현재 페이지/);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100); const k2 = await page.evaluate(() => window.__vt.view.selectedId); assert.notEqual(k2, k1.sel, '→ 한 번 더: 다음 방문자');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(100); assert.equal(await page.evaluate(() => window.__vt.view.selectedId), k1.sel, '←: 이전 방문자');
  await page.keyboard.press('Enter'); await page.waitForTimeout(200); assert.equal(await page.evaluate(() => document.querySelector('#btnFollow')?.getAttribute('aria-pressed')), 'false', 'Enter: 따라가기 끔');
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
  const b1 = await page.evaluate(() => { const vt = window.__vt; return { sel: vt.view.selectedId, building: window.__vt.view.selectedId && !!document.querySelector('#infoBody') && vt.store.counts[vt.view.selectedId] !== undefined, info: document.getElementById('infoBody').innerText }; });
  assert.ok(b1.building, '↓: 건물 경로가 골라진다 ' + b1.sel); assert.doesNotMatch(b1.info, /현재 페이지/);
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100); assert.notEqual(await page.evaluate(() => window.__vt.view.selectedId), b1.sel, '↓ 한 번 더: 다음 건물');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100); assert.equal(await page.evaluate(() => window.__vt.view.selectedId), null, 'Esc: 선택 해제');
  assert.equal(await page.evaluate(() => document.activeElement === document.getElementById('stage')), true, '포커스는 마을에 남는다');
  // 피드 요약: 30초마다 한 문장. 그 전엔 비어 있고, announce()로 지금 읽어 주면 그동안의 줄 수와 접속자 수가 들어간다
  assert.equal(await page.evaluate(() => document.getElementById('feedLive').textContent), '', '30초 전엔 조용하다');
  await page.evaluate(() => window.__vt.ui.announce()); await page.waitForTimeout(200);
  const live = await page.evaluate(() => ({ text: document.getElementById('feedLive').textContent, role: document.getElementById('feedLive').getAttribute('role'), polite: document.getElementById('feedLive').getAttribute('aria-live') }));
  assert.match(live.text, /^지난 30초: .+\. 지금 접속자 \d+명\.$/, live.text); assert.match(live.text, /입장|이동|떠남|이벤트/); assert.equal(live.role, 'status'); assert.equal(live.polite, 'polite');
  await clean(); await ctx.close();
  // 다른 라우트
  for (const r of ['/app', '/', '/design-system']) { const o = await open(r, 1500); await axeRun(o.page, r); await o.ctx.close(); }
  // 동작 줄이기: CSS는 전역 규칙(0.01ms), 캔버스는 엔진 world.reduceMotion(파티클 0, 비·눈 안 그림)
  const rctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }); const rp = await rctx.newPage();
  await rp.goto(base + '/demo', { waitUntil: 'load' }); await rp.waitForTimeout(2500);
  const rm = await rp.evaluate(() => { const vt = window.__vt; vt.sim.rain = true; vt.world.burst(100, 100, 'fireworks'); vt.world.update(0.05); return { flag: vt.world.reduceMotion, particles: vt.world.particles.length, chars: vt.world.chars.size, btn: parseFloat(getComputedStyle(document.querySelector('.btn')).transitionDuration) }; });
  assert.deepEqual({ flag: rm.flag, particles: rm.particles }, { flag: true, particles: 0 }); assert.ok(rm.btn < 0.001, 'CSS 전환 0.01ms: ' + rm.btn); assert.ok(rm.chars > 0, '캐릭터(내용)는 그대로 걷는다');
  await rctx.close();
});

// 영어(로드맵 60): Accept-Language가 en이면 서버가 <html lang="en">과 영어 마크업을 보내고, 셸·패널·엔진 이름도 영어. 숨은 메뉴·모달까지 화면 글자·속성에 한글이 남지 않는다(언어 토글의 '한국어'만 예외: lang="ko")
test('영어(로드맵 60): /·/demo(통계·도감·피드 요약)·/app이 영어로 뜨고 한글이 남지 않으며 오류·CSP·axe 0, 토글로 한국어', async () => {
  const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); const errors = [];
  await page.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); }); page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const hangul = () => page.evaluate(() => { const H = /[가-힣]/, out = new Set(); const skip = el => !el || el.closest('[lang="ko"], script, style, noscript');
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (!skip(n.parentElement) && H.test(n.nodeValue)) out.add(n.nodeValue.trim().slice(0, 50));
    for (const el of document.querySelectorAll('[title],[aria-label],[placeholder],[alt]')) for (const a of ['title', 'aria-label', 'placeholder', 'alt']) { const v = el.getAttribute(a); if (v && H.test(v) && !skip(el)) out.add(a + '=' + v.slice(0, 50)); }
    if (H.test(document.title)) out.add('title: ' + document.title); return [...out]; });
  for (const u of ['/', '/app']) {
    await page.goto(base + u, { waitUntil: 'load' }); await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en', u); assert.deepEqual(await hangul(), [], u + ' 한글');
  }
  errors.length = 0; // 랜딩은 수집 서버(로컬 기본 8787)에 붙으므로 콘솔 오류는 서버가 필요 없는 /demo부터 센다(랜딩 오류는 위 '랜딩(/)' 테스트가 실제 서버로 본다)
  await page.goto(base + '/demo', { waitUntil: 'load' }); await page.waitForTimeout(3500);
  assert.deepEqual(await hangul(), [], '/demo 한글');
  await page.evaluate(() => window.__vt.ui.announce()); await page.waitForTimeout(200);
  assert.match(await page.evaluate(() => document.getElementById('feedLive').textContent), /^[\x20-\x7e·…]+$/, '피드 요약도 영어');
  await page.evaluate(() => { window.__vt.sim.running = false; window.__vt.showStats('now'); }); await page.waitForTimeout(600); assert.deepEqual(await hangul(), [], '/demo 통계 한글'); await axeRun(page, '/demo en 통계');
  await page.keyboard.press('Escape'); await page.evaluate(() => window.__vt.showDex()); await page.waitForTimeout(600); assert.deepEqual(await hangul(), [], '/demo 도감 한글');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300); await axeRun(page, '/demo en');
  assert.deepEqual(await page.evaluate(() => window.__csp), [], 'CSP 위반'); assert.deepEqual(errors, []);
  // 토글: 쿠키를 쓰고 새로고침 → 한국어
  await page.evaluate(() => document.querySelector('[data-langpick="ko"]').click()); await page.waitForLoadState('load'); await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'ko', '토글 뒤 한국어'); assert.match(await page.evaluate(() => document.body.innerText), /접속자/);
  await ctx.close();
});
