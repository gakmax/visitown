'use strict';
// 임의 이벤트 순열에 대한 불변식 (fast-check). 각 속성은 store.js를 다시 쓰는 게 아니라 "무엇이 변하지 않아야 하는가"만 말한다
const { test } = require('node:test'); const assert = require('node:assert/strict');
const fc = require('fast-check');
const { clock, makeStore, sumPages } = require('./helpers');
const T0 = Date.UTC(2026, 10, 4, 1, 0, 0);
const RUNS = +(process.env.FC_RUNS || 200);

const PATHS = ['/', '/products', '/products/1', '/search', '/community/x', '/mypage', '/checkout', '/order/complete', '/blog'];
const SESSIONS = ['s0', 's1', 's2', 's3'];
const TYPES = ['session_start', 'page_view', 'heartbeat', 'page_leave', 'click'];
// 이벤트 id를 작은 풀에서 뽑아 중복이 자주 생기게 한다
const arbEvent = fc.record({ id: fc.integer({ min: 0, max: 40 }), sid: fc.constantFrom(...SESSIONS), type: fc.constantFrom(...TYPES), path: fc.constantFrom(...PATHS), ts: fc.integer({ min: 0, max: 60000 }), bot: fc.boolean() })
  .map(r => ({ event_id: 'e' + r.id, site_id: 'site_test', session_id: r.sid, event_type: r.type, page_path: r.path, timestamp: new Date(T0 + r.ts).toISOString(), properties: r.bot ? { bot: 'BOT' } : {} }));
const arbSeq = fc.array(arbEvent, { maxLength: 60 });
const AUTO_SITE = { event_config: [{ type: 'purchase', label: '구매', auto: '^/order/complete' }] };
// 세션 상태 중 결정적인 부분만 비교(lastSeen은 벽시계)
const shape = st => [...st.sessions.values()].map(s => ({ id: s.id, page: s.page, path: s.path, lastTs: s.lastTs, bot: s.bot, leave: !!s.leaveAt })).sort((a, b) => a.id.localeCompare(b.id));
function run(seq, opts = {}) { const st = makeStore({ now: clock(T0), site: AUTO_SITE, ...opts }); const results = seq.map(e => st.apply({ ...e, properties: { ...e.properties } })); return { st, results }; }

test('속성 1: 어떤 순열에서도 건물별 인원 합 = 사람 접속자 수', () => {
  fc.assert(fc.property(arbSeq, seq => { const { st } = run(seq); const c = st.counts(); assert.equal(sumPages(st), c.online); assert.equal(c.online + c.bots, st.sessions.size); }), { numRuns: RUNS });
});

test('속성 2: 같은 순열을 두 번 넣어도 상태는 한 번 넣은 것과 같고 두 번째는 전부 중복', () => {
  fc.assert(fc.property(arbSeq, seq => { const a = run(seq); const b = run(seq.concat(seq)); assert.deepEqual(shape(b.st), shape(a.st));
    const uniq = new Set(seq.map(e => e.event_id)).size; assert.equal(a.st.totalEvents, uniq); assert.equal(b.st.duplicates - a.st.duplicates, seq.length); }), { numRuns: RUNS });
});

test('속성 3: 중복 이벤트를 아무 데나 끼워 넣어도 최종 상태는 같다', () => {
  fc.assert(fc.property(arbSeq, fc.array(fc.nat(), { maxLength: 10 }), (seq, picks) => { if (!seq.length) return;
    const withDup = [...seq]; for (const p of picks) { const i = p % seq.length; const j = p % (withDup.length + 1); withDup.splice(j, 0, seq[i]); }
    // 끼워 넣은 중복이 원본보다 앞에 올 수 있으므로 "첫 등장 순서"가 같아야 한다. 그 순서를 기준으로 비교한다
    const firstOrder = l => { const seen = new Set(), out = []; for (const e of l) { if (seen.has(e.event_id)) continue; seen.add(e.event_id); out.push(e); } return out; };
    assert.deepEqual(shape(run(withDup).st), shape(run(firstOrder(withDup)).st)); }), { numRuns: RUNS });
});

test('속성 4: 세션의 lastTs는 줄지 않고, 과거 page_view는 페이지를 바꾸지 못한다', () => {
  fc.assert(fc.property(arbSeq, seq => { const st = makeStore({ now: clock(T0), site: AUTO_SITE });
    for (const e of seq) { const before = st.sessions.get(e.session_id); const prev = before && { lastTs: before.lastTs, page: before.page }; const r = st.apply({ ...e, properties: { ...e.properties } }); const after = st.sessions.get(e.session_id);
      if (!prev || !after || !r.ok) continue; assert.ok(after.lastTs >= prev.lastTs, 'lastTs 역행');
      if ((e.event_type === 'page_view' || e.event_type === 'session_start') && Date.parse(e.timestamp) < prev.lastTs) assert.equal(after.page, prev.page, '과거 이벤트가 페이지를 바꿈'); } }), { numRuns: RUNS });
});

