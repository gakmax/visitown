'use client';
// 랜딩의 살아 있는 부분: 대시보드 링크(같은 서버로 로그인), 이 페이지의 방문자 마을 iframe(/embed/[key]?me=내 세션), 지금 보는 사람 수(배지 JSON), 공개 마을 목록(/town/[id]).
// 설정은 NEXT_PUBLIC_VT_SITE·NEXT_PUBLIC_VT_EMBED(이 페이지를 추적하는 사이트와 임베드 키. 비어 있으면 데모 마을), 쿼리 ?api=&site=&key=로도 넣을 수 있다
// (테스트. embed= 가 아닌 이유: /?embed=키 는 예전 임베드 주소라 next.config.ts가 /embed/[key]로 rewrite한다)
import { useEffect, useState } from 'react';
import { clientApi, type PublicSite } from '../lib/api';
import { tr, type Locale, type Vars } from '@visitown/i18n';
// 화면 언어는 서버(page.tsx)가 정해 prop으로 준다(서버 렌더링과 브라우저가 같은 글자를 그리게)
const useT = (locale: Locale) => (ko: string, vars?: Vars) => tr(locale, ko, vars);

const CFG = { site: process.env.NEXT_PUBLIC_VT_SITE || 'site_da36fde808', embed: process.env.NEXT_PUBLIC_VT_EMBED || 'emb_363b238fdd75647f57de5863' };
type Cfg = { api: string; site: string; embed: string; live: boolean; dash: string; local: boolean };
function useCfg() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  useEffect(() => { const q = new URLSearchParams(location.search); const api = clientApi(q.get('api'), location.hostname), site = q.get('site') || CFG.site, embed = q.get('key') || CFG.embed;
    setCfg({ api, site, embed, live: !!(site && embed), dash: `/app?api=${encodeURIComponent(api)}`, local: api !== clientApi(null, location.hostname) }); }, []);
  return cfg;
}

// 언어 바꾸기(로드맵 60): 쿠키를 쓰고 새로고침하면 서버가 그 언어로 다시 그린다
export function LangSwitch({ locale }: { locale: Locale }) {
  const other: Locale = locale === 'ko' ? 'en' : 'ko';
  return <a href="#" id="langSwitch" lang={other} onClick={e => { e.preventDefault(); document.cookie = `vt_lang=${other}; path=/; max-age=31536000; samesite=lax`; location.reload(); }}>{other === 'en' ? 'English' : '한국어'}</a>;
}

export function LandingCta({ locale }: { locale: Locale }) {
  const cfg = useCfg(); const T = useT(locale);
  return <div className="row"><a className="btn primary" id="ctaStart" href={cfg?.dash || '/app'}>{T("GitHub로 시작하기")}</a><a className="btn" id="ctaDemo" href="/demo">{T("데모 둘러보기")}</a></div>;
}

