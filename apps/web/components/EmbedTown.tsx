'use client';
// 마을만 그리는 클라이언트 컴포넌트(/embed/[key], /town/[slug]). 스트림은 useSiteStream 훅(packages/ui, 로드맵 54)이 쥐고(공개 임베드 키, 끊기면 백오프 + lastEventId 재개),
// 그리기는 마운트 뒤 동적으로 불러온 shell/embed.ts가 한다. 엔진 청크가 오기 전에 도착한 프레임은 모아 두었다가 넘긴다
import { useEffect, useRef, useState } from 'react';
import { useSiteStream, type StreamStatus } from '@visitown/ui/stream';
import '../shell/embed.css';
import { embedApi } from '../lib/api';
import { tr, type Locale, type Vars } from '@visitown/i18n';
import type { EmbedOptions, EmbedTownHandle } from '../shell/embed';

export type EmbedTownProps = EmbedOptions & { api?: string; site: string; embedKey: string; brand: boolean; locale: Locale };

export default function EmbedTown(props: EmbedTownProps) {
  const T = (ko: string, vars?: Vars) => tr(props.locale, ko, vars); // 화면 언어는 서버 페이지가 prop으로(로드맵 60)
  const root = useRef<HTMLDivElement>(null); const town = useRef<EmbedTownHandle | null>(null); const queue = useRef<Array<['frame', string, any] | ['status', StreamStatus]>>([]);
  const [api, setApi] = useState(''); // 기본 서버는 브라우저의 호스트를 보고 정한다(lib/api.ts)
  useEffect(() => { setApi(embedApi(props.api, location.hostname)); }, [props.api]);
  const { api: _a, site: _s, embedKey: _k, brand: _b, locale: _l, ...opts } = props; const key = JSON.stringify(opts);
  useEffect(() => {
    const el = root.current; if (!el) return; let on = true;
    import('../shell/embed').then(m => { if (!on) return; town.current = m.createEmbedTown(el, JSON.parse(key)); for (const q of queue.current) q[0] === 'frame' ? town.current.frame(q[1], q[2]) : town.current.status(q[1]); queue.current = []; });
    return () => { on = false; town.current?.destroy(); town.current = null; };
  }, [key]);
  useSiteStream(api ? {
    api, siteId: props.site, auth: { embedKey: props.embedKey },
    onFrame: (type, data) => { if (town.current) town.current.frame(type, data); else queue.current.push(['frame', type, data]); },
    onStatus: s => { if (town.current) town.current.status(s); else queue.current.push(['status', s]); },
  } : null);
  return <div className="vt-embed" ref={root} role="region" aria-label={T("방문자 마을")}>
    <div className="stage">
      <div className="viewport"><div className="town">
        <canvas width={480} height={270} role="img" aria-label={T("Visitown 마을. 방문자가 캐릭터로 돌아다닙니다.")} />
        <div className="labels" aria-hidden="true" />
      </div></div>
      <div className="err" role="alert" hidden />
      {props.brand ? <a className="brand" href="/" target="_blank" rel="noopener" title={T("Visitown으로 만든 실시간 방문자 마을이에요")}><img src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="" />Visitown</a> : null}
    </div>
  </div>;
}
