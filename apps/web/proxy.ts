// 요청마다 nonce를 만들어 CSP를 붙인다(docs/security.md S-03·S-24, 로드맵 56). script-src에 'unsafe-inline'이 없다: Next가 자기 스크립트에 nonce를 붙이고,
// 'strict-dynamic'이라 그 스크립트가 만든 스크립트(랜딩의 SDK 로드)만 더 허용된다. 페이지는 전부 동적 렌더링(layout.tsx가 headers()를 읽는다)
import { NextResponse, type NextRequest } from 'next/server';

const DEV = process.env.NODE_ENV === 'development';
const EMBEDDABLE = /^\/(embed|town)(\/|$)/; // 남의 사이트 iframe·OBS·공개 마을: frame-ancestors·X-Frame-Options 없음
const STATIC_HTML = /^\/legal\//;           // public/의 순수 HTML(인라인 스크립트 없음): nonce 없이 자기 출처 스크립트만

function csp(nonce: string | null, embeddable: boolean) {
  const script = nonce ? `'self' 'nonce-${nonce}' 'strict-dynamic'${DEV ? " 'unsafe-eval'" : ''}` : `'self'`;
  return [
    `default-src 'self'`,
    `script-src ${script}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net`, // 인라인 style 속성(캔버스 배율·캠페인 색)은 둔다. 위험도 낮음
    `font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net`,
    `img-src 'self' data: blob: https: http://localhost:* http://127.0.0.1:*`,   // 배지·아이콘(data:)·사진 공유(blob:)·수집 서버의 배지
    `connect-src 'self' https: http://localhost:* http://127.0.0.1:*${DEV ? ' ws: wss:' : ''}`, // 수집 서버 API·SSE·Supabase. 개발은 HMR 웹소켓
    `media-src 'self' blob: data:`,
    `worker-src 'self'`,
    `manifest-src 'self'`,
    `frame-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    ...(embeddable ? [] : [`frame-ancestors 'self'`]),
  ].join('; ');
}

export function proxy(req: NextRequest) {
  const p = req.nextUrl.pathname;
  const embeddable = EMBEDDABLE.test(p) || ((p === '/' || p === '/index.html') && req.nextUrl.searchParams.has('embed'));
  const nonce = STATIC_HTML.test(p) ? null : Buffer.from(crypto.randomUUID()).toString('base64');
  const value = csp(nonce, embeddable);
  const reqHeaders = new Headers(req.headers);
  if (nonce) reqHeaders.set('x-nonce', nonce);
  reqHeaders.set('Content-Security-Policy', value); // Next가 여기서 nonce를 읽어 자기 스크립트에 붙인다
  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set('Content-Security-Policy', value);
  if (!embeddable) res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return res;
}

export const config = {
  matcher: [{
    source: '/((?!_next/static|_next/image|.*\\.(?:png|ico|svg|webmanifest|js|css|woff2?)$).*)',
    missing: [{ type: 'header', key: 'next-router-prefetch' }, { type: 'header', key: 'purpose', value: 'prefetch' }],
  }],
};
