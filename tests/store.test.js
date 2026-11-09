'use strict';
// server/store.js 불변식. 각 test 이름이 불변식 한 줄이다
const { test } = require('node:test'); const assert = require('node:assert/strict');
const { SiteStore, normalizePages, normalizeEventConfig, OTHER, MAX_TYPES, MAX_BUILDINGS, unsafeRegex, maskPii } = require('../server/store');
const { clock, makeStore, ev, sumPages } = require('./helpers');
const T0 = Date.UTC(2026, 10, 4, 1, 0, 0);

test('불변식 1: 같은 event_id는 두 번 반영되지 않는다', () => {
  const st = makeStore(); const e = ev('session_start', 's1', '/products', T0);
  assert.equal(st.apply(e).ok, true);
  const r = st.apply({ ...e, page_path: '/checkout' }); // 내용이 달라도 id가 같으면 무시
  assert.deepEqual(r, { ok: false, reason: 'duplicate' });
  assert.equal(st.sessions.get('s1').page, '/products'); assert.equal(st.duplicates, 1); assert.equal(st.totalEvents, 1);
});

test('불변식 2: 늦게 도착한 과거 이벤트로 페이지가 되돌아가지 않는다', () => {
  const st = makeStore();
  st.apply(ev('session_start', 's1', '/products', T0 + 2000));
  st.apply(ev('page_view', 's1', '/checkout', T0 + 1000)); // 과거 → 무시
  assert.equal(st.sessions.get('s1').page, '/products'); assert.equal(st.stale, 1);
  st.apply(ev('page_view', 's1', '/checkout', T0 + 2000)); // 같은 시각 → 반영
  assert.equal(st.sessions.get('s1').page, '/checkout');
  st.apply(ev('page_view', 's1', '/search', T0 + 3000));
  assert.equal(st.sessions.get('s1').page, '/search'); assert.equal(st.sessions.get('s1').lastTs, T0 + 3000);
  const views = st.emitted.filter(m => m.event.event_type === 'page_view').map(m => m.event.page_path);
  assert.deepEqual(views, ['/checkout', '/search']); // 되돌아가는 page_view는 내보내지 않는다
});

test('불변식 3: 건물별 인원 합 = 사람 접속자 수, 봇은 따로', () => {
  const st = makeStore();
  st.apply(ev('session_start', 's1', '/products', T0)); st.apply(ev('session_start', 's2', '/products/1', T0)); st.apply(ev('session_start', 's3', '/nowhere', T0));
  st.apply(ev('session_start', 'b1', '/', T0, { bot: 'GOOGLE' }));
  const c = st.counts();
  assert.equal(c.online, 3); assert.equal(c.bots, 1); assert.equal(sumPages(st), c.online);
  assert.equal(c.pages['/products'], 2); assert.equal(c.pages[OTHER], 1);
  st.apply(ev('page_view', 's2', '/checkout', T0 + 1));
  assert.equal(st.counts().pages['/products'], 1); assert.equal(st.counts().pages['/checkout'], 1); assert.equal(sumPages(st), 3);
});

test('불변식 4: 세션은 ttl 뒤 timeout page_leave로 나가고, 다음 이벤트에 다시 들어온다', () => {
  const now = clock(T0); const st = makeStore({ now, ttl: 45000 });
  st.apply(ev('session_start', 's1', '/products', T0));
  now.tick(45000); st.expire(); assert.equal(st.sessions.size, 1, 'ttl 안이면 남는다');
  now.tick(1); st.expire(); assert.equal(st.sessions.size, 0);
  const leave = st.emitted.at(-1).event; assert.equal(leave.event_type, 'page_leave'); assert.equal(leave.properties.reason, 'timeout'); assert.equal(leave.page_path, '/products');
  const r = st.apply(ev('page_view', 's1', '/checkout', now())); // 재입장
  assert.equal(r.ok, true); assert.equal(st.sessions.get('s1').page, '/checkout'); assert.equal(st.emitted.at(-1).event.event_type, 'session_start');
});

