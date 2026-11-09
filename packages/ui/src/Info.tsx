// INFO 패널(<div id="infoBody"> 안). 무엇을 보여 줄지는 store.selectedId 하나로 정한다: 건물 경로(BY_PATH) → 건물, 세션 id → 캐릭터, 캐릭터가 없으면 "떠났어요"
import { useMemo } from 'react';
import type { Session } from '@visitown/engine';
import { useCtx, useSelectedId, useStoreVersion, useTick } from './context';
import { useStore } from './store';
import { elapsed, flagEmoji, countryName, hhmmss } from './format';
import { L } from '@visitown/i18n';

export function InfoPanel() {
  const { engine, store, world, ui } = useCtx();
  const selectedId = useSelectedId(); useStoreVersion(); useStore(ui, s => s.rev); useTick(1000, !!selectedId);
  if (!selectedId) return <p className="hint">{L("캐릭터나 건물을 클릭하면 정보가 나와요. 피드 항목을 누르면 그 캐릭터를 찾아줘요.")}</p>;
  const b = engine.BY_PATH.get(selectedId);
  if (b) return <BuildingInfo key={selectedId} b={b} />;
  const ch = world.chars.get(selectedId);
  if (!ch) return <p className="hint" key={selectedId}>{L("방문자")} <b>#{engine.sessionCode(selectedId)}</b>{L("는 이미 마을을 떠났어요.")}</p>;
  return <CharInfo key={selectedId} ch={ch} s={store.sessions.get(selectedId)} />;
}

function CharInfo({ ch, s }: { ch: any; s: Session | undefined }) {
  const { engine, store, world, ui, actions } = useCtx(); const follow = useStore(ui, s => s.follow); const rev = useStore(ui, s => s.rev);
  const { A, BY_PATH, evLabel } = engine;
  const state = ch.leaving || ch.state === 'rise' ? <span className="pill leave">{L("떠나는 중")}</span> : ch.state === 'idle' ? <span className="pill">{L("머무는 중")}</span> : <span className="pill walk">{L("이동 중")}</span>;
  const page = s ? BY_PATH.get(s.page) : null; const look = ch.bot ? L("크롤러") : `${s?.props?.me ? L("주인") : A.colors[ch.color].name} ${A.shapes[ch.shape].name}`;
  // 캐릭터 그림(toDataURL)은 테마가 바뀔 때만 다시 만든다(rev)
  const img = useMemo(() => world.charImage(ch), [world, ch, ch.bot, ch.shape, ch.color, rev]);
  const recent = s ? [...s.events].reverse().slice(0, 5) : [];
  return <div>
    <div className="avatar"><img src={img} alt={look} /><div><div className="code">{ch.bot ? ch.bot + ' BOT' : s?.props?.me ? L("나 (#{0})", {0:ch.code}) : '#' + ch.code}</div><div className="hint">{look}</div></div>
      <button className="btn" id="btnFollow" aria-pressed={follow} onClick={actions.toggleFollow} title={L("카메라가 이 캐릭터를 따라가요. 캐릭터를 한 번 더 누르거나, 끌거나, 미니맵을 누르면 꺼져요")}>{L("따라가기")}</button></div>
    <PropTags s={s} />
    <dl className="kv"><dt>{L("세션")}</dt><dd>{ch.id.slice(0, 9)}…</dd><dt>{L("현재 페이지")}</dt><dd>{page ? <>{page.name} <span className="hint">{s?.path || page.path}</span></> : L("(떠남)")}</dd>
      <dt>{L("접속 경과")}</dt><dd data-el="">{s ? elapsed(Date.now() - s.startedAt) : '-'}</dd><dt>{L("상태")}</dt><dd>{state}</dd></dl>
    <ul className="recent">{recent.length ? recent.map((e, i) => <li key={i}>{hhmmss(e.at)} {evLabel(e.type)}{e.type === 'page_view' ? ' → ' + (BY_PATH.get(store.resolvePath(e.page))?.name || e.page) : ''}</li>) : <li>{L("최근 이벤트 없음")}</li>}</ul>
  </div>;
}

