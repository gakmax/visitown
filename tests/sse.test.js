'use strict';
// SSE 재접속 무손실(로드맵 44). 실제 서버에 이벤트를 넣으며 스트림을 끊었다 Last-Event-ID로 다시 붙어, 빈 구간만 받고 스냅샷은 다시 오지 않는지 본다.
// 불변식 "재접속 전후 상태 동일": 계속 붙어 있던 구독자가 본 이벤트 id 집합 = 끊긴 구독자가 두 연결에서 본 id 집합(유실 0·중복 0), 그래서 세션 상태도 같다
const { test, before, after } = require('node:test'); const assert = require('node:assert/strict');
const { startServer, streamTicket } = require('./helpers');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const ORIGIN = 'http://localhost:3000';
let srv, base;
const post = body => fetch(base + '/api/events', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: ORIGIN, 'User-Agent': UA }, body: JSON.stringify(body) });
let n = 0; const ev = (type, sid, page_path = '/') => ({ event_id: `sse${++n}`, site_id: 'site_demo', session_id: sid, event_type: type, page_path, timestamp: new Date().toISOString(), properties: {} });
const num = id => +String(id).split('.')[1], boot = id => String(id).split('.')[0];

// 작은 SSE 클라이언트: 프레임을 { id, event, data }로 모은다. retry·주석(: ping) 프레임은 event가 없어 건너뛴다
function subscribe(b, qs = '', headers = {}, embedKey = null) { // embedKey를 주면 티켓 대신 임베드 키로(S-34: 공개 링크 쪽 연결)
  const ac = new AbortController(); const got = []; let status = 0;
  const auth = embedKey ? Promise.resolve('embed=' + encodeURIComponent(embedKey)) : streamTicket(b).then(t => 'ticket=' + encodeURIComponent(t));
  const done = auth.then(a => fetch(b + '/api/sites/site_demo/stream?' + a + qs, { headers, signal: ac.signal })).then(async res => { status = res.status; if (res.status !== 200) return;
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
    for (;;) { const { value, done } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i;
      while ((i = buf.indexOf('\n\n')) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2); const f = {};
        for (const line of chunk.split('\n')) { const j = line.indexOf(':'); if (j <= 0) continue; const k = line.slice(0, j), v = line.slice(j + 1).trim(); f[k] = k === 'data' ? JSON.parse(v) : v; }
        if (f.event) got.push(f); } } }).catch(() => {});
  const until = async (fn, ms = 4000) => { const t0 = Date.now(); while (!fn(got)) { if (Date.now() - t0 > ms) throw new Error('timeout, got: ' + got.map(f => f.event).join(',')); await new Promise(r => setTimeout(r, 25)); } };
  return { got, until, status: () => status, close: () => ac.abort(), done, events: () => got.filter(f => f.event === 'event'), lastId: () => [...got].reverse().find(f => f.id)?.id };
}
// 스트림에서 본 이벤트로 만든 세션 상태: session_id → 마지막 건물(떠났으면 없음). 스냅샷의 sessions도 같은 모양으로
function replica(frames) { const m = new Map(); for (const f of frames) { if (f.event === 'snapshot') { m.clear(); for (const s of f.data.sessions) m.set(s.session_id, s.page_path); } else if (f.event === 'event') { const e = f.data; if (e.event_type === 'page_leave') m.delete(e.session_id); else m.set(e.session_id, e.page_path); } } return Object.fromEntries([...m].sort()); }

before(async () => { srv = await startServer(); base = srv.base; });
after(() => { srv && srv.proc.kill(); });

test('스냅샷과 모든 이벤트에 id가 붙고(부팅ID.순번), 순번은 단조 증가한다', async () => {
  const a = subscribe(base); await a.until(g => g.some(f => f.event === 'snapshot'));
  await post([ev('session_start', 'id1'), ev('page_view', 'id1', '/products')]); await a.until(g => g.filter(f => f.event === 'event').length >= 2);
  const ids = a.got.filter(f => f.id).map(f => f.id); assert.equal(ids.length, 3, '스냅샷 1 + 이벤트 2');
  assert.ok(ids.every(id => /^[a-z0-9]+\.\d+$/.test(id)), ids.join(' ')); assert.ok(new Set(ids.map(boot)).size === 1, '같은 부팅');
  for (let i = 1; i < ids.length; i++) assert.ok(num(ids[i]) > num(ids[i - 1]), `${ids[i - 1]} < ${ids[i]}`);
  a.close();
});

