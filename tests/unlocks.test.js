'use strict';
// server/unlocks.js: 테마 해금·희귀 방문자·기록 갱신·선물
const { test } = require('node:test'); const assert = require('node:assert/strict');
process.env.ROLLUP_TZ = 'Asia/Seoul'; process.env.RECORD_ONLINE_MIN = '5';
const { Unlocks, normalize, local, KEYS, GIFT_EVERY, RULES } = require('../server/unlocks');
const { clock } = require('./helpers');
// 서울 2026-11-04(수) 10:00 = UTC 01:00. 평일 업무 시간
const T0 = Date.UTC(2026, 10, 4, 1, 0, 0);
const NIGHT = Date.UTC(2026, 10, 3, 18, 30, 0); // 서울 11/04 03:30
let n = 0;
const ev = (type, sid, props = {}, path = '/') => ({ event_id: 'u' + (++n), site_id: 's', session_id: sid, event_type: type, page_path: path, timestamp: new Date(T0).toISOString(), properties: { ...props } });
function fresh(saved, at = T0, createdAt) { const now = clock(at); const u = new Unlocks(saved, { createdAt: createdAt || new Date(at).toISOString(), now }); u.clock = now; return u; }

test('local(): 서울 기준 날짜·시·평일', () => {
  assert.deepEqual(local(T0), { day: '2026-11-04', hour: 10, weekday: true }); assert.deepEqual(local(NIGHT), { day: '2026-11-04', hour: 3, weekday: true });
  assert.equal(local(Date.UTC(2026, 10, 7, 3)).weekday, false, '토요일');
});

test('normalize: 모르는 키는 버리고 범위를 맞춘다', () => {
  const s = normalize({ unlocked: { office: '2026-01-01T00:00:00Z', nope: 'x', hanok: 3 }, progress: { countries: ['KR', 'kr', 'KR', 'US'], days: ['2026-01-01', 'bad'], office: -3, pages: 999, visits: 1.7 }, gifts: ['rpg', 'zzz'], rare: { owl: { n: 2.9, first: 'a' } }, records: { log: [{ kind: 'visits', n: 100 }, { kind: 'bad' }] } });
  assert.deepEqual(Object.keys(s.unlocked), ['office']); assert.deepEqual(s.progress.countries, ['KR', 'US']); assert.deepEqual(s.progress.days, ['2026-01-01']);
  assert.equal(s.progress.office, 0); assert.equal(s.progress.pages, 100); assert.equal(s.progress.visits, 1); assert.deepEqual(s.gifts, ['rpg']); assert.deepEqual(s.rare.owl, { n: 2, first: 'a', last: null });
  assert.equal(s.records.log.length, 1); assert.deepEqual(normalize(null).progress.countries, []);
});

test('judge: 첫 손님·기념 손님·개척자·올빼미, 세션당 한 번, 봇·주인 제외, 클라이언트 값 무시', () => {
  const u = fresh();
  const e1 = ev('session_start', 'a', { rare: 'owl', visit_no: 999 }); assert.deepEqual(u.judge(e1), { kind: 'first', no: 1 }); assert.equal(e1.properties.rare, 'first'); assert.equal(e1.properties.visit_no, 1);
  assert.equal(u.judge(ev('session_start', 'a')), null, '같은 세션은 다시 세지 않는다'); assert.equal(u.state.progress.visits, 1);
  assert.equal(u.judge(ev('session_start', 'b', { bot: 'BOT' })), null); assert.equal(u.judge(ev('session_start', 'c', { me: true })), null); assert.equal(u.judge(ev('page_view', 'd')), null); assert.equal(u.state.progress.visits, 1);
  const e2 = ev('session_start', 'e', { country: 'JP' }); assert.deepEqual(u.judge(e2), { kind: 'pioneer', no: 2 }, '첫 손님 다음부터는 처음 보는 나라면 개척자'); u.observe(e2);
  assert.equal(u.judge(ev('session_start', 'f', { country: 'JP' })), null, '이미 본 나라는 아니다');
  assert.deepEqual(u.judge(ev('session_start', 'g2', { country: 'US' })), { kind: 'pioneer', no: 4 });
  assert.deepEqual(u.judge(ev('session_start', 'g'), NIGHT), { kind: 'owl', no: 5 });
  for (let i = 6; i < 100; i++) u.judge(ev('session_start', 'v' + i));
  assert.deepEqual(u.judge(ev('session_start', 'v100')), { kind: 'milestone', no: 100 });
  const ms = u.takeMilestones(); assert.equal(ms.length, 1); assert.equal(ms[0].kind, 'visits'); assert.equal(ms[0].n, 100); assert.equal(ms[0].text, '100번째 방문자가 왔어요!'); assert.deepEqual(u.takeMilestones(), []);
  const v = u.view(); assert.equal(v.visits, 100); assert.deepEqual(v.rares.map(r => [r.key, r.n]), [['first', 1], ['milestone', 1], ['pioneer', 2], ['owl', 1]]);
});