test('하트비트는 lastSeen만 늘리고 기록에 남지 않는다', () => {
  const now = clock(T0); const st = makeStore({ now, ttl: 45000 });
  st.apply(ev('session_start', 's1', '/products', T0));
  now.tick(40000); st.apply(ev('heartbeat', 's1', '/products', now())); now.tick(40000); st.expire();
  assert.equal(st.sessions.size, 1); assert.equal(st.log.length, 1); assert.equal(st.emitted.filter(m => m.event.event_type === 'heartbeat').length, 0);
});

test('page_leave는 2.5초 유예하고, 그 안에 같은 세션 이벤트가 오면 취소된다', () => {
  const now = clock(T0); const st = makeStore({ now });
  st.apply(ev('session_start', 's1', '/products', T0)); st.apply(ev('page_leave', 's1', '/products', T0 + 10));
  now.tick(2000); st.expire(); assert.equal(st.sessions.size, 1, '유예 중');
  st.apply(ev('page_view', 's1', '/checkout', now())); now.tick(3000); st.expire();
  assert.equal(st.sessions.size, 1, '취소됨'); assert.equal(st.sessions.get('s1').leaveAt, null);
  st.apply(ev('page_leave', 's1', '/checkout', now())); now.tick(2501); st.expire();
  assert.equal(st.sessions.size, 0); const leave = st.emitted.at(-1).event; assert.equal(leave.event_type, 'page_leave'); assert.equal(leave.page_path, '/checkout');
});

test('불변식 5: 자동 이벤트는 세션당 규칙마다 한 번, 그 id는 재사용되지 않는다', () => {
  const st = makeStore({ site: { event_config: [{ type: 'purchase', label: '구매', auto: '^/order/complete' }] } });
  st.apply(ev('session_start', 's1', '/', T0));
  const r1 = st.apply(ev('page_view', 's1', '/order/complete?id=1', T0 + 1, {}, 'pv1'));
  assert.equal(r1.auto.length, 1); assert.equal(r1.auto[0].event_type, 'purchase'); assert.equal(r1.auto[0].event_id, 'pv1_auto_purchase'); assert.equal(r1.auto[0].properties.auto, true);
  const r2 = st.apply(ev('page_view', 's1', '/order/complete', T0 + 2)); assert.equal(r2.auto.length, 0, '같은 세션 두 번째는 없다');
  const r3 = st.apply(ev('page_view', 's2', '/order/complete', T0 + 3)); assert.equal(r3.auto.length, 1, '다른 세션은 된다');
  assert.equal(st.apply({ ...ev('purchase', 's1', '/', T0), event_id: 'pv1_auto_purchase' }).reason, 'duplicate');
  assert.equal(st.apply(ev('page_view', 'b1', '/order/complete', T0, { bot: 'BING' })).auto.length, 0, '봇은 안 만든다');
  assert.equal(st.types.get('purchase').n, 2);
});

test('normalize: 모양이 틀린 이벤트는 버리고, 주소·속성·시각을 다듬는다', () => {
  const now = clock(T0); const st = makeStore({ now });
  const base = { event_id: 'x1', session_id: 's1', event_type: 'page_view', page_path: '/products?q=1#top', timestamp: new Date(T0).toISOString(), properties: { device: 'mobile', returning: true, amount: 12.5, tz: 'Asia/Seoul', secret: 'no', me: true } };
  const n = st.normalize(base);
  assert.equal(n.page_path, '/products'); assert.deepEqual(n.properties, { device: 'mobile', returning: true, amount: 12.5, me: true, country: 'KR' });
  assert.equal(st.normalize(null), null); assert.equal(st.normalize({ ...base, event_id: 7 }), null); assert.equal(st.normalize({ ...base, event_id: 'a'.repeat(81) }), null);
  assert.equal(st.normalize({ ...base, session_id: undefined }), null); assert.equal(st.normalize({ ...base, page_path: 'products' }), null); assert.equal(st.normalize({ ...base, page_path: '/' + 'a'.repeat(256) }), null);
  assert.equal(st.normalize({ ...base, event_type: 'Bad Type' }), null); assert.equal(st.normalize({ ...base, event_type: 'x' }), null);
  assert.equal(st.normalize({ ...base, properties: { amount: Infinity } }).properties.amount, undefined);
  assert.equal(st.normalize({ ...base, page_path: undefined }).page_path, '/');
  const far = st.normalize({ ...base, timestamp: new Date(Date.now() + 3600000).toISOString() }); assert.ok(Date.parse(far.timestamp) <= Date.now() + 5001, '미래 시각은 5초로 자른다');
  assert.equal(Number.isFinite(Date.parse(st.normalize({ ...base, timestamp: 'nope' }).timestamp)), true);
  assert.equal(st.normalize(base, { bot: 'GOOGLE' }).properties.bot, 'GOOGLE'); assert.equal(st.normalize({ ...base, properties: { bot: 'FAKE' } }).properties.bot, undefined, '클라이언트가 보낸 bot은 믿지 않는다');
  assert.equal(st.normalize(base, { country: 'us' }).properties.country, 'US', '서버가 안 나라가 우선');
});