test('불변식: 끊겼다 Last-Event-ID로 붙으면 resume + 빈 구간만 받고 스냅샷은 다시 오지 않으며, 계속 붙어 있던 구독자와 같은 상태가 된다', async () => {
  const control = subscribe(base), a = subscribe(base); await control.until(g => g.some(f => f.event === 'snapshot')); await a.until(g => g.some(f => f.event === 'snapshot'));
  await post([ev('session_start', 'r1'), ev('session_start', 'r2', '/products')]); await a.until(g => g.filter(f => f.event === 'event').length >= 2);
  const lastId = a.lastId(); a.close(); await a.done;
  // 끊긴 동안 일어난 일: 이동·새 방문자·해금 진행(unlocks 프레임도 버퍼를 탄다)
  await post([ev('page_view', 'r1', '/checkout'), ev('session_start', 'r3', '/search'), ev('page_view', 'r2', '/community')]);
  await control.until(g => g.filter(f => f.event === 'event').length >= 5);
  const missedInControl = control.got.filter(f => f.id && num(f.id) > num(lastId));
  const b = subscribe(base, '', { 'Last-Event-ID': lastId }); await b.until(g => g.filter(f => f.id).length >= missedInControl.length);
  assert.equal(b.got[0].event, 'resume'); assert.equal(b.got[0].data.count, missedInControl.length, 'resume.count = 놓친 프레임 수');
  assert.ok(!b.got.some(f => f.event === 'snapshot'), '스냅샷 재전송 0회');
  assert.deepEqual(b.got.filter(f => f.id).map(f => f.id), missedInControl.map(f => f.id), '빈 구간의 id가 순서대로 정확히');
  assert.ok(b.got.some(f => f.event === 'weather'), '재접속 뒤 날씨를 다시 준다');
  // 유실 0·중복 0: 두 연결에서 본 id의 합집합 = 계속 붙어 있던 구독자가 본 id
  const seen = [...a.got, ...b.got].filter(f => f.id).map(f => f.id); assert.equal(new Set(seen).size, seen.length, '중복 0');
  assert.deepEqual(new Set(seen), new Set(control.got.filter(f => f.id).map(f => f.id)), '유실 0');
  // 상태 동일: 스트림으로 만든 세션 상태가 서로 같고 서버 /state와도 같다
  const st = await (await fetch(base + '/api/sites/site_demo/state?token=dev')).json();
  const mine = replica([...a.got, ...b.got]); assert.deepEqual(mine, replica(control.got)); assert.deepEqual(mine, replica([{ event: 'snapshot', data: st }]));
  assert.deepEqual(st.totals.sse, { snapshots: 3, resumed: 1, recovered: missedInControl.length }, '측정값: 재접속 복구 N건 · 스냅샷은 처음 연결 3번뿐');
  control.close(); b.close();
});

