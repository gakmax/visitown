// 패널이 같이 보는 것: 엔진(그림·건물·라벨), 스토어(세션·선택), 월드(캐릭터 상태·그림), 피드·UI 스토어, 셸이 넣어 준 동작. mount()가 한 번 만들고 Provider로 내린다
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type * as Engine from '@visitown/engine';
import type { TownStore, World } from '@visitown/engine';
import type { FeedStore } from './feedStore';
import type { Subscribe, createStore } from './store';

export type EngineApi = typeof Engine;
export interface UiState { rev: number; follow: boolean; clock: string; weather: string; weatherTitle: string; }
export type UiStore = ReturnType<typeof createStore<UiState>>;
export interface Actions { pick(sid: string): void; toggleFollow(): void; }
export interface Ctx { engine: EngineApi; store: TownStore; world: World; feed: FeedStore; ui: UiStore; actions: Actions;
  // store: 스토어 알림 그대로(선택처럼 바로 보여야 하는 것), slow: 250ms로 묶은 알림(숫자·세션 목록), version: 알림마다 오르는 번호(바뀌었는지만 알고 싶을 때의 스냅샷)
  sub: { store: Subscribe; slow: Subscribe; version: () => number }; }

export const UiContext = createContext<Ctx | null>(null);
export function useCtx(): Ctx { const c = useContext(UiContext); if (!c) throw new Error('UiContext가 없어요. mount() 안에서만 쓸 수 있어요'); return c; }
// 스토어가 바뀌면(250ms로 묶어) 다시 그린다. 값은 렌더 중에 store에서 직접 읽는다
export function useStoreVersion(): number { const { sub } = useCtx(); return useSyncExternalStore(sub.slow, sub.version, sub.version); }
export function useSelectedId(): string | null { const { sub, store } = useCtx(); return useSyncExternalStore(sub.store, () => store.selectedId, () => store.selectedId); }
// 1초마다 다시 그리기(접속 경과 같은 시계). on이 false면 멈춘다
export function useTick(ms: number, on: boolean): number { const [n, setN] = useState(0); useEffect(() => { if (!on) return; const t = setInterval(() => setN(x => x + 1), ms); return () => clearInterval(t); }, [ms, on]); return n; }
