// LIVE FEED(<ul id="feed"> 안). 줄 클릭·Enter·Space는 그 캐릭터 찾기(actions.pick → store.select), 강조(.hi)는 store.selectedId에서 나온다
import { useCtx, useSelectedId } from './context';
import type { FeedPart } from './feedStore';
import { useStore } from './store';
import { hhmmss } from './format';

export function Part({ p }: { p: FeedPart }) {
  if (typeof p === 'string') return <>{p}</>;
  if ('b' in p) return <b>{p.b}</b>;
  if ('muted' in p) return <span className="muted" title={p.title}>{p.muted}</span>;
  if ('rare' in p) return <b className="rare-x">✦ {p.rare}</b>;
  return <button className="btn mini" type="button" onClick={e => { e.stopPropagation(); p.onClick(); }}>{p.btn}</button>;
}

export function Feed() {
  const { feed, engine, ui, actions } = useCtx();
  const list = useStore(feed, s => s); const selectedId = useSelectedId(); useStore(ui, s => s.rev); // rev: 테마·밝기가 바뀌면 아이콘 주소가 바뀐다
  const icons = engine.A.iconUrl || {};
  const pick = (sid: string) => { if (sid) actions.pick(sid); };
  return <>{list.map(e => (
    <li key={e.id} data-sid={e.sid} tabIndex={0} className={[e.cls, e.sid && e.sid === selectedId ? 'hi' : ''].filter(Boolean).join(' ') || undefined}
      onClick={() => pick(e.sid)} onKeyDown={k => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); pick(e.sid); } }}>
      <img src={icons[e.icon]} alt={e.icon} /><span className="t">{hhmmss(e.at)}</span><span>{e.parts.map((p, i) => <Part key={i} p={p} />)}</span>
    </li>))}</>;
}
