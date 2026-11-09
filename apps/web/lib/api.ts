// 수집 서버 주소. 배포하면 NEXT_PUBLIC_VT_API로 바꾼다(로컬에서 열면 대시보드·랜딩이 localhost:8787로 돌린다, 쿼리 ?api=는 개발·테스트용)
export const DEFAULT_API = (process.env.NEXT_PUBLIC_VT_API || 'https://visitown-api.fly.dev').replace(/\/$/, '');
export const LOCAL_API = 'http://localhost:8787';
export const isLocalHost = (host: string) => /^(localhost|127\.\d+\.\d+\.\d+|)$/.test(host); // 페이지를 로컬에서 열었나(127.0.0.1 포함)
const isLocalApi = (u: string) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(u);
// 브라우저에서: ?api= → 환경값(로컬이면 로컬 서버)
// 보안 S-30·S-31: 대시보드는 이 주소로 로그인 토큰을 보내고 랜딩은 이 주소의 SDK를 실행하므로 아무 주소나 받으면 링크 하나로 토큰이 새고 남의 스크립트가 우리 출처에서 돈다.
// 그래서 쿼리는 DEFAULT_API이거나, 페이지가 로컬(localhost·127.*)일 때의 localhost 서버(개발·테스트)만 받고 나머지는 환경값으로 돌린다.
export function clientApi(query: string | null | undefined, host: string) {
  const q = (query || '').replace(/\/$/, ''), def = isLocalHost(host) ? LOCAL_API : DEFAULT_API;
  if (!q) return def; return q === DEFAULT_API || (isLocalApi(q) && isLocalHost(host)) ? q : def;
}
// 임베드(/embed/[key])만 예외: 토큰이 없고 임베드 키로 읽기만 하며, 미니 위젯·iframe을 넣는 쪽(자기 서버를 쓰는 사이트)이 주소를 정한다
export function embedApi(query: string | null | undefined, host: string) { return (query || '').replace(/\/$/, '') || clientApi(null, host); }

export type PublicSite = { id: string; name: string; domain: string; embed: string; online: number; lastEventAt: number | null };
// 공개 마을 목록(GET /api/public/sites). /town/[slug]의 서버 렌더링·OG가 쓴다. 실패하면 빈 목록
export async function publicSites(api: string): Promise<PublicSite[]> {
  try { const r = await fetch(`${api}/api/public/sites`, { cache: 'no-store', signal: AbortSignal.timeout(4000) }); if (!r.ok) return []; return ((await r.json()).sites || []) as PublicSite[]; }
  catch { return []; }
}
