// 헤더 숫자(<div id="statsBox"> 안): 접속자·봇·이벤트는 스토어를 250ms로 묶어 구독, 마을 시간·날씨는 셸이 ui 스토어에 넣는다(ui.set). 숫자가 바뀌면 key가 바뀌어 bump 애니메이션이 다시 돈다
import { useSyncExternalStore } from 'react';
import { useCtx } from './context';
import { useStore } from './store';
import { L } from '@visitown/i18n';

function Num({ id, v }: { id: string; v: number }) { return <b id={id} key={v} className="bump">{v}</b>; }

export function HeaderStats() {
  const { engine, store, ui, sub } = useCtx();
  useStore(ui, s => s.rev); const clock = useStore(ui, s => s.clock); const weather = useStore(ui, s => s.weather); const weatherTitle = useStore(ui, s => s.weatherTitle);
  const online = useSyncExternalStore(sub.slow, () => store.online, () => store.online);
  const bots = useSyncExternalStore(sub.slow, () => store.bots || 0, () => store.bots || 0);
  const events = useSyncExternalStore(sub.slow, () => store.totalEvents, () => store.totalEvents);
  const I = engine.A.iconUrl || {};
  return <>
    <div className="stat" title={L("실시간 접속자")}><img id="icoPerson" src={I.person} alt="" />{L("접속자")} <Num id="stOnline" v={online} /></div>
    <div className="stat" title={L("마을 시간 (데모에서는 150초가 하루)")}><img id="icoClock" src={I.spark} alt="" />{L("마을 시간")} <b id="stClock" style={{ minWidth: '5ch' }}>{clock}</b>{weather ? <span id="stWeather" className="muted" title={weatherTitle}>{weather}</span> : null}</div>
    <div className="stat" title={L("크롤러·봇 (접속자 수에 포함하지 않음)")}><img id="icoRobot" src={I.robot} alt="" />{L("봇")} <Num id="stBots" v={bots} /></div>
    <div className="stat" title={L("누적 이벤트")}><img id="icoBolt" src={I.bolt} alt="" />{L("이벤트")} <Num id="stEvents" v={events} /></div>
  </>;
}