test('observe: 나라 2곳 → west + 첫 해외 기록, 3곳 → space, 5곳 → 나라 수 기록', () => {
  const u = fresh(); assert.deepEqual(u.observe(ev('session_start', 'a', { country: 'KR' })), ['hanok']);
  assert.deepEqual(u.observe(ev('session_start', 'b', { country: 'JP' })), ['west']); const r = u.state.records; assert.deepEqual(r.firstForeign.country, 'JP');
  assert.deepEqual(u.observe(ev('session_start', 'c', { country: 'US' })), ['office', 'space'], '업무 시간 3번째 세션이라 office도 같이 열린다');
  u.observe(ev('session_start', 'd', { country: 'DE' })); u.observe(ev('session_start', 'e', { country: 'FR' }));
  assert.deepEqual(u.takeMilestones().map(m => [m.kind, m.n || m.country]), [['foreign', 'JP'], ['countries', 5]]);
  assert.equal(u.observe(ev('session_start', 'f', { country: 'xx' })).length, 0); assert.equal(u.state.progress.countries.length, 5);
});

test('observe: 재방문은 새 세션의 session_start만, 봇·주인은 세지 않는다', () => {
  const u = fresh(); u.observe(ev('session_start', 'a', { returning: true })); u.observe(ev('page_view', 'a', { returning: true })); u.observe(ev('session_start', 'a', { returning: true }));
  assert.equal(u.state.progress.returning, 1); assert.ok(u.state.unlocked.forest);
  u.observe(ev('session_start', 'b', { returning: true, bot: 'BOT' })); u.observe(ev('session_start', 'c', { returning: true, me: true })); u.observe(ev('page_view', 'c', { returning: true }));
  assert.equal(u.state.progress.returning, 1); assert.equal(u.state.progress.office, 1, '주인·봇은 업무 시간에도 안 센다');
  // judge로 먼저 등록된(pending) 세션도 첫 observe는 새 세션으로 본다
  const e = ev('session_start', 'd', { returning: true }); u.judge(e); u.observe(e); assert.equal(u.state.progress.returning, 2);
});

test('observe: 업무 시간 3명 → office, 새벽 → cyber, 페이지 3곳 → candy, 5분 → rpg, 7일 → farm', () => {
  const u = fresh(); for (const s of ['a', 'b']) u.observe(ev('session_start', s)); assert.equal(u.state.unlocked.office, undefined);
  assert.deepEqual(u.observe(ev('session_start', 'c')), ['office']); u.observe(ev('page_view', 'c')); assert.equal(u.state.progress.office, 3, '세션당 한 번');
  assert.deepEqual(u.observe(ev('session_start', 'n'), NIGHT), ['cyber']);
  u.observe(ev('page_view', 'a', {}, '/x')); assert.equal(u.state.unlocked.candy, undefined); assert.deepEqual(u.observe(ev('page_view', 'a', {}, '/y')), ['candy']);
  assert.deepEqual(u.observe(ev('heartbeat', 'b'), T0 + 5 * 60000), ['rpg']); assert.equal(u.state.progress.stay, 5);
  assert.equal(u.observe(ev('page_leave', 'zz')).length, 0, 'page_leave만 온 세션은 만들지 않는다'); assert.equal(u.sess.has('zz'), false);
  for (let d = 1; d <= 6; d++) u.observe(ev('session_start', 'day' + d), T0 + d * 86400000);
  assert.ok(u.state.unlocked.farm); assert.equal(u.state.progress.days.length, 7);
  const v = u.view(); assert.deepEqual(v.free, ['cozy']); assert.equal(v.rules.length, RULES.length); assert.ok(v.rules.every(r => r.value <= r.goal));
});

test('observeOnline: 최고치는 매번, 알림은 5명부터 1.3배·+2 간격', () => {
  const u = fresh(); const marks = []; for (const n of [1, 3, 5, 6, 7, 8, 9, 10, 12, 13, 2]) { u.observeOnline(n); for (const m of u.takeMilestones()) marks.push(m.n); }
  assert.deepEqual(marks, [5, 7, 10, 13]); assert.equal(u.state.records.maxOnline.n, 13);
});

test('선물: 사이트를 만든 뒤 14일마다 하나, 열린 테마에는 못 쓴다', () => {
  const u = fresh(undefined, T0, new Date(T0 - GIFT_EVERY * 2 - 1).toISOString()); assert.equal(u.giftsLeft(), 2);
  assert.deepEqual(u.useGift('rpg'), { ok: true }); assert.equal(u.giftsLeft(), 1); assert.ok(u.useGift('rpg').error); assert.ok(u.useGift('nope').error);
  u.useGift('cyber'); assert.ok(u.useGift('farm').error, '남은 선물 없음'); assert.deepEqual(u.toJSON().gifts, ['rpg', 'cyber']);
  assert.equal(u.view().rules.find(r => r.key === 'rpg').gift, true); assert.ok(u.dirty);
  assert.ok(KEYS.includes('rpg'));
});

test('저장 → 복원이 상태를 보존한다', () => {
  const u = fresh(); u.observe(ev('session_start', 'a', { country: 'KR', returning: true })); u.judge(ev('session_start', 'b')); u.observeOnline(6);
  const copy = new Unlocks(JSON.parse(JSON.stringify(u.toJSON())), { createdAt: new Date(T0).toISOString(), now: () => T0 });
  assert.deepEqual(copy.view(), u.view());
});
