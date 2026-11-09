// 요청의 화면 언어(로드맵 60): vt_lang 쿠키 → Accept-Language. 서버 렌더링은 요청마다 언어가 달라 @visitown/i18n의 전역(setLocale)을 쓰지 않고
// 여기서 정한 locale을 tr(locale, …)·클라이언트 컴포넌트 prop으로 넘긴다. 브라우저 스크립트(대시보드 셸·React 패널)는 <html lang>을 읽는다.
import { cookies, headers } from 'next/headers';
import { pickLocale, tr, LOCALE_COOKIE, type Locale, type Vars } from '@visitown/i18n';

export async function requestLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value; const a = (await headers()).get('accept-language');
  return pickLocale(c, a);
}
export async function serverT(): Promise<{ locale: Locale; T: (ko: string, vars?: Vars) => string }> {
  const locale = await requestLocale(); return { locale, T: (ko, vars) => tr(locale, ko, vars) };
}

// 서버에서 그대로 넣는 마크업(shell/dashboard.html·dlg.html)의 글자·속성을 번역한다. 글자 노드는 앞뒤 공백을 지키고 가운데만 키로 찾는다.
const HANGUL = /[가-힣]/;
const ATTRS = /\b(title|aria-label|aria-description|placeholder|alt|data-tip|data-label|content)="([^"]*)"/g;
// 약관·개인정보처리방침은 한 파일에 한국어·영어가 다 있고 public/legal/legal.js가 ?lang=으로 고른다
export function legalHref(locale: Locale, doc: 'terms' | 'privacy'): string { return `/legal/${doc}.html?lang=${locale}`; }
export function translateHtml(html: string, locale: Locale): string {
  if (locale === 'ko') return html;
  return html.replace(/href="\/legal\/(terms|privacy)\.html"/g, 'href="/legal/$1.html?lang=en"')
    .replace(/>([^<>]+)</g, (m, text: string) => { if (!HANGUL.test(text)) return m; const lead = text.match(/^\s*/)![0], tail = text.match(/\s*$/)![0]; const key = text.trim().replace(/\s+/g, ' '); return '>' + lead + tr(locale, key) + tail + '<'; })
    .replace(ATTRS, (m, name: string, val: string) => HANGUL.test(val) ? `${name}="${tr(locale, val).replace(/"/g, '&quot;')}"` : m);
}