test('속성 5: 시각이 서로 다른 page 이벤트만 있으면 도착 순서와 상관없이 최종 페이지는 가장 늦은 시각의 페이지', () => {
  const arb = fc.uniqueArray(fc.record({ sid: fc.constantFrom(...SESSIONS), path: fc.constantFrom(...PATHS), ts: fc.integer({ min: 0, max: 60000 }) }), { selector: r => r.sid + ':' + r.ts, maxLength: 30 })
    .map(l => l.map((r, i) => ({ event_id: 'u' + i, site_id: 'site_test', session_id: r.sid, event_type: 'page_view', page_path: r.path, timestamp: new Date(T0 + r.ts).toISOString(), properties: {} })));
  fc.assert(fc.property(arb, fc.array(fc.nat(), { maxLength: 30 }), (seq, swaps) => { if (!seq.length) return;
    const shuffled = [...seq]; for (let i = 0; i < swaps.length; i++) { const a = swaps[i] % (seq.length || 1), b = (swaps[i] * 7 + i) % (seq.length || 1); [shuffled[a], shuffled[b]] = [shuffled[b], shuffled[a]]; }
    const sorted = [...seq].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    assert.deepEqual(shape(run(shuffled).st).map(s => [s.id, s.page, s.lastTs]), shape(run(sorted).st).map(s => [s.id, s.page, s.lastTs])); }), { numRuns: RUNS });
});

test('속성 6: 자동 이벤트는 세션당 규칙마다 최대 한 번(만료 없이)', () => {
  fc.assert(fc.property(arbSeq, seq => { const { results } = run(seq); const per = new Map();
    for (const r of results) for (const a of r.auto || []) { const k = a.session_id + ':' + a.event_type; per.set(k, (per.get(k) || 0) + 1); }
    for (const [k, n] of per) assert.equal(n, 1, k); }), { numRuns: RUNS });
});

test('속성 7: 시계를 아무렇게나 돌려도 expire 뒤 남은 세션은 모두 ttl 안이고, 나간 세션 수만큼 page_leave가 나간다', () => {
  const step = fc.record({ e: arbEvent, dt: fc.integer({ min: 0, max: 60000 }) });
  fc.assert(fc.property(fc.array(step, { maxLength: 60 }), steps => { const now = clock(T0); const st = makeStore({ now, ttl: 45000, site: AUTO_SITE }); let gone = 0;
    for (const s of steps) { st.apply({ ...s.e, properties: { ...s.e.properties } }); now.tick(s.dt); const before = st.sessions.size; st.expire(); gone += before - st.sessions.size;
      for (const sess of st.sessions.values()) { assert.ok(now() - sess.lastSeen <= 45000, 'ttl 넘긴 세션이 남음'); assert.ok(!sess.leaveAt || now() - sess.leaveAt <= 2500, '유예 끝난 세션이 남음'); } }
    const leaves = st.emitted.filter(m => m.session && m.event.event_type === 'page_leave').length; assert.equal(leaves, gone); }), { numRuns: RUNS });
});

// ---- SSE 링버퍼(server/sse.js, 로드맵 44)
const { Ring } = require('../server/sse');
test('불변식 13 (fast-check): 링버퍼 — 끊긴 지점 뒤가 모두 남아 있으면 정확히 그 구간만 순서대로, 하나라도 밀려났거나 다른 부팅·미래 순번이면 null(스냅샷)', () => {
  fc.assert(fc.property(fc.integer({ min: 1, max: 20 }), fc.integer({ min: 0, max: 60 }), fc.integer({ min: 0, max: 70 }), (size, total, cut) => {
    const r = new Ring({ size, boot: 'b' }); for (let i = 1; i <= total; i++) r.push('event', { i });
    const out = r.after('b.' + cut); const first = Math.max(1, total - size + 1);
    if (cut > total || cut < first - 1) return out === null;
    return Array.isArray(out) && out.length === total - cut && out.every((e, k) => e.n === cut + 1 + k && JSON.parse(e.payload).i === e.n);
  }), { numRuns: RUNS });
  const r = new Ring({ boot: 'b' }); r.push('event', {}); assert.equal(r.after('other.1'), null); assert.equal(r.after(''), null); assert.equal(r.after('b.x'), null); assert.deepEqual(r.after('b.1'), []);
});
