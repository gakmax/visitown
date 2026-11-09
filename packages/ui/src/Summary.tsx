// 스크린리더용 피드 요약(로드맵 57). 피드 줄은 초당 여러 번 생겨 aria-live에 바로 붙이면 넘치므로, 30초마다 한 문장으로 묶어 role="status"(polite) 영역에 넣는다.
// 피드 스토어 구독으로 새 줄을 세고(30줄 상한과 무관하게 전부 센다), 조용했던 구간은 말하지 않는다. summarizeFeed는 React 없이 테스트한다
import { useEffect, useRef, useState } from 'react';
import { useCtx } from './context';
import type { FeedEntry } from './feedStore';
import type { Readable } from './store';

export interface FeedCounts { enter: number; move: number; leave: number; timeout: number; bot: number; event: number; sys: number; }
export const EMPTY_COUNTS: FeedCounts = { enter: 0, move: 0, leave: 0, timeout: 0, bot: 0, event: 0, sys: 0 };
// 아이콘이 줄의 종류다(dashboard.js feedLine): enter·star(희귀 입장)·walk·leave·timeout·robot, 나머지는 커스텀 이벤트. 시스템 줄(cls에 sys)은 연결 상태·기록 갱신 같은 알림
export function countEntry(c: FeedCounts, e: FeedEntry): FeedCounts {
  const n = { ...c };
  if (/\bsys\b/.test(e.cls)) n.sys++;
  else if (e.icon === 'enter' || e.icon === 'star') n.enter++;
  else if (e.icon === 'walk') n.move++;
  else if (e.icon === 'leave') n.leave++;
  else if (e.icon === 'timeout') n.timeout++;
  else if (e.icon === 'robot') n.bot++;
  else n.event++;
  return n;
}
export function summarizeFeed(c: FeedCounts, online: number, secs = 30): string | null {
  const parts: string[] = [];
  if (c.enter) parts.push(`입장 ${c.enter}명`); if (c.leave) parts.push(`떠남 ${c.leave}명`); if (c.move) parts.push(`페이지 이동 ${c.move}번`);
  if (c.event) parts.push(`이벤트 ${c.event}건`); if (c.timeout) parts.push(`연결 끊김 ${c.timeout}명`); if (c.bot) parts.push(`봇 ${c.bot}건`); if (c.sys) parts.push(`알림 ${c.sys}건`);
  if (!parts.length) return null;
  return `지난 ${secs}초: ${parts.join(', ')}. 지금 접속자 ${online}명.`;
}

// every ms마다 그동안 쌓인 줄을 한 문장으로. flush 스토어의 번호가 오르면 바로 한 번 말한다(테스트·"지금 읽어 줘")
export function FeedSummary({ every = 30000, flush }: { every?: number; flush?: Readable<{ n: number }> }) {
  const { feed, store } = useCtx();
  const [text, setText] = useState('');
  const acc = useRef<FeedCounts>(EMPTY_COUNTS); const lastId = useRef(0);
  useEffect(() => {
    // add()는 한 줄씩 앞에 붙이므로 알림마다 맨 앞 줄이 새 줄. clear() 뒤에는 목록이 비어 있어 건너뛴다
    const off = feed.subscribe(() => { const top = feed.get()[0]; if (!top || top.id <= lastId.current) return; lastId.current = top.id; acc.current = countEntry(acc.current, top); });
    const say = () => { const s = summarizeFeed(acc.current, store.online, Math.round(every / 1000)); acc.current = EMPTY_COUNTS; if (s) setText(s); };
    const timer = setInterval(say, every);
    const offFlush = flush ? flush.subscribe(say) : () => {};
    return () => { off(); offFlush(); clearInterval(timer); };
  }, [feed, store, every, flush]);
  return <>{text}</>;
}