test('normalize: 커스텀 이벤트 이름은 사이트당 MAX_TYPES개까지, 설정에 적은 이름은 항상 허용', () => {
  const st = makeStore({ site: { event_config: [{ type: 'listed', label: 'L' }] } }); const base = { event_id: 'x', session_id: 's', page_path: '/', timestamp: new Date(T0).toISOString() };
  for (let i = 0; i < MAX_TYPES; i++) assert.ok(st.normalize({ ...base, event_type: 'type_' + String.fromCharCode(97 + i % 26) + String.fromCharCode(97 + Math.floor(i / 26)) }));
  assert.equal(st.normalize({ ...base, event_type: 'overflow' }), null); assert.ok(st.dropped.has('overflow'));
  assert.ok(st.normalize({ ...base, event_type: 'listed' }));
  const custom = st.normalize({ ...base, event_type: 'listed', properties: { a: 'x'.repeat(200), b: 1, c: true, d: {}, 'Bad-Key': 1 } });
  assert.deepEqual(custom.properties, { a: 'x'.repeat(100), b: 1, c: true });
});

test('커스텀 이벤트는 세션이 없으면 세션을 만들고 그 건물에서 일어난 것으로 내보낸다', () => {
  const st = makeStore(); const r = st.apply(ev('click', 's9', '/products/3', T0));
  assert.equal(r.ok, true); assert.equal(r.changes, 2); assert.deepEqual(st.emitted.map(m => m.event.event_type), ['session_start', 'click']); assert.equal(st.emitted[1].event.page_path, '/products');
  assert.equal(sumPages(st), 1);
});

test('setPages: 매핑이 바뀌면 접속 중인 세션을 새 건물로 옮기고 page_view로 알린다', () => {
  const st = makeStore(); st.apply(ev('session_start', 's1', '/blog/1', T0)); assert.equal(st.sessions.get('s1').page, OTHER);
  st.setPages([{ path: '/', name: '' }, { path: '/blog', pattern: '^/blog', kind: 'library', slot: 3 }]);
  assert.equal(st.sessions.get('s1').page, '/blog'); const last = st.emitted.at(-1).event; assert.equal(last.event_type, 'page_view'); assert.equal(last.page_path, '/blog'); assert.equal(last.path, '/blog/1');
  assert.equal(sumPages(st), 1);
});

test('normalizePages: 자리 0은 광장, 중복·범위 밖 자리는 다시 배정, 12개 넘는 건물은 버린다', () => {
  const list = normalizePages([{ path: '/a', slot: 3, kind: 'shop' }, { path: '/b', slot: 3, kind: 'nope' }, { path: '/c', slot: 99 }, { path: '/', slot: 7 }]);
  assert.deepEqual(list.map(p => [p.path, p.kind, p.slot]), [['/', 'plaza', 0], ['/b', 'shop', 1], ['/c', 'shop', 2], ['/a', 'shop', 3]]);
  const many = normalizePages(Array.from({ length: 20 }, (_, i) => ({ path: '/p' + i }))); assert.equal(many.length, MAX_BUILDINGS);
  assert.equal(normalizePages([]).length, 6, '비어 있으면 예전 기본 6건물');
  const legacy = normalizePages(['/', '/checkout']); assert.deepEqual(legacy.map(p => [p.kind, p.slot]), [['plaza', 0], ['checkout', 1]]);
});

