import type { NextConfig } from 'next';

// 보안 응답 헤더(docs/security.md S-03). CSP·X-Frame-Options는 요청마다 nonce가 필요해서 proxy.ts가 붙인다
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 워크스페이스 패키지는 TS 소스 그대로 가져온다(packages/engine·packages/ui의 exports.import)
  transpilePackages: ['@visitown/engine', '@visitown/ui', '@visitown/i18n'],
  // 대시보드·디자인 시스템 마크업은 서버 컴포넌트가 fs로 읽는다(components/DashboardShell.tsx). 배포 번들에 같이 넣는다
  outputFileTracingIncludes: { '/app': ['./shell/*.html'], '/demo': ['./shell/*.html'], '/design-system': ['./shell/*.html'] },
  async headers() { return [{ source: '/(.*)', headers: SECURITY_HEADERS }]; },
  // 예전 주소(index.html?demo=1 · index.html?api=&site= · /landing/)는 새 라우트로 보낸다. 쿼리는 그대로 넘어간다
  async redirects() {
    return [
      { source: '/index.html', has: [{ type: 'query', key: 'demo', value: '1' }], destination: '/demo', permanent: false },
      { source: '/index.html', missing: [{ type: 'query', key: 'embed' }], destination: '/app', permanent: false },
      { source: '/landing', destination: '/', permanent: true },
      { source: '/landing/index.html', destination: '/', permanent: true },
    ];
  },
  // 임베드 링크(index.html?embed=키 · /?embed=키)는 남의 사이트 iframe·OBS에 박혀 있는 공개 계약이라 redirect가 아니라 rewrite로 그대로 산다
  async rewrites() {
    return { beforeFiles: [
      { source: '/index.html', has: [{ type: 'query', key: 'embed', value: '(?<key>.*)' }], destination: '/embed/:key' },
      { source: '/', has: [{ type: 'query', key: 'embed', value: '(?<key>.*)' }], destination: '/embed/:key' },
    ] };
  },
};

export default nextConfig;
