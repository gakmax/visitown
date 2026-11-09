'use strict';
// README·블로그용 픽셀 배지 SVG: [집 아이콘] 지금 N명 보는 중. GET /api/sites/:id/badge?embed=키(&label=문구). 의존성 없이 문자열로 만든다.
// 아이콘은 대시보드 src/p2.js ICON_ROWS.house와 같은 도트. GitHub은 camo 프록시로 캐시하므로 서버가 Cache-Control을 짧게 준다
const HOUSE = ['.....oo.....', '....oppo....', '...oppppo...', '..oppppppo..', '.oppppppppo.', 'oooooooooooo', '.occcccccco.', '.ocbbcckkco.', '.ocbbcckkco.', '.occccckkco.', '.oooooooooo.', '............'];
const COL = { o: '#3b2f3a', p: '#f4a9bb', c: '#fff5e3', b: '#a9d9f1', k: '#c98d5d' };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// 글자 폭 추정(픽셀 폰트가 없을 때도 잘리지 않게 textLength로 맞춘다): 한글·전각 13px, 그 밖에 8px
const textW = s => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e7f ? 13 : 8), 0);
function badgeSvg(online, label) {
  const n = Math.max(0, online | 0), text = (label ? String(label).slice(0, 20) : '지금 ' + n + '명 보는 중');
  // 오른쪽 끝의 작은 "Visitown"은 브랜드 표시(로드맵 19). 배지 자체가 랜딩 링크라 글자만 둔다. 유료 플랜 숨김은 플랜이 생기면
  const BRAND = 'Visitown', bw = BRAND.length * 6 + 6;
  const S = 2, ICON = 12 * S, PAD = 6, tw = textW(text), left = ICON + PAD * 2, w = left + tw + PAD * 2 + bw, h = ICON + PAD * 2;
  let icon = ''; HOUSE.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') icon += `<rect x="${PAD + x * S}" y="${PAD + y * S}" width="${S}" height="${S}" fill="${COL[ch]}"/>`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w + 2}" height="${h + 2}" viewBox="0 0 ${w + 2} ${h + 2}" shape-rendering="crispEdges" role="img" aria-label="${esc(text)}">` +
    `<rect x="2" y="2" width="${w}" height="${h}" fill="#3b2f3a"/><rect x="0" y="0" width="${w}" height="${h}" fill="#3b2f3a"/><rect x="2" y="2" width="${w - 4}" height="${h - 4}" fill="#fff5e3"/>` +
    `<rect x="2" y="2" width="${left - 2}" height="${h - 4}" fill="#f7d78f"/><rect x="${left}" y="2" width="2" height="${h - 4}" fill="#3b2f3a"/>${icon}` +
    `<text x="${left + PAD + 2}" y="${Math.round(h / 2) + 5}" font-family="'Galmuri11','DungGeunMo','NeoDunggeunmo',Pretendard,'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif" font-size="13" font-weight="700" fill="#3b2f3a" textLength="${tw}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>` +
    `<text x="${w - PAD - bw + 4}" y="${Math.round(h / 2) + 4}" font-family="system-ui,sans-serif" font-size="9" fill="#9b8a93" textLength="${bw - 6}" lengthAdjust="spacingAndGlyphs">${BRAND}</text></svg>`;
}
module.exports = { badgeSvg };
