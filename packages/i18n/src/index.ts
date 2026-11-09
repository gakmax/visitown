// 화면 문구 번역(로드맵 60). 키는 한국어 원문 그대로라 코드가 읽기 쉽고, 사전에 없는 문구는 원문(한국어)으로 남는다(tests/i18n.test.js가 en 화면에 한글이 남았는지 본다).
// 자리표시 {이름}은 vars로 채운다. 영어 값은 {이름:단수|복수}로 수를 맞출 수 있다(그 자리에는 단어만 나온다: '{n} {n:visitor|visitors}').
// 언어는 서버가 정한다: vt_lang 쿠키 → Accept-Language(ko로 시작하면 ko, 나머지 en). 브라우저 쪽은 <html lang>을 읽어 setLocale 한 번.
import { EN } from './en';

export type Locale = 'ko' | 'en';
export type Vars = Record<string, string | number | null | undefined>;
export const LOCALES: readonly Locale[] = ['ko', 'en'];
export const LOCALE_COOKIE = 'vt_lang';

const DICT: Record<Locale, Record<string, string> | null> = { ko: null, en: EN };
const HANGUL = /[가-힣]/;

export function normLocale(v: unknown): Locale | null { return v === 'ko' || v === 'en' ? v : null; }

// 쿠키 값이 있으면 그것, 없으면 Accept-Language에서 q가 가장 높은 언어
export function pickLocale(cookie?: string | null, acceptLanguage?: string | null): Locale {
  const c = normLocale(cookie); if (c) return c;
  let best = '', bestQ = -1;
  for (const part of (acceptLanguage || '').split(',')) {
    const [tag, ...params] = part.trim().toLowerCase().split(';'); if (!tag) continue;
    const qp = params.find(p => p.trim().startsWith('q=')); const q = qp ? parseFloat(qp.trim().slice(2)) : 1;
    if (q > bestQ) { best = tag; bestQ = q; }
  }
  if (!best) return 'ko';
  return best.startsWith('ko') ? 'ko' : 'en';
}

function fill(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)(?::([^|{}]*)\|([^{}]*))?\}/g, (m, k: string, one?: string, many?: string) => {
    if (!(k in vars)) return m; const v = vars[k];
    if (one !== undefined) return Number(v) === 1 ? one : many!;
    return v == null ? '' : String(v);
  });
}

// 사전에 없는데 한글이 든 키(en일 때). 테스트·개발 도구가 읽는다
export const missing = new Set<string>();

export function tr(locale: Locale, ko: string, vars?: Vars): string {
  const d = DICT[locale]; let s = ko;
  if (d) { const v = d[ko]; if (v !== undefined) s = v; else if (HANGUL.test(ko)) missing.add(ko); }
  return fill(s, vars);
}

// 브라우저(대시보드 셸·React 패널)용 전역 언어. 서버 렌더링에서는 쓰지 않는다(요청마다 언어가 다르다)
let current: Locale = (normLocale((globalThis as { document?: { documentElement?: { lang?: string } } }).document?.documentElement?.lang)) || 'ko'; // 모듈 최상위 상수도 바른 언어로 만들어지게 처음부터 <html lang>을 읽는다
export function setLocale(l: unknown) { current = normLocale(l) || 'ko'; }
export function getLocale(): Locale { return current; }
export function t(ko: string, vars?: Vars): string { return tr(current, ko, vars); }

// 한국어 조사: 앞말의 받침에 따라 pair[0](받침 없음)·pair[1](받침 있음). 영어면 빈 문자열이라 문장 템플릿이 조사를 안 붙인다
export function josaAfter(word: string, pair: readonly [string, string]): string {
  if (current === 'en') return '';
  const ch = word.trim().slice(-1); const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return pair[(code - 0xac00) % 28 ? 1 : 0];
  if (/[0-9]/.test(ch)) return pair['2459'.includes(ch) ? 0 : 1];
  if (/[a-z]/i.test(ch)) return pair['lmnr'.includes(ch.toLowerCase()) ? 1 : 0];
  return pair[0];
}

// 셸·패널 코드에서 부르는 이름. t는 시간 변수로 흔히 쓰여 가려지므로 L(ocalize)로 쓴다
export const L = t;
// 날짜·숫자·나라 이름(Intl)에 넘길 언어 태그
export function intlLocale(): string { return current === 'en' ? 'en-US' : 'ko-KR'; }