type Live = { town: string; badge: string; online: number | null; tour: PublicSite[]; origin: string };
export function LandingLive({ locale }: { locale: Locale }) {
  const T = useT(locale); const cfg = useCfg(); const [st, setSt] = useState<Live | null>(null);
  useEffect(() => {
    if (!cfg) return; const { api, site, embed, live } = cfg;
    const townUrl = (sid?: string | null) => { if (!live) return '/demo'; const u = new URL(`/embed/${encodeURIComponent(embed)}`, location.origin); u.searchParams.set('api', api); u.searchParams.set('site', site); if (sid) u.searchParams.set('me', sid); u.searchParams.set('brand', '0'); return u.pathname + u.search; }; // 이 페이지가 Visitown이라 마을 안 브랜드 링크는 뺀다
    const badge = live ? `${api}/api/sites/${encodeURIComponent(site)}/badge?embed=${encodeURIComponent(embed)}${locale === 'en' ? '&lang=en' : ''}` : '';
    setSt({ town: live ? '' : townUrl(), badge, online: null, tour: [], origin: location.origin + location.pathname });
    // 이 페이지도 Visitown으로 추적한다. SDK가 만든 세션 ID를 임베드 주소의 me= 로 넘기면 마을이 그 세션을 ME 캐릭터로 그린다.
    // CSP: 'strict-dynamic'이라 nonce가 붙은 이 번들이 만든 <script>는 허용된다
    const s = document.createElement('script'); s.src = `${api}/visitown.js`; s.setAttribute('data-site', site); s.async = true;
    let dead = false; const timers: ReturnType<typeof setTimeout>[] = [];
    if (live) { s.onload = () => { if (!dead) setSt(p => p && { ...p, town: townUrl((window as any).visitown?.sessionId) }); }; s.onerror = () => { if (!dead) setSt(p => p && { ...p, town: townUrl() }); }; }
    document.head.appendChild(s);
    if (live) {
      const poll = () => { fetch(badge + '&format=json').then(r => r.json()).then(j => { if (!dead) setSt(p => p && { ...p, online: j.online }); }).catch(() => {}); timers.push(setTimeout(poll, 15000)); };
      poll();
      fetch(`${api}/api/public/sites`).then(r => r.json()).then(j => { if (!dead) setSt(p => p && { ...p, tour: ((j.sites || []) as PublicSite[]).filter(x => x.id !== site) }); }).catch(() => {});
    }
    return () => { dead = true; timers.forEach(clearTimeout); };
  }, [cfg]);
  const live = cfg?.live ?? true;
  const townHref = (id: string) => cfg?.local ? `/town/${encodeURIComponent(id)}?api=${encodeURIComponent(cfg.api)}` : `/town/${encodeURIComponent(id)}`;
  return <>
    <section>
      <div className="town-head"><span id="liveLine">{live ? <><b>LIVE</b> {T("지금 이 페이지를 보고 있는 사람들이에요.")}</> : <><b>DEMO</b> {T("아직 이 페이지에 추적이 연결되지 않아 가상 방문자 마을을 보여 드려요.")}</>}</span><span className="count" id="count">{st?.online != null ? <><i />{T("지금 {0}명", {0:st.online})}</> : null}</span></div>
      <div className={'town px' + (live ? '' : ' demo')} id="townBox"><iframe id="town" title={T("지금 이 페이지의 방문자 마을")} loading="eager" src={st?.town || undefined} /></div>
      <p className="muted" id="meLine">{live ? T("왕관을 쓰고 ME 표를 단 금빛 캐릭터가 당신이에요. 이 페이지에 들어온 순간 마을에 입장했고, 창을 닫으면 떠나요.") : T("실제 사이트에 설치하면 진짜 방문자가 이렇게 보여요.")}</p>
    </section>
    <section className="feats">
      <div className="feat px"><h2><img src="/icons/icon-192.png" alt="" />{T("스크립트 한 줄")}</h2><p>{T("<script> 한 줄을 넣으면 방문자가 캐릭터로 들어와요. 쿠키 없음, IP·이름·입력 내용은 저장하지 않아요.")}</p></div>
      <div className="feat px"><h2><img src="/icons/icon-192.png" alt="" />{T("페이지가 건물로")}</h2><p>{T("상품·검색·결제 같은 페이지를 건물에 연결하면 어디에 사람이 모이는지 한눈에 보여요. 구매·가입은 효과와 소리로 알려 줘요.")}</p></div>
      <div className="feat px"><h2><img src="/icons/icon-192.png" alt="" />{T("어디에든 띄워요")}</h2><p>{T("OBS·홈페이지 임베드, README 배지, 어제 하루 타임랩스 영상, 테마 해금과 도감까지. 사무실 TV에 틀어 두기 좋아요.")}</p></div>
    </section>
    {st && st.tour.length > 0 ? <section className="sec px" id="tourSec">
      <h2>{T("공개 마을 구경")}</h2><p>{T("주인이 공개를 켠 다른 마을이에요. 지금 사람이 있는 곳부터 보여 드려요.")}</p>
      <div className="tour" id="tourList">{st.tour.map(x => <a key={x.id} className="tour-item px" href={townHref(x.id)} target="_blank" rel="noopener"><span>{x.name}</span><small>{T("{0} · 접속자 {1}", {0:x.domain, 1:x.online})}</small></a>)}</div>
    </section> : null}
    <section className="sec px" id="badgeSec">
      <h2>{T("README 배지")}</h2><p>{T("GitHub README나 블로그에 \"지금 N명 보는 중\" 배지를 붙일 수 있어요. 대시보드의 임베드 링크 화면에서 복사해요.")}</p>
      <div className="badge-prev" id="badgePrev" hidden={!st?.badge}>{st?.badge ? <img id="badgeImg" alt={T("지금 보는 사람 수 배지")} src={st.badge} /> : null}<span className="muted" style={{ margin: 0 }}>{T("↑ 이 페이지의 배지예요. 30초마다 바뀌어요.")}</span></div>
      <pre id="badgeCode">{st?.badge ? `[![Visitown](${st.badge})](${st.origin})` : T("[![Visitown](https://수집서버/api/sites/site_xxx/badge?embed=임베드키)](https://visitown.vercel.app/)")}</pre>
    </section>
  </>;
}
