import type { Metadata } from 'next';
import '../shell/shell.css';
import './landing.css';
import { LOGO_SVG } from '../lib/logo';
import { LandingCta, LandingLive, LangSwitch } from './LandingClient';
import { serverT, legalHref } from '../lib/locale';

export async function generateMetadata(): Promise<Metadata> { const { T } = await serverT(); return { title: T("Visitown · 방문자가 걸어 다니는 마을") }; }

// 랜딩(예전 landing/index.html). 이 페이지 자체가 Visitown으로 추적되는 사이트라서, 들어온 사람은 자기 캐릭터(ME)와 지금 같이 보는 사람들을 본다(LandingLive).
// 서버가 보내는 HTML은 글만 있고, 마을 iframe·접속자 수·공개 마을 목록은 브라우저에서 수집 서버를 보고 채운다
export default async function LandingPage() {
  const { T, locale } = await serverT();
  return <div className="wrap">
    <header className="hero">
      <h1 style={{ margin: 0, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
      <p className="tagline">{T("사이트 방문자가 픽셀 마을을 걸어 다녀요.")}<br />{T("설치는 스크립트 한 줄이면 돼요.")}</p>
      <LandingCta locale={locale} />
    </header>
    <main><LandingLive locale={locale} /></main>
    <footer>Visitown · <a href={legalHref(locale, 'terms')}>{T("이용약관")}</a> · <a href={legalHref(locale, 'privacy')}>{T("개인정보처리방침")}</a> · <a href="https://github.com/">GitHub</a> · <LangSwitch locale={locale} /></footer>
  </div>;
}
