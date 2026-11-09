import type { Metadata } from 'next';
import EmbedTown from '../../../components/EmbedTown';

export const metadata: Metadata = { title: 'Visitown', robots: { index: false } };
type SP = Record<string, string | string[] | undefined>;
const str = (sp: SP, k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined);

// 임베드(OBS 브라우저 소스·홈페이지 iframe·미니 위젯): 마을만, 배경 투명. 예전 index.html?api=&site=&embed=키 주소는 next.config.ts의 rewrite로 여기 온다.
// 옵션은 대시보드 임베드 링크 화면이 만든다: theme= · labels/night/badges/marks/weather/season=0 · heat=1 · brand=0 · me=세션 · season=xmas
export default async function EmbedPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<SP> }) {
  const { key } = await params; const sp = await searchParams; const site = str(sp, 'site') || '';
  const off = (k: string) => str(sp, k) !== '0';
  return <div className="vt-embed-page">
    {site ? <EmbedTown api={str(sp, 'api')} site={site} embedKey={key} me={str(sp, 'me')} theme={str(sp, 'theme')} seasonForce={str(sp, 'season')} brand={off('brand')}
      labels={off('labels')} night={off('night')} badges={off('badges')} marks={off('marks')} weather={off('weather')} season={off('season')} heat={str(sp, 'heat') === '1'} />
      : <p role="alert" style={{ font: '13px/1.5 sans-serif', padding: 12 }}>임베드 주소에 site= 가 없어요. 대시보드의 임베드 버튼에서 링크를 다시 만들어 주세요.</p>}
  </div>;
}