test('다른 부팅의 id·형식이 틀린 id·버퍼 밖(너무 오래전)이면 스냅샷을 준다', async () => {
  for (const bad of ['zzz.1', 'garbage', '']) { const s = subscribe(base, '', bad ? { 'Last-Event-ID': bad } : {}); await s.until(g => g.length >= 1); assert.equal(s.got[0].event, 'snapshot', bad || '(없음)'); s.close(); }
  // 버퍼 3개짜리 서버: 이벤트 6건 뒤 id 1에서 이어받으려 하면 2·3번이 이미 밀려나 스냅샷
  const small = await startServer({ SSE_BUFFER: '3' }); try {
    const first = subscribe(small.base); await first.until(g => g.some(f => f.event === 'snapshot')); const b0 = boot(first.got[0].id); first.close();
    const p = body => fetch(small.base + '/api/events', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: ORIGIN, 'User-Agent': UA }, body: JSON.stringify(body) });
    await p([ev('session_start', 'b1'), ev('session_start', 'b2'), ev('session_start', 'b3'), ev('page_view', 'b1', '/products'), ev('page_view', 'b2', '/products'), ev('page_view', 'b3', '/products')]);
    // 순번은 event 말고도 unlocks·vitals 같은 프레임도 쓰므로 지금 순번 N을 스냅샷 id에서 읽는다
    const probe = subscribe(small.base); await probe.until(g => g.some(f => f.event === 'snapshot')); const N = num(probe.got[0].id); probe.close(); assert.ok(N >= 6, 'N=' + N);
    const old = subscribe(small.base, '', { 'Last-Event-ID': b0 + '.' + (N - 5) }); await old.until(g => g.length >= 1); assert.equal(old.got[0].event, 'snapshot', '버퍼 밖(N-5 뒤 5개 중 2개가 밀려남)'); old.close();
    const recent = subscribe(small.base, '', { 'Last-Event-ID': b0 + '.' + (N - 2) }); await recent.until(g => g.filter(f => f.id).length >= 2); assert.equal(recent.got[0].event, 'resume'); assert.equal(recent.got[0].data.count, 2, 'N-1·N만'); assert.deepEqual(recent.got.filter(f => f.id).map(f => num(f.id)), [N - 1, N]); recent.close();
    const sameAsNow = subscribe(small.base, '&lastEventId=' + b0 + '.' + N); await sameAsNow.until(g => g.length >= 1); assert.equal(sameAsNow.got[0].event, 'resume'); assert.equal(sameAsNow.got[0].data.count, 0, '놓친 게 없으면 count 0 (쿼리 lastEventId도 된다)'); sameAsNow.close();
  } finally { small.proc.kill(); }
});

// ---- 보안 S-34(docs/security.md): 임베드 키 연결은 마을을 그리는 데 필요한 것만 받는다. 주인·멤버(티켓) 연결은 전부 받는다
test('보안 S-34: embedView는 alert·milestone을 버리고 이벤트에서 금액·커스텀 속성·원본 경로를, 스냅샷에서 lastEventAt·패턴·자동 규칙·기록을 뺀다', () => {
  const { view } = require('../server/embed');
  assert.equal(view('alert', { text: '매출 1,000,000원' }), null); assert.equal(view('milestone', { text: '1,000번째' }), null); assert.equal(view('resume', {}), null);
  assert.equal(view('event', { event_type: 'note', properties: { text: '배포', by: '홍길동' } }), null); assert.equal(view('event', { event_type: 'web_vital', properties: {} }), null);
  const e = view('event', { event_id: 'e1', site_id: 's', session_id: 'a', event_type: 'purchase', page_path: '/products', path: '/products/secret', timestamp: 't', properties: { amount: 99000, coupon: 'VIP', device: 'mobile', me: true, country: 'KR', rare: 'owl', emoji: '👋', reason: 'timeout', bot: null, visit_no: 7 } });
  assert.deepEqual(e, { event_id: 'e1', site_id: 's', session_id: 'a', event_type: 'purchase', page_path: '/products', timestamp: 't', properties: { me: true, country: 'KR', rare: 'owl', emoji: '👋', reason: 'timeout', bot: null, visit_no: 7 } });
  const snap = view('snapshot', { site_id: 's', at: 'now', lastEventAt: 123, sessions: [{ event_id: 'x', site_id: 's', session_id: 'a', event_type: 'session_start', page_path: '/', path: '/raw', timestamp: 't', started_at: 1, properties: { amount: 1, me: true } }, { event_type: 'note', properties: {} }],
    pages: [{ path: '/', name: '광장', pattern: '^/$', kind: 'plaza' }], eventTypes: [{ type: 'purchase', label: '구매', auto: '^/thanks' }], unlocks: { free: ['cozy'], unlocked: { night: 't' }, visits: 10, rules: [{ key: 'night', value: 3 }], records: { log: ['비밀'] }, rares: [] }, weather: { kind: 'rain' }, vitals: { '/': { LCP: { p75: 4100, n: 9 }, level: 'poor' } } });
  assert.deepEqual(snap, { site_id: 's', at: 'now', sessions: [{ event_id: 'x', site_id: 's', session_id: 'a', event_type: 'session_start', page_path: '/', timestamp: 't', properties: { me: true }, started_at: 1 }],
    pages: [{ path: '/', name: '광장', kind: 'plaza' }], eventTypes: [{ type: 'purchase', label: '구매' }], unlocks: { free: ['cozy'], unlocked: { night: 't' }, visits: 10, rules: [] }, weather: { kind: 'rain' }, vitals: { '/': { level: 'poor' } } });
  assert.deepEqual(view('trails', { moves: [] }), { moves: [] }); assert.deepEqual(view('pages', [{ path: '/a', name: 'A', pattern: 'x' }]), [{ path: '/a', name: 'A' }]);
});