export function PropTags({ s }: { s: Session | undefined }) {
  const { engine } = useCtx(); const { BOTS, PROP_LABEL, RARE_BY_KEY, rareLabel, campaignColor } = engine;
  if (!s) return null;
  if (s.bot) { const b = BOTS.find(x => x.name === s.bot); return <div className="tags"><span className="tag bot">{L("봇 추정 ·")} {b ? b.ua : s.bot}</span><span className="tag">{L("접속자 수 제외")}</span></div>; }
  const p = s.props; const utm = [p.utm_source && 'source=' + p.utm_source, p.utm_medium && 'medium=' + p.utm_medium, p.utm_campaign && 'campaign=' + p.utm_campaign].filter(Boolean).join(' · ');
  return <div className="tags">
    {p.me ? <span className="tag me">{L("나")}</span> : null}
    {p.rare ? <span className="tag rare" title={RARE_BY_KEY[p.rare]?.text}>✦ {rareLabel(p)}</span> : null}
    <span className="tag">{PROP_LABEL.device[p.device as keyof typeof PROP_LABEL.device] || p.device || '?'}</span>
    <span className="tag">{p.returning ? L("재방문") : L("신규")}</span>
    <span className="tag">{PROP_LABEL.referrer[p.referrer as keyof typeof PROP_LABEL.referrer] || p.referrer || '?'}</span>
    {p.country ? <span className="tag" title={p.country}>{flagEmoji(p.country)} {countryName(p.country)}</span> : null}
    {p.plan === 'pro' ? <span className="tag pro">{L("유료 회원")}</span> : null}
    {p.campaign ? <span className="tag camp" title={utm}><i style={{ background: campaignColor(p.campaign) }} />{p.campaign}</span> : null}
  </div>;
}

function BuildingInfo({ b }: { b: any }) {
  const { engine, store, world } = useCtx(); const n = store.counts[b.path] || 0; const rc = store.recentCount(b.path, 60000);
  const lv = n >= 10 ? <span className="pill hot">{L("10명 이상 · 강조")}</span> : n >= 5 ? <span className="pill">{L("5~9명 · 반짝임")}</span> : n > 0 ? <span className="pill walk">{L("1~4명")}</span> : <span className="pill leave">{L("0명")}</span>;
  const vt = world.vitals?.[b.path];
  return <div>
    <div className="avatar"><img src={engine.A.iconUrl?.[b.icon]} alt="" /><div><div className="code">{b.name}</div><div className="hint">{b.path}</div></div></div>
    <dl className="kv"><dt>{L("현재 인원")}</dt><dd><b>{n}{L("명")}</b></dd><dt>{L("밀집도")}</dt><dd>{lv}</dd><dt>{L("최근 1분 이벤트")}</dt><dd>{rc}{L("건")}</dd>{vt?.level ? <><dt>{L("웹 바이탈")}</dt><dd><VitalText v={vt} /></dd></> : null}</dl>
  </div>;
}

// 느린 페이지(로드맵 28): 서버가 모은 건물별 p75. SDK data-vitals="1"이 보낸 LCP·INP·CLS
export function VitalText({ v }: { v: any }) {
  const lv = ({ poor: <span className="pill hot">{L("느려요")}</span>, ok: <span className="pill">{L("개선 필요")}</span>, good: <span className="pill walk">{L("좋아요")}</span> } as Record<string, any>)[v.level] || null;
  const parts: string[] = []; if (v.LCP?.n) parts.push(L("LCP {0}초", {0:(v.LCP.p75 / 1000).toFixed(1)})); if (v.INP?.n) parts.push(`INP ${Math.round(v.INP.p75)}ms`); if (v.CLS?.n) parts.push(`CLS ${(+v.CLS.p75).toFixed(2)}`);
  return <>{lv} <span className="hint" title={L("최근 표본의 75번째 백분위. 느려요: LCP 4초·INP 500ms·CLS 0.25 초과 / 개선 필요: 2.5초·200ms·0.1 초과")}>{parts.join(' · ')} ({Math.max(v.LCP?.n || 0, v.INP?.n || 0, v.CLS?.n || 0)}{L("회)")}</span></>;
}
