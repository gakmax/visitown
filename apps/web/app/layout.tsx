import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { SHELL_APPLY } from '../lib/shell-head';
import { requestLocale } from '../lib/locale';
import { tr } from '@visitown/i18n';
import { SITE_URL } from '../lib/site';

const BASE_META: Metadata = {
  metadataBase: new URL(SITE_URL), // 상대 주소 OG 이미지를 절대 주소로
  title: 'Visitown',
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/icons/favicon.ico', sizes: '48x48' }, { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' }], apple: '/icons/icon-180.png' },
  appleWebApp: { capable: true, title: 'Visitown' },
  other: { 'mobile-web-app-capable': 'yes' },
};
export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const description = tr(locale, '웹사이트 방문자를 픽셀 캐릭터로, 페이지를 마을 건물로 보여 주는 실시간 방문자 시각화. 설치는 스크립트 한 줄.');
  // 링크 미리보기(디스코드·카카오톡·슬랙·X·레딧): 기본은 public/og.png(1200×630, 글자 없는 마을+로고라 언어 무관). 공개 마을은 자기 것으로 덮는다
  return { ...BASE_META, description, openGraph: { type: 'website', siteName: 'Visitown', title: 'Visitown', description, images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Visitown' }] }, twitter: { card: 'summary_large_image', title: 'Visitown', description, images: ['/og.png'] } };
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f1e6d2' };

// 모든 페이지가 headers()를 읽으므로 동적 렌더링이다: proxy.ts가 요청마다 만든 nonce가 Next 스크립트와 아래 밝기 스크립트에 붙는다(정적 생성이면 nonce를 못 붙여 CSP에 막힌다)
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined; const locale = await requestLocale(); // 화면 언어(로드맵 60): 브라우저 스크립트는 <html lang>을 읽는다
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SHELL_APPLY }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
