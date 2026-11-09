// 작은 외부 스토어(migration.md 2절): React는 useSyncExternalStore + 셀렉터로 구독만 한다. 셀렉터는 원시값이나 스토어가 들고 있는 같은 참조를 돌려줘야 한다(매번 새 객체면 무한 리렌더)
import { useSyncExternalStore } from 'react';

export type Unsubscribe = () => void;
export type Subscribe = (fn: () => void) => Unsubscribe;
export interface Readable<T> { get(): T; subscribe: Subscribe; }

export function createStore<T extends object>(initial: T) {
  let state = initial; const subs = new Set<() => void>();
  const subscribe: Subscribe = fn => { subs.add(fn); return () => { subs.delete(fn); }; };
  return {
    get: () => state, subscribe,
    // 바뀐 키가 하나도 없으면 알리지 않는다(매 프레임 같은 시계 문자열을 넣어도 리렌더 0)
    set(patch: Partial<T>) { let changed = false; for (const k in patch) if (state[k as keyof T] !== patch[k as keyof T]) { changed = true; break; } if (!changed) return; state = { ...state, ...patch }; for (const f of subs) f(); },
  };
}

export function useStore<T, R>(store: Readable<T>, sel: (s: T) => R): R {
  return useSyncExternalStore(store.subscribe, () => sel(store.get()), () => sel(store.get()));
}

// 초당 여러 번 바뀌는 값(접속자·봇·이벤트 수)은 알림을 ms마다 한 번으로 묶는다. 구독자는 알림을 받은 뒤 getSnapshot으로 최신값을 읽으므로 중간값을 놓쳐도 마지막 값은 보인다
export function throttled(subscribe: Subscribe, ms = 250): Subscribe {
  return fn => { let timer: ReturnType<typeof setTimeout> | null = null;
    const off = subscribe(() => { if (timer) return; timer = setTimeout(() => { timer = null; fn(); }, ms); });
    return () => { off(); if (timer) { clearTimeout(timer); timer = null; } }; };
}
