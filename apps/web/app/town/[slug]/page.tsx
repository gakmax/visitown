import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import '../../../shell/shell.css';
import '../../landing.css';
import EmbedTown from '../../../components/EmbedTown';
import { clientApi, publicSites } from '../../../lib/api';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const sites = cache(publicSites); // generateMetadata와 페이지가 같은 요청에서 한 번만 가져온다
async function load({ params, searchParams }: Props) {
  const { slug } = await params; const sp = await searchParams; const host = ((await headers()).get('host') || '').replace(/:\d+$/, ''); const api = clientApi(typeof sp.api === 'string' ? sp.api : null, host); // ?api=는 개발·테스트용. 서버가 아무 주소나 fetch하지 않게 허용 목록(lib/api.ts, S-30)으로 거른다
  return { api, site: (await sites(api)).find(s => s.id === slug) };
}

// 공개 마을(로드맵 23·56): 주인이 공개를 켠 사이트를 서버에서 그린다. 링크 미리보기(OG)에 마을 이름·지금 접속자 수가 들어가는, 서버 렌더링이 쓸모 있는 유일한 곳
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { site } = await load(props);
  if (!site) return { title: '마을을 찾을 수 없어요 · Visitown', robots: { index: false } };
  const title = `${site.name} 마을 · Visitown`, description = `${site.domain}의 방문자가 픽셀 마을을 걸어 다녀요. 지금 ${site.online}명이 있어요.`;
  return { title, description, openGraph: { title, description, type: 'website', siteName: 'Visitown', images: ['/icons/icon-512.png'] }, twitter: { card: 'summary', title, description } };
}

export default async function TownPage(props: Props) {
  const { api, site } = await load(props);
  if (!site) notFound();
  return <div className="wrap town-page">
    <header className="hero"><h1>{site.name}</h1><span className="domain">{site.domain} · 지금 {site.online}명</span></header>
    <main>
      <div className="town px"><EmbedTown api={api} site={site.id} embedKey={site.embed} brand={false} labels night badges marks weather season heat={false} /></div>
      <p className="muted">주인이 공개를 켠 마을이에요. 방문자 정보·설정은 없고 지금 있는 사람들만 보여요. 내 사이트에도 띄우려면 <a href="/">Visitown</a>을 설치해 보세요.</p>
    </main>
    <footer>Visitown · <a href="/legal/terms.html">이용약관</a> · <a href="/legal/privacy.html">개인정보처리방침</a></footer>
  </div>;
}
