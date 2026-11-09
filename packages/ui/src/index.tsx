// Visitown React 패널(로드맵 53): 피드·정보 패널·헤더 숫자. 엔진 인스턴스(스토어·월드·에셋)를 mount()로 받아 구독만 하고, 데이터는 넣지 않는다(SSE·시뮬레이터는 스토어에만 쓴다).
// 실시간 스트림(로드맵 54)도 여기 훅(useSiteStream)이 소유한다. 나머지 화면(설정·통계·리플레이 등)은 아직 shell/dashboard.js가 DOM으로 그린다. 이 패키지는 @visitown/engine을 타입으로만 본다(값을 import하면 번들에 엔진이 한 벌 더 들어간다 → tests/ui.test.js가 막는다)
import { StrictMode, useMemo, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { UiContext, type Actions, type Ctx, type EngineApi, type UiState } from './context';
import { createFeedStore, type FeedInput, type FeedPart, type FeedEntry } from './feedStore';
import { createStore, throttled } from './store';
import { createSiteStream, useSiteStream, FRAME_TYPES, type StreamOptions, type StreamStatus, type StreamAuth, type SiteStream } from './stream';
import { Feed } from './Feed';
import { InfoPanel } from './Info';
import { HeaderStats } from './Header';
import { FeedSummary, summarizeFeed, countEntry, EMPTY_COUNTS, type FeedCounts } from './Summary';
import type { TownStore, World } from '@visitown/engine';

export interface MountOptions { engine: EngineApi; store: TownStore; world: World; actions: Actions; targets: { feed: Element | null; info: Element | null; stats: Element | null; live?: Element | null }; maxFeed?: number; summaryMs?: number; }
// targets.live: 스크린리더용 피드 요약(로드맵 57)을 넣을 숨긴 role="status" 요소. summaryMs(기본 30초)마다 그동안의 줄을 한 문장으로

// 패널이 보는 스토어는 바꿀 수 있다(bindStore, 로드맵 54): 리플레이 동안은 리플레이 스토어를, 끝나면 라이브 스토어를. Provider 값이 바뀌면 패널이 새 스토어를 구독한다
function Host({ host, base, children }: { host: ReturnType<typeof createStore<{ store: TownStore; ver: () => number }>>; base: Omit<Ctx, 'store' | 'sub'>; children: React.ReactNode }) {
  const cur = useSyncExternalStore(host.subscribe, host.get, host.get);
  const ctx = useMemo<Ctx>(() => { const subStore = (fn: () => void) => cur.store.subscribe(fn); return { ...base, store: cur.store, sub: { store: subStore, slow: throttled(subStore, 250), version: cur.ver } }; }, [cur, base]);
  return <UiContext.Provider value={ctx}>{children}</UiContext.Provider>;
}
function StreamHost({ cfg }: { cfg: ReturnType<typeof createStore<{ opts: StreamOptions | null }>> }) { useSiteStream(useSyncExternalStore(cfg.subscribe, () => cfg.get().opts, () => cfg.get().opts)); return null; }

export function mount(o: MountOptions) {
  const feed = createFeedStore(o.maxFeed ?? 30);
  const ui = createStore<UiState>({ rev: 0, follow: false, clock: '06:00', weather: '', weatherTitle: '' });
  let ver = 0, unsubVer = o.store.subscribe(() => { ver++; }); const verOf = () => ver;
  const host = createStore<{ store: TownStore; ver: () => number }>({ store: o.store, ver: verOf });
  const base: Omit<Ctx, 'store' | 'sub'> = { engine: o.engine, world: o.world, feed, ui, actions: o.actions };
  // 실시간 스트림(로드맵 54)은 React 훅이 소유한다. 셸은 stream.connect/disconnect로 설정만 넣고 프레임 콜백을 받는다. 보이지 않는 루트에 마운트
  const streamCfg = createStore<{ opts: StreamOptions | null }>({ opts: null }); const streamEl = document.createElement('div');
  const flush = createStore<{ n: number }>({ n: 0 });
  const roots: Root[] = [];
  for (const [el, node] of [[o.targets.feed, <Feed />], [o.targets.info, <InfoPanel />], [o.targets.stats, <HeaderStats />], [o.targets.live, <FeedSummary every={o.summaryMs} flush={flush} />], [streamEl, <StreamHost cfg={streamCfg} />]] as const) {
    if (!el) continue; const r = createRoot(el); r.render(<StrictMode><Host host={host} base={base}>{node}</Host></StrictMode>); roots.push(r); }
  return {
    feed, ui,
    addFeed: (e: FeedInput) => feed.add(e),
    set: (patch: Partial<UiState>) => ui.set(patch),
    // 스토어가 모르는 변화(테마·밝기·건물 목록·웹 바이탈)가 있었으니 패널을 다시 그리라는 신호
    refresh() { ui.set({ rev: ui.get().rev + 1 }); },
    // 패널이 보는 스토어 바꾸기(리플레이 스토어 ↔ 라이브 스토어). 선택·피드 강조·헤더 숫자가 새 스토어를 따른다
    bindStore(store: TownStore) { unsubVer(); unsubVer = store.subscribe(() => { ver++; }); ver++; host.set({ store, ver: verOf }); },
    stream: { connect(opts: StreamOptions) { streamCfg.set({ opts }); }, disconnect() { streamCfg.set({ opts: null }); }, get active() { return !!streamCfg.get().opts; } },
    // 피드 요약을 지금 바로 한 번 읽어 준다(30초를 기다리지 않고). 테스트와 콘솔용
    announce() { flush.set({ n: flush.get().n + 1 }); },
    unmount() { for (const r of roots) r.unmount(); roots.length = 0; unsubVer(); },
  };
}
export type Mounted = ReturnType<typeof mount>;
export { Feed, InfoPanel, HeaderStats, FeedSummary, summarizeFeed, countEntry, EMPTY_COUNTS, UiContext, createFeedStore, createStore, throttled, createSiteStream, useSiteStream, FRAME_TYPES };
export { Part } from './Feed'; export { PropTags, VitalText } from './Info';
export { hhmmss, elapsed, flagEmoji, countryName } from './format';
export type { Actions, Ctx, EngineApi, UiState, FeedInput, FeedPart, FeedEntry, FeedCounts, StreamOptions, StreamStatus, StreamAuth, SiteStream };
