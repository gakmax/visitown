// 임베드 마을(로드맵 56 /embed/[key], 로드맵 19·23): 엔진(스토어·월드)만으로 마을을 그린다. 패널·설정·React 패널 없음(최소 번들).
// 스트림 연결은 EmbedTown.tsx의 useSiteStream 훅(packages/ui, 로드맵 54)이 쥐고, 여기는 프레임(frame)과 상태(status)를 받아 그리기만 한다:
// 스냅샷→건물·이벤트 설정·해금(테마·레벨)·날씨·바이탈·세션, 이후 event·pages·unlocks·trails·weather·vitals. 배율은 iframe·OBS 소스를 꽉 채운다. 밝기가 바뀌면 아이콘을 다시 만든다
import { TownStore, World, A, PAL, BUILDINGS, THEMES, W, H, THEME_KEY, SEASON, TOWN_LEVEL, layoutTown, buildAssets, buildIconUrls, setShellInfo, setEventConfig, placeDecor, setSeasonValue, seasonOf, setTownLevelValue, townLevelOf, buildGround } from '@visitown/engine';
import type { StreamStatus } from '@visitown/ui/stream';
import { L } from '@visitown/i18n';

export type EmbedOptions = {
  me?: string;          // ?me=세션ID: 그 세션을 '나'(ME)로 그린다(랜딩·미니 위젯이 SDK 세션을 넘긴다)
  theme?: string;       // ?theme=: 해금된 테마만. 잠겼으면 서버 해금 상태의 첫 무료 테마
  seasonForce?: string; // ?season=halloween|xmas|seol
  labels: boolean; night: boolean; badges: boolean; marks: boolean; weather: boolean; season: boolean; heat: boolean;
};
export interface EmbedTownHandle { frame(type: string, data: any): void; status(s: StreamStatus): void; destroy(): void; }
const WEATHER = new Set(['clear', 'sunny', 'rain']);
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);

