'use strict';
// 엔진 패키지(packages/engine, 로드맵 52): 타입 검사가 통과하고, DOM 없이 로드되며, 클라이언트 스토어(TownStore)가 서버 스토어와 같은 불변식을 지키는지 본다.
// 번들(dist/index.cjs)은 npm run build:packages(packages/engine의 build 스크립트)가 만든다. CI도 빌드 뒤에 돈다
const { test } = require('node:test'); const assert = require('node:assert/strict');
const path = require('path'); const fs = require('fs'); const { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..'); const DIST = path.join(ROOT, 'packages', 'engine', 'dist', 'index.cjs');
assert.ok(fs.existsSync(DIST), '엔진 번들이 없어요. npm run build:packages 먼저');

test('엔진 TS 소스가 tsc 타입 검사를 통과한다(packages/engine/tsconfig.json)', () => {
  const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'); assert.ok(fs.existsSync(tsc), 'typescript가 없어요. npm ci');
  execFileSync(process.execPath, [tsc, '-p', path.join(ROOT, 'packages', 'engine')], { stdio: 'pipe' });
});

test('엔진은 DOM 없이 로드된다: document·window를 모듈 로드 시점에 건드리지 않고, 테마 10개(기본 3 + 파일 7)가 등록돼 있다', () => {
  assert.equal(typeof document, 'undefined'); const E = require(DIST);
  assert.ok(E.World && E.TownStore && E.Simulator && E.layoutTown && E.buildAssets, '주요 export');
  const themes = Object.keys(E.THEMES); for (const k of ['cozy', 'rpg', 'office', 'candy', 'cyber', 'farm', 'forest', 'hanok', 'space', 'west']) assert.ok(themes.includes(k), '테마 ' + k + '(기본 3 + 파일 7)');
  assert.ok(E.BUILDINGS.length >= 6, '기본 건물이 모듈 초기화 때 배치된다(layoutTown은 캔버스가 필요 없다)');
  assert.equal(E.W, 480); assert.equal(E.H, 270);
  // 캔버스가 필요한 일(에셋 빌드)은 UI가 공장을 넣어 준 뒤에만 가능하다
  assert.throws(() => E.buildAssets('cozy'), /document is not defined/);
});

const E = require(DIST); let n = 0;
const ev = (type, sid, page_path = '/', ts = Date.now(), props = {}, id) => ({ event_id: id || `e${++n}`, site_id: 'site_demo', session_id: sid, event_type: type, page_path, timestamp: new Date(ts).toISOString(), properties: props });
const mk = (opts = {}) => { let t = 1000; const now = () => t; const st = new E.TownStore({ now, ttl: 45000, ...opts }); const seen = []; st.on(c => seen.push(c)); return { st, seen, tick: ms => { t += ms; } }; };
const sumPages = st => Object.values(st.counts).reduce((a, b) => a + b, 0);

test('TownStore: 중복 event_id 무시, 입장·이동·퇴장 알림, 건물별 인원 합 = 사람 접속자 수, 봇은 따로', () => {
  const { st, seen } = mk();
  st.apply(ev('session_start', 'a', '/products', 1, {}, 'x1')); st.apply(ev('session_start', 'a', '/', 2, {}, 'x1'));
  assert.equal(st.duplicates, 1); assert.equal(st.sessions.get('a').page, '/products');
  st.apply(ev('page_view', 'a', '/community/3', 3)); assert.equal(st.sessions.get('a').page, '/', '패턴 매핑이 없으면 건물 키와 똑같은 경로만 통과하고 아니면 광장');
  st.apply(ev('page_view', 'a', '/community', 4)); assert.equal(st.sessions.get('a').page, '/community');
  st.apply(ev('session_start', 'bot', '/', 4, { bot: 'GOOGLE' })); assert.equal(st.online, 1); assert.equal(st.bots, 1); assert.equal(sumPages(st), st.online);
  st.apply(ev('page_leave', 'a', '/community', 5)); assert.equal(st.online, 0);
  assert.deepEqual(seen.filter(c => c.type !== 'event').map(c => c.type), ['enter', 'duplicate', 'move', 'move', 'enter', 'leave']);
});

test('TownStore: 늦게 온(timestamp 역행) 이동은 무시되고, 만료는 now()·ttl 기준이며 frozen이면 미룬다', () => {
  const { st, seen, tick } = mk();
  st.apply(ev('session_start', 'a', '/products', 10)); st.apply(ev('page_view', 'a', '/', 5)); assert.equal(st.sessions.get('a').page, '/products'); assert.equal(st.stale, 1);
  tick(46000); st.frozen = true; st.expire(); assert.equal(st.online, 1, '끊긴 동안(frozen)은 만료하지 않는다');
  st.frozen = false; st.expire(); assert.equal(st.online, 0); assert.equal(seen.at(-1).type, 'leave'); assert.equal(seen.at(-1).reason, 'timeout');
});

test('TownStore: setPages 패턴 매핑, isMe 주입(UI 전역을 읽지 않는다), 선택(selectedId)은 바뀔 때만 알린다', () => {
  const { st, seen } = mk({ isMe: sid => sid === 'me' });
  st.setPages([{ path: '/products', pattern: '^/shop(/|$)' }, { path: '/mypage', pattern: '(' }]); // 잘못된 정규식은 무시
  assert.equal(st.resolvePath('/shop/1'), '/products'); assert.equal(st.resolvePath('/nothing'), '/');
  st.apply(ev('session_start', 'me', '/')); st.apply(ev('session_start', 'you', '/')); assert.equal(st.sessions.get('me').props.me, true); assert.equal(st.sessions.get('you').props.me, false);
  st.select('me'); st.select('me'); st.select(null); assert.deepEqual(seen.filter(c => c.type === 'select').map(c => c.id), ['me', null]); assert.equal(st.selectedId, null);
  assert.equal(typeof st.subscribe(() => {}), 'function', 'subscribe는 해제 함수를 준다(useSyncExternalStore 모양)');
});

test('Simulator가 만든 이벤트는 서버 이벤트 모양이고 스토어가 그대로 받는다(3% 재전송은 중복으로 걸러진다)', () => {
  // Simulator는 Math.random을 쓰고 유령 방문자(10%)는 떠나는 이벤트 없이 TTL까지 남으므로 online이 target을 넘는 폭이 난수에 달렸다(CI에서 가끔 +5를 넘김). 시드를 고정해 결정적으로 돌린다
  const orig = Math.random; let seed = 0x9e3779b9; Math.random = () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  try {
    const st = new E.TownStore({ ttl: 45000 }); const sim = new E.Simulator(st); sim.botsOn = false; const sent = []; sim.onSend = e => sent.push(e);
    for (let i = 0; i < 200; i++) sim.tick(0.5);
    assert.ok(sent.length > 20); for (const e of sent) { assert.match(e.event_id, /^evt_/); assert.equal(typeof e.session_id, 'string'); assert.ok(e.timestamp); }
    assert.equal(sumPages(st), st.online); assert.ok(st.online <= sim.target + 5, `online ${st.online} > target ${sim.target} + 5`);
  } finally { Math.random = orig; }
});