test('보안 S-34: 실제 스트림 — 임베드 키 연결은 금액·커스텀 속성·원본 경로·메모를 받지 않고, 주인 연결은 전부 받으며, 임베드도 자기 링버퍼로 resume 한다', async () => {
  const { key } = await (await fetch(base + '/api/sites/site_demo/embed?token=dev', { method: 'POST' })).json(); assert.match(key, /^emb_/);
  const owner = subscribe(base), emb = subscribe(base, '', {}, key);
  await owner.until(g => g.some(f => f.event === 'snapshot')); await emb.until(g => g.some(f => f.event === 'snapshot'));
  const es = emb.got.find(f => f.event === 'snapshot'); assert.ok(es.id, '임베드 스냅샷에도 id'); assert.equal('lastEventAt' in es.data, false); assert.ok(es.data.pages.length > 0 && es.data.pages.every(p => !('pattern' in p)), '패턴 없음');
  assert.ok('lastEventAt' in owner.got.find(f => f.event === 'snapshot').data, '주인 스냅샷은 그대로');
  await post([{ ...ev('session_start', 'emb1', '/products/secret-42'), properties: { device: 'mobile', country: 'KR', me: true } }, { ...ev('purchase', 'emb1', '/products/secret-42'), properties: { amount: 99000, coupon: 'VIP' } }]);
  const note = await fetch(base + '/api/sites/site_demo/notes?token=dev', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '배포 v2' }) }); assert.equal(note.status, 200);
  await owner.until(g => g.some(f => f.event === 'event' && f.data.event_type === 'note') && g.some(f => f.event === 'event' && f.data.event_type === 'purchase'));
  const op = owner.events().map(f => f.data).filter(e => e.session_id === 'emb1' || e.event_type === 'note'); const opur = op.find(e => e.event_type === 'purchase'); assert.equal(opur.properties.amount, 99000); assert.equal(opur.properties.coupon, 'VIP'); assert.equal(op.find(e => e.event_type === 'session_start').properties.device, 'mobile'); assert.ok(op.some(e => e.event_type === 'note'), '주인은 메모를 받는다');
  await emb.until(g => g.some(f => f.event === 'event' && f.data.event_type === 'purchase')); await new Promise(r => setTimeout(r, 200));
  const ep = emb.events().map(f => f.data).filter(e => e.session_id === 'emb1' || e.event_type === 'note'); const epur = ep.find(e => e.event_type === 'purchase'); assert.deepEqual(epur.properties, {}, '금액·커스텀 속성 없음'); assert.equal('path' in epur, false, '원본 경로 없음'); assert.equal(epur.page_path, '/products', '건물 키만');
  const est = ep.find(e => e.event_type === 'session_start'); assert.equal(est.properties.me, true); assert.equal(est.properties.country, 'KR'); assert.equal('device' in est.properties, false);
  assert.ok(!ep.some(e => e.event_type === 'note'), '임베드는 메모를 받지 않는다'); assert.ok(!JSON.stringify(emb.got).includes('secret-42') && !JSON.stringify(emb.got).includes('배포 v2'), '임베드 프레임 전체에 원본 경로·메모 글이 없다');
  const last = emb.lastId(); emb.close(); await post([ev('page_view', 'emb1', '/search')]);
  const emb2 = subscribe(base, '', { 'Last-Event-ID': last }, key); await emb2.until(g => g.length >= 2);
  assert.equal(emb2.got[0].event, 'resume'); assert.equal(emb2.got[1].event, 'event'); assert.equal(emb2.got[1].data.page_path, '/search'); assert.equal('path' in emb2.got[1].data, false);
  owner.close(); emb2.close();
});