export function createEmbedTown(root: HTMLElement, o: EmbedOptions): EmbedTownHandle {
  const stage = root.querySelector<HTMLElement>('.stage')!, cv = root.querySelector('canvas')!, labelsEl = root.querySelector<HTMLElement>('.labels')!, errEl = root.querySelector<HTMLElement>('.err')!;
  const brandImg = root.querySelector<HTMLImageElement>('.brand img');
  const syncShell = () => setShellInfo(document.documentElement.dataset.shell === 'dark', getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#3b2f3a');
  syncShell();
  const want = o.theme && THEMES[o.theme] ? o.theme : 'cozy';
  buildAssets(want);
  const store = new TownStore({ now: () => Date.now(), ttl: 120000, isMe: sid => !!o.me && sid === o.me });
  const world = new World(store, cv);
  world.showBadges = o.badges; world.showMarks = o.marks; world.night = o.night; world.showWeather = o.weather; world.showSeason = o.season; world.showHeat = o.heat;
  labelsEl.hidden = !o.labels;
  let unl: any = null; const themeOpen = (k: string) => !unl || unl.free.includes(k) || !!unl.unlocked[k];
  function refresh() {
    cv.style.background = PAL.grass; if (brandImg) brandImg.src = A.iconUrl.house;
    labelsEl.innerHTML = '';
    for (const b of BUILDINGS) { const el = document.createElement('div'); el.className = 'label'; el.style.left = (Math.min(W - 36, Math.max(36, b.x)) / W * 100) + '%'; el.style.top = (Math.max(14, b.top - 14) / H * 100) + '%'; el.innerHTML = `${esc(b.name)}<span>${esc(b.path)}</span>`; labelsEl.appendChild(el); }
  }
  function applyTheme(k: string) { if (!THEMES[k] || k === THEME_KEY) return; buildAssets(k); refresh(); }
  function applyPages(pages: any) { layoutTown(pages); buildAssets(THEME_KEY); store.setPages(pages); store.setBuildings(); world.syncFromStore(); refresh(); }
  function setLevel(lv: number) { lv = Math.max(1, Math.min(5, lv | 0)); if (lv === TOWN_LEVEL) return; setTownLevelValue(lv); placeDecor(); A.ground = buildGround(THEMES[THEME_KEY].decor.ground); }
  function setUnlocks(v: any) {
    unl = v && Array.isArray(v.rules) ? v : null; setLevel(unl ? townLevelOf(unl.visits || 0) : 1);
    if (!themeOpen(THEME_KEY)) applyTheme(unl.free[0] || 'cozy'); else if (THEME_KEY !== want && themeOpen(want)) applyTheme(want);
  }
  const force = /^(halloween|xmas|seol)$/.test(o.seasonForce || '') ? o.seasonForce! : ''; let seasonAcc = 60;
  function tickSeason(dt: number) { seasonAcc += dt; if (seasonAcc < 60) return; seasonAcc = 0; const k = force || seasonOf(); if (k === SEASON) return; setSeasonValue(k); placeDecor(); world.flakes.length = 0; world.seasonAcc = 12; }
  const ro = new ResizeObserver(() => { const r = stage.getBoundingClientRect(); root.style.setProperty('--s', String(Math.max(.5, Math.min(r.width / W, r.height / H)))); }); ro.observe(stage);
  let got = false, downs = 0;
  function frame(type: string, d: any) {
    switch (type) {
      case 'snapshot': got = true; errEl.hidden = true; store.reset(); store.frozen = false;
        if (d.pages) applyPages(d.pages); if (d.eventTypes) setEventConfig(d.eventTypes); setUnlocks(d.unlocks || null);
        world.weather = WEATHER.has(d.weather?.kind) ? d.weather.kind : 'clear'; world.vitals = d.vitals || {};
        world.muted = true; for (const x of d.sessions) store.apply(x); world.muted = false; world.syncFromStore(); break;
      case 'resume': got = true; store.frozen = false; errEl.hidden = true; break;
      case 'event': store.apply(d); break;
      case 'eventtypes': setEventConfig(d); break;
      case 'pages': applyPages(d); break;
      case 'unlocks': setUnlocks(d); break;
      case 'trails': world.loadTrails(d.moves); break;
      case 'weather': world.weather = WEATHER.has(d.kind) ? d.kind : 'clear'; break;
      case 'vitals': world.vitals = d; break;
    }
  }
  function status(s: StreamStatus) {
    if (s.state === 'down') { store.frozen = true; if (!got && ++downs === 2 && parent !== window) parent.postMessage({ vt: 'embed-down' }, location.origin); if (!got) { errEl.textContent = L("임베드 링크가 맞지 않거나 서버에 연결할 수 없어요. 대시보드의 임베드 버튼에서 링크를 다시 만들어 주세요."); errEl.hidden = false; } }
  }
  let last = performance.now(), raf = 0;
  const clock = () => { const d = new Date(); return (d.getHours() * 60 + d.getMinutes()) / 1440; };
  function loop(now: number) {
    const gap = (now - last) / 1000, dt = Math.max(0, Math.min(.05, gap)); last = now;
    if (gap > 1) { world.syncFromStore(); world.decayHeat(gap); } // 다른 탭에 있다 돌아오면 밀린 걸음을 한꺼번에 걷지 않게
    store.expire(); world.update(dt); tickSeason(dt); world.render(clock());
    raf = requestAnimationFrame(loop);
  }
  const onShell = () => { syncShell(); buildIconUrls(); refresh(); };
  document.addEventListener('vt-shell', onShell);
  // 동작 줄이기(로드맵 57): OS 설정이면 파티클·빗줄기 같은 꾸밈 움직임을 끈다(캐릭터 걸음은 남긴다). 설정이 바뀌면 바로 따른다
  const rm = matchMedia('(prefers-reduced-motion: reduce)'); const onRm = () => { world.reduceMotion = rm.matches; }; onRm(); rm.addEventListener('change', onRm);
  refresh(); raf = requestAnimationFrame(loop);
  return { frame, status, destroy() { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('vt-shell', onShell); rm.removeEventListener('change', onRm); } };
}
