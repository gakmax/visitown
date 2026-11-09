'use strict';
// 보안 S-34: 임베드 구독자(공개 마을·고객 홈페이지 iframe·OBS·미니 위젯, 임베드 키만으로 연결)가 받는 SSE 프레임.
// 임베드 키는 공개 링크에 들어 있으므로 주인·멤버와 같은 프레임을 주면 구매 금액·커스텀 속성·원본 경로·메모·알림이 누구에게나 샌다.
// 그래서 마을을 그리는 데 필요한 것만 허용 목록으로 남긴다(엔진이 읽는 필드: apps/web/shell/embed.ts frame()·packages/engine/src/store.ts create()).
// 돌려주는 값이 null이면 그 프레임은 임베드에 보내지 않는다. 서버는 이 결과를 따로 둔 임베드용 링버퍼·대기 버퍼에 넣는다(server/index.js broadcast).
const FRAMES = new Set(['snapshot', 'event', 'eventtypes', 'pages', 'unlocks', 'trails', 'weather', 'vitals']); // milestone·alert는 안 보낸다(문장에 매출·기록이 들어간다)
const PROPS = ['me', 'country', 'rare', 'emoji', 'reason', 'bot', 'visit_no']; // 캐릭터 그리기용. device·referrer·plan·amount·ua·커스텀 속성은 뺀다
const SKIP_TYPES = new Set(['note', 'web_vital']); // 메모(글·작성자)와 성능 표본은 임베드가 쓰지 않는다

function event(ev) {
  if (!ev || typeof ev !== 'object' || SKIP_TYPES.has(ev.event_type)) return null;
  const props = {}; const src = ev.properties && typeof ev.properties === 'object' ? ev.properties : {};
  for (const k of PROPS) if (k in src) props[k] = src[k];
  const out = { event_id: ev.event_id, site_id: ev.site_id, session_id: ev.session_id, event_type: ev.event_type, page_path: ev.page_path, timestamp: ev.timestamp, properties: props }; // path(원본 경로)는 뺀다
  if (ev.started_at !== undefined) out.started_at = ev.started_at;
  return out;
}
const eventTypes = list => (Array.isArray(list) ? list : []).map(({ auto, ...c }) => c); // auto(자동 이벤트 정규식)는 설정이라 뺀다
const pages = list => (Array.isArray(list) ? list : []).map(({ pattern, ...p }) => p); // 임베드가 받는 page_path는 이미 건물 키라 패턴이 필요 없다
function vitals(v) { const out = {}; for (const k of Object.keys(v || {})) out[k] = { level: v[k] && v[k].level || null }; return out; } // 건물 연기는 level만 본다
const unlocks = u => (u ? { free: u.free, unlocked: u.unlocked, visits: u.visits, rules: [] } : null); // 테마·마을 레벨만. 진행도·기록·희귀 손님 목록은 뺀다

function view(frame, data) {
  if (!FRAMES.has(frame)) return null;
  switch (frame) {
    case 'event': return event(data);
    case 'eventtypes': return eventTypes(data);
    case 'pages': return pages(data);
    case 'vitals': return vitals(data);
    case 'unlocks': return unlocks(data);
    case 'snapshot': return { site_id: data.site_id, at: data.at, sessions: (data.sessions || []).map(event).filter(Boolean), pages: pages(data.pages), eventTypes: eventTypes(data.eventTypes), unlocks: unlocks(data.unlocks), weather: data.weather, vitals: vitals(data.vitals) }; // lastEventAt은 뺀다
    default: return data; // trails·weather: 집계값뿐
  }
}
module.exports = { view, event, FRAMES, PROPS };
