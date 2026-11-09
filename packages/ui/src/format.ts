import { L, intlLocale } from '@visitown/i18n';
// 시각·경과·나라 표기. 대시보드 셸(p6.js)도 같은 함수를 쓴다(UI.countryName 등)
export function hhmmss(ts: number): string { const d = new Date(ts); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'); }
export function elapsed(ms: number): string { const s = Math.floor(ms / 1000); if (s < 60) return L("{0}초", {0:s}); const m = Math.floor(s / 60); return m < 60 ? L("{0}분 {1}초", {0:m, 1:s % 60}) : L("{0}시간 {1}분", {0:Math.floor(m / 60), 1:m % 60}); }
// 나라 코드 → 깃발 이모지(지역 표시 문자)·한국어 이름. 이름은 브라우저의 Intl에 맡긴다
export function flagEmoji(cc: string): string { return String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)); }
const CN_NAMES = (() => { try { return new Intl.DisplayNames([intlLocale()], { type: 'region' }); } catch { return null; } })();
export function countryName(cc: string): string { try { return CN_NAMES?.of(cc) || cc; } catch { return cc; } }
