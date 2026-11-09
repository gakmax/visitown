'use strict';
// React 패널 패키지(packages/ui, 로드맵 53): strict 타입 검사, 브라우저 번들에 엔진이 안 들어감, 피드·정보 패널·헤더가 서버 데이터(HTML 포함)를 글자로만 그림, 피드 스토어 상한·참조 안정, 알림 묶기
// 번들(dist/index.cjs, react 외부)은 npm run build:packages가 만든다. 웹 앱(apps/web)은 TSX 소스를 직접 묶는다. 렌더는 react-dom/server로(브라우저 없이), 실제 화면은 tests/smoke.test.js
const { test } = require('node:test'); const assert = require('node:assert/strict');
const path = require('path'); const fs = require('fs'); const { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..'); const DIST = path.join(ROOT, 'packages', 'ui', 'dist', 'index.cjs');
assert.ok(fs.existsSync(DIST), 'UI 번들이 없어요. npm run build:packages 먼저');
const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
const UI = require(DIST); const E = require(path.join(ROOT, 'packages', 'engine', 'dist', 'index.cjs'));
const X = '<img src=x onerror="window.__xss=1">';

test('UI TS 소스가 strict 타입 검사를 통과한다(packages/ui/tsconfig.json, 엔진은 dist/types d.ts로만 본다)', () => {
  const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'); assert.ok(fs.existsSync(tsc), 'typescript가 없어요. npm ci');
  execFileSync(process.execPath, [tsc, '-p', path.join(ROOT, 'packages', 'ui')], { stdio: 'pipe' });
});

test('UI 번들(dist/index.cjs)에 엔진이 들어 있지 않다(엔진은 mount()로 받는다. 값을 import하면 화면 아이콘·건물이 두 벌이 된다)', () => {
  const src = fs.readFileSync(DIST, 'utf8'); assert.match(src, /require\("react"\)/, 'react는 외부'); assert.doesNotMatch(src, /layoutTown|new TownStore|@visitown\/engine/);
});

// 엔진 CJS에는 캔버스가 없어 에셋(A)이 비어 있다. 아이콘·이름만 가짜로 넣고 나머지(스토어·건물·라벨)는 진짜 엔진을 쓴다
function setup() {
  const store = new E.TownStore({ now: () => 1000 }); const feed = UI.createFeedStore(30); const ui = UI.createStore({ rev: 0, follow: false, clock: '06:00', weather: '', weatherTitle: '' });
  const engine = { ...E, A: { iconUrl: { enter: 'data:enter', walk: 'data:walk', house: 'data:house', person: 'data:p', spark: 'data:s', robot: 'data:r', bolt: 'data:b', plaza: 'data:plaza' }, colors: [{ name: '빨강' }], shapes: [{ name: '둥근' }] } };
  const world = { chars: new Map(), vitals: {}, charImage: () => 'data:char' };
  const sub = fn => store.subscribe(fn); let ver = 0; store.subscribe(() => { ver++; });
  const ctx = { engine, store, world, feed, ui, actions: { pick() {}, toggleFollow() {} }, sub: { store: sub, slow: UI.throttled(sub, 250), version: () => ver } };
  const render = type => renderToStaticMarkup(React.createElement(UI.UiContext.Provider, { value: ctx }, React.createElement(type)));
  return { store, feed, ui, world, engine, render };
}
const ev = (id, sid, type, page_path = '/', properties = {}) => ({ event_id: id, site_id: 'site_demo', session_id: sid, event_type: type, page_path, timestamp: new Date(1000).toISOString(), properties });

test('피드: 조각의 글자는 이스케이프되고 {b}·{muted}·{btn}은 요소가 된다, 선택된 세션 줄은 .hi, 최신 줄이 위', () => {
  const c = setup(); c.feed.add({ parts: ['방문자 ', { b: '#A01' }, '가 ', X, ' ', { muted: X, title: X }, { btn: '카드', onClick() {} }], icon: 'enter', sid: 's1', at: 0 }); c.feed.add({ parts: '연결됐어요', icon: 'house', cls: 'sys note' });
  c.store.select('s1'); const html = c.render(UI.Feed);
  assert.doesNotMatch(html, /<img src=x/); assert.match(html, /&lt;img src=x/); assert.match(html, /<li[^>]* class="hi"/); assert.match(html, /class="sys note"/);
  assert.match(html, /<button class="btn mini" type="button">카드<\/button>/); assert.match(html, /<b>#A01<\/b>/); assert.match(html, /<img src="data:enter" alt="enter"\/>/);
  assert.equal((html.match(/<li/g) || []).length, 2); assert.ok(html.indexOf('연결됐어요') < html.indexOf('#A01'), '최신 줄이 위');
});

test('피드 스토어: 상한을 넘으면 오래된 줄이 빠지고, 추가하지 않으면 같은 배열 참조(useSyncExternalStore 조건), clear는 비어 있으면 알리지 않는다', () => {
  const f = UI.createFeedStore(3); for (let i = 0; i < 5; i++) f.add({ parts: String(i), icon: 'enter' }); assert.deepEqual(f.get().map(e => e.parts[0]), ['4', '3', '2']);
  const a = f.get(); assert.equal(f.get(), a); let n = 0; f.subscribe(() => n++); f.add({ parts: 'x', icon: 'enter' }); assert.equal(n, 1); assert.notEqual(f.get(), a);
  f.clear(); assert.equal(n, 2); assert.deepEqual(f.get(), []); f.clear(); assert.equal(n, 2);
});

test('정보 패널: 선택 없음 → 안내, 건물 경로 → 건물(인원·바이탈), 세션 id → 캐릭터(경로·속성의 HTML은 글자, 나라 깃발, 따라가기 aria-pressed), 캐릭터가 없으면 떠났어요', () => {
  const c = setup();
  assert.match(c.render(UI.InfoPanel), /캐릭터나 건물을 클릭하면/);
  c.store.select('/'); let html = c.render(UI.InfoPanel); assert.match(html, /현재 인원/); assert.match(html, /<b>0명<\/b>/); assert.doesNotMatch(html, /웹 바이탈/);
  c.store.apply(ev('e1', 'sess_x', 'session_start', '/products/' + X, { device: X, referrer: X, plan: X, country: 'KR', utm_campaign: 'nov' + X }));
  c.store.select('sess_x'); assert.match(c.render(UI.InfoPanel), /이미 마을을 떠났어요/);
  c.world.chars.set('sess_x', { id: 'sess_x', code: 'A01', shape: 0, color: 0, state: 'idle', bot: null, props: {} });
  html = c.render(UI.InfoPanel); assert.match(html, /머무는 중/); assert.match(html, /#A01/); assert.match(html, /빨강 둥근/); assert.doesNotMatch(html, /<img src=x/); assert.match(html, /&lt;img src=x/);
  assert.match(html, /aria-pressed="false"/); assert.match(html, /🇰🇷/); assert.match(html, /class="tag camp"/);
  c.ui.set({ follow: true }); assert.match(c.render(UI.InfoPanel), /aria-pressed="true"/);
  c.world.vitals = { '/': { LCP: { p75: 4800, n: 3 }, INP: { p75: 620, n: 3 }, level: 'poor' } }; c.store.select('/'); html = c.render(UI.InfoPanel); assert.match(html, /느려요/); assert.match(html, /LCP 4\.8초 · INP 620ms \(3회\)/); assert.match(html, /<b>1명<\/b>/);
  c.world.chars.set('bot_1', { id: 'bot_1', code: 'B01', shape: 0, color: 0, state: 'walk', bot: 'GOOGLE', props: { bot: 'GOOGLE' } }); c.store.apply(ev('e2', 'bot_1', 'session_start', '/', { bot: 'GOOGLE' })); c.store.select('bot_1');
  html = c.render(UI.InfoPanel); assert.match(html, /GOOGLE BOT/); assert.match(html, /봇 추정 · Googlebot/); assert.match(html, /크롤러/);
});

test('헤더 숫자: 접속자·봇·이벤트는 스토어에서, 시계·날씨는 ui 스토어에서 (id는 예전 DOM과 같다)', () => {
  const c = setup(); c.store.apply(ev('h1', 'sess_a', 'session_start')); c.store.apply(ev('h2', 'bot_a', 'session_start', '/', { bot: 'GOOGLE' })); c.store.apply(ev('h3', 'sess_a', 'page_view', '/products'));
  c.ui.set({ clock: '12:30', weather: '· 비', weatherTitle: '최근 10분 JS 오류 3건 · 비가 와요' });
  const html = c.render(UI.HeaderStats); assert.match(html, /id="stOnline"[^>]*>1</); assert.match(html, /id="stBots"[^>]*>1</); assert.match(html, /id="stEvents"[^>]*>3</); assert.match(html, /id="stClock"[^>]*>12:30</); assert.match(html, /id="stWeather"[^>]*>· 비</);
  assert.match(html, /id="icoPerson" src="data:p"/); c.ui.set({ weather: '' }); assert.doesNotMatch(c.render(UI.HeaderStats), /stWeather/);
});

test('throttled: 알림 여러 번을 ms 안에 한 번으로 묶고, 해지하면 더 오지 않는다. createStore.set은 바뀐 키가 없으면 알리지 않는다', async () => {
  const subs = new Set(); const sub = fn => { subs.add(fn); return () => subs.delete(fn); }; const slow = UI.throttled(sub, 30);
  let n = 0; const off = slow(() => n++); for (let i = 0; i < 10; i++) for (const f of subs) f(); assert.equal(n, 0, '바로는 안 온다'); await new Promise(r => setTimeout(r, 60)); assert.equal(n, 1, '30ms 뒤 한 번');
  off(); for (const f of subs) f(); await new Promise(r => setTimeout(r, 60)); assert.equal(n, 1, '해지 뒤 0');
  const st = UI.createStore({ a: 1, b: 'x' }); let m = 0; st.subscribe(() => m++); st.set({ a: 1 }); assert.equal(m, 0); st.set({ a: 2 }); assert.equal(m, 1); assert.equal(st.get().a, 2); assert.equal(st.get().b, 'x');
});

// ---- 실시간 스트림(로드맵 54, packages/ui/src/stream.ts createSiteStream): 브라우저 없이 가짜 EventSource로 연결의 생애를 본다. 훅(useSiteStream)은 이것을 effect에 감싼 것이라 스모크(next start)가 본다
class FakeES { constructor(url) { this.url = url; this.listeners = {}; this.closed = false; FakeES.all.push(this); } addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); } close() { this.closed = true; }
  emit(type, data, lastEventId = '') { for (const fn of this.listeners[type] || []) fn({ data: JSON.stringify(data), lastEventId }); } fail() { this.onerror?.(); } }
FakeES.all = [];
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
function withES(fn) { return async () => { const prev = global.EventSource; global.EventSource = FakeES; FakeES.all = []; try { await fn(); } finally { global.EventSource = prev; } }; }
const BK = { min: 10, max: 40 };

test('스트림: 임베드 키로 열고, 끊기면 백오프(10→20→40ms) 뒤 lastEventId를 붙여 다시 연다. snapshot·resume이 오면 백오프가 0으로', withES(async () => {
  const frames = [], st = []; const s = UI.createSiteStream({ api: 'http://x', siteId: 'site_a', auth: { embedKey: 'emb_1' }, backoff: BK, onFrame: (t, d, m) => frames.push([t, d, m.lastEventId]), onStatus: x => st.push(x) });
  await tick(); assert.equal(FakeES.all.length, 1); assert.equal(FakeES.all[0].url, 'http://x/api/sites/site_a/stream?embed=emb_1');
  FakeES.all[0].emit('snapshot', { sessions: [] }, 'b.1'); FakeES.all[0].emit('event', { event_id: 'e1' }, 'b.2');
  assert.deepEqual(frames, [['snapshot', { sessions: [] }, 'b.1'], ['event', { event_id: 'e1' }, 'b.2']]); assert.deepEqual(st.at(-1), { state: 'open', via: 'snapshot' });
  FakeES.all[0].fail(); assert.equal(FakeES.all[0].closed, true); assert.deepEqual(st.at(-1), { state: 'down', retryIn: 10 });
  await tick(15); assert.equal(FakeES.all.length, 2); assert.equal(FakeES.all[1].url, 'http://x/api/sites/site_a/stream?embed=emb_1&lastEventId=b.2');
  FakeES.all[1].fail(); assert.equal(st.at(-1).retryIn, 20); await tick(25); assert.equal(FakeES.all.length, 3); FakeES.all[2].fail(); assert.equal(st.at(-1).retryIn, 40, '상한');
  await tick(45); FakeES.all[3].emit('resume', { count: 2 }, 'b.9'); assert.deepEqual(st.at(-1), { state: 'open', via: 'resume' }); FakeES.all[3].fail(); assert.equal(st.at(-1).retryIn, 10, 'resume 뒤 백오프 초기화');
  s.close(); await tick(15); assert.equal(FakeES.all.length, 4, 'close 뒤에는 다시 열지 않는다');
}));

test('스트림: 티켓은 열 때마다 새로 받아 URL에 넣는다. 401이면 백오프 없이 auth 상태로 멈추고, 다른 실패는 백오프 뒤 다시 받는다', withES(async () => {
  let n = 0, fail = null; const st = []; const ticket = async () => { n++; if (fail) { const e = new Error('x'); e.status = fail; throw e; } return 'tk' + n; };
  const s = UI.createSiteStream({ api: 'http://x', siteId: 'site_a', auth: { ticket }, backoff: BK, onFrame() {}, onStatus: x => st.push(x) });
  await tick(); assert.equal(FakeES.all[0].url, 'http://x/api/sites/site_a/stream?ticket=tk1'); assert.deepEqual(st, [{ state: 'connecting' }]);
  fail = 500; FakeES.all[0].fail(); await tick(15); assert.equal(n, 2, '백오프 뒤 티켓을 다시 받는다'); assert.equal(FakeES.all.length, 1, '티켓 실패면 EventSource를 안 만든다'); assert.equal(st.at(-1).state, 'down');
  fail = null; await tick(25); assert.equal(FakeES.all.length, 2); assert.equal(FakeES.all[1].url, 'http://x/api/sites/site_a/stream?ticket=tk3');
  fail = 401; FakeES.all[1].fail(); await tick(60); assert.equal(st.at(-1).state, 'auth'); assert.equal(st.at(-1).error.status, 401); assert.equal(FakeES.all.length, 2); const n4 = n; await tick(60); assert.equal(n, n4, '401 뒤엔 다시 시도하지 않는다');
  s.close();
}));

test('스트림: close() 뒤에 늦게 온 티켓·프레임·에러는 버린다(cancelled). 만들고 바로 닫고 다시 만들면(StrictMode) 연결은 하나만 남는다', withES(async () => {
  let resolve; const ticket = () => new Promise(r => { resolve = r; }); const frames = [], st = [];
  const a = UI.createSiteStream({ api: 'http://x', siteId: 'site_a', auth: { ticket }, backoff: BK, onFrame: (t) => frames.push('a:' + t), onStatus: x => st.push('a:' + x.state) });
  a.close(); resolve('late'); await tick(); assert.equal(FakeES.all.length, 0, '닫힌 뒤 도착한 티켓으로는 열지 않는다'); assert.equal(a.closed, true);
  const b = UI.createSiteStream({ api: 'http://x', siteId: 'site_a', auth: { embedKey: 'k' }, backoff: BK, onFrame: (t) => frames.push('b:' + t), onStatus: x => st.push('b:' + x.state) });
  await tick(); assert.equal(FakeES.all.length, 1); const es = FakeES.all[0]; es.emit('snapshot', {}); b.close(); es.emit('event', {}); es.fail(); await tick(15);
  assert.deepEqual(frames, ['b:snapshot']); assert.equal(FakeES.all.length, 1, '닫힌 뒤 onerror는 다시 열지 않는다'); assert.ok(!st.includes('b:down'));
  assert.equal(typeof UI.useSiteStream, 'function'); assert.ok(UI.FRAME_TYPES.includes('snapshot') && UI.FRAME_TYPES.includes('alert'));
}));

// ---- 스크린리더용 피드 요약(로드맵 57): 줄을 종류별로 세어 30초마다 한 문장(role=status). 세는 것·문장은 React 없이 검사하고, 컴포넌트는 SSR에서 비어 있다(aria-live는 effect가 채운다)
test('피드 요약: 아이콘·sys로 종류를 세고 한 문장으로 묶는다, 조용했던 구간은 null, SSR 출력은 빈 문자열', () => {
  const { render } = setup();
  const e = (icon, cls = '') => ({ id: 0, at: 0, icon, sid: '', cls, parts: [] });
  let c = UI.EMPTY_COUNTS; for (const [icon, cls] of [['enter'], ['star'], ['walk'], ['walk'], ['leave'], ['timeout'], ['robot'], ['cart'], ['bolt', 'sys note'], ['house', 'sys']]) c = UI.countEntry(c, e(icon, cls));
  assert.deepEqual(c, { enter: 2, move: 2, leave: 1, timeout: 1, bot: 1, event: 1, sys: 2 }); assert.deepEqual(UI.EMPTY_COUNTS, { enter: 0, move: 0, leave: 0, timeout: 0, bot: 0, event: 0, sys: 0 }, 'EMPTY_COUNTS는 그대로');
  assert.equal(UI.summarizeFeed(c, 7), '지난 30초: 입장 2명, 떠남 1명, 페이지 이동 2번, 이벤트 1건, 연결 끊김 1명, 봇 1건, 알림 2건. 지금 접속자 7명.');
  assert.equal(UI.summarizeFeed(UI.EMPTY_COUNTS, 3), null, '조용한 구간은 말하지 않는다');
  assert.equal(UI.summarizeFeed({ ...UI.EMPTY_COUNTS, enter: 1 }, 1, 10), '지난 10초: 입장 1명. 지금 접속자 1명.');
  assert.equal(render(UI.FeedSummary), '');
});
