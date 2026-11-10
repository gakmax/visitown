// 이 앱의 공개 주소. 메타데이터(OG 이미지 절대 주소)·robots·sitemap이 쓴다. 도메인을 옮기면 Vercel 환경변수 NEXT_PUBLIC_SITE_URL만 바꾼다
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://visitown.vercel.app').replace(/\/$/, '');
export const REPO_URL = 'https://github.com/gakmax/visitown';