test('normalizeEventConfig: 이름 규칙·중복·잘못된 정규식·한도', () => {
  const out = normalizeEventConfig([{ type: 'buy', label: ' 구매 ', effect: 'coin', sound: 'nope', auto: '^/ok', notify: true }, { type: 'buy' }, { type: 'Bad' }, { type: 'bad_re', auto: '(' }, null]);
  assert.deepEqual(out, [{ type: 'buy', label: '구매', effect: 'coin', auto: '^/ok', notify: true }, { type: 'bad_re', label: '' }]);
  assert.equal(normalizeEventConfig(Array.from({ length: 60 }, (_, i) => ({ type: 'ev_' + String(i).padStart(2, '0').replace(/\d/g, d => 'abcdefghij'[d]) }))).length, MAX_TYPES);
});

test('snapshot으로 복원한 스토어는 원본과 같은 인원 분포를 가진다 (재접속 전후 상태 동일)', () => {
  const st = makeStore(); st.apply(ev('session_start', 's1', '/products', T0)); st.apply(ev('page_view', 's1', '/checkout', T0 + 1)); st.apply(ev('session_start', 's2', '/search', T0)); st.apply(ev('session_start', 'b1', '/', T0, { bot: 'BOT' }));
  const snap = st.snapshot(); assert.equal(snap.sessions.length, 3);
  const st2 = makeStore(); for (const s of snap.sessions) st2.apply({ ...s, page_path: s.path || s.page_path });
  assert.deepEqual(st2.counts(), st.counts()); assert.deepEqual([...st2.sessions.keys()].sort(), [...st.sessions.keys()].sort());
});

test('trails: 세션의 건물 이동을 (from,to) 가중치로 합치고 봇·메모는 뺀다', () => {
  const st = makeStore(); const evs = [ev('session_start', 's1', '/', T0), ev('page_view', 's1', '/products', T0 + 1000), ev('page_view', 's1', '/products/2', T0 + 2000), ev('page_leave', 's1', '/products', T0 + 3000),
    ev('session_start', 'b1', '/', T0, { bot: 'BOT' }), ev('page_view', 'b1', '/search', T0 + 1), { ...ev('note', 'note', '/', T0), properties: { text: '배포' } }];
  const moves = st.trails(evs, T0 + 3000, 1800);
  assert.deepEqual(moves.map(m => [m.from, m.to]), [[null, '/'], ['/', '/products'], ['/products', null]]);
  assert.ok(moves.every(m => m.w > 0.99 && m.w <= 1));
  const old = st.trails(evs, T0 + 3000 + 1800000, 1800); assert.ok(old.every(m => Math.abs(m.w - 0.5) < 0.01), '반감기 뒤 절반');
});

test('weather: 10분 안 js_error가 기준 이상이면 비, 접속자가 많으면 쨍쨍', () => {
  const now = clock(T0); const st = makeStore({ now }); assert.equal(st.weather().kind, 'clear');
  for (let i = 0; i < 3; i++) st.apply(ev('js_error', 's' + i, '/', T0)); assert.equal(st.weather().kind, 'rain');
  now.tick(601000); assert.equal(st.weather().kind, 'clear', '10분 지나면 걷힌다');
  for (let i = 0; i < 8; i++) st.apply(ev('session_start', 'u' + i, '/', now())); assert.equal(st.weather().kind, 'sunny');
});

test('vital: 건물별 p75로 느림 판정이 바뀔 때만 true', () => {
  const st = makeStore(); let changed = 0; for (let i = 0; i < 5; i++) changed += st.vital('/products/1', 'LCP', 1000) ? 1 : 0;
  assert.equal(changed, 1); assert.equal(st.vitalsView()['/products'].level, 'good'); assert.equal(st.vitalsView()['/products'].LCP.n, 5);
  for (let i = 0; i < 10; i++) st.vital('/products', 'LCP', 6000); assert.equal(st.vitalsView()['/products'].level, 'poor');
});

test('seen 집합은 2만 개까지만 기억한다', () => {
  const st = makeStore(); for (let i = 0; i < 20005; i++) st.remember('id' + i);
  assert.equal(st.seen.size, 20000); assert.equal(st.seen.has('id0'), false); assert.equal(st.seen.has('id20004'), true);
});

