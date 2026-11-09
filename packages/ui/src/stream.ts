// 실시간 스트림(로드맵 54): SSE 연결 하나의 생애를 여기서만 관리한다. 셸(apps/web/shell/dashboard.js)과 임베드(components/EmbedTown.tsx)는 프레임·상태 콜백만 받는다.
// - 티켓(S-29): EventSource는 헤더를 못 붙이므로 열 때마다 auth.ticket()으로 30초짜리 일회용 티켓을 받아 URL에 둔다(임베드는 공개 키 그대로)
// - 끊기면 브라우저 자동 재접속(같은 URL = 만료된 티켓)을 쓰지 않고 직접 닫고 다시 연다: 1→2→…→30초 지수 백오프, 놓친 구간은 lastEventId 쿼리로 서버 resume
// - 티켓 요청이 401이면 백오프가 아니라 'auth' 상태를 주고 멈춘다(토큰 갱신·로그인은 쓰는 쪽이)
// - cancelled: close() 뒤에 늦게 온 티켓·프레임은 버린다(사이트 전환, StrictMode 이중 effect)
import { useEffect, useRef } from 'react';
import { L } from '@visitown/i18n';

export type StreamAuth = { embedKey: string } | { ticket: () => Promise<string> };
export type StreamStatus =
  | { state: 'connecting' }
  | { state: 'open'; via: 'snapshot' | 'resume' }
  | { state: 'down'; retryIn: number }
  | { state: 'auth'; error: unknown };
export interface StreamOptions {
  api: string; siteId: string; auth: StreamAuth;
  onFrame(type: string, data: any, meta: { lastEventId: string }): void;
  onStatus?(s: StreamStatus): void;
  types?: readonly string[];                 // 받을 SSE 이벤트 이름(기본 FRAME_TYPES). EventSource는 이름마다 리스너를 달아야 한다
  backoff?: { min?: number; max?: number };  // 기본 1초→30초
}
export const FRAME_TYPES = ['snapshot', 'resume', 'event', 'eventtypes', 'pages', 'unlocks', 'trails', 'weather', 'vitals', 'milestone', 'alert'] as const;

export interface SiteStream { close(): void; readonly closed: boolean; }

export function createSiteStream(o: StreamOptions): SiteStream {
  let cancelled = false, es: EventSource | null = null, lastId = '', backoff = 0, timer: ReturnType<typeof setTimeout> | undefined;
  const min = o.backoff?.min ?? 1000, max = o.backoff?.max ?? 30000;
  const status = (s: StreamStatus) => { if (!cancelled) o.onStatus?.(s); };
  const schedule = () => { const wait = backoff || min; backoff = Math.min(wait * 2, max); status({ state: 'down', retryIn: wait }); timer = setTimeout(open, wait); };
  async function open() {
    if (cancelled) return; status({ state: 'connecting' });
    let q: string;
    if ('embedKey' in o.auth) q = 'embed=' + encodeURIComponent(o.auth.embedKey);
    else {
      let t: string;
      try { t = await o.auth.ticket(); }
      catch (e) { if (cancelled) return; if ((e as { status?: number })?.status === 401) { status({ state: 'auth', error: e }); return; } return schedule(); }
      if (cancelled) return; q = 'ticket=' + encodeURIComponent(t);
    }
    if (lastId) q += '&lastEventId=' + encodeURIComponent(lastId);
    const s = new EventSource(`${o.api}/api/sites/${encodeURIComponent(o.siteId)}/stream?${q}`); es = s;
    for (const type of o.types ?? FRAME_TYPES) s.addEventListener(type, ev => {
      if (cancelled || es !== s) return; const m = ev as MessageEvent; if (m.lastEventId) lastId = m.lastEventId;
      let data: any; try { data = JSON.parse(m.data); } catch { return; }
      if (type === 'snapshot' || type === 'resume') { backoff = 0; status({ state: 'open', via: type }); }
      o.onFrame(type, data, { lastEventId: lastId });
    });
    s.onerror = () => { if (es !== s) return; s.close(); es = null; schedule(); };
  }
  open();
  return { close() { cancelled = true; clearTimeout(timer); es?.close(); es = null; }, get closed() { return cancelled; } };
}

// React 훅: 연결은 effect의 생애와 같다. 의존성은 api·siteId·임베드 키뿐이라 핸들러·티켓 함수가 렌더마다 바뀌어도 재연결하지 않는다(ref로 최신 것을 부른다).
// cleanup이 close()하므로 StrictMode의 마운트→정리→재마운트는 첫 연결을 바로 닫고 하나만 남긴다. 사이트가 바뀌면 cleanup이 이전 연결을 닫고 cancelled가 늦은 티켓·프레임을 버린다. null이면 연결하지 않는다
export function useSiteStream(o: StreamOptions | null): void {
  const latest = useRef(o); latest.current = o;
  const api = o?.api ?? '', siteId = o?.siteId ?? '', embedKey = o && 'embedKey' in o.auth ? o.auth.embedKey : '';
  useEffect(() => {
    if (!api || !siteId) return;
    const s = createSiteStream({
      api, siteId,
      auth: embedKey ? { embedKey } : { ticket: () => { const a = latest.current?.auth; return a && 'ticket' in a ? a.ticket() : Promise.reject(new Error(L("티켓 함수가 없어요"))); } },
      onFrame: (t, d, m) => latest.current?.onFrame(t, d, m),
      onStatus: st => latest.current?.onStatus?.(st),
      types: latest.current?.types, backoff: latest.current?.backoff,
    });
    return () => s.close();
  }, [api, siteId, embedKey]);
}
