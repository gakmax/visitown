'use strict';
// 방문자 나라(ISO 3166-1 두 글자). IP는 저장하지 않고 나라 코드만 세션 속성에 남긴다.
// 우선순위: 프록시가 붙여 준 나라 헤더(Cloudflare·Vercel·CloudFront·App Engine) → GEOIP_URL 조회(선택) → SDK가 보낸 시간대 → 언어 지역
const HEADERS = ['cf-ipcountry', 'x-vercel-ip-country', 'cloudfront-viewer-country', 'x-appengine-country', 'x-country-code'];
const TZ = {
  'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Chongqing': 'CN', 'Asia/Harbin': 'CN', 'Asia/Urumqi': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Macau': 'MO', 'Asia/Taipei': 'TW',
  'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Kuching': 'MY', 'Asia/Bangkok': 'TH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN', 'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID', 'Asia/Jayapura': 'ID',
  'Asia/Manila': 'PH', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Dhaka': 'BD', 'Asia/Karachi': 'PK', 'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA',
  'Asia/Jerusalem': 'IL', 'Asia/Tel_Aviv': 'IL', 'Asia/Tehran': 'IR', 'Asia/Istanbul': 'TR', 'Europe/Istanbul': 'TR', 'Asia/Ulaanbaatar': 'MN', 'Asia/Almaty': 'KZ', 'Asia/Tashkent': 'UZ', 'Asia/Yangon': 'MM',
  'Asia/Phnom_Penh': 'KH', 'Asia/Vientiane': 'LA', 'Asia/Pyongyang': 'KP',
  'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU', 'Europe/Lisbon': 'PT',
  'Europe/Athens': 'GR', 'Europe/Kiev': 'UA', 'Europe/Kyiv': 'UA', 'Europe/Moscow': 'RU', 'Europe/Bucharest': 'RO',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US', 'America/Detroit': 'US', 'Pacific/Honolulu': 'US',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/Montreal': 'CA',
  'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR', 'America/Argentina/Buenos_Aires': 'AR', 'America/Buenos_Aires': 'AR', 'America/Santiago': 'CL', 'America/Bogota': 'CO', 'America/Lima': 'PE',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Pacific/Auckland': 'NZ',
  'Africa/Johannesburg': 'ZA', 'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE',
};
const TZ_PREFIX = [['America/Indiana/', 'US'], ['America/Kentucky/', 'US'], ['America/North_Dakota/', 'US'], ['America/Argentina/', 'AR'], ['Australia/', 'AU']];
// 언어만 있고 지역이 없을 때(ko, ja…). en·es·pt·zh·ar 처럼 여러 나라가 쓰는 말은 추측하지 않는다
const LANG = { ko: 'KR', ja: 'JP', vi: 'VN', th: 'TH', id: 'ID', tr: 'TR', pl: 'PL', nl: 'NL', sv: 'SE', da: 'DK', fi: 'FI', no: 'NO', nb: 'NO', cs: 'CZ', hu: 'HU', el: 'GR', he: 'IL', uk: 'UA', ru: 'RU', de: 'DE', fr: 'FR', it: 'IT', ro: 'RO', bg: 'BG', hr: 'HR', sk: 'SK', sl: 'SI', lt: 'LT', lv: 'LV', et: 'EE', fa: 'IR', hi: 'IN', bn: 'BD', ur: 'PK', mn: 'MN', km: 'KH', lo: 'LA', my: 'MM', ne: 'NP', si: 'LK', ms: 'MY', tl: 'PH', fil: 'PH' };

const code = v => (typeof v === 'string' && /^[A-Za-z]{2}$/.test(v) && !/^(xx|zz|t1)$/i.test(v)) ? v.toUpperCase() : null;
function fromHeaders(h) { for (const k of HEADERS) { const c = code(h[k]); if (c) return c; } return null; }
function fromTz(tz) { if (typeof tz !== 'string') return null; if (TZ[tz]) return TZ[tz]; for (const [pre, c] of TZ_PREFIX) if (tz.startsWith(pre)) return c; return null; }
function fromLang(lang) { if (typeof lang !== 'string') return null; const m = lang.match(/^([a-z]{2,3})(?:[-_]([A-Za-z]{2}))?/i); if (!m) return null; if (m[2]) return code(m[2]); return LANG[m[1].toLowerCase()] || null; }

// 선택: GEOIP_URL="https://example/{ip}" 처럼 {ip}를 넣어 두면 응답 JSON의 country/countryCode/country_code 중 하나를 쓴다. IP별 24시간 캐시, 사설 IP는 건너뛴다
const cache = new Map(); const CACHE_MAX = 5000, CACHE_TTL = 24 * 3600000;
function clientIp(req) { const h = req.headers; const xf = h['x-forwarded-for']; const ip = (h['cf-connecting-ip'] || h['fly-client-ip'] || h['x-real-ip'] || (xf && String(xf).split(',')[0]) || req.socket?.remoteAddress || '').trim(); return ip.replace(/^::ffff:/, ''); }
function isPrivate(ip) { return !ip || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fc|fd|fe80)/i.test(ip) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip); }
async function lookup(ip, url, fetchFn = fetch) {
  if (!url || isPrivate(ip)) return null;
  const hit = cache.get(ip); if (hit && Date.now() - hit.at < CACHE_TTL) return hit.c;
  let c = null;
  try { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 1500); const r = await fetchFn(url.replace('{ip}', encodeURIComponent(ip)), { signal: ac.signal }); clearTimeout(t); if (r.ok) { const j = await r.json(); c = code(j.country_code || j.countryCode || j.country || (j.location && j.location.country)); } } catch { /* 조회 실패는 무시 */ }
  cache.set(ip, { c, at: Date.now() }); if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return c;
}
// 요청 하나에 대한 나라. 외부 조회는 session_start가 든 배치에서만 한다(하트비트마다 묻지 않는다)
async function countryOf(req, events, { geoUrl = process.env.GEOIP_URL } = {}) {
  const c = fromHeaders(req.headers); if (c) return c;
  if (geoUrl && events.some(e => e && e.event_type === 'session_start')) return lookup(clientIp(req), geoUrl);
  return null;
}
module.exports = { countryOf, fromHeaders, fromTz, fromLang, lookup, clientIp, code };