// ---- 보안 점검표(docs/security.md) 항목의 서버 쪽 규칙
test('보안 S-06: 중첩 반복 정규식((a+)+ 꼴)은 건물 패턴·자동 이벤트에서 거절된다(ReDoS)', () => {
  for (const [p, bad] of [['(a+)+', true], ['(\\d*\\s)*x', true], ['(x{2,})+', true], ['((a+)b)+', true], ['^/products(/|$)', false], ['(a|b)+c', false], ['[a+]+', false], ['\\(a+\\)+', false], ['(a+)?', false]]) assert.equal(unsafeRegex(p), bad, p);
  const cfg = normalizeEventConfig([{ type: 'boom', auto: '^/(a+)+$' }, { type: 'fine', auto: '^/ok(/|$)' }]);
  assert.equal(cfg.find(c => c.type === 'boom').auto, undefined); assert.equal(cfg.find(c => c.type === 'fine').auto, '^/ok(/|$)');
});
test('보안 S-02·S-10: device·referrer는 정해진 값만 남고, 커스텀 속성의 이메일·전화번호는 가려진다', () => {
  const st = makeStore(); const X = '<img src=x onerror=1>';
  const s = st.normalize(ev('session_start', 's1', '/', T0, { device: X, referrer: 'search', plan: X }));
  assert.equal(s.properties.device, undefined); assert.equal(s.properties.referrer, 'search'); assert.equal(s.properties.plan, X, '열거형이 아닌 속성은 그대로(대시보드가 이스케이프)');
  const c = st.normalize(ev('purchase', 's1', '/', T0, { note: 'call 010-1234-5678 or +82 10 1234 5678, mail a.b+c@x.co.kr', order: 'ORD-20261104', when: '2026-11-04 12:00' }));
  assert.equal(c.properties.note, 'call <phone> or <phone>, mail <email>'); assert.equal(c.properties.order, 'ORD-20261104'); assert.equal(c.properties.when, '2026-11-04 12:00', '날짜·주문번호 같은 숫자는 건드리지 않는다');
  assert.equal(maskPii('x@y.z'), '<email>');
});

// ---- SDK 오프라인 큐(로드맵 45): 큐에 묵었다 ttl보다 늦게 온 이벤트
test('로드맵 45: ttl보다 늦게 온 이벤트는 끝난 세션을 되살리지 않고 기록만 남기며, 살아 있는 세션의 것이면 그대로 적용된다', () => {
  const c = clock(T0); const st = makeStore({ now: c });
  const r1 = st.apply(ev('session_start', 'late1', '/', T0 - 120000)); assert.equal(r1.late, true); assert.equal(r1.persist, true); assert.equal(st.sessions.size, 0, '2분 전 session_start는 세션을 만들지 않는다');
  const r2 = st.apply(ev('purchase', 'late1', '/checkout', T0 - 120000)); assert.equal(r2.late, true); assert.equal(r2.persist, true, '늦은 커스텀 이벤트는 DB에는 남긴다'); assert.equal(st.sessions.size, 0);
  assert.equal(st.apply(ev('heartbeat', 'late1', '/', T0 - 120000)).persist, false); assert.equal(st.apply(ev('page_leave', 'late1', '/', T0 - 120000)).persist, false); assert.equal(st.late, 4);
  st.apply(ev('session_start', 'live', '/', T0)); const r3 = st.apply(ev('page_view', 'live', '/products', T0 - 1000)); assert.equal(r3.late, undefined, '살아 있는 세션의 이벤트는 늦은 것이 아니다'); assert.equal(st.stale, 1, '역행 검사가 막는다');
  assert.equal(st.apply(ev('page_view', 'live', '/products', T0 + 1000)).changes, 1); assert.equal(st.sessions.get('live').page, '/products');
});

test('로드맵 49: 첫 방문 날짜(first)는 YYYY-MM-DD 꼴만 남는다', () => {
  const st = makeStore(); assert.equal(st.normalize(ev('session_start', 'f1', '/', T0, { first: '2026-11-01' })).properties.first, '2026-11-01');
  assert.equal(st.normalize(ev('session_start', 'f2', '/', T0, { first: 'nope' })).properties.first, undefined); assert.equal(st.normalize(ev('session_start', 'f3', '/', T0, { first: 20261101 })).properties.first, undefined);
});
