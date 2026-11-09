// 피드 스토어: 줄은 HTML 문자열이 아니라 조각(FeedPart) 배열이다. 글자는 React가 이스케이프하므로 esc()가 필요 없고, 버튼은 onClick 클로저로 동작을 든다(data-* 속성 + 위임 없음)
import type { Subscribe } from './store';

export type FeedPart = string | { b: string } | { muted: string; title?: string } | { rare: string } | { btn: string; onClick: () => void };
export interface FeedEntry { id: number; at: number; icon: string; sid: string; cls: string; parts: FeedPart[]; }
export interface FeedInput { parts: FeedPart[] | string; icon: string; sid?: string; at?: number; cls?: string | boolean; }
export interface FeedStore { get(): FeedEntry[]; subscribe: Subscribe; add(e: FeedInput): FeedEntry; clear(): void; }

export function createFeedStore(max = 30): FeedStore {
  let list: FeedEntry[] = []; let seq = 0; const subs = new Set<() => void>();
  const emit = () => { for (const f of subs) f(); };
  return {
    get: () => list,
    subscribe: fn => { subs.add(fn); return () => { subs.delete(fn); }; },
    add(e) { const entry: FeedEntry = { id: ++seq, at: e.at ?? Date.now(), icon: e.icon, sid: e.sid || '', cls: e.cls === true ? 'sys' : (e.cls || ''), parts: typeof e.parts === 'string' ? [e.parts] : e.parts };
      list = [entry, ...list].slice(0, max); emit(); return entry; },
    clear() { if (!list.length) return; list = []; emit(); },
  };
}
