// 대시보드 셸(예전 src/p6.js, 로드맵 56): 피드·정보 패널·헤더 숫자는 React(@visitown/ui)가 그리고, 나머지 패널·컨트롤·테마·스케일·메인 루프는 여기서 DOM으로.
// apps/web/components/DashboardShell.tsx가 shell/dashboard.html을 서버에서 넣고, 클라이언트 <Boot>가 마운트 뒤 boot({ demo })를 한 번 부른다. 임베드(/embed/[key])는 shell/embed.ts가 따로 그린다.
import * as ENGINE from '@visitown/engine';
import * as UI from '@visitown/ui';
import { L, tr, getLocale, intlLocale } from '@visitown/i18n';
import { SOUNDS, synth, bgm } from './sfx.js';
import { clientApi } from '../lib/api';
import { esc, PXS, pxSelect, pxsClose, initPxSelect, PANEL_SND, showEl, hideEl, pop, say, errText, ask, note, hooks } from './helpers.js';
const $ = id => document.getElementById(id);
let booted = false;
export function boot(opts = {}) { if (booted) return; booted = true; hooks.sfx = (name, force) => sfx(name, force);
// 엔진(packages/engine, 로드맵 52): 모듈 네임스페이스 ENGINE에서 쓰는 이름만 꺼낸다. 엔진이 스스로 바꾸는 값(ENGINE.THEME_KEY·ENGINE.TOWN_LEVEL·ENGINE.SEASON)은 ENGINE.X로 읽고 set…Value로 쓴다(ESM 네임스페이스라 live binding).
// 엔진은 DOM을 모르므로 캔버스(cv)·겉 화면(밝기·글자색, syncShell)은 여기서 넣어 주고, 첫 에셋 빌드도 여기서 한다
const { hhmmss, elapsed, flagEmoji, countryName } = UI;
const { A, BASE_PAL, BOTS, BUILD, BUILDINGS, BY_PATH, EV_DEFAULTS, EV_EFFECTS, EV_SOUNDS, FLAG_ROWS, H, KINDS, MAX_BUILDINGS, PAL, PROP_LABEL, RARE_BY_KEY, RARE_DEFS, SEASONS, SLOTS, SYS_EV, Simulator, THEMES, TOWN_LEVEL_AT, TownStore, W, World, buildAssets, buildGround, buildIconUrls, campaignColor, compileChar, drawMarks, drawRare, evDefault, evLabel, evMeta, hit, josa, kindFits, layoutTown, pick, placeDecor, rareLabel, seasonOf, sessionCode, setEventConfig, setSeasonValue, setShellInfo, setTownLevelValue, townLevelOf } = ENGINE;
const cv=$('cv'); function syncShell(){ setShellInfo(document.documentElement.dataset.shell==='dark', getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()); } syncShell(); buildAssets('cozy');
const sim = new Simulator(null);
// ---- 연결 설정: ?demo=1 이면 시뮬레이터, 아니면 localStorage/쿼리의 api·site(·token)로 실시간 연결. 토큰이 없으면 GitHub 로그인(Supabase)
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }; const lsSet = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const AUTH = (() => { // Supabase 암시적 플로우: 로그인 후 #access_token=…&refresh_token=… 으로 돌아온다
  const h = new URLSearchParams(location.hash.replace(/^#/, '')); let a = lsGet('vt_auth') || null;
  if (h.get('error') || h.get('error_description')) { lsSet('vt_login_error', `${h.get('error')||''} ${h.get('error_code')||''} ${h.get('error_description')||''}`.trim()); history.replaceState(null, '', location.pathname + location.search); }
  if (h.get('access_token')) { a = { token: h.get('access_token'), refresh: h.get('refresh_token'), exp: Date.now() + (+h.get('expires_in') || 3600) * 1000 }; lsSet('vt_auth', a); history.replaceState(null, '', location.pathname + location.search); }
  return a; })();
const CONN = (() => { const q=new URLSearchParams(location.search); const saved=lsGet('vt_conn')||{};
  const raw=q.get('api')||saved.api||''; const c={ api: raw ? clientApi(raw, location.hostname) : '', site:q.get('site')||saved.site||'', token:q.get('token')||saved.token||'', demo: q.get('demo')==='1' || !!opts.demo, join:q.get('join')||'', me:q.get('me')||'', tv:q.get('tv')||'', sites:q.get('sites')||'', season:q.get('season')||'' }; c.gate = !c.demo && !c.api;
  // 서버 주소가 없으면 진입 화면(로그인/데모 선택)
  if (!c.token && AUTH) c.token = AUTH.token;
  // 보안 S-30: ?api=는 허용 목록(lib/api.ts clientApi)으로 거른다. 이 주소로 로그인 토큰을 보내므로 아무 주소나 받으면 링크 하나로 토큰이 샌다. 예전에 저장된 주소도 같은 규칙으로 고쳐 쓴다
  if (saved.api && saved.api !== c.api) lsSet('vt_conn', { ...saved, api: c.api });
  if (q.get('api')||q.get('site')) lsSet('vt_conn', {api:c.api, site:c.site, token:q.get('token')||saved.token||''}); return c; })();
let LIVE = !CONN.demo && !CONN.gate;
// ?me=세션ID: 그 세션을 '나'(빨간 ME)로 그린다. 랜딩·미니 위젯이 그 페이지 SDK의 window.visitown.sessionId를 임베드 주소에 붙여 보낸다(p4.js TownStore.create)
const ME_SID = CONN.me;
// 진입 화면에서 로그인할 기본 수집 서버(lib/api.ts: NEXT_PUBLIC_VT_API, 로컬에서 열면 로컬 서버)
const DEFAULT_API = clientApi(null, location.hostname);
const isMe = sid => typeof ME_SID === 'string' && !!ME_SID && ME_SID === sid;
// 라이브 스토어. 스트림(훅)이 여기에만 쓴다. 리플레이는 따로 만든 스토어를 보여 주고(bindView) 이건 계속 쌓인다(로드맵 54)
const store = new TownStore({ now: () => LIVE ? Date.now() : sim.clockMs, ttl: LIVE ? 120000 : 45000, isMe });
sim.store = store;
const world = new World(store, cv);
// React 패널(로드맵 53, packages/ui): 피드·정보 패널·헤더 숫자. 엔진 인스턴스(스토어·월드·에셋)를 넘기고 구독만 하게 한다. 피드 줄은 addFeed(→ ui.addFeed), 스토어가 모르는 변화(테마·밝기·건물 목록·바이탈)는 ui.refresh(), 시계·날씨·따라가기는 ui.set
const ui = UI.mount({ engine: ENGINE, store, world, targets: { feed: $('feed'), info: $('infoBody'), stats: $('statsBox'), live: $('feedLive') }, actions: { pick: sid => focusChar(sid), toggleFollow: () => setFollow(!follow) } });
// 보는 스토어(view): 평소엔 라이브 스토어, 리플레이 중엔 리플레이 스토어. world·React 패널·피드 줄·선택이 이것을 따른다
let view = store, unwatch = watchFeed(store);
function bindView(s){ view = s; world.bind(s); ui.bindStore(s); unwatch?.(); unwatch = watchFeed(s); ui.feed.clear(); }
let speed = 1, zoom = 1; // zoom: 맞춤 배율 대비 사용자 확대 비율
const DAY_LEN = 150;                                   // 데모에서는 150초가 하루
function townClock(){ if (LIVE){ const d=new Date((replay.active ? replay.cur : Date.now()/1000)*1000); return (d.getHours()*60+d.getMinutes())/1440; } const c = replay.active ? replay.cur : sim.clock; return ((c / DAY_LEN) + 0.25) % 1; }
function recClock(){ return LIVE ? Date.now()/1000 : sim.clock; }

// ---- 이벤트 기록 + 타임랩스 리플레이. 실서비스에서는 REC 대신 서버의 이벤트 로그(occurred_at 순)를 쓰면 된다
const REC = []; function record(ev){ REC.push({ t: recClock(), ev }); if (REC.length > 8000) REC.shift(); } sim.onSend = record;
const replay = { active:false, playing:false, t0:0, t1:0, cur:0, idx:0, rate:8, saved:null };
function applyUntil(t){ while (replay.idx < REC.length && REC[replay.idx].t <= t) view.apply(REC[replay.idx++].ev); }
// 실시간 모드는 서버 기록(events 테이블)을 구간으로 받아온다. 데모는 메모리의 REC를 그대로 돌린다
async function startReplay(range){ if (replay.active || replay.loading) return; // range: { from, to }(ms)를 주면 그 구간(놓친 구간 안내), 아니면 리플레이 바의 선택
  let from, to, label=''; const gap=LIVE && range && range.from>0 && range.to>range.from;
  if (LIVE){ const v=$('rpRange').value; if (gap){ from=range.from; to=range.to; } else if (v==='yesterday'){ const d=new Date(); d.setHours(0,0,0,0); to=d.getTime(); from=to-86400000; } else { to=Date.now(); from=to-(+v); } replay.loading=true; $('btnReplay').disabled=true; let j;
    try { j=await live.api(`/api/sites/${encodeURIComponent(CONN.site)}/events?from=${new Date(from).toISOString()}&to=${new Date(to).toISOString()}`); } catch(e){ replay.loading=false; $('btnReplay').disabled=false; return note(errText(e,L("기록을 가져오지 못했어요"))); }
    replay.loading=false; $('btnReplay').disabled=false; REC.length=0; for (const ev of j.events) REC.push({ t: (Date.parse(ev.timestamp)||to)/1000, ev }); REC.sort((a,b)=>a.t-b.t); // 메모는 지난 시각으로 남길 수 있어 기록 순서가 어긋날 수 있다
    const sel=$('rpRange'); label=L("{0} · 이벤트 {1}건{2}", {0:gap?L("놓친 구간 {0}~{1}", {0:hhmmss(from).slice(0,5), 1:hhmmss(to).slice(0,5)}):sel.options[sel.selectedIndex].text, 1:REC.length, 2:j.truncated?L(" (앞부분만)"):''}); }
  else { if (REC.length < 5) return; from=REC[0].t*1000; to=recClock()*1000; label=L("{0}초 기록", {0:Math.round((to-from)/1000)}); }
  replay.saved = { running: sim.running, heat: world.heat.slice() }; world.clearHeat();
  // 리플레이는 따로 만든 스토어에 돌린다(로드맵 54): world·패널은 이것을 보고, 라이브 스토어는 스트림을 계속 받아 쌓인다(끝나면 바로 현재). 하트비트는 저장하지 않으므로 만료는 퇴장 기록에 맡기고 느슨하게
  replay.active = true; sim.running = false; bindView(new TownStore({ now: () => replay.cur*1000, ttl: LIVE ? 600000 : 45000, isMe })); world.reset(); $('dupInfo').hidden = true;
  replay.t0 = from/1000; replay.t1 = to/1000; const span = Math.max(1, replay.t1 - replay.t0); const auto = LIVE ? Math.max(4, Math.min(120, Math.round(span / 60))) : Math.max(4, Math.min(16, Math.round(span / 24)));
  const sp=$('rpSpeed'); let best=0; for (let i=0;i<sp.options.length;i++) if (Math.abs(+sp.options[i].value-auto) < Math.abs(+sp.options[best].value-auto)) best=i; sp.selectedIndex=best; sp.dispatchEvent(new Event('pxs-refresh')); replay.rate=+sp.value; // 구간에 맞는 배속을 고르되, 리플레이 중에도 바꿀 수 있다
  replay.cur = replay.t0; replay.idx = 0; replay.playing = REC.length > 0;
  $('app').classList.add('replay'); showEl($('replayBar')); $('rpRate').textContent = REC.length ? `${replay.rate}x · ${label}` : L("{0} 기록이 없어요", {0:label.split(' · ')[0]}); $('rpPlay').textContent = replay.playing ? '❚❚' : '▶'; drawNoteTicks(); }
// 리플레이 메모 눈금: 구간 안의 note 이벤트를 슬라이더 위에 찍는다. 누르면 그 시각으로 간다
function drawNoteTicks(){ const box=$('rpTicks'); box.innerHTML=''; if (!replay.active) return; const span=Math.max(1, replay.t1-replay.t0);
  for (const r of REC){ if (r.ev.event_type!=='note') continue; const b=document.createElement('b'); b.style.left=`${Math.min(100,Math.max(0,(r.t-replay.t0)/span*100))}%`; b.title=`${hhmmss(r.t*1000)} ${r.ev.properties?.text||''}`; b.onclick=()=>{ if (EXP.on) return; seekReplay(r.t); replay.playing=false; $('rpPlay').textContent='▶'; }; box.appendChild(b); } }
function seekReplay(t){ view.reset(); world.muted = true; replay.idx = 0; replay.cur = t; applyUntil(t); world.muted = false; world.syncFromStore(); ui.feed.clear(); } // cur를 먼저 옮겨야 복원된 세션의 lastSeen이 탐색 지점이 된다
function exitReplay(){ if (!replay.active) return; if (EXP.on) cancelExport(); replay.active = false; replay.playing = false; $('rpTicks').innerHTML='';
  // 라이브 스토어로 돌아간다. 스트림은 리플레이 동안에도 계속 받았으므로 다시 연결하지 않고 syncFromStore만. 미뤄 둔 피드 줄(기록 갱신·알림)과 발자국은 지금 흘린다
  world.reset(); bindView(store); store.select(null); world.heat.set(replay.saved.heat); world.heatDirty = true; if (store.duplicates) { $('dupInfo').hidden = false; $('dupInfo').textContent = L("중복 {0}건 무시", {0:store.duplicates}); }
  world.syncFromStore(); if (!LIVE) sim.running = replay.saved.running; live.flushLater(); $('app').classList.remove('replay'); hideEl($('replayBar')); }
function recTime(t){ if (LIVE) return hhmmss(t*1000); if (!REC.length) return '--:--:--'; const i = Math.min(REC.length-1, Math.max(0, REC.findIndex(r => r.t >= t))); const ev = REC[i < 0 ? REC.length-1 : i].ev; return hhmmss(Date.parse(ev.timestamp) || Date.now()); }

// ---- 실시간 연결 (SSE). 스냅샷 → store.reset + apply + syncFromStore, 이후 이벤트는 store.apply
const live = { streamOn:false, pending:[], pendingTrails:null, status:'demo', site:null, cfg:null, user:null, sites:[],
  setStatus(s, text){ const changed = s!==this.status || (text||'')!==(this._text||''); this.status=s; this._text=text||''; const dot=$('connDot'); dot.className='dot '+s; $('siteBox').title=text||s;
    // 상태 글자를 헤더에 같이 보여 주고(실시간일 땐 숨김), 바뀔 때마다 LIVE FEED에 시스템 줄을 남긴다. 같은 문구는 60초 안에 반복하지 않는다
    const lbl=$('connText'); lbl.textContent = s==='live' ? '' : this._text; lbl.hidden=!lbl.textContent; lbl.className='conn-text '+s;
    if (changed && this._text && !CONN.gate){ const now=Date.now(); if (!(this._sys && this._sys.text===this._text && now-this._sys.at<60000)){ this._sys={ text:this._text, at:now }; sysFeed(this._text, s); } } },
  headers(){ return { Authorization:`Bearer ${CONN.token}` }; },
  async api(path, opt={}){ const r=await fetch(`${CONN.api}${path}`, { ...opt, headers:{ ...(opt.body?{'Content-Type':'application/json'}:{}), ...this.headers() } }); const j=await r.json().catch(()=>({})); if (!r.ok) { const e=new Error(j.error||('HTTP '+r.status)); e.status=r.status; throw e; } return j; },
  async connect(){ if (!LIVE) return; this.setStatus('connecting',L("연결 중")); $('app').classList.add('live'); sim.running=false;
    try { this.cfg = await (await fetch(`${CONN.api}/api/config`)).json(); } catch(e){ const m=L("서버에 연결할 수 없어요. 서버가 켜져 있는지, API 주소가 맞는지 확인해 주세요."); if (!CONN.token){ this.setStatus('down',m); return showGate(m, CONN.api); } return this.fail(m); } // 로그인 전이면 진입 화면에서 주소를 고치게
    if (!this.cfg.devAuth && CONN.token && CONN.token.split('.').length !== 3) { CONN.token = AUTH ? AUTH.token : ''; const c=lsGet('vt_conn')||{}; lsSet('vt_conn',{ ...c, token:'' }); } // 수동 토큰은 Supabase 없는 개발 서버에서만 쓴다
    if (!CONN.token) { if (this.cfg.devAuth) CONN.token='dev'; else return this.showLogin(); }
    await this.refreshIfNeeded();
    let me; try { me = await this.api('/api/sites'); } catch(e){ if (e.status===401){ lsSet('vt_auth',null); CONN.token=''; return this.showLogin(L("로그인이 만료됐어요. 다시 로그인해 주세요.")); } return this.fail(L("연결 실패: ")+e.message); }
    this.user=me.user; this.sites=me.sites; $('cpLogout').hidden=!!this.cfg.devAuth;
    if (CONN.join) return this.acceptInvite(CONN.join);
    if (CONN.tv){ startTv(CONN.tv==='1'?60:+CONN.tv, CONN.sites.split(',').filter(Boolean)); if (TV.on) return; } // ?tv=초&sites=a,b: 사무실 TV 모드로 바로 시작
    const pick = this.sites.find(s=>s.id===CONN.site);
    if (!pick) return this.showSites();
    this.site=pick; $('siteName').textContent=pick.domain||pick.name; this.open(); },
  fail(msg){ this.setStatus('down',msg); say($('cpMsg'),msg); showEl($('connPanel')); },
  // ---- GitHub 로그인 (Supabase authorize → 돌아오면 AUTH가 해시에서 토큰을 읽는다)
  showLogin(msg){ this.setStatus('down',L("로그인 필요")); const le=lsGet('vt_login_error'); if (le){ msg=(msg?msg+' ':'')+L("로그인 응답 오류: ")+le; lsSet('vt_login_error',null); } showGate(msg, CONN.api); },
  async refreshIfNeeded(force){ if (!AUTH || !AUTH.refresh || !this.cfg?.supabaseUrl) return; if (!force && AUTH.exp - Date.now() > 5*60000) return;
    try { const r=await fetch(`${this.cfg.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, { method:'POST', headers:{ apikey:this.cfg.supabaseAnonKey, 'Content-Type':'application/json' }, body:JSON.stringify({ refresh_token:AUTH.refresh }) }); const j=await r.json(); if (j.access_token){ AUTH.token=j.access_token; AUTH.refresh=j.refresh_token||AUTH.refresh; AUTH.exp=Date.now()+(j.expires_in||3600)*1000; lsSet('vt_auth',AUTH); CONN.token=AUTH.token; } } catch {} },
  logout(){ lsSet('vt_auth',null); const c=lsGet('vt_conn')||{}; lsSet('vt_conn',{api:c.api}); location.search=`?api=${encodeURIComponent(CONN.api)}`; },
  // ---- 사이트 선택 / 등록 / 설치 확인
  showSites(){ this.setStatus('connecting',L("사이트 선택")); const list=this.sites.map(s=>`<button class="btn" data-site="${s.id}"><span>${esc(s.name)} <span class="muted">${esc(s.domain)}</span>${roleTag(s.role)}</span><span class="muted">${!s.lastEventAt?L("아직 이벤트 없음"):Date.now()-s.lastEventAt>QUIET_MS?L("마지막 이벤트 ")+elapsed(Date.now()-s.lastEventAt)+L(" 전"):L("접속자 ")+s.online}</span></button>`).join('');
    panel(L("<h2>MY SITES</h2>{0}{1}\n      <form id=\"spForm\"><h2>NEW SITE</h2><label>사이트 이름 <input id=\"spName\" required maxlength=\"60\" placeholder=\"내 쇼핑몰\"></label><label>도메인 <input id=\"spDomain\" required placeholder=\"my-shop.com\"></label><p class=\"err\" id=\"spErr\"></p><div class=\"row\"><button class=\"btn primary\" type=\"submit\">등록하고 설치 코드 받기</button>{2}</div></form>", {0:this.user?`<p class="muted">${esc(this.user.email||this.user.id)}</p>`:'', 1:list?`<div class="list">${list}</div>`:L("<p>등록된 사이트가 없어요. 아래에서 첫 사이트를 등록해 보세요.</p>"), 2:this.cfg.devAuth?'':L("<button class=\"btn\" type=\"button\" id=\"spLogout\">로그아웃</button>")}));
    document.querySelectorAll('#sitePanel [data-site]').forEach(b=>b.onclick=()=>this.choose(this.sites.find(s=>s.id===b.dataset.site)));
    $('spForm').onsubmit=async e=>{ e.preventDefault(); $('spErr').textContent=''; try { const j=await this.api('/api/sites',{ method:'POST', body:JSON.stringify({ name:$('spName').value, domain:$('spDomain').value }) }); this.sites.push({ ...j.site, lastEventAt:null, online:0 }); this.showInstall(j.site); } catch(err){ $('spErr').textContent=err.message; } };
    const lo=$('spLogout'); if (lo) lo.onclick=()=>this.logout(); },
  choose(s){ const c=lsGet('vt_conn')||{}; lsSet('vt_conn',{ ...c, site:s.id }); if (!s.lastEventAt && (s.role||'owner')==='owner') return this.showInstall(s); CONN.site=s.id; this.site=s; $('siteName').textContent=s.domain||s.name; hideEl($('sitePanel')); this.open(); },
  showInstall(s){ this.setStatus('connecting',L("설치 대기")); const code=`<script src="${CONN.api}/visitown.js" data-site="${s.id}" async><\/script>`; const meLink=`${/^(localhost|127\.)/.test(s.domain)?'http':'https'}://${s.domain}/?vt_me=1`;
    panel(L("<h2>INSTALL</h2><p><b>{0}</b> <span class=\"muted\">{1} · {2}</span></p><p>아래 한 줄을 사이트의 <code>&lt;head&gt;</code> 또는 <code>&lt;body&gt;</code> 끝에 넣어 주세요.</p><pre id=\"spCode\">{3}</pre><div class=\"row\"><button class=\"btn\" id=\"spCopy\">복사</button><span class=\"muted\" id=\"spCopied\"></span></div>\n      {4}\n      <div class=\"status\"><span class=\"dot\" id=\"spDot\"></span><span id=\"spStatus\">첫 이벤트를 기다리는 중…</span></div><p class=\"muted\">설치 후 <a href=\"{5}\" target=\"_blank\" rel=\"noopener\">{6}</a> 로 내 사이트를 열면 그 브라우저가 빨간 ME 캐릭터로 표시돼요.</p>\n      <div class=\"row\"><button class=\"btn primary\" id=\"spGo\" disabled>대시보드 보기</button><button class=\"btn\" id=\"spBack\">사이트 목록</button></div>", {0:esc(s.name), 1:esc(s.domain), 2:s.id, 3:esc(code), 4:installGuide(code, new URL(CONN.api).origin, s), 5:esc(meLink), 6:esc(meLink)}), true);
    wireInstallGuide();
    $('spCopy').onclick=async()=>{ try { await navigator.clipboard.writeText(code); say($('spCopied'),L("복사했어요")); } catch { const r=document.createRange(); r.selectNodeContents($('spCode')); getSelection().removeAllRanges(); getSelection().addRange(r); say($('spCopied'),L("선택했어요. Ctrl+C")); } };
    $('spBack').onclick=()=>{ clearInterval(this.pollT); this.showSites(); };
    $('spGo').onclick=()=>{ clearInterval(this.pollT); if (this.site&&this.site.id===s.id){ hideEl($('sitePanel')); this.setStatus('live',L("실시간")); return; } this.choose({ ...s, lastEventAt:Date.now() }); };
    if (this.site&&this.site.id===s.id){ $('spGo').disabled=false; $('spDot').classList.add('ok'); $('spStatus').textContent=L("이미 수신 중인 사이트예요"); }
    clearInterval(this.pollT); this.pollT=setInterval(async()=>{ try { const j=await this.api('/api/sites'); const cur=j.sites.find(x=>x.id===s.id); if (cur&&cur.lastEventAt){ $('spDot').classList.add('ok'); $('spStatus').textContent=L("수신 중 · 마지막 수신 {0}초 전 · 접속자 {1}", {0:Math.max(0,Math.round((Date.now()-cur.lastEventAt)/1000)), 1:cur.online}); $('spGo').disabled=false; } } catch {} }, 3000); },
  // 스트림(S-29·로드맵 54·55): 연결의 생애는 React 훅(packages/ui useSiteStream)이 쥔다. 여기서는 설정(사이트·티켓 함수)을 넣고 프레임·상태 콜백만 받는다.
  // 티켓: EventSource는 헤더를 못 붙이므로 30초짜리 일회용 티켓만 URL에. 끊김·지수 백오프·lastEventId 재개·늦게 온 티켓 버리기는 훅이 한다
  open(){ hideEl($('sitePanel')); this.streamOn=true;
    ui.stream.connect({ api: CONN.api, siteId: CONN.site, auth: { ticket: () => this.ticket() }, onFrame: (type, d) => this.frame(type, d), onStatus: s => this.streamStatus(s) });
    const role=this.site?.role||'owner', edit=role==='owner'||role==='editor'; UNL.edit=edit; for (const id of ['btnPages','btnEvents','btnEmbed','btnInstall','btnNote','btnHooks']) $(id).hidden=!edit; $('btnMembers').hidden=false;
    const rt=$('siteRole'); rt.hidden=role==='owner'; rt.textContent=role==='editor'?L("편집 권한"):L("보기 권한"); rt.title=role==='editor'?L("편집 멤버: 설정을 바꿀 수 있어요"):L("보기 멤버: 설정은 못 바꿔요"); },
  // 401이면 백오프가 아니라 토큰 갱신 한 번. 그래도 401이면 훅이 'auth' 상태를 주고 아래 streamStatus가 로그인 화면으로 보낸다
  async ticket(){ const get=async()=>(await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/stream-ticket`, { method:'POST' })).ticket;
    try { return await get(); } catch(e){ if (e.status!==401 || !AUTH?.refresh) throw e; await this.refreshIfNeeded(true); return get(); } },
  streamStatus(s){ if (s.state==='auth'){ this.disconnect(); lsSet('vt_auth',null); CONN.token=''; return this.showLogin(L("로그인이 만료됐어요. 다시 로그인해 주세요.")); }
    if (s.state==='down'){ store.frozen=true; this.downAt=this.downAt||Date.now(); this.setStatus('connecting',L("연결이 끊겨 다시 시도 중")); } },
  // 리플레이 동안 피드에 남길 것(기록 갱신·알림·복구 건수)은 미뤄 두었다가 라이브로 돌아올 때 흘린다. 라이브 스토어 자체는 리플레이 중에도 계속 쌓인다(world·패널만 리플레이 스토어를 본다)
  later(fn){ if (replay.active) this.pending.push(fn); else fn(); },
  flushLater(){ const q=this.pending; this.pending=[]; for (const fn of q) fn(); if (this.pendingTrails){ world.loadTrails(this.pendingTrails); this.pendingTrails=null; } },
  frame(type, d){ switch (type) {
    case 'snapshot': { const snap=d; this.lastEventAt=snap.lastEventAt||null; const gap=this.downAt; this.downAt=null; if (gap && !replay.active) this.missedGap(gap, Date.now());
      store.reset(); store.frozen=false; if (snap.pages) applyPages(snap.pages); if (snap.eventTypes) setEventConfig(snap.eventTypes); setUnlocks(snap.unlocks||null); setWeather(snap.weather?.kind||'clear', snap.weather, true); world.vitals=snap.vitals||{}; funnelRestore();
      world.muted=true; for (const x of snap.sessions) store.apply(x); world.muted=false; if (!replay.active) world.syncFromStore(); this.setStatus('live',L("실시간 · {0}명 복원", {0:snap.sessions.length})); quietCheck(); autoExport(); break; }
    case 'event': this.lastEventAt=Date.now(); store.apply(d); if (quietShown) quietCheck(); break;
    // 재접속 무손실(로드맵 44): lastEventId 뒤가 링버퍼에 있으면 서버가 스냅샷 대신 'resume' + 놓친 이벤트만 준다. 끊긴 동안 멈춰 둔 로컬 만료(store.frozen)를 푼다
    case 'resume': this.downAt=null; store.frozen=false; this.setStatus('live', d.count?L("실시간 · 놓친 {0}건 복구", {0:d.count}):L("실시간 · 다시 연결")); if (d.count) this.later(()=>sysFeed(L("다시 연결됐어요. 놓친 {0}건을 복구했어요.", {0:d.count}))); break;
    case 'eventtypes': if (!EVS.editing) setEventConfig(d); break; // 이벤트 설정도 다른 탭 저장을 바로 반영(편집 중이면 저장·닫기 때)
    case 'pages': applyPages(d); break; // 설정 저장이 다른 탭에서 돼도 바로 반영
    case 'unlocks': setUnlocks(d, d.opened); break; // 테마 해금: 새로 열렸거나 선물을 썼을 때
    case 'trails': if (replay.active) this.pendingTrails=d.moves; else world.loadTrails(d.moves); break; // 발자국은 서버 기록으로 다시 만든다(world.loadTrails). 리플레이 중이면 돌아올 때
    case 'weather': setWeather(d.kind, d, replay.active); break; // 날씨는 서버가 정한다(store.weather). 리플레이 중엔 피드 줄 없이 상태만
    case 'vitals': world.vitals=d; ui.refresh(); break; // 느린 페이지(로드맵 28): 건물별 웹 바이탈 p75
    case 'milestone': this.later(()=>onMilestone(d)); break; // 기록 갱신(로드맵 21)
    // 서버 알림(server/alerts.js): 이상 감지·아침 요약·조용함은 피드 줄 + 브라우저 알림. 이벤트·접속자 기준은 이미 피드·알림에 있으니 건너뛴다
    case 'alert': { const a=d; if (a.kind==='event'||a.kind==='online') return; if (a.kind==='quiet' && quietShown) return;
      this.later(()=>{ addFeed(a.text, a.kind==='anomaly'?(a.dir==='down'?'cross':'firework'):a.kind==='daily'?'chart':'bell', '', a.at||Date.now(), a.kind==='anomaly'&&a.dir==='down'?'sys warn':'sys note'); notify(a.kind==='anomaly'?(a.dir==='down'?L("평소보다 적어요"):L("평소보다 많아요")):a.kind==='daily'?L("어제 요약"):L("이벤트가 없어요"), a.text, 'alert_'+a.kind); }); break; } } },
  // 놓친 구간 안내(로드맵 59): 끊긴 동안이 링버퍼보다 길거나 서버가 재시작되면 resume 대신 스냅샷이 온다. 상태는 스냅샷이 맞추고, 놓친 맥락은 서버 기록(events?from&to, 최대 24시간)으로 세어
  // "N분 동안 M명이 다녀갔어요"를 피드에 남기고 그 구간의 서버 기록 리플레이로 잇는다. 봇·메모는 사람 수에서 빼고, 1분 미만은 조용히 넘긴다
  async missedGap(from, to){ if (to-from < 60000) return; from=Math.max(from, to-86400000); let j; try { j=await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/events?from=${new Date(from).toISOString()}&to=${new Date(to).toISOString()}`); } catch { return; }
    const people=new Set(); for (const ev of j.events) if (ev.session_id && ev.event_type!=='note' && !ev.properties?.bot) people.add(ev.session_id);
    const mins=Math.max(1, Math.round((to-from)/60000)), n=people.size;
    addFeed(n ? [L("연결이 끊긴 "), {b:L("{0}분", {0:mins})}, L(" 동안 "), {b:L("{0}명", {0:n})}, L("이 다녀갔어요 "), { btn:L("리플레이로 보기"), onClick:()=>startReplay({ from, to }) }] : L("연결이 끊긴 {0}분 동안 다녀간 사람은 없었어요", {0:mins}), 'bolt', '', to, 'sys note'); },
  // ---- 초대 링크(?join=토큰)로 들어왔을 때: 어느 사이트에 어떤 역할로 참여하는지 보여 주고 참여하면 그 사이트를 연다
  async acceptInvite(token){ this.setStatus('connecting',L("초대 확인")); const clean=()=>{ CONN.join=''; const u=new URL(location.href); u.searchParams.delete('join'); history.replaceState(null,'',u.pathname+u.search+u.hash); };
    const back=()=>{ clean(); const pick=this.sites.find(s=>s.id===CONN.site); if (pick){ this.site=pick; $('siteName').textContent=pick.domain||pick.name; this.open(); } else this.showSites(); };
    let inv; try { inv=await this.api(`/api/invites/${encodeURIComponent(token)}`); } catch(e){ return panel(L("<h2>INVITE</h2><p class=\"err\">{0}</p><div class=\"row\"><button class=\"btn\" id=\"ivClose\">닫기</button></div>", {0:esc(e.message)})), $('ivClose').onclick=back; }
    const rname=inv.role==='editor'?L("편집 멤버"):L("보기 멤버");
    panel(L("<h2>INVITE</h2><p><b>{0}</b> <span class=\"muted\">{1}</span></p>\n      <p>{2}</p>\n      <p class=\"muted\">{3}링크 만료 {4}</p>\n      <div class=\"row\"><button class=\"btn primary\" id=\"ivGo\">{5}</button><button class=\"btn\" id=\"ivClose\">취소</button><span class=\"muted\" id=\"ivMsg\"></span></div>", {0:esc(inv.site.name), 1:esc(inv.site.domain), 2:inv.current==='owner'?L("내가 주인인 사이트예요."):inv.current?L("이미 {0} 멤버예요.", {0:inv.current==='editor'?L("편집 권한"):L("보기 권한")}):L("이 사이트의 <b>{0}</b>로 초대받았어요. {1}", {0:rname, 1:inv.role==='editor'?L("마을을 보고 건물·이벤트 설정도 바꿀 수 있어요."):L("마을·피드·통계를 볼 수 있고 설정은 못 바꿔요.")}), 3:this.user?esc(this.user.name||this.user.email||this.user.id)+L(" 계정으로 참여해요 · "):'', 4:esc(new Date(inv.expires_at).toLocaleDateString(intlLocale())), 5:inv.current?L("사이트 열기"):L("참여하기")}));
    $('ivClose').onclick=back;
    $('ivGo').onclick=async()=>{ say($('ivMsg'),L("참여하는 중…")); try { const r=await this.api(`/api/invites/${encodeURIComponent(token)}/accept`,{ method:'POST' }); const me=await this.api('/api/sites'); this.sites=me.sites; clean();
        const s=this.sites.find(x=>x.id===r.site_id); if (!s) throw new Error(L("사이트 목록을 다시 읽지 못했어요")); const c=lsGet('vt_conn')||{}; lsSet('vt_conn',{ ...c, site:s.id }); CONN.site=s.id; this.site=s; $('siteName').textContent=s.domain||s.name; hideEl($('sitePanel')); this.open();
        if (!r.already) sysFeed(L("{0}에 {1} 멤버로 참여했어요.", {0:s.name, 1:r.role==='editor'?L("편집 권한"):L("보기 권한")})); } catch(e){ say($('ivMsg'),errText(e,L("참여하지 못했어요")),true); } }; },
  // ---- 멤버: 같이 보는 사람 목록. 주인은 초대 링크(보기용·편집용)를 만들고 멤버를 내보낼 수 있고, 멤버는 스스로 나갈 수 있다
  async showMembers(){ let j; try { j=await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/members`); } catch(e){ return panel(L("<h2>MEMBERS</h2><p class=\"err\">{0}</p><div class=\"row\"><button class=\"btn\" id=\"mbClose\">닫기</button></div>", {0:esc(e.message)})), $('mbClose').onclick=()=>hideEl($('sitePanel')); }
    const owner=j.me.role==='owner', api=this.api.bind(this), site=encodeURIComponent(CONN.site);
    const who=(id,name)=>`${esc(name||id.slice(0,12))}${id===j.me.id?L(" <span class=\"muted\">(나)</span>"):''}`;
    const link=t=>{ const u=new URL(location.href); u.hash=''; u.search=''; u.searchParams.set('api',CONN.api); u.searchParams.set('join',t); return u.href; };
    const copy=async(t,ok)=>{ try { await navigator.clipboard.writeText(t); say($('mbMsg'),ok); } catch { say($('mbMsg'),L("복사가 막혀 있어요. 직접 선택해 주세요")); } };
    const rows=()=>L("<div class=\"mb-row\"><span>{0}</span><span class=\"tags\"><span class=\"tag pro\">주인</span></span></div>", {0:who(j.owner.id,j.owner.name)})+j.members.map(m=>`<div class="mb-row"><span>${who(m.user_id,m.name)} <span class="muted">${m.created_at?new Date(m.created_at).toLocaleDateString(intlLocale()):''}</span></span><span class="row">${roleTag(m.role)}${owner?L("<button class=\"btn del\" data-rm=\"{0}\" title=\"내보내기\">×</button>", {0:esc(m.user_id)}):m.user_id===j.me.id?L("<button class=\"btn\" data-rm=\"{0}\">나가기</button>", {0:esc(m.user_id)}):''}</span></div>`).join('');
    const invRows=()=>{ const list=j.invites||[]; return list.length?list.map(i=>L("<div class=\"mb-row\"><span>{0} <span class=\"muted\">만료 {1} · {2}명 참여</span></span><span class=\"row\"><button class=\"btn\" data-copy=\"{3}\">링크 복사</button><button class=\"btn del\" data-revoke=\"{4}\" title=\"끊기\">×</button></span></div>", {0:roleTag(i.role), 1:esc(new Date(i.expires_at).toLocaleDateString(intlLocale())), 2:i.uses, 3:esc(i.token), 4:esc(i.token)})).join(''):L("<p class=\"muted\">만든 링크가 없어요.</p>"); };
    panel(L("<h2>MEMBERS</h2><p class=\"muted\">{0}</p><div class=\"list\" id=\"mbList\"></div>\n      {1}\n      <div class=\"row\"><button class=\"btn\" id=\"mbClose\">닫기</button><span class=\"muted\" id=\"mbMsg\"></span></div>", {0:esc(this.site?.domain||CONN.site), 1:owner?L("<h2>INVITE</h2><p class=\"muted\">링크를 받은 사람이 GitHub로 로그인하면 멤버가 돼요. 링크는 7일 뒤 만료되고, 같은 역할의 링크를 새로 만들면 예전 링크는 끊겨요. 보기 멤버는 마을·피드·통계만, 편집 멤버는 건물·이벤트 설정까지 바꿀 수 있어요.</p><div class=\"list\" id=\"mbInv\"></div><div class=\"row\"><button class=\"btn primary\" id=\"mbNewV\">보기용 링크 만들기</button><button class=\"btn primary\" id=\"mbNewE\">편집용 링크 만들기</button></div>"):''}));
    const render=()=>{ $('mbList').innerHTML=rows(); if (owner) $('mbInv').innerHTML=invRows();
      document.querySelectorAll('#sitePanel [data-rm]').forEach(b=>b.onclick=async()=>{ const self=b.dataset.rm===j.me.id; if (!await ask(self?L("이 사이트에서 나갈까요? 다시 보려면 새 초대 링크가 필요해요."):L("이 멤버를 내보낼까요?"), { ok:self?L("나가기"):L("내보내기"), danger:true })) return; try { await api(`/api/sites/${site}/members?user=${encodeURIComponent(b.dataset.rm)}`,{ method:'DELETE' }); if (self){ hideEl($('sitePanel')); const c=lsGet('vt_conn')||{}; lsSet('vt_conn',{ ...c, site:'' }); location.search=`?api=${encodeURIComponent(CONN.api)}`; return; } j.members=j.members.filter(m=>m.user_id!==b.dataset.rm); say($('mbMsg'),L("내보냈어요")); render(); } catch(e){ say($('mbMsg'),errText(e,L("내보내지 못했어요")),true); } });
      document.querySelectorAll('#sitePanel [data-copy]').forEach(b=>b.onclick=()=>copy(link(b.dataset.copy),L("초대 링크를 복사했어요")));
      document.querySelectorAll('#sitePanel [data-revoke]').forEach(b=>b.onclick=async()=>{ if (!await ask(L("이 링크를 끊을까요? 이미 참여한 멤버는 그대로예요."), { ok:L("끊기"), danger:true })) return; try { await api(`/api/sites/${site}/invites?token=${encodeURIComponent(b.dataset.revoke)}`,{ method:'DELETE' }); j.invites=(j.invites||[]).filter(i=>i.token!==b.dataset.revoke); say($('mbMsg'),L("끊었어요")); render(); } catch(e){ say($('mbMsg'),errText(e,L("링크를 끊지 못했어요")),true); } }); };
    const make=async role=>{ say($('mbMsg'),L("만드는 중…")); try { const r=await api(`/api/sites/${site}/invites`,{ method:'POST', body:JSON.stringify({ role }) }); j.invites=[...(j.invites||[]).filter(i=>i.role!==role), r.invite]; render(); await copy(link(r.invite.token),L("링크를 만들고 복사했어요")); } catch(e){ say($('mbMsg'),errText(e,L("링크를 만들지 못했어요")),true); } };
    if (owner){ $('mbNewV').onclick=()=>make('viewer'); $('mbNewE').onclick=()=>make('editor'); }
    $('mbClose').onclick=()=>hideEl($('sitePanel')); render(); },
  // ---- 임베드: 사이트별 읽기 전용 키로 마을만 보여 주는 링크. 키는 서버가 발급하고 회전하면 예전 링크는 바로 끊긴다
  async showEmbed(){ let key=null; try { key=(await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/embed`)).key; } catch(e){ return panel(L("<h2>EMBED</h2><p class=\"err\">{0}</p><div class=\"row\"><button class=\"btn\" id=\"emClose\">닫기</button></div>", {0:esc(e.message)})), $('emClose').onclick=()=>hideEl($('sitePanel')); }
    panel(L("<h2>EMBED</h2><p>OBS 브라우저 소스나 홈페이지 iframe에 마을만 띄우는 링크예요. 링크만 있으면 누구나 볼 수 있으니(방문자 정보 패널·설정은 없어요) 공개해도 괜찮은 곳에만 넣어 주세요.</p>\n      <div class=\"row\"><label class=\"toggle\">테마 <select id=\"emTheme\">{0}</select></label><label class=\"toggle\"><input type=\"checkbox\" id=\"emLabels\" checked>건물 이름</label><label class=\"toggle\"><input type=\"checkbox\" id=\"emNight\" checked>낮·밤</label><label class=\"toggle\"><input type=\"checkbox\" id=\"emBadges\" checked>인원 배지</label><label class=\"toggle\"><input type=\"checkbox\" id=\"emMarks\" checked>방문자 표시</label><label class=\"toggle\"><input type=\"checkbox\" id=\"emHeat\">발자국</label></div>\n      <div id=\"emBody\"></div><div class=\"row\"><button class=\"btn primary\" id=\"emMake\"></button><button class=\"btn\" id=\"emClose\">닫기</button><span class=\"muted\" id=\"emMsg\"></span></div>", {0:THEME_KEYS.map(k=>`<option value="${k}"${themeOpen(k)?'':' disabled'}>${esc(THEMES[k].name)}${themeOpen(k)?'':L(" (잠김)")}</option>`).join('')}));
    $('emTheme').value=ENGINE.THEME_KEY; $('emTheme').dispatchEvent(new Event('pxs-refresh'));
    const url=()=>{ const u=new URL(`/embed/${encodeURIComponent(key)}`, location.origin); u.searchParams.set('api',CONN.api); u.searchParams.set('site',CONN.site); const t=$('emTheme').value; if (t!=='cozy') u.searchParams.set('theme',t); if (!$('emLabels').checked) u.searchParams.set('labels','0'); if (!$('emNight').checked) u.searchParams.set('night','0'); if (!$('emBadges').checked) u.searchParams.set('badges','0'); if (!$('emMarks').checked) u.searchParams.set('marks','0'); if ($('emHeat').checked) u.searchParams.set('heat','1'); return u.href; };
    const render=()=>{ $('emMake').textContent=key?L("링크 새로 만들기"):L("임베드 링크 만들기"); if (!key){ $('emBody').innerHTML=L("<p class=\"muted\">아직 링크가 없어요. 아래 버튼으로 만들면 iframe 코드와 OBS용 주소가 나와요.</p>"); return; }
      const u=url(), badge=`${CONN.api}/api/sites/${encodeURIComponent(CONN.site)}/badge?embed=${encodeURIComponent(key)}${getLocale()==='en'?'&lang=en':''}`, landing=`${location.origin}/`;
      $('emBody').innerHTML=L("<p class=\"muted\">홈페이지 iframe</p><pre id=\"emCode\">{0}</pre><div class=\"row\"><button class=\"btn\" id=\"emCopyCode\">iframe 복사</button><button class=\"btn\" id=\"emCopyUrl\">주소만 복사</button><a class=\"btn\" href=\"{1}\" target=\"_blank\" rel=\"noopener\">새 탭에서 보기</a></div><p class=\"muted\">OBS에서는 브라우저 소스에 이 주소를 넣고 너비 960·높이 540(16:9)로 두면 배경이 투명하게 나와요. 링크를 새로 만들면 예전 링크는 바로 끊겨요.</p>\n        <p class=\"muted\">방문자용 미니 위젯</p><label class=\"toggle\"><input type=\"checkbox\" id=\"emWidget\"{2}>내 사이트 구석에 작은 마을 버튼을 보여 줘요 <span class=\"muted\">(방문자가 누르면 지금 있는 사람들과 자기 캐릭터가 보여요. 임베드 키가 방문자에게 공개돼요)</span></label>\n        <pre id=\"emWidgetCode\">{3}</pre><p class=\"muted\">설치 코드에 <code>data-widget=\"1\"</code>만 더하면 돼요(bottom-left·top-right처럼 자리를 써도 돼요). 위젯을 끄면 버튼이 바로 사라져요.</p>\n        <p class=\"muted\">공개 마을 구경</p><label class=\"toggle\"><input type=\"checkbox\" id=\"emPublic\"{4}{5}>다른 Visitown 사용자가 \"마을 구경\"에서 이 마을을 볼 수 있게 해요 <span class=\"muted\">(사이트 이름·도메인과 지금 접속자 수 같은 트래픽 규모가 드러나요. 주인만 바꿀 수 있어요)</span></label>\n        <p class=\"muted\">README·블로그 배지 <span class=\"muted\">· 지금 보는 사람 수가 30초마다 바뀌어요. 같은 임베드 키를 써서 링크를 새로 만들면 배지도 바꿔야 해요</span></p><p class=\"em-badge\"><img src=\"{6}\" alt=\"지금 보는 사람 수 배지\" height=\"38\"></p><pre id=\"emBadge\">{7}</pre><div class=\"row\"><button class=\"btn\" id=\"emCopyBadge\">마크다운 복사</button><button class=\"btn\" id=\"emCopyBadgeHtml\">HTML 복사</button></div>", {0:esc(`<iframe src="${u}" width="960" height="540" style="border:0;background:transparent" loading="lazy"></iframe>`), 1:esc(u), 2:this.site?.widget?' checked':'', 3:esc(`<script src="${CONN.api}/visitown.js" data-site="${CONN.site}" data-widget="1" async><\/script>`), 4:this.site?.public?' checked':'', 5:(this.site?.role||'owner')==='owner'?'':' disabled', 6:esc(badge), 7:esc(`[![Visitown](${badge})](${landing})`)});
      const copy=async(t,ok)=>{ try { await navigator.clipboard.writeText(t); say($('emMsg'),ok); } catch { say($('emMsg'),L("복사가 막혀 있어요. 직접 선택해 주세요")); } };
      $('emCopyCode').onclick=()=>copy($('emCode').textContent,L("iframe 코드를 복사했어요")); $('emCopyUrl').onclick=()=>copy(u,L("주소를 복사했어요"));
      $('emWidget').onchange=async()=>{ const on=$('emWidget').checked; try { await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/widget`,{ method:'PUT', body:JSON.stringify({ on }) }); if (this.site) this.site.widget=on; say($('emMsg'), on?L("위젯을 켰어요"):L("위젯을 껐어요")); } catch(e){ $('emWidget').checked=!on; say($('emMsg'),errText(e,L("바꾸지 못했어요")),true); } };
      $('emPublic').onchange=async()=>{ const on=$('emPublic').checked; if (on && !await ask(L("공개 목록에 올리면 다른 사용자가 이 마을의 이름·도메인·접속자 수를 볼 수 있어요. 올릴까요?"), { ok:L("올리기") })){ $('emPublic').checked=false; return; }
        try { await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/public`,{ method:'PUT', body:JSON.stringify({ on }) }); if (this.site) this.site.public=on; say($('emMsg'), on?L("공개 목록에 올렸어요"):L("공개 목록에서 내렸어요")); } catch(e){ $('emPublic').checked=!on; say($('emMsg'),errText(e,L("바꾸지 못했어요")),true); } };
      $('emCopyBadge').onclick=()=>copy($('emBadge').textContent,L("배지 마크다운을 복사했어요")); $('emCopyBadgeHtml').onclick=()=>copy(L("<a href=\"{0}\"><img src=\"{1}\" alt=\"Visitown: 지금 보는 사람 수\" height=\"38\"></a>", {0:landing, 1:badge}),L("배지 HTML을 복사했어요")); };
    ['emTheme','emLabels','emNight','emBadges','emMarks','emHeat'].forEach(id=>$(id).addEventListener('change', render));
    $('emMake').onclick=async()=>{ if (key && !await ask(L("링크를 새로 만들면 지금 쓰는 임베드 링크는 바로 끊겨요. 계속할까요?"), { ok:L("새로 만들기"), danger:true })) return; say($('emMsg'),L("만드는 중…")); try { key=(await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/embed`,{ method:'POST' })).key; say($('emMsg'),L("만들었어요")); render(); } catch(e){ say($('emMsg'),errText(e,L("링크를 만들지 못했어요")),true); } };
    $('emClose').onclick=()=>hideEl($('sitePanel')); render(); },
  reconnect(){ this.disconnect(); this.open(); },
  // ---- 알림 보내기(웹훅): 슬랙·디스코드 주소 하나와 종류별 켬/끔. 서버(server/alerts.js)가 탭이 닫혀 있어도 보낸다
  async showHooks(){ let j; try { j=await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/webhook`); } catch(e){ return panel(L("<h2>WEBHOOK</h2><p class=\"err\">{0}</p><div class=\"row\"><button class=\"btn\" id=\"whClose\">닫기</button></div>", {0:esc(e.message)})), $('whClose').onclick=()=>hideEl($('sitePanel')); }
    const w=j.webhook||{}; const on=k=>w.url?w[k]!==false:true;
    panel(L("<h2>WEBHOOK</h2><p class=\"muted\">슬랙 Incoming Webhook이나 디스코드 채널 웹훅 주소를 넣으면 대시보드 탭이 닫혀 있어도 알림을 받아요. 주소는 주인·편집 멤버만 볼 수 있어요.</p>\n      <form id=\"whForm\"><label>웹훅 주소 <input id=\"whUrl\" type=\"url\" placeholder=\"https://hooks.slack.com/services/… 또는 https://discord.com/api/webhooks/…\" value=\"{0}\" spellcheck=\"false\" autocomplete=\"off\"></label>\n      <div class=\"wh-opts\"><label class=\"toggle\"><input type=\"checkbox\" id=\"whEvents\"{1}>알림을 켠 이벤트 <span class=\"muted\">(이벤트 설정의 '알림', 기본은 구매)</span></label>\n      <label class=\"toggle\"><input type=\"checkbox\" id=\"whOnline\"{2}>접속자 <input id=\"whOnlineN\" type=\"number\" min=\"1\" max=\"9999\" value=\"{3}\" style=\"width:64px\"> 명에 닿으면 <span class=\"muted\">(10분에 한 번)</span></label>\n      <label class=\"toggle\"><input type=\"checkbox\" id=\"whQuiet\"{4}>30분 넘게 이벤트가 없으면 <span class=\"muted\">(스크립트 빠짐)</span></label>\n      <label class=\"toggle\"><input type=\"checkbox\" id=\"whAnomaly\"{5}>평소와 다를 때 <span class=\"muted\">(지난 6일 같은 시간 평균 대비 3배 이상 급증·1/4 이하 급감, 15분마다 확인)</span></label>\n      <label class=\"toggle\"><input type=\"checkbox\" id=\"whDaily\"{6}>아침 9시 어제 요약 <span class=\"muted\">(방문·조회·많이 본 페이지·유입·매출)</span></label>\n      <label class=\"toggle\"><input type=\"checkbox\" id=\"whMilestone\"{7}>기록 갱신 <span class=\"muted\">(1,000번째 방문자, 동시 접속 최고, 첫 해외 방문자, 나라 수)</span></label></div>\n      <div class=\"row\"><button class=\"btn primary\" type=\"submit\">저장</button><button class=\"btn\" type=\"button\" id=\"whTest\"{8}>테스트 보내기</button><button class=\"btn\" type=\"button\" id=\"whClose\">닫기</button><span class=\"muted\" id=\"whMsg\"></span></div></form>", {0:esc(w.url||''), 1:on('events')?' checked':'', 2:w.online>0?' checked':'', 3:w.online>0?w.online:10, 4:on('quiet')?' checked':'', 5:on('anomaly')?' checked':'', 6:on('daily')?' checked':'', 7:on('milestone')?' checked':'', 8:w.url?'':' disabled'}), true);
    $('whClose').onclick=()=>hideEl($('sitePanel'));
    $('whForm').onsubmit=async e=>{ e.preventDefault(); say($('whMsg'),L("저장 중…")); const body={ url:$('whUrl').value.trim(), events:$('whEvents').checked, quiet:$('whQuiet').checked, anomaly:$('whAnomaly').checked, daily:$('whDaily').checked, milestone:$('whMilestone').checked, online:$('whOnline').checked?Math.max(1,+$('whOnlineN').value||10):0 };
      try { const r=await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/webhook`,{ method:'PUT', body:JSON.stringify({ webhook:body }) }); $('whTest').disabled=!r.webhook; say($('whMsg'), r.webhook?L("저장했어요"):L("저장했어요 (웹훅 끔)")); } catch(err){ say($('whMsg'),errText(err,L("저장하지 못했어요")),true); } };
    $('whTest').onclick=async()=>{ say($('whMsg'),L("보내는 중…")); try { await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/webhook`,{ method:'POST' }); say($('whMsg'),L("보냈어요. 채널을 확인해 보세요")); } catch(err){ say($('whMsg'),errText(err,L("보내지 못했어요")),true); } }; },
  // ---- 리플레이 메모: "배포", "광고 시작" 같은 한 줄을 기록에 남긴다(주인·editor). 지금 시각이 기본이고 "N분 전"으로 당길 수 있다. 피드와 리플레이 시간축에 보인다
  showNote(){ panel(L("<h2>NOTE</h2><p class=\"muted\">배포·광고 시작·장애 복구처럼 \"그때 무슨 일이 있었는지\"를 적어 두면 리플레이 시간축에 눈금으로 남아 전후를 비교할 수 있어요. 메모는 사이트 기록에 저장되고 다른 멤버에게도 보여요.</p>\n      <form id=\"ntForm\"><label>내용 <input id=\"ntText\" required maxlength=\"80\" placeholder=\"예: v2.3 배포\" autocomplete=\"off\"></label><label>시각 <select id=\"ntAgo\"><option value=\"0\">지금</option><option value=\"5\">5분 전</option><option value=\"15\">15분 전</option><option value=\"30\">30분 전</option><option value=\"60\">1시간 전</option><option value=\"180\">3시간 전</option></select></label>\n      <div class=\"row\"><button class=\"btn primary\" type=\"submit\">남기기</button><button class=\"btn\" type=\"button\" id=\"ntClose\">닫기</button><span class=\"muted\" id=\"ntMsg\"></span></div></form>"));
    $('ntText').focus(); $('ntClose').onclick=()=>hideEl($('sitePanel'));
    $('ntForm').onsubmit=async e=>{ e.preventDefault(); const text=$('ntText').value.trim(); if (!text) return; say($('ntMsg'),L("남기는 중…")); const ago=+$('ntAgo').value||0;
      try { await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/notes`,{ method:'POST', body:JSON.stringify({ text, at:new Date(Date.now()-ago*60000).toISOString() }) }); say($('ntMsg'),L("남겼어요")); setTimeout(()=>hideEl($('sitePanel')),500); } catch(err){ say($('ntMsg'),errText(err,L("메모를 남기지 못했어요")),true); } }; },
  // ---- 건물 설정: 자리(슬롯)·종류·이름·패턴 + 실제로 본 경로 체크리스트. 체크를 끄거나 어디에도 안 맞으면 광장(기타)
  async showSettings(){ let j; try { j=await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/pages`); } catch(e){ return panel(L("<h2>BUILDINGS</h2><p class=\"err\">{0}</p><div class=\"row\"><button class=\"btn\" id=\"bsClose\">닫기</button></div>", {0:esc(e.message)})), $('bsClose').onclick=()=>{hideEl($('sitePanel'));}; }
    const OTHER='/other'; const saved=j.pages||[];
    const cfg=saved.map(p=>({ path:p.path, name:p.name||'', pattern:p.pattern||'', kind:p.kind||'shop', slot:p.slot })).filter(p=>SLOTS[p.slot]).sort((a,b)=>a.slot-b.slot);
    if (!cfg.some(p=>p.slot===0)) cfg.unshift({ path:'/', name:'', pattern:'^/$', kind:'plaza', slot:0 });
    const kname=b=>b.name||(A.kinds[b.kind]||A.kinds.shop).name;
    // 본 경로는 첫 조각(/deals 등)으로 묶어서 보여 준다. /deals/<id>가 수백 개여도 한 줄이고, 체크·건물 선택도 조각 단위라 일관된다
    const seenMap=new Map(); for (const s of (j.seen||[])) { const seg=s.path.split('/')[1]||''; const g=seenMap.get(seg)||{ seg, n:0, kinds:new Set(), last:0 }; g.n+=s.n; g.kinds.add(s.path); g.last=Math.max(g.last,s.last||0); seenMap.set(seg,g); }
    const seen=[...seenMap.values()].sort((a,b)=>b.n-a.n).slice(0,200).map(g=>{ const deeper=[...g.kinds].some(k=>k!=='/'+g.seg); return { path: g.seg?('/'+g.seg+(deeper?'/…':'')):'/', probe: g.seg?'/'+g.seg:'/', n:g.n, kinds:g.kinds.size }; });
    const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), segOf=p=>p.split('/')[1]||'', canon=seg=>seg?`^/${reEsc(seg)}(/|$)`:'^/$';
    const splitAlt=pat=>{ const out=[]; let d=0,cur=''; for (const ch of pat){ if (ch==='(') d++; else if (ch===')') d--; if (ch==='|'&&d===0){ out.push(cur); cur=''; } else cur+=ch; } if (cur) out.push(cur); return out; };
    const GROUP=/^\^\/\(([^()]+)\)\(\/\|\$\)$/;
    const removeSeg=seg=>{ const c=canon(seg); for (const b of cfg){ const alts=splitAlt(b.pattern).map(a=>{ if (a===c) return null; const g=a.match(GROUP); if (g){ const parts=g[1].split('|').filter(x=>x!==reEsc(seg)); if (!parts.length) return null; return parts.length===1?`^/${parts[0]}(/|$)`:`^/(${parts.join('|')})(/|$)`; } return a; }).filter(Boolean); b.pattern=alts.join('|'); } };
    const addSeg=(key,seg)=>{ const b=cfg.find(x=>x.path===key); if (!b) return; const alts=splitAlt(b.pattern); const gi=alts.findIndex(a=>GROUP.test(a)); if (seg&&gi>=0){ const parts=alts[gi].match(GROUP)[1].split('|'); if (!parts.includes(reEsc(seg))) parts.push(reEsc(seg)); alts[gi]=`^/(${parts.join('|')})(/|$)`; } else if (seg&&alts.length===1&&/^\^\/[^()|]+\(\/\|\$\)$/.test(alts[0])){ alts[0]=`^/(${alts[0].slice(2,-5)}|${reEsc(seg)})(/|$)`; } else if (!alts.includes(canon(seg))) alts.push(canon(seg)); b.pattern=alts.join('|'); };
    const classify=p=>{ for (const b of cfg){ if (!b.pattern) continue; try { if (new RegExp(b.pattern).test(p)) return b.path; } catch {} } return OTHER; };
    const opts=cur=>cfg.map(b=>`<option value="${b.path}" data-img="${(A.kinds[b.kind]||A.kinds.shop).url}"${b.path===cur?' selected':''}>${esc(kname(b))}</option>`).join('')+L("<option value=\"{0}\" data-img=\"{1}\"{2}>기타(광장)</option>", {0:OTHER, 1:A.kinds.plaza.url, 2:cur===OTHER?' selected':''});
    const newKey=kind=>{ let k='/'+kind, i=2; while (cfg.some(b=>b.path===k)) k='/'+kind+(i++); return k; };
    const freeSlots=me=>SLOTS.filter(sl=>sl.id!==0&&(sl.id===me||!cfg.some(b=>b.slot===sl.id)));
    // 자리보다 큰 종류(테마·자리 크기가 바뀌어 저장된 값이 안 맞게 된 것)는 그 자리에 맞는 종류로 바꾼다. 아직 안 쓴 종류를 먼저 고른다
    const fitKinds=()=>{ let n=0; for (const b of cfg){ if (b.slot===0||kindFits(b.kind,b.slot)) continue; const used=new Set(cfg.map(x=>x.kind)), ok=KINDS.filter(x=>x!=='plaza'&&kindFits(x,b.slot)), k=ok.find(x=>!used.has(x))||ok[0]; if (k){ b.kind=k; n++; } } return n; };
    panel(L("<h2>BUILDINGS</h2><p class=\"muted\">{0}</p>\n      <div class=\"tabs\"><button class=\"btn tab\" data-tab=\"b\" aria-pressed=\"true\">건물</button><button class=\"btn tab\" data-tab=\"p\" aria-pressed=\"false\">경로</button></div>\n      <div id=\"bsTabB\"><p class=\"muted\">건물은 광장 포함 {1}개까지. 자리·종류를 바꾸면 뒤 지도에 바로 보여요(저장 전엔 임시). 이름을 비우면 테마 기본 이름이에요.</p>\n        <div class=\"bt\" id=\"bsTable\"></div><div class=\"row\"><button class=\"btn\" id=\"bsAdd\">+ 건물 추가</button><span class=\"muted\" id=\"bsCount\"></span><label class=\"toggle\"><input type=\"checkbox\" id=\"bsAdv\">고급: 경로 패턴(정규식) 직접 편집</label></div></div>\n      <div id=\"bsTabP\" hidden><p class=\"muted\" id=\"bsSeenHint\"></p>\n        <div class=\"row\"><input id=\"bsTry\" placeholder=\"/deals/123 처럼 주소를 넣어 보세요\" spellcheck=\"false\" autocomplete=\"off\"><span id=\"bsTryOut\" class=\"muted\"></span><button class=\"btn\" id=\"bsTryAdd\" hidden>목록에 추가</button></div>\n        <div class=\"paths\" id=\"bsPaths\"></div></div>\n      <p class=\"err\" id=\"bsWarn\" hidden></p><div class=\"row\"><button class=\"btn primary\" id=\"bsSave\">저장</button><button class=\"btn\" id=\"bsClose\">닫기</button><span class=\"muted\" id=\"bsMsg\"></span></div>", {0:esc(j.site?.domain||CONN.site), 1:MAX_BUILDINGS}), true);
    document.querySelectorAll('#sitePanel .tab').forEach(t=>t.onclick=()=>{ document.querySelectorAll('#sitePanel .tab').forEach(x=>x.setAttribute('aria-pressed',String(x===t))); $('bsTabB').hidden=t.dataset.tab!=='b'; $('bsTabP').hidden=t.dataset.tab!=='p'; });
    const bad=pat=>{ if (!pat) return false; try { new RegExp(pat); return false; } catch { return true; } };
    const preview=()=>applyPages(cfg, true);
    const renderTable=()=>{ $('bsTable').innerHTML=cfg.map((b,i)=>{ const k=A.kinds[b.kind]||A.kinds.shop; const fixed=b.slot===0;
        const slotSel=fixed?`<span class="k">${esc(SLOTS[0].name)}</span>`:L("<select data-i=\"{0}\" data-f=\"slot\" title=\"자리\">{1}</select>", {0:i, 1:freeSlots(b.slot).map(sl=>`<option value="${sl.id}"${sl.id===b.slot?' selected':''}>${sl.id}. ${esc(sl.name)}</option>`).join('')});
        const kindSel=fixed?`<span class="k">${esc(k.name)}</span>`:L("<select data-i=\"{0}\" data-f=\"kind\" title=\"종류\">{1}</select>", {0:i, 1:KINDS.filter(x=>x!=='plaza').map(x=>`<option value="${x}" data-img="${A.kinds[x].url}"${x===b.kind?' selected':''}${kindFits(x,b.slot)?'':' disabled'}>${esc(A.kinds[x].name)}${kindFits(x,b.slot)?'':L(" (너무 커요)")}</option>`).join('')});
        return L("<img class=\"pv\" src=\"{0}\" alt=\"\" title=\"{1} · {2}×{3}\">{4}{5}<input data-i=\"{6}\" data-f=\"name\" value=\"{7}\" maxlength=\"30\" placeholder=\"{8}\" title=\"이름 (비우면 테마 기본 이름)\"><input data-i=\"{9}\" data-f=\"pattern\" class=\"pat{10}\" value=\"{11}\" maxlength=\"300\" placeholder=\"(경로 탭에서 고르면 자동)\" spellcheck=\"false\" title=\"{12}\">{13}", {0:k.url, 1:esc(k.name), 2:k.w, 3:k.h, 4:slotSel, 5:kindSel, 6:i, 7:esc(b.name), 8:esc(k.name), 9:i, 10:bad(b.pattern)?' bad':'', 11:esc(b.pattern), 12:bad(b.pattern)?L("올바른 정규식이 아니에요. 이 건물로는 아무 경로도 안 가요"):L("경로 패턴 (정규식)"), 13:fixed?'<span></span>':L("<button class=\"btn del\" data-i=\"{0}\" title=\"건물 삭제. 이 건물로 가던 경로는 광장으로 가요\">×</button>", {0:i})}); }).join('');
      $('bsCount').textContent=`${cfg.length}/${MAX_BUILDINGS}`; $('bsAdd').disabled=cfg.length>=MAX_BUILDINGS;
      $('bsTable').classList.toggle('adv', $('bsAdv').checked);
      $('bsTable').querySelectorAll('input').forEach(inp=>inp.oninput=()=>{ cfg[+inp.dataset.i][inp.dataset.f]=inp.value; if (inp.dataset.f==='name') preview(); else inp.classList.toggle('bad', bad(inp.value)); renderPaths(); });
      $('bsTable').querySelectorAll('select').forEach(sel=>sel.onchange=()=>{ const b=cfg[+sel.dataset.i]; if (sel.dataset.f==='slot'){ b.slot=+sel.value; if (!kindFits(b.kind,b.slot)) b.kind=KINDS.find(x=>x!=='plaza'&&kindFits(x,b.slot))||b.kind; } else b.kind=sel.value; cfg.sort((a,b)=>a.slot-b.slot); preview(); renderTable(); renderPaths(); });
      $('bsTable').querySelectorAll('button.del').forEach(bt=>bt.onclick=()=>{ cfg.splice(+bt.dataset.i,1); preview(); renderTable(); renderPaths(); }); };
    const tryIt=()=>{ const v=$('bsTry').value.trim(); if (!v||!v.startsWith('/')){ say($('bsTryOut'),v?L("주소는 /로 시작해요"):''); $('bsTryAdd').hidden=true; return; } const k=classify(v.split('?')[0]); const b=cfg.find(x=>x.path===k); say($('bsTryOut'),'→ '+(b?kname(b):L("광장(기타)"))); $('bsTryAdd').hidden=seen.some(s=>s.probe===(segOf(v)?'/'+segOf(v):'/')); };
    $('bsTry').oninput=tryIt; $('bsTryAdd').onclick=()=>{ const v=$('bsTry').value.trim(), seg=segOf(v); seen.unshift({ path:seg?'/'+seg+(v.split('/').length>2?'/…':''):'/', probe:seg?'/'+seg:'/', n:0, kinds:1 }); renderPaths(); tryIt(); };
    const renderPaths=()=>{ $('bsSeenHint').textContent=seen.length?L("사이트에서 실제로 본 경로 {0}묶음 · 줄마다 어느 건물로 갈지 고르세요. 체크를 끄면 광장으로 가요. 건물 쪽 설정은 건물 탭에서.", {0:seen.length}):L("아직 본 경로가 없어요. 방문이 쌓이면 여기에 나타나요. 아래 칸에 주소를 넣어 미리 정할 수도 있어요.");
      $('bsPaths').innerHTML=seen.map((s,i)=>{ const k=classify(s.probe); return `<label class="${k===OTHER?'off':''}"><input type="checkbox" data-i="${i}"${k===OTHER?'':' checked'}><code>${esc(s.path)}</code><span class="n">${s.n?s.n+L("회"):L("새 경로")}${s.kinds>1?' · '+s.kinds+L("개 경로"):''}</span><select data-i="${i}">${opts(k)}</select></label>`; }).join('');
      $('bsPaths').querySelectorAll('select').forEach(sel=>sel.onchange=()=>{ const s=seen[+sel.dataset.i], seg=segOf(s.probe); removeSeg(seg); if (sel.value!==OTHER) addSeg(sel.value,seg); renderTable(); renderPaths(); });
      $('bsPaths').querySelectorAll('input[type=checkbox]').forEach(cb=>cb.onchange=()=>{ const s=seen[+cb.dataset.i], seg=segOf(s.probe); removeSeg(seg); if (cb.checked){ const sel=cb.parentElement.querySelector('select'); addSeg(sel.value===OTHER?(cfg[1]?.path||cfg[0].path):sel.value, seg); } renderTable(); renderPaths(); }); };
    $('bsAdv').onchange=()=>renderTable();
    $('bsAdd').onclick=()=>{ if (cfg.length>=MAX_BUILDINGS) return; const used=new Set(cfg.map(b=>b.kind)); const kind=KINDS.find(x=>x!=='plaza'&&!used.has(x))||'shop'; const sl=freeSlots(-1).find(sl=>kindFits(kind,sl.id))||freeSlots(-1)[0]; if (!sl) return;
      const k2=kindFits(kind,sl.id)?kind:KINDS.find(x=>x!=='plaza'&&kindFits(x,sl.id)); if (!k2) return; cfg.push({ path:newKey(k2), name:'', pattern:'', kind:k2, slot:sl.id }); cfg.sort((a,b)=>a.slot-b.slot); preview(); renderTable(); renderPaths(); };
    const refit=fitKinds(); renderTable(); renderPaths();
    if (refit){ preview(); say($('bsMsg'),L("자리보다 커서 못 들어가는 건물 {0}개를 맞는 종류로 바꿨어요. 저장하면 반영돼요", {0:refit})); }
    const close=()=>{ hideEl($('sitePanel')); if (this.pages) applyPages(this.pages); }; // 저장 안 한 미리보기는 되돌린다
    $('bsClose').onclick=close;
    $('bsSave').onclick=async()=>{ say($('bsMsg'),L("저장 중…")); $('bsWarn').hidden=true; try { const r=await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/pages`,{ method:'PUT', body:JSON.stringify({ pages:cfg }) }); applyPages(r.pages); if (r.warning){ say($('bsMsg'),L("저장했어요 (일부만)")); $('bsWarn').textContent=r.warning; $('bsWarn').hidden=false; return; } say($('bsMsg'),L("저장했어요")); setTimeout(()=>{ hideEl($('sitePanel')); },500); } catch(e){ say($('bsMsg'),errText(e,L("저장하지 못했어요")),true); } }; },
  // ---- 이벤트 설정: 받은 이름마다 이름표·지도 효과·소리·알림·매출 집계·피드 표시. 편집하는 동안 바로 미리 보이고, 저장 안 하고 닫으면 되돌린다
  async showEvents(){ let j; try { j=await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/eventtypes`); } catch(e){ return panel(L("<h2>EVENTS</h2><p class=\"err\">{0}</p><div class=\"row\"><button class=\"btn\" id=\"etClose\">닫기</button></div>", {0:esc(e.message)})), $('etClose').onclick=()=>hideEl($('sitePanel')); }
    const saved=j.config||[], seenN=new Map((j.seen||[]).map(x=>[x.type,x])), orig=[...ENGINE.EV_CFG.values()];
    const types=[...new Set([...Object.keys(EV_DEFAULTS), ...(j.seen||[]).map(x=>x.type), ...saved.map(c=>c.type)])];
    const rows=types.map(t=>{ const c=saved.find(x=>x.type===t)||{}; return { type:t, ...evDefault(t), ...Object.fromEntries(Object.entries(c).filter(([,v])=>v!==undefined)), label:c.label||'', keep:!!saved.find(x=>x.type===t) }; });
    const TYPE_RE=/^[a-z_]{2,32}$/;
    // 기본값과 다른 칸만 남겨 보낸다. 직접 추가한 이름은 그대로 두어 한도와 상관없이 받게 한다
    const toConfig=()=>rows.map(r=>{ const d=evDefault(r.type), c={ type:r.type }; if (r.label) c.label=r.label; if (r.auto) c.auto=r.auto; for (const k of ['effect','sound','notify','value','feed']) if (r[k]!==d[k]) c[k]=r[k]; return (Object.keys(c).length>1||r.keep)?c:null; }).filter(Boolean);
    const preview=()=>setEventConfig(toConfig());
    panel(L("<h2>EVENTS</h2><p class=\"muted\">{0}</p>\n      <p class=\"muted\">사이트에서 <code>visitown.track('이름', { amount: 29000 })</code>로 보낸 이벤트예요. 이름은 영문 소문자·밑줄 2~32자, 사이트마다 {1}가지까지 받아요. 이름표를 비우면 이벤트 이름이나 기본 이름으로 보여요. ▶로 소리와 지도 효과를 미리 볼 수 있어요.</p>\n      <p class=\"muted\"><b>코드 없이 자동으로</b>: \"URL 패턴\" 칸에 정규식을 적으면(예: 결제 완료 <code>^/order/complete</code>) 그 주소를 본 방문자마다 한 번씩 이 이벤트가 서버에서 만들어져요. 금액(amount)은 없으니 매출 집계는 코드로 보낼 때만 돼요.</p>\n      <div class=\"et\" id=\"etTable\"></div>\n      <p class=\"err\" id=\"etDrop\" hidden></p>\n      <div class=\"row\"><input id=\"etNew\" placeholder=\"미리 등록할 이름 (예: add_to_cart)\" maxlength=\"32\" spellcheck=\"false\" autocomplete=\"off\"><button class=\"btn\" id=\"etAdd\">+ 이벤트 추가</button><span class=\"muted\" id=\"etNewMsg\"></span></div>\n      <div class=\"row\"><button class=\"btn\" id=\"etGuideBtn\" aria-expanded=\"false\"><img data-ico=\"code\" alt=\"\">코드 넣는 법</button><span class=\"muted\">사이트에 이벤트를 보내는 코드 예시와 AI에게 맡길 프롬프트</span></div>\n      <div id=\"etGuide\" hidden>{2}</div>\n      <div class=\"row\"><button class=\"btn primary\" id=\"etSave\">저장</button><button class=\"btn\" id=\"etClose\">닫기</button><span class=\"muted\" id=\"etMsg\"></span></div>", {0:esc(this.site?.domain||CONN.site), 1:j.limit||50, 2:eventGuide()}), true);
    EVS.editing=true; EVS.orig=orig; wireInstallGuide(); $('etGuideBtn').querySelector('img').src=A.iconUrl.code;
    const guide=open=>{ $('etGuideBtn').setAttribute('aria-expanded',String(open)); if (open){ showEl($('etGuide')); $('etGuide').scrollIntoView({ block:'nearest', behavior:'smooth' }); } else hideEl($('etGuide')); };
    $('etGuideBtn').onclick=()=>guide($('etGuide').hidden);
    if (!(j.seen||[]).length) guide(true); // 아직 받은 커스텀 이벤트가 없으면 가이드부터 펼쳐 둔다
    if (j.dropped && j.dropped.length){ $('etDrop').hidden=false; $('etDrop').textContent=L("한도({0}가지)를 넘어 버린 이름이 있어요: {1}. 필요 없는 이름은 사이트 코드에서 정리하거나, 받아야 하는 이름은 아래에서 추가해 주세요.", {0:j.limit, 1:j.dropped.join(', ')}); }
    const render=()=>{ $('etTable').innerHTML=rows.map((r,i)=>{ const fx=EV_EFFECTS[r.effect]||EV_EFFECTS.bolt, n=seenN.get(r.type); const del=!EV_DEFAULTS[r.type]&&!n;
        return L("<div class=\"et-row\"><img class=\"pv\" src=\"{0}\" alt=\"\" title=\"{1}\"><span class=\"et-name\"><code>{2}</code><span class=\"muted\">{3}</span></span>\n          <input data-i=\"{4}\" data-f=\"label\" value=\"{5}\" maxlength=\"20\" placeholder=\"{6}\" title=\"이름표 (피드·통계·알림에 쓰여요)\">\n          <input data-i=\"{7}\" data-f=\"auto\" value=\"{8}\" maxlength=\"300\" placeholder=\"URL 패턴 (선택)\" spellcheck=\"false\" autocomplete=\"off\" title=\"이 정규식에 맞는 주소를 방문자가 보면 코드 없이 이 이벤트를 만들어요. 세션당 한 번\">\n          <select data-i=\"{9}\" data-f=\"effect\" title=\"지도 효과\">{10}</select>\n          <select data-i=\"{11}\" data-f=\"sound\" title=\"소리 (하단 '소리'를 켜야 들려요)\">{12}</select>\n          <span class=\"et-flags\"><label class=\"toggle\" title=\"LIVE FEED에 줄을 남겨요\"><input type=\"checkbox\" data-i=\"{13}\" data-f=\"feed\"{14}>피드</label><label class=\"toggle\" title=\"하단 '알림'을 켠 브라우저에 알림을 보내요 (봇 제외)\"><input type=\"checkbox\" data-i=\"{15}\" data-f=\"notify\"{16}>알림</label><label class=\"toggle\" title=\"통계의 매출에 amount를 더해요\"><input type=\"checkbox\" data-i=\"{17}\" data-f=\"value\"{18}>매출</label></span>\n          <span class=\"et-act\"><button class=\"btn\" data-play=\"{19}\" title=\"미리 보기 (소리 + 아무 캐릭터 위 효과)\" aria-label=\"미리 보기\">▶</button>{20}</span></div>", {0:A.iconUrl[fx.icon||'eye'], 1:esc(fx.name), 2:esc(r.type), 3:n?n.n+L("회"):(EV_DEFAULTS[r.type]?L("기본"):L("아직 안 옴")), 4:i, 5:esc(r.label), 6:esc(evDefault(r.type).label), 7:i, 8:esc(r.auto||''), 9:i, 10:Object.entries(EV_EFFECTS).map(([k,v])=>`<option value="${k}"${v.icon?` data-img="${A.iconUrl[v.icon]}"`:''}${k===r.effect?' selected':''}>${esc(v.name)}</option>`).join(''), 11:i, 12:Object.entries(EV_SOUNDS).map(([k,v])=>`<option value="${k}"${k===r.sound?' selected':''}>${esc(v)}</option>`).join(''), 13:i, 14:r.feed?' checked':'', 15:i, 16:r.notify?' checked':'', 17:i, 18:r.value?' checked':'', 19:i, 20:del?L("<button class=\"btn del\" data-del=\"{0}\" title=\"목록에서 빼기\" aria-label=\"빼기\">×</button>", {0:i}):''}); }).join('');
      $('etTable').querySelectorAll('input[data-f="label"]').forEach(inp=>inp.oninput=()=>{ rows[+inp.dataset.i].label=inp.value.trim(); preview(); });
      $('etTable').querySelectorAll('input[data-f="auto"]').forEach(inp=>inp.oninput=()=>{ const v=inp.value.trim(); let ok=true; if (v){ try { new RegExp(v); } catch { ok=false; } } inp.classList.toggle('err',!ok); inp.title=ok?L("이 정규식에 맞는 주소를 방문자가 보면 코드 없이 이 이벤트를 만들어요. 세션당 한 번"):L("올바른 정규식이 아니에요"); rows[+inp.dataset.i].auto=ok?v:''; });
      $('etTable').querySelectorAll('input[type=checkbox]').forEach(cb=>cb.onchange=()=>{ rows[+cb.dataset.i][cb.dataset.f]=cb.checked; preview(); });
      $('etTable').querySelectorAll('select').forEach(sel=>sel.onchange=()=>{ const r=rows[+sel.dataset.i]; r[sel.dataset.f]=sel.value; preview(); if (sel.dataset.f==='effect'){ sel.closest('.et-row').querySelector('.pv').src=A.iconUrl[EV_EFFECTS[sel.value].icon||'eye']; } else if (sel.value!=='none') sfx(sel.value, true); });
      $('etTable').querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>{ const r=rows[+b.dataset.play]; preview(); if (r.sound!=='none') sfx(r.sound, true); const cs=[...world.chars.values()].filter(ch=>!ch.leaving); const ch=cs[Math.floor(Math.random()*cs.length)]; if (ch) world.customEffect(ch.id, r.type); });
      $('etTable').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ rows.splice(+b.dataset.del,1); preview(); render(); }); };
    render();
    const add=()=>{ const v=$('etNew').value.trim(); if (!TYPE_RE.test(v)) return say($('etNewMsg'),L("영문 소문자·밑줄 2~32자로 써 주세요")); if (rows.some(r=>r.type===v)) return say($('etNewMsg'),L("이미 있어요")); rows.push({ type:v, ...evDefault(v), label:'', keep:true }); $('etNew').value=''; say($('etNewMsg'),''); preview(); render(); };
    $('etAdd').onclick=add; $('etNew').onkeydown=e=>{ if (e.key==='Enter'){ e.preventDefault(); add(); } };
    const close=()=>{ evsRevert(); hideEl($('sitePanel')); }; // 저장 안 한 미리보기는 되돌린다
    $('etClose').onclick=close;
    $('etSave').onclick=async()=>{ say($('etMsg'),L("저장 중…")); try { const r=await this.api(`/api/sites/${encodeURIComponent(CONN.site)}/eventtypes`,{ method:'PUT', body:JSON.stringify({ config:toConfig() }) }); EVS.editing=false; setEventConfig(r.config); say($('etMsg'),L("저장했어요")); setTimeout(()=>hideEl($('sitePanel')),500); } catch(e){ say($('etMsg'),errText(e,L("저장하지 못했어요")),true); } }; },
  disconnect(){ this.streamOn=false; ui.stream.disconnect(); } };
// 이벤트 설정 패널이 열려 있는 동안은 SSE eventtypes로 미리보기를 덮지 않는다. 저장 없이 다른 패널로 바뀌면 원래 설정으로 되돌린다
const EVS={ editing:false, orig:null }; function evsRevert(){ if (!EVS.editing) return; EVS.editing=false; setEventConfig(EVS.orig); }
initPxSelect();
// ---- 진입 화면: 서버 주소가 없거나 토큰이 없을 때. 로그인은 GitHub(Supabase), 아니면 데모
function showGate(msg, api){ api=(api||DEFAULT_API).replace(/\/$/,''); const g=$('gate'); $('gateApi').textContent=api.replace(/^https?:\/\//,''); $('gateErr').hidden=!msg; if (msg) $('gateErr').textContent=msg; $('app').inert=true; showEl(g);
  $('gateLogin').onclick=async()=>{ const b=$('gateLogin'); b.disabled=true; $('gateErr').hidden=true;
    try { const cfg=await (await fetch(`${api}/api/config`)).json(); lsSet('vt_conn',{ ...(lsGet('vt_conn')||{}), api, token:'' });
      if (cfg.devAuth){ location.search=`?api=${encodeURIComponent(api)}&token=dev`; return; }
      if (!cfg.supabaseUrl) throw new Error(L("서버에 로그인 설정이 없어요"));
      const back=`${location.origin}${location.pathname}?api=${encodeURIComponent(api)}${CONN.join?'&join='+encodeURIComponent(CONN.join):''}`; location.href=`${cfg.supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(back)}`; }
    catch(e){ $('gateErr').textContent=/로그인 설정/.test(e.message)?e.message:L("서버({0})에 연결할 수 없어요. 서버가 켜져 있는지, 주소가 맞는지 확인해 주세요.", {0:api}); $('gateErr').hidden=false; b.disabled=false; } };
  $('gateDemo').onclick=()=>{ location.href='/demo'; };
  $('gateOther').onclick=()=>{ const r=$('gateRow'); r.hidden=!r.hidden; if (!r.hidden){ $('gateApiIn').value=api; $('gateApiIn').focus(); } };
  $('gateGo').onclick=()=>{ const v=$('gateApiIn').value.trim().replace(/\/$/,''); if (/^https?:\/\//.test(v)) location.search=`?api=${encodeURIComponent(v)}`; else { $('gateErr').textContent=L("주소는 http:// 또는 https:// 로 시작해야 해요."); $('gateErr').hidden=false; } };
  $('gateApiIn').onkeydown=e=>{ if (e.key==='Enter'){ e.preventDefault(); $('gateGo').click(); } }; }
// ---- 설치 가이드: 플랫폼별 단계 + AI에게 그대로 붙여 넣을 프롬프트
function installGuide(code, origin, s){ const P=[
  ['html',L("HTML 사이트"),L("<ol><li>모든 페이지에 공통으로 들어가는 파일(헤더 템플릿, 레이아웃)을 찾아요.</li><li><code>&lt;/head&gt;</code> 바로 앞에 위 한 줄을 넣어요.</li><li>저장하고 사이트를 새로고침하면 아래 상태가 \"수신 중\"으로 바뀌어요.</li></ol>"),
    L("내 웹사이트의 모든 페이지 <head> 끝에 아래 스크립트 한 줄을 추가해 줘. 공통 헤더나 레이아웃 파일이 있으면 거기에 한 번만 넣고, 다른 코드는 바꾸지 마.\n\n{0}", {0:code})],
  ['cms',L("워드프레스·카페24·아임웹"),L("<ol><li><b>워드프레스</b>: 외모 → 테마 파일 편집기 → header.php의 <code>&lt;/head&gt;</code> 앞. 또는 \"Insert Headers and Footers\" 플러그인의 Header 칸.</li><li><b>카페24</b>: 디자인 관리 → 공통 레이아웃 → 상단 HTML.</li><li><b>아임웹</b>: 설정 → 코드 삽입 → 헤더.</li></ol>"),
    L("나는 워드프레스(또는 카페24, 아임웹)로 만든 사이트를 운영하고 있어. 관리자 화면에서 모든 페이지에 공통으로 들어가는 헤더 HTML을 편집하는 메뉴가 어디인지 단계별로 알려 주고, 거기에 아래 한 줄을 넣는 방법을 설명해 줘.\n\n{0}", {0:code})],
  ['react','Next.js·React',L("<ol><li><b>Next.js(app 라우터)</b>: <code>app/layout.tsx</code>에 <code>next/script</code>의 <code>&lt;Script src=\"{0}/visitown.js\" data-site=\"{1}\" strategy=\"afterInteractive\" /&gt;</code>.</li><li><b>Vite·CRA</b>: <code>index.html</code>의 <code>&lt;/head&gt;</code> 앞에 위 한 줄.</li><li>라우트가 바뀔 때마다 스크립트가 알아서 page_view를 보내요. 추가 코드는 필요 없어요.</li></ol>", {0:esc(origin), 1:esc(s.id)}),
    L("이 프로젝트는 Next.js(또는 React) 앱이야. 모든 페이지에 공통으로 들어가는 루트 레이아웃(Next.js면 app/layout.tsx, Vite나 CRA면 index.html)에 아래 방문자 추적 스크립트를 한 번만 넣어 줘. Next.js면 next/script의 Script 컴포넌트를 strategy=\"afterInteractive\"로 쓰고 data-site 속성을 그대로 유지해. 클라이언트 라우팅은 스크립트가 알아서 감지하니 추가 코드는 넣지 마.\n\n{0}", {0:code})],
  ['csp',L("CSP 있는 사이트"),L("<ol><li>Content-Security-Policy를 쓰는 사이트는 외부 스크립트가 기본으로 막혀요.</li><li><code>script-src</code>와 <code>connect-src</code>에 <code>{0}</code>을 추가해요.</li><li>그 다음 다른 탭의 방법대로 한 줄을 넣어요.</li></ol>", {0:esc(origin)}),
    L("이 사이트는 Content-Security-Policy를 쓰고 있어. 아래 방문자 추적 스크립트가 동작하도록 CSP의 script-src와 connect-src에 {0} 을 추가해 줘. 다른 origin은 건드리지 말고, 공통 레이아웃에 스크립트 한 줄도 넣어 줘.\n\n{1}", {0:origin, 1:code})],
  ['privacy',L("방문자 고지"),L("<p>고객 사이트 방문자에겐 <b>사이트 운영자</b>가 Visitown 사용을 알려야 해요. 아래 문구를 사이트의 개인정보처리방침에 붙여 넣으세요. 쿠키는 안 쓰고 IP·이름·이메일은 저장하지 않아요. 전체 내용은 <a href=\"legal/privacy.html\" target=\"_blank\" rel=\"noopener\">개인정보처리방침</a>·<a href=\"legal/terms.html\" target=\"_blank\" rel=\"noopener\">이용약관</a>에 있어요.</p><pre>{0}</pre><pre>{1}</pre><p class=\"muted\">EU·영국처럼 동의가 필요한 지역 방문자가 있으면 <code>data-consent=\"wait\"</code>를 붙여 설치하고, 동의 배너에서 <code>window.visitown.consent(true)</code>를 불러 주세요. 그 전엔 아무것도 저장·전송하지 않아요.</p>", {0:esc(privacyNotice(origin,intlLocale())), 1:esc(privacyNotice(origin,'en'))}),
    L("우리 사이트에 방문자 분석 스크립트 Visitown을 설치했어. 사이트의 개인정보처리방침(없으면 새로 만들어서 푸터에 링크) 안에 \"분석 도구\" 항목으로 아래 문구를 추가해 줘. 사이트가 영어도 지원하면 영어 문구도 같이 넣어. 이미 쿠키 동의 배너가 있으면 설치 스크립트에 data-consent=\"wait\" 속성을 붙이고, 사용자가 분석(통계) 쿠키에 동의했을 때 window.visitown && window.visitown.consent(true) 를 부르도록 연결해 줘.\n\n{0}\n\n{1}", {0:privacyNotice(origin,intlLocale()), 1:privacyNotice(origin,'en')})],
  ['app',L("앱(WebView)"),L("<p>앱이 웹사이트를 WebView로 감싸는 구조면 웹사이트에 넣은 스크립트가 앱 안에서도 그대로 동작해요. 따로 할 일이 없어요. 화면을 네이티브로 직접 그리는 앱은 아직 지원하지 않아요.</p>"),
    L("우리 앱이 웹사이트를 WebView로 보여주는 구조인지, 아니면 네이티브 화면으로 직접 그리는지 확인해 줘. WebView면 JavaScript가 켜져 있는지와 user agent를 바꾸지 않았는지 확인해 주고, 네이티브면 어떤 화면들이 있는지 목록을 뽑아 줘.")]];
  return guideTabs(P); }
// 고객 사이트의 개인정보처리방침에 붙여 넣을 Visitown 고지 문구. 수집 항목·보관 기간은 legal/privacy.html 3절과 맞춘다
function privacyNotice(origin, lang){ const legal=`${location.origin}/legal/privacy.html${lang==='en'?'?lang=en':''}`;
  if (lang==='en') return `Visitor analytics (Visitown): This site uses Visitown to see how it is visited. It records, per anonymous session, the pages viewed (without query strings), device type (desktop/mobile/tablet), traffic source (direct/search/social/ad), campaign tags from the URL (utm_source/utm_medium/utm_campaign, when present), country, and event times. If error reporting is enabled on this site, JavaScript error messages are also sent with e-mail addresses and long numbers masked. It does not use cookies and does not store IP addresses, names, email addresses or anything you type. A random session ID is kept in your browser's sessionStorage until the tab is closed, and a returning-visitor flag in localStorage. Raw data is deleted after 7 days; only daily aggregate counts are kept. Data is processed on our behalf by Visitown (${origin}). Details: ${legal}`;
  return tr('ko', "방문자 분석(Visitown): 이 사이트는 방문 현황을 보기 위해 Visitown을 사용해요. 익명 세션 단위로 본 페이지(쿼리 제외), 기기 종류(PC·모바일·태블릿), 유입 경로(직접·검색·SNS·광고), 주소에 있을 때 캠페인 값(utm_source·utm_medium·utm_campaign), 나라, 이벤트 시각을 기록해요. 이 사이트가 오류 수집을 켠 경우 자바스크립트 오류 메시지도 이메일·긴 숫자를 가린 채 보내요. 쿠키는 쓰지 않고 IP 주소·이름·이메일·입력 내용은 저장하지 않아요. 무작위 세션 ID가 브라우저 sessionStorage에 탭을 닫을 때까지, 재방문 표시가 localStorage에 남아요. 원본 기록은 7일 뒤 삭제되고 일별 집계 숫자만 남아요. 처리는 Visitown({0})이 저희를 대신해 수행해요. 자세한 내용: {1}", {0:origin, 1:legal}); }
// 가이드 탭 묶음: [키, 탭 이름, 설명 HTML, AI 프롬프트]. 설치 가이드와 이벤트 가이드가 같이 쓴다(wireInstallGuide가 연결)
function guideTabs(P){ return `<div class="tabs" id="igTabs">${P.map((t,i)=>`<button class="btn tab" type="button" data-ig="${t[0]}" aria-pressed="${i===0}">${t[1]}</button>`).join('')}</div>
    ${P.map((t,i)=>L("<div class=\"ig\" data-ig=\"{0}\"{1}>{2}<div class=\"row\"><span class=\"muted\">AI에게 맡기려면 이걸 그대로 붙여 넣으세요</span><button class=\"btn\" type=\"button\" data-cp=\"{3}\">프롬프트 복사</button><span class=\"muted\" data-cpd=\"{4}\"></span></div><pre class=\"prompt\" data-pr=\"{5}\">{6}</pre></div>", {0:t[0], 1:i?' hidden':'', 2:t[2], 3:t[0], 4:t[0], 5:t[0], 6:esc(t[3])})).join('')}`; }
// 커스텀 이벤트 넣는 법. 이벤트 설정 화면의 "코드 넣는 법"
function eventGuide(){ const rule=L("이름은 영문 소문자와 밑줄 2~32자(add_to_cart처럼), 속성은 문자열·숫자·불리언 값만 10개까지, 금액은 amount(숫자)로 보내. 이메일·전화번호 같은 개인정보는 속성에 넣지 마. window.visitown이 없을 수도 있으니(광고 차단, 스크립트 로딩 전) 항상 확인하고 부르고, 실패해도 사이트 동작에 영향이 없게 해.");
  const P=[
  ['js',L("기본(JS)"),L("<ol><li>설치 스크립트가 이미 들어가 있으면 추가로 설치할 건 없어요.</li><li>이벤트가 일어나는 곳(버튼 클릭, 폼 제출 등)에서 한 줄을 부르면 돼요.</li></ol><pre>{0}</pre><p class=\"muted\">이름은 영문 소문자·밑줄 2~32자, 속성은 문자열·숫자·불리언 10개까지예요. 금액은 <code>amount</code>(숫자)로 보내면 '매출'을 켰을 때 합산돼요. 이메일 같은 개인정보는 넣지 마세요.</p>", {0:esc(`window.visitown && window.visitown.track('sign_up');
window.visitown && window.visitown.track('add_to_cart', { amount: 12000, sku: 'A-1' });`)}),
    L("우리 사이트에 방문자 추적 스크립트(window.visitown)가 이미 설치되어 있어. 아래 행동이 일어날 때 커스텀 이벤트를 보내도록 코드를 추가해 줘.\n- 회원가입 완료: visitown.track('sign_up')\n- 장바구니 담기: visitown.track('add_to_cart', { amount: 상품가격, sku: 상품코드 })\n{0}\n어느 파일의 어느 부분에 넣었는지 목록으로 알려 줘.", {0:rule})],
  ['react','Next.js·React',L("<ol><li>헬퍼 함수를 하나 만들어 두고 컴포넌트에서 불러 써요.</li><li>서버 컴포넌트에서는 못 부르니 클릭 핸들러처럼 브라우저에서 도는 곳에서 불러요.</li></ol><pre>{0}</pre>", {0:esc(L("// lib/visitown.ts\ndeclare global { interface Window { visitown?: { track(type: string, props?: Record<string, unknown>): void } } }\nexport function track(type: string, props?: Record<string, unknown>) {\n  if (typeof window !== \"undefined\") window.visitown?.track(type, props);\n}\n\n// 사용\n<button onClick={() => track(\"add_to_cart\", { amount: price })}>담기</button>"))}),
    L("이 프로젝트는 Next.js(또는 React) 앱이고, 방문자 추적 스크립트(window.visitown)가 루트 레이아웃에 이미 들어가 있어. lib/visitown.ts에 track(type, props) 헬퍼를 만들고(window.visitown이 없으면 아무것도 안 함, 타입 선언 포함), 아래 행동이 일어나는 클라이언트 컴포넌트의 핸들러에서 불러 줘.\n- 회원가입 완료: track('sign_up')\n- 장바구니 담기: track('add_to_cart', { amount: 상품가격 })\n{0}\n서버 컴포넌트에서는 부르지 말고, 바꾼 파일 목록을 알려 줘.", {0:rule})],
  ['buy',L("결제 완료"),L("<ol><li>구매는 <b>결제가 실제로 끝난 뒤</b> 한 번만 보내요. 결제 버튼을 누른 순간 보내면 실패·취소도 구매로 잡혀요.</li><li>보통 주문 완료(감사) 페이지에서 보내요. 새로고침해도 두 번 세지 않게 주문번호로 한 번만 보내세요.</li></ol><pre>{0}</pre><p class=\"muted\">카페24·아임웹처럼 주문 완료 페이지를 직접 못 고치면, 관리자 화면의 \"주문 완료 페이지 스크립트\" 칸에 넣어요(쇼핑몰마다 이름이 달라요).</p>", {0:esc(L("// 주문 완료 페이지\nvar key = 'vt_sent_' + orderId;\nif (window.visitown && !sessionStorage.getItem(key)) {\n  window.visitown.track('purchase', { amount: totalPrice });\n  sessionStorage.setItem(key, '1');\n}"))}),
    L("우리 사이트의 결제가 실제로 끝난 뒤(주문 완료 페이지 또는 결제 성공 콜백) 방문자 추적 스크립트로 구매 이벤트를 한 번 보내도록 코드를 넣어 줘: window.visitown.track('purchase', { amount: 결제금액 }).\n- 결제 버튼 클릭 시점이 아니라 결제 성공이 확정된 뒤에만 보내.\n- 같은 주문을 새로고침해도 두 번 보내지 않게 주문번호로 sessionStorage에 표시해 둬.\n{0}\n결제 흐름이 어디서 끝나는지 먼저 찾아서 설명해 주고 코드를 넣어 줘.", {0:rule})],
  ['gtm',L("태그 관리자"),L("<ol><li>Google 태그 관리자(GTM)를 쓰면 코드 수정 없이 넣을 수 있어요.</li><li>태그 → 새로 만들기 → <b>맞춤 HTML</b>에 아래를 넣고, 트리거를 \"클릭 - 특정 버튼\"이나 \"구매 완료 이벤트\"로 걸어요.</li></ol><pre>{0}</pre><p class=\"muted\"><code>{{상품가격}}</code>은 GTM 변수예요. 없으면 빼고 이름만 보내도 돼요.</p>", {0:esc(L("<script>\n  window.visitown && window.visitown.track('add_to_cart', { amount: {{상품가격}} });\n</script>"))}),
    L("Google 태그 관리자(GTM)로 방문자 추적 스크립트(window.visitown)에 커스텀 이벤트를 보내고 싶어. '장바구니 담기' 버튼 클릭과 '구매 완료'에 각각 맞춤 HTML 태그를 만드는 방법을 단계별로 알려 줘. 태그 내용은 window.visitown && window.visitown.track('add_to_cart', { amount: 가격 }) 와 window.visitown && window.visitown.track('purchase', { amount: 결제금액 }) 이야. 금액은 GTM 데이터 영역 변수로 가져오는 방법도 알려 줘.")],
  ['check',L("확인하기"),L("<ol><li>내 사이트에서 이벤트를 한 번 일으켜 보세요(<code>?vt_me=1</code>로 열면 내 캐릭터가 \"나\"로 표시돼요).</li><li>LIVE FEED에 줄이 생기고 이 표에 이름과 횟수가 나타나면 성공이에요. 새 이름은 표를 다시 열면 보여요.</li><li>안 보이면 브라우저 개발자 도구 콘솔에서 <code>visitown.track('test_event')</code>를 직접 불러 보세요. 이것도 안 오면 설치 스크립트 쪽 문제예요.</li></ol>"),
    L("내 사이트에서 window.visitown.track(...)으로 보낸 커스텀 이벤트가 대시보드에 안 보여. 브라우저 개발자 도구에서 확인할 순서를 알려 줘: window.visitown이 있는지, track 호출 뒤 네트워크 탭에 /api/events 요청이 가는지, 응답의 accepted·rejected 값이 뭔지. 이벤트 이름 규칙은 영문 소문자·밑줄 2~32자야.")]];
  return guideTabs(P); }
function wireInstallGuide(){ const root=$('sitePanel'); root.querySelectorAll('#igTabs .tab').forEach(t=>t.onclick=()=>{ root.querySelectorAll('#igTabs .tab').forEach(x=>x.setAttribute('aria-pressed',String(x===t))); root.querySelectorAll('.ig').forEach(p=>p.hidden=p.dataset.ig!==t.dataset.ig); });
  root.querySelectorAll('[data-cp]').forEach(b=>b.onclick=async()=>{ const k=b.dataset.cp, txt=root.querySelector(`[data-pr="${k}"]`).textContent, out=root.querySelector(`[data-cpd="${k}"]`); try { await navigator.clipboard.writeText(txt); say(out,L("복사했어요")); } catch { say(out,L("복사가 막혔어요. 아래 글을 직접 긁어 주세요")); } }); }
function panel(html, wide){ evsRevert(); const el=$('sitePanel'); el.innerHTML=`<div${wide?' class="wide"':''}>${html}</div>`; showEl(el); }
// 모션 헬퍼 (docs/motion.md): showEl/hideEl은 닫힘 애니메이션 뒤에 hidden, pop은 클래스 애니메이션 재생, say는 안내 문구 교체 + 페이드
// 아이콘(<img data-ico>) 달린 버튼의 글자만 바꾼다. ico를 주면 아이콘도 바꾼다
function setBtn(btn, text, ico){ btn.lastChild.textContent=text; if (ico){ const i=btn.querySelector('img[data-ico]'); i.dataset.ico=ico; i.src=A.iconUrl[ico]; } }
$('btnPages').onclick=()=>live.showSettings();
$('btnEvents').onclick=()=>live.showEvents();
$('btnInstall').onclick=()=>{ if (live.site) live.showInstall(live.site); }; // 이미 연동된 사이트도 설치 코드·가이드를 다시 볼 수 있게
$('btnEmbed').onclick=()=>live.showEmbed();
$('btnMembers').onclick=()=>live.showMembers();
function roleTag(role){ return role==='owner'?L("<span class=\"tag pro\">주인</span>"):role==='editor'?L("<span class=\"tag\">편집</span>"):role==='viewer'?L("<span class=\"tag\">보기</span>"):''; }
// 서버가 준 건물 목록(자리·종류·이름·패턴)으로 지도를 다시 만든다. preview=true면 저장 전 미리보기(live.pages는 그대로)
function applyPages(pages, preview){ if (!preview) live.pages=pages; layoutTown(pages); buildAssets(ENGINE.THEME_KEY); store.setPages(pages); store.setBuildings(); world.syncFromStore(); refreshThemeUI();
  if (view.selectedId?.startsWith('/') && !BY_PATH.has(view.selectedId)) view.select(null); ui.refresh(); }
setInterval(()=>{ if (LIVE) live.refreshIfNeeded(); }, 600000);
const labelsEl = $('labels');
function refreshThemeUI(){ $('logoImg').src=A.iconUrl.house; ui.refresh(); document.querySelectorAll('img[data-ico]').forEach(i=>{ i.src=A.iconUrl[i.dataset.ico]; });
  labelsEl.innerHTML=''; for (const b of BUILDINGS){ const el=document.createElement('div'); el.className='label'; el.style.left=(Math.min(W-36,Math.max(36,b.x))/W*100)+'%'; el.style.top=(Math.max(14,b.top-14)/H*100)+'%'; el.innerHTML=`${esc(b.name)}<span>${esc(b.path)}</span>`; labelsEl.appendChild(el); }
  const ts=$('themeSel'); if (ts.value!==ENGINE.THEME_KEY){ ts.value=ENGINE.THEME_KEY; ts.dispatchEvent(new Event('pxs-refresh')); } cv.style.background=PAL.grass; }
// 테마 목록: THEMES 순서(order가 있으면 그 순서). 항목 그림은 그 테마의 첫 캐릭터. 고른 테마는 이 브라우저에만 기억한다(vt_theme)
const THEME_KEYS=Object.keys(THEMES).sort((a,b)=>(THEMES[a].order??Object.keys(THEMES).indexOf(a))-(THEMES[b].order??Object.keys(THEMES).indexOf(b)));
function themeThumb(k){ const C=THEMES[k].characters; return compileChar(C.shapes[0],C.colors[0],C.fixed,C.up).down[0].canvas.toDataURL(); }
const THUMBS=Object.fromEntries(THEME_KEYS.map(k=>[k,themeThumb(k)]));
// 테마 해금(server/unlocks.js): 서버가 스냅샷·SSE 'unlocks'로 열린 테마와 조건·진행도를 준다. 정보가 없으면(데모·예전 서버) 전부 열림
const UNL={ data:null, edit:false, focus:null };
// 여는 조건 문구. 서버가 보낸 rules[].text가 우선이고, 해금 정보가 없을 때(데모·예전 서버) 도감에 보여 줄 사본. server/unlocks.js RULES와 같게 둔다
const UNL_TEXT={ cozy:L("처음부터 열려 있어요"), office:L("평일 업무 시간(9~18시)에 방문자 3명"), hanok:L("한국에서 온 방문자 1명"), candy:L("한 방문자가 서로 다른 페이지 3곳을 둘러봄"), forest:L("다시 찾아온 방문자 1명"), rpg:L("한 방문자가 5분 이상 머묾"), cyber:L("자정~새벽 5시에 방문자 1명"), west:L("서로 다른 나라 2곳에서 방문"), farm:L("방문자가 있었던 날 7일"), space:L("서로 다른 나라 3곳에서 방문") };
const themeOpen=k=>!UNL.data || UNL.data.free.includes(k) || !!UNL.data.unlocked[k];
const unlRule=k=>UNL.data?.rules.find(r=>r.key===k);
function themeOptions(){ const ts=$('themeSel'); ts.innerHTML=THEME_KEYS.map(k=>{ const r=unlRule(k), open=themeOpen(k); return `<option value="${k}" data-img="${THUMBS[k]}"${open?'':' data-locked="1"'}>${esc(THEMES[k].name)}${open||!r?'':` · ${r.value}/${r.goal}`}</option>`; }).join(''); ts.value=ENGINE.THEME_KEY; ts.dispatchEvent(new Event('pxs-refresh')); }
themeOptions(); pxSelect($('themeSel')); $('themeSel').dispatchEvent(new Event('pxs-refresh'));
// 원하는 테마(이 브라우저의 vt_theme, 임베드는 theme=). 잠겨 있으면 포근 마을로 보여 주고, 열리면 그때 바꾼다
const THEME_WANT=lsGet('vt_theme') || ENGINE.THEME_KEY;
if (THEME_WANT!==ENGINE.THEME_KEY && THEMES[THEME_WANT]) buildAssets(THEME_WANT);
refreshThemeUI();
function applyTheme(k, save){ if (!THEMES[k] || k===ENGINE.THEME_KEY) return; pop($('town'),'flash'); buildAssets(k); refreshThemeUI(); DEX.redraw?.(); if (save) lsSet('vt_theme',k); }
// 잠긴 테마를 고르면 바꾸지 않고 도감 테마 탭에서 조건을 보여 준다
function setTheme(k){ if (!THEMES[k]) return; if (!themeOpen(k)){ UNL.focus=k; showDex('theme'); return; } applyTheme(k, true); }
$('themeSel').addEventListener('change', e=>{ const k=e.target.value; if (!themeOpen(k)){ e.target.value=ENGINE.THEME_KEY; e.target.dispatchEvent(new Event('pxs-refresh')); } setTheme(k); });
const nextOpenTheme=()=>{ for (let i=1;i<=THEME_KEYS.length;i++){ const k=THEME_KEYS[(THEME_KEYS.indexOf(ENGINE.THEME_KEY)+i)%THEME_KEYS.length]; if (themeOpen(k)) return k; } return ENGINE.THEME_KEY; };
// 서버 해금 상태 반영. opened가 있으면(SSE로 방금 열림) 피드·알림으로 축하
function setUnlocks(v, opened){ UNL.data=v&&Array.isArray(v.rules)?v:null; themeOptions(); setTownLevel(UNL.data?townLevelOf(UNL.data.visits||0):LIVE?1:3);
  if (!themeOpen(ENGINE.THEME_KEY)) applyTheme(UNL.data.free[0]||'cozy'); else if (ENGINE.THEME_KEY!==THEME_WANT && themeOpen(THEME_WANT)) applyTheme(THEME_WANT);
  for (const k of opened||[]){ if (!THEMES[k]) continue; const r=unlRule(k), why=r?(r.gift?L("선물로 열었어요"):r.text):'';
    addFeed([L("새 테마가 열렸어요: "), {b:THEMES[k].name}, ...(why?[' · ',{muted:why}]:[])], 'star', '', Date.now(), 'sys unlock');
    notify(L("새 테마가 열렸어요"), `${THEMES[k].name}${why?' · '+why:''}`, 'unlock'); }
  if (opened?.length){ const b=document.querySelector('.pxs-btn[data-for="themeSel"]'); if (b) pop(b,'unlocked'); sfx('unlock'); }
  DEX.redraw?.(); }

const stage=$('stage'), vp=$('viewport'), town=$('town'), mini=$('mini'), mctx=mini.getContext('2d');
// ---- 확대: 맞춤 배율(base) × zoom. 휠·핀치는 포인터 아래 지점이 제자리에 있도록 스크롤을 보정한다
let curS=1;
function baseScale(){ const r=stage.getBoundingClientRect();
  let s=Math.min(Math.floor((r.width-4)/W), Math.floor((r.height-4)/H)); if (s<1) s = r.width<W ? Math.max(.5,(r.width-4)/W) : 1; return s; }
function fit(){ setScale(baseScale()*zoom); }
function clampScale(s){ const base=baseScale(); return Math.max(Math.min(base,1), Math.min(Math.max(base*4, 6), s)); }
function setScale(s, cx, cy){ const base=baseScale(); s=clampScale(s); zoom=s/base;
  const sr=stage.getBoundingClientRect(), tr=town.getBoundingClientRect(); if (cx==null){ cx=sr.left+sr.width/2; cy=sr.top+sr.height/2; }
  const px=(cx-tr.left)/curS, py=(cy-tr.top)/curS; // 포인터 아래의 마을 좌표
  curS=s; document.documentElement.style.setProperty('--s', s);
  vp.scrollLeft=px*s+town.offsetLeft-(cx-sr.left); vp.scrollTop=py*s+town.offsetTop-(cy-sr.top); }
// 부드러운 확대: 목표 배율로 프레임마다 다가간다 (휠·버튼). 핀치는 손가락이 곧 보간이라 바로 적용
let zt=null; // {s, cx, cy}
function zoomTo(s, cx, cy){ zt={ s:clampScale(s), cx, cy }; }
// 동작 줄이기(로드맵 57, prefers-reduced-motion): CSS는 shell.css의 전역 규칙이 맡고, 캔버스는 엔진 world.reduceMotion(파티클·빗줄기·눈·까딱이는 화살표 끔. 캐릭터 걸음은 내용이라 남긴다), 확대는 보간 없이 바로 간다
const RM=matchMedia('(prefers-reduced-motion: reduce)'); const applyRM=()=>{ world.reduceMotion=RM.matches; }; applyRM(); RM.addEventListener('change', applyRM);
function tickZoom(){ if (!zt) return; if (world.reduceMotion){ setScale(zt.s, zt.cx, zt.cy); zt=null; return; } const d=zt.s-curS; if (Math.abs(d)<0.003){ setScale(zt.s, zt.cx, zt.cy); zt=null; return; } setScale(curS+d*0.28, zt.cx, zt.cy); }
new ResizeObserver(()=>fit()).observe(stage); fit();
stage.addEventListener('wheel', e=>{ if (e.target.closest('#sitePanel,#connPanel,#replayBar,#mini')) return; e.preventDefault(); const k=Math.exp(-e.deltaY*(e.deltaMode===1?0.05:0.0015)); zoomTo((zt?zt.s:curS)*k, e.clientX, e.clientY); }, {passive:false});
// 미니맵: 맞춤 배율보다 확대됐을 때만 보이고, 누르거나 끌면 그 지점이 화면 가운데로 온다
function drawMini(){ const on=curS>baseScale()+0.01; mini.hidden=!on; if (!on) return; mctx.imageSmoothingEnabled=false; mctx.drawImage(cv,0,0,96,54);
  const fw=vp.clientWidth/(W*curS), fh=vp.clientHeight/(H*curS); if (fw<1||fh<1){ const x=vp.scrollLeft/(W*curS)*96, y=vp.scrollTop/(H*curS)*54; mctx.fillStyle='rgba(59,47,58,.35)'; mctx.fillRect(0,0,96,54); mctx.clearRect(x,y,Math.min(96,fw*96),Math.min(54,fh*54)); mctx.drawImage(cv, x/96*W,y/54*H,Math.min(W,fw*W),Math.min(H,fh*H), x,y,Math.min(96,fw*96),Math.min(54,fh*54)); mctx.strokeStyle='#fff8ea'; mctx.lineWidth=1; mctx.strokeRect(Math.round(x)+.5,Math.round(y)+.5,Math.round(Math.min(96,fw*96))-1,Math.round(Math.min(54,fh*54))-1); } }
const miniGo=e=>{ setFollow(false); const r=mini.getBoundingClientRect(); const px=(e.clientX-r.left)/r.width*W, py=(e.clientY-r.top)/r.height*H; vp.scrollLeft=px*curS-vp.clientWidth/2; vp.scrollTop=py*curS-vp.clientHeight/2; };
mini.addEventListener('pointerdown', e=>{ e.stopPropagation(); mini.setPointerCapture(e.pointerId); miniGo(e); mini.onpointermove=miniGo; });
mini.addEventListener('pointerup', ()=>{ mini.onpointermove=null; }); mini.addEventListener('click', e=>e.stopPropagation());
let pinch=null; // 두 손가락: {d:시작 거리, s:시작 배율}
stage.addEventListener('touchstart', e=>{ if (e.touches.length===2){ const [a,b]=e.touches; pinch={ d:Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY), s:curS }; } }, {passive:true});
stage.addEventListener('touchmove', e=>{ if (!pinch||e.touches.length!==2) return; e.preventDefault(); const [a,b]=e.touches; const d=Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY); setScale(pinch.s*d/pinch.d, (a.clientX+b.clientX)/2, (a.clientY+b.clientY)/2); }, {passive:false});
stage.addEventListener('touchend', ()=>{ pinch=null; });
let drag=null, dragged=false; // 마우스 드래그로 이동 (클릭과 구분: 4px 이상 움직이면 드래그)
stage.addEventListener('pointerdown', e=>{ if (e.pointerType!=='mouse'||e.button!==0||e.target.closest('#sitePanel,#connPanel,#replayBar,#mini,button,input,select')) return; drag={ x:e.clientX, y:e.clientY, sl:vp.scrollLeft, st:vp.scrollTop }; dragged=false; });
addEventListener('pointermove', e=>{ if (!drag) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y; if (!dragged && Math.hypot(dx,dy)<4) return; dragged=true; setFollow(false); stage.classList.add('dragging'); vp.scrollLeft=drag.sl-dx; vp.scrollTop=drag.st-dy; });
addEventListener('pointerup', ()=>{ if (!drag) return; drag=null; stage.classList.remove('dragging'); if (dragged) setTimeout(()=>{ dragged=false; }, 0); });

// 피드
// 피드(로드맵 53): 줄은 React(packages/ui Feed)가 그린다. 여기서는 문장을 조각(parts: 글자·{b}·{muted}·{rare}·{btn,onClick})으로 만들어 ui.addFeed에 넣는다. 글자는 React가 이스케이프하므로 esc()를 쓰지 않는다
function who(s, ev){ const en=getLocale()==='en'; /* 조사는 한국어에만(영어 문장 템플릿은 {0} 자리를 안 쓴다) */ if (s?.bot) return [[{b:L("{0}봇", {0:s.bot})}], en?'':'이']; if (s?.props?.me) return [[{b:L("나")}], en?'':'는']; const code='#'+(s?s.code:sessionCode(ev.session_id)); return [[L("방문자 "), {b:code}], en?'':josa(code,['가','이'])]; }
function feedLine(ev, s, moved){ const [name, ga]=who(s, ev); const bot=!!s?.bot;
  switch(ev.event_type){
    case 'session_start': return [bot?[...name, L("{0} 크롤링을 시작했어요.", {0:ga})]:[...name, L("{0} 입장했어요.", {0:ga}), ...(s?.props?.rare?[' ',{rare:rareLabel(s.props)}]:[])], bot?'robot':s?.props?.rare?'star':'enter'];
    case 'page_view': if(!moved) return null; const bn=BY_PATH.get(store.resolvePath(ev.page_path)).name; return [[...name, bot?L("{0} {1}을(를) 훑었어요.", {0:ga, 1:bn}):L("{0} {1}으로 이동했어요.", {0:ga, 1:bn})], bot?'robot':'walk'];
    case 'page_leave': return [bot?[...name, L("{0} 크롤링을 마쳤어요.", {0:ga})]:[...name, L("{0} 떠났어요.", {0:ga})], bot?'robot':'leave'];
    case 'heartbeat': return null; }
  // 커스텀 이벤트: 내장 4종은 이름표를 안 바꿨으면 원래 문장, 나머지는 "누구 · 이름표"
  const m=evMeta(ev.event_type); if (!m.feed) return null; const ic=(EV_EFFECTS[m.effect]||EV_EFFECTS.bolt).icon||'bolt';
  if (ev.event_type==='greet' && typeof ev.properties?.emoji==='string') return [[...name, L("{0} 인사했어요 {1}", {0:ga, 1:ev.properties.emoji})], 'heart']; // 미니 위젯 인사(로드맵 37)
  const autoMark=ev.properties?.auto?[' ',{muted:L("(자동)"), title:L("URL 패턴으로 서버가 만든 이벤트")}]:[];
  if (!m.renamed){ const t={ search:L("검색했어요."), product_click:L("상품을 클릭했어요."), sign_up:L("회원가입했어요!"), purchase:L("구매했어요!") }[ev.event_type]; if (t) return [[...name, `${ga} ${t}`, ...autoMark], ic]; }
  const amt=m.value && typeof ev.properties?.amount==='number' ? [' ',{muted:ev.properties.amount.toLocaleString()}] : [];
  const msg=typeof ev.properties?.message==='string' ? [' ',{muted:ev.properties.message.slice(0,60)+(ev.properties.message.length>60?'…':''), title:ev.properties.message}] : []; // 오류(js_error) 메시지
  return [[...name, ' · ', {b:m.label}, ...amt, ...msg, ...autoMark], ic]; }
function addFeed(parts, icon, sid, ts, sys){ ui.addFeed({ parts, icon, sid, at:ts, cls:sys }); }
// 연결 상태를 피드에 남긴다. down은 빨간 테두리(warn), connecting은 노란 테두리(note), live·demo는 회색 시스템 줄
function sysFeed(text, level){ const hint = /설치 대기/.test(text) ? [' · ', {muted:L("하단 \"설치 코드\"에서 코드를 복사해 사이트에 넣어 주세요.")}] : /로그인/.test(text) ? [] : /끊겨/.test(text) ? [' · ', {muted:L("서버가 꺼졌거나 네트워크가 불안정해요. 자동으로 다시 붙어요.")}] : [];
  addFeed([text, ...hint], level==='down'?'cross':level==='connecting'?'bell':level==='live'?'bolt':'house', '', Date.now(), level==='down'?'sys warn':level==='connecting'?'sys note':'sys'); }
// 피드 줄·캔버스 클릭은 store.select 하나로 모인다(migration.md 2절). 정보 패널(React)·피드 강조·따라가기는 selectedId만 본다
function focusChar(sid){ const ch=world.chars.get(sid); view.select(sid); if (!ch) return; ch.flash=2; setFollow(true); }

// 피드 줄·효과음·알림: 보는 스토어(view)의 변화에서 만든다. bindView가 스토어를 바꿀 때 다시 건다
function watchFeed(s){ return s.on(c => {
  if (c.type==='event'){ const line=feedLine(c.event,c.session,c.moved); if (line) addFeed(line[0],line[1],c.event.session_id,Date.parse(c.event.timestamp)||Date.now());
    const t=c.event.event_type; if (!SYS_EV.has(t) && !c.session?.bot){ const m=evMeta(t); if (m.notify){ const code='#'+(c.session?c.session.code:sessionCode(c.event.session_id)), amt=typeof c.event.properties?.amount==='number'?` (${c.event.properties.amount.toLocaleString()})`:''; notify(`${m.label}${amt}`, L("방문자 {0} · {1}", {0:code, 1:live.site?.domain||live.site?.name||L("데모")}), 'ev_'+t); } if (m.sound!=='none') sfx(m.sound); } }
  else if (c.type==='note'){ const pr=c.event.properties||{}; addFeed([{b:L("메모")}, ' · ', pr.text||'', ...(pr.by?[' ',{muted:pr.by}]:[])],'tag','',Date.parse(c.event.timestamp)||Date.now(),'sys note'); }
  else if (c.type==='leave' && c.reason==='timeout'){ addFeed([...who(c.session)[0], L("의 연결이 끊겼어요. (하트비트 만료)")],'timeout',c.session.id,Date.now(),true); }
  else if (c.type==='duplicate'){ const d=$('dupInfo'); d.hidden=false; d.textContent=L("중복 {0}건 무시", {0:s.duplicates}); }
  if (c.type==='enter' && c.session.props?.rare && !c.session.bot){ notify(L("희귀 방문자가 왔어요"), `${rareLabel(c.session.props)} · ${live.site?.domain||live.site?.name||L("데모")}`, 'rare'); sfx('chime'); }
  if (c.type==='enter') sfx(c.session.bot?'bot':'enter'); else if (c.type==='leave' && !c.session?.bot) sfx('leave');
}); }

// 정보 패널(로드맵 53): React(packages/ui InfoPanel)가 view.selectedId를 보고 그린다(건물 경로 → 건물, 세션 id → 캐릭터, 캐릭터가 없으면 떠났어요). 캐릭터 상태(world.chars)·웹 바이탈(world.vitals)은 렌더 때 읽고, 스토어가 모르는 변화는 ui.refresh()로 알린다

// 캔버스 클릭/호버
function toLocal(e){ const r=cv.getBoundingClientRect(); return [ (e.clientX-r.left)/r.width*W, (e.clientY-r.top)/r.height*H ]; }
cv.addEventListener('mousemove', e => { const [x,y]=toLocal(e); cv.classList.toggle('hit', !!world.hit(x,y)); });
cv.addEventListener('click', e => { if (dragged) return; const [x,y]=toLocal(e); const h=world.hit(x,y); const id=h ? (h.kind==='char' ? h.id : h.b.path) : null; const again = h?.kind==='char' && view.selectedId===h.id;
  view.select(id); if (h?.kind==='char') setFollow(again ? !follow : true); else setFollow(false); });
// ---- 따라가기: 캐릭터를 누르면 기본으로 켜져 화면 가운데에 둔다(최소 2.5배 확대). 같은 캐릭터 다시 누름·버튼·드래그·미니맵·다른 것 선택·퇴장이면 꺼진다
let follow=false;
function setFollow(on){ follow=on; ui.set({ follow:on }); if (on && curS < baseScale()*2.5-0.01) zoomTo(baseScale()*2.5); }
function tickFollow(){ if (!follow) return; const ch=view.selectedId ? world.chars.get(view.selectedId) : null; if (!ch || ch.state==='rise' || ch.state==='despawn'){ setFollow(false); return; }
  const tx=ch.x*curS+town.offsetLeft-vp.clientWidth/2, ty=(ch.y-8)*curS+town.offsetTop-vp.clientHeight/2; vp.scrollLeft+=(tx-vp.scrollLeft)*.2; vp.scrollTop+=(ty-vp.scrollTop)*.2; }

// 컨트롤
const btnRun=$('btnRun');
btnRun.addEventListener('click', () => { sim.running=!sim.running; setBtn(btnRun, sim.running?L("정지"):L("시작"), sim.running?'pause':'play'); btnRun.setAttribute('aria-pressed', String(sim.running)); });
$('btnAdd').addEventListener('click', () => sim.addOne());
$('btnRemove').addEventListener('click', () => sim.removeOne());
$('btnEvent').addEventListener('click', () => sim.randomEvent());
$('btnClear').addEventListener('click', () => sim.clearAll());
$('btnMe').addEventListener('click', () => { const v=sim.spawnMe(); focusChar(v.id); });
const target=$('target'), targetOut=$('targetOut');
target.addEventListener('input', () => { sim.target=+target.value; targetOut.value=target.value; });
document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => { speed=+b.dataset.speed; document.querySelectorAll('[data-speed]').forEach(x=>x.setAttribute('aria-pressed', String(x===b))); }));
$('zoomIn').addEventListener('click', () => { zoomTo(Math.floor((zt?zt.s:curS)+1e-6)+1); });
$('zoomOut').addEventListener('click', () => { zoomTo(Math.ceil((zt?zt.s:curS)-1e-6)-1); });
$('chkBadge').addEventListener('change', e => world.showBadges=e.target.checked);
$('chkMarks').addEventListener('change', e => world.showMarks=e.target.checked);
$('chkLabel').addEventListener('change', e => { labelsEl.hidden=!e.target.checked; });
$('chkBots').addEventListener('change', e => { world.showBots=e.target.checked; sim.botsOn=e.target.checked; });
$('chkNight').addEventListener('change', e => { world.night=e.target.checked; });
// 화면 밝기: 자동(OS)·밝게·어둡게. 겉 레이아웃만 바뀌고 마을 그림은 테마·낮밤을 따른다. 값은 이 브라우저에만(vt_shell). shellApply는 p1.html
const shellMark=v=>document.querySelectorAll('[data-shellpick]').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.shellpick===(v||''))));
function setShell(v){ lsSet('vt_shell', v||null); shellApply(); shellMark(v); }
document.querySelectorAll('[data-shellpick]').forEach(b=>b.addEventListener('click', ()=>setShell(b.dataset.shellpick))); shellMark(shellPref());
// 화면 언어(로드맵 60): 서버가 vt_lang 쿠키(없으면 Accept-Language)로 마크업까지 번역해 보내므로 바꾸면 쿠키를 쓰고 새로고침한다
document.querySelectorAll('[data-langpick]').forEach(b=>{ b.setAttribute('aria-pressed', String(b.dataset.langpick===getLocale())); b.addEventListener('click', ()=>{ if (b.dataset.langpick===getLocale()) return; document.cookie=`vt_lang=${b.dataset.langpick}; path=/; max-age=31536000; samesite=lax`; location.reload(); }); });
// 밝기가 바뀌면 화면 아이콘을 다시 만들고, 이미 그려진 <img>·드롭다운 항목의 주소도 새 것으로 바꾼다
document.addEventListener('vt-shell', ()=>{ const old=A.iconUrl; syncShell(); buildIconUrls(); const to=new Map(Object.keys(old).map(k=>[old[k],A.iconUrl[k]]));
  document.querySelectorAll('img').forEach(i=>{ const n=to.get(i.getAttribute('src')); if (n) i.src=n; });
  document.querySelectorAll('[data-img]').forEach(o=>{ const n=to.get(o.dataset.img); if (n) o.dataset.img=n; }); refreshThemeUI(); });
$('chkHeat').addEventListener('change', e => { world.showHeat=e.target.checked; lsSet('vt_heat', e.target.checked||null); }); if (lsGet('vt_heat')){ $('chkHeat').checked=true; world.showHeat=true; }
// ---- 날씨(로드맵 35): 종류(clear·sunny·rain)는 서버가 정하고(store.weather, 스냅샷·SSE 'weather') 대시보드는 그리기만 한다. 데모는 접속자 수와 '비 내리기' 버튼으로 흉내
const WX={ kind:'clear', acc:0 }, WX_TEXT={ clear:'', sunny:L("· 쨍쨍"), rain:L("· 비") };
function setWeather(kind, info, initial){ if (!(kind in WX_TEXT)) kind='clear'; const prev=WX.kind; WX.kind=kind; world.weather=kind; ui.set({ weather:WX_TEXT[kind], weatherTitle:kind==='rain'?L("최근 10분 JS 오류 {0}건 · 비가 와요", {0:info?.errors??L("여러")}):kind==='sunny'?L("접속자가 몰려 쨍쨍해요"):'' });
  if (initial || prev===kind) return;
  if (kind==='rain') addFeed(L("비가 내려요 · 최근 10분 JS 오류 {0}건. 불이 난 건물을 확인해 보세요.", {0:String(info?.errors??'')}),'cross','',Date.now(),'sys warn'); else if (kind==='sunny') addFeed(L("쨍쨍해요 · 접속자가 몰리고 있어요."),'spark','',Date.now(),'sys note'); else addFeed(prev==='rain'?L("비가 그쳤어요."):L("날이 평소대로 돌아왔어요."),'house','',Date.now(),'sys'); }
$('chkWeather').addEventListener('change', e => { world.showWeather=e.target.checked; lsSet('vt_weather', e.target.checked?null:'0'); }); if (lsGet('vt_weather')==='0'){ $('chkWeather').checked=false; world.showWeather=false; }
$('chkSeason').addEventListener('change', e => { world.showSeason=e.target.checked; lsSet('vt_season', e.target.checked?null:'0'); }); if (lsGet('vt_season')==='0'){ $('chkSeason').checked=false; world.showSeason=false; }
// 계절 이벤트(로드맵 38): 1분마다 오늘 날짜로 ENGINE.SEASON을 정한다. ?season=halloween|xmas|seol(임베드 포함)이나 데모 메뉴 "계절"로 강제
let SEASON_FORCE=/^(halloween|xmas|seol)$/.test(CONN.season)?CONN.season:'', seasonAcc=60;
function setSeason(k){ if (k===ENGINE.SEASON) return; const prev=ENGINE.SEASON; setSeasonValue(k); placeDecor(); world.flakes.length=0; world.seasonAcc=12;
  const s=SEASONS[k]; if (s) addFeed(`${s.name} · ${s.feed}`, 'gift', '', Date.now(), 'sys note'); else if (prev) addFeed(L("{0} 장식을 치웠어요.", {0:SEASONS[prev].name}), 'gift', '', Date.now(), 'sys'); }
function tickSeason(dt){ seasonAcc+=dt; if (seasonAcc<60) return; seasonAcc=0; setSeason(SEASON_FORCE||seasonOf()); }
$('seasonSel').addEventListener('change', e => { SEASON_FORCE=e.target.value; seasonAcc=60; tickSeason(0); }); if (SEASON_FORCE){ $('seasonSel').value=SEASON_FORCE; $('seasonSel').dispatchEvent(new Event('pxs-refresh')); }
$('btnRain').addEventListener('click', ()=>{ sim.rain=!sim.rain; $('btnRain').setAttribute('aria-pressed', String(sim.rain)); setBtn($('btnRain'), sim.rain?L("비 그치기"):L("비 내리기")); });
function tickDemoWeather(dt){ if (LIVE || replay.active) return; WX.acc+=dt; if (WX.acc<1) return; WX.acc=0; const kind=sim.rain?'rain':store.online>=8?'sunny':'clear'; if (kind!==WX.kind) setWeather(kind, { errors: sim.rain?3:0 }); }
const cp=$('connPanel'); $('cpApi').value=CONN.api||'http://localhost:8787'; $('cpSite').value=CONN.site||''; $('cpToken').value=(lsGet('vt_conn')||{}).token||'';
$('btnConn').addEventListener('click', () => { cp.hidden?showEl(cp):hideEl(cp); });
$('cpClose').addEventListener('click', () => { hideEl(cp); });
$('cpConnect').addEventListener('click', () => { const api=$('cpApi').value.trim().replace(/\/$/,''), site=$('cpSite').value.trim(), token=$('cpToken').value.trim(); if(!api) return; try { localStorage.setItem('vt_conn', JSON.stringify({api,site,token})); } catch {} location.search=`?api=${encodeURIComponent(api)}${site?'&site='+encodeURIComponent(site):''}${token?'&token='+encodeURIComponent(token):''}`; });
$('cpDemo').addEventListener('click', () => { location.href='/demo'; });
$('cpSites').addEventListener('click', () => { hideEl(cp); if (LIVE && live.sites) live.showSites(); else if (LIVE) live.connect(); });
$('cpLogout').addEventListener('click', () => live.logout());
function setRec(on){ $('app').classList.toggle('rec', on); $('recExit').hidden=!on; fit(); if (on) stage.focus(); else stopTv(); }
// ---- 사무실 TV 모드(로드맵 32): 녹화 모드 위에 큰 글씨 상자(#tvBar)를 띄우고 고른 사이트를 N초마다 돌아가며 보여 준다. ?tv=초&sites=a,b 로 열면 연결되자마자 시작, ← →로 넘기고 Esc로 끝
const TV={ on:false, every:60, list:[], i:0, timer:null };
function tvSites(ids){ const ok=s=>!!s.lastEventAt; return ids&&ids.length ? ids.map(id=>live.sites.find(s=>s.id===id)).filter(s=>s&&ok(s)) : live.sites.filter(ok); }
function startTv(every, ids){ const list=tvSites(ids); if (!list.length){ note(L("보여 줄 사이트가 없어요. 이벤트가 한 번이라도 들어온 사이트만 돌아가요.")); return; } hideEl($('sitePanel'));
  TV.on=true; TV.every=Math.max(10, (every|0)||60); TV.list=list; $('app').classList.add('tv'); setRec(true); tvShow(Math.max(0, list.findIndex(s=>s.id===CONN.site))); }
function stopTv(){ if (!TV.on) return; TV.on=false; clearTimeout(TV.timer); $('app').classList.remove('tv'); }
function tvShow(i){ const n=TV.list.length; TV.i=((i%n)+n)%n; const s=TV.list[TV.i]; if (s.id!==CONN.site || !live.streamOn) live.choose(s); // choose가 SSE를 그 사이트로 다시 연다
  $('tvName').textContent=s.name; $('tvSub').textContent=s.domain; $('tvN').textContent=store.online; $('tvNext').textContent=n>1?L("다음: {0} · {1}초마다", {0:TV.list[(TV.i+1)%n].name, 1:TV.every}):'';
  const p=$('tvProg'); p.style.transition='none'; p.style.transform='scaleX(0)'; void p.offsetWidth; if (n>1){ p.style.transition=`transform ${TV.every}s linear`; p.style.transform='scaleX(1)'; }
  clearTimeout(TV.timer); if (n>1) TV.timer=setTimeout(()=>tvShow(TV.i+1), TV.every*1000); }
function showTv(){ if (!LIVE || !live.sites) return; const picked=new Set(TV.list.map(s=>s.id));
  panel(L("<h2>TV MODE</h2><p>사무실 TV나 큰 모니터용이에요. UI 없이 마을만 크게 띄우고 사이트 이름·접속자를 큰 글씨로 보여 주며, 고른 사이트를 돌아가며 비춰요. <kbd>←</kbd> <kbd>→</kbd>로 넘기고 <kbd>Esc</kbd>로 끝나요.</p>\n    <div class=\"row\"><label class=\"toggle\">간격 <select id=\"tvEvery\">{0}</select></label></div>\n    <div class=\"list\">{1}</div>\n    <p class=\"muted\">TV 브라우저에서 한 번 로그인해 두면 아래 링크로 바로 시작돼요.</p><pre id=\"tvUrl\"></pre>\n    <div class=\"row\"><button class=\"btn primary\" id=\"tvStart\">시작</button><button class=\"btn\" id=\"tvCopy\">링크 복사</button><button class=\"btn\" id=\"tvClose\">닫기</button><span class=\"muted\" id=\"tvMsg\"></span></div>", {0:[[30,L("30초")],[60,L("1분")],[120,L("2분")],[300,L("5분")]].map(([v,l])=>`<option value="${v}"${v===TV.every?' selected':''}>${l}</option>`).join(''), 1:live.sites.map(s=>`<label class="toggle"><input type="checkbox" data-tv="${s.id}"${(picked.size?picked.has(s.id):!!s.lastEventAt)?' checked':''}${s.lastEventAt?'':' disabled'}>${esc(s.name)} <span class="muted">${esc(s.domain)}${s.lastEventAt?'':L(" · 아직 이벤트 없음")}</span></label>`).join('')}));
  const root=$('sitePanel').firstElementChild, ids=()=>[...root.querySelectorAll('[data-tv]:checked')].map(c=>c.dataset.tv);
  const url=()=>{ const u=new URL(location.href); u.hash=''; u.search=''; u.searchParams.set('api',CONN.api); u.searchParams.set('tv',$('tvEvery').value); const s=ids(); if (s.length) u.searchParams.set('sites', s.join(',')); return u.href; };
  const upd=()=>{ $('tvUrl').textContent=url(); }; upd(); root.addEventListener('change', upd);
  $('tvStart').onclick=()=>startTv(+$('tvEvery').value, ids()); $('tvCopy').onclick=async()=>{ try { await navigator.clipboard.writeText(url()); say($('tvMsg'),L("복사했어요")); } catch { say($('tvMsg'),L("복사하지 못했어요"),true); } }; $('tvClose').onclick=()=>hideEl($('sitePanel')); }
$('btnTv').addEventListener('click', showTv);
// ---- 공개 마을 구경(로드맵 23): 주인이 공개를 켠 사이트 목록(GET /api/public/sites). 구경은 임베드 링크(마을만, 브랜드 링크 포함)를 새 탭으로
async function showTour(){ if (!LIVE) return; panel(L("<h2>TOUR</h2><p class=\"muted\">다른 사람이 공개한 마을이에요. 내 마을도 올리려면 임베드 링크 화면의 \"공개 마을 구경\"을 켜 주세요.</p><div id=\"tourBody\"><p class=\"st-sub\">불러오는 중…</p></div><div class=\"row\"><button class=\"btn\" id=\"tourClose\">닫기</button></div>"));
  $('tourClose').onclick=()=>hideEl($('sitePanel'));
  try { const j=await (await fetch(`${CONN.api}/api/public/sites`)).json(); const list=(j.sites||[]).filter(s=>s.id!==CONN.site); const body=$('tourBody'); if (!body) return;
    if (!list.length){ body.innerHTML=L("<p class=\"st-sub\">아직 공개된 마을이 없어요.</p>"); return; }
    body.innerHTML=`<div class="list">${list.map(s=>{ const u=new URL(`/town/${encodeURIComponent(s.id)}`, location.origin); u.searchParams.set('api',CONN.api);
      return L("<div class=\"mb-row\"><span>{0} <span class=\"muted\">{1}</span></span><span class=\"tags\"><span class=\"tag\">접속자 {2}</span>{3}<a class=\"btn mini\" href=\"{4}\" target=\"_blank\" rel=\"noopener\">구경하기</a></span></div>", {0:esc(s.name), 1:esc(s.domain), 2:s.online, 3:s.lastEventAt&&Date.now()-s.lastEventAt>QUIET_MS?L("<span class=\"tag\" title=\"마지막 이벤트 {0} 전\">조용함</span>", {0:elapsed(Date.now()-s.lastEventAt)}):'', 4:esc(u.href)}); }).join('')}</div>`; }
  catch(e){ const body=$('tourBody'); if (body) body.innerHTML=`<p class="err">${esc(errText(e,L("목록을 가져오지 못했어요")))}</p>`; } }
$('btnTour').addEventListener('click', showTour);
// ---- 계정 삭제: 소유 사이트·방문자 데이터·멤버 자격·로그인 계정을 서버가 지운다(DELETE /api/account). 두 번 묻는다
$('btnDelAcct').addEventListener('click', async()=>{ if (!LIVE) return; const mine=(live.sites||[]).filter(s=>s.role==='owner'&&!s.local);
  if (!await ask(L("계정을 삭제하면 내가 소유한 사이트 {0}개와 그 방문자 데이터·집계·멤버 초대가 모두 지워지고, 다른 사이트의 멤버 자격도 사라져요. 되돌릴 수 없어요. 계속할까요?", {0:mine.length}), { ok:L("계속"), danger:true })) return;
  if (!await ask(L("정말 삭제할까요? {0} 계정으로는 다시 로그인할 수 없어요.", {0:esc(live.user?.email||'')}), { ok:L("계정 삭제"), danger:true })) return;
  try { await live.api('/api/account', { method:'DELETE' }); lsSet('vt_auth', null); lsSet('vt_conn', { api:CONN.api }); lsSet('vt_login_error', null); await note(L("계정과 데이터를 모두 지웠어요. 이용해 주셔서 고마워요.")); location.search=`?api=${encodeURIComponent(CONN.api)}`; }
  catch(e){ note(errText(e,L("계정을 지우지 못했어요"))); } });
// ---- 배경음(src/sfx.js bgm): 보기 메뉴에서 끔·BGM·환경음을 고르면 낮·밤(마을 시간)과 비 날씨를 따라 트랙을 바꾼다. 임베드는 무음. 첫 사용자 동작 전엔 브라우저가 막으니 그때 다시 켠다
const BGM={ mode:'', vol:.6, acc:0, want:null };
function bgmTrack(){ if (!BGM.mode) return null; const night=world.dark>.5; if (BGM.mode==='ambient') return WX.kind==='rain'&&world.showWeather ? 'amb-rain' : night ? 'amb-night' : 'amb-day'; return night ? 'night' : 'day'; }
function bgmTick(dt){ BGM.acc+=dt; if (BGM.acc<1) return; BGM.acc=0; const t=bgmTrack(); if (!t){ if (bgm.current) bgm.stop(); return; } if (bgm.current!==t){ BGM.want=t; if (!bgm.start(t)) return; BGM.want=null; } }
function setBgm(mode, save){ BGM.mode=mode||''; $('bgmVolBox').hidden=!BGM.mode; if (save) lsSet('vt_bgm', BGM.mode?{ mode:BGM.mode, vol:BGM.vol }:null); BGM.acc=1; bgmTick(0); }
{ const saved=lsGet('vt_bgm'); if (saved){ BGM.vol=Math.max(0,Math.min(1,+saved.vol||.6)); bgm.volume=BGM.vol; $('bgmVol').value=Math.round(BGM.vol*100); $('bgmVolOut').value=Math.round(BGM.vol*100); $('bgmSel').value=saved.mode||''; setBgm(saved.mode, false); } else bgm.volume=BGM.vol;
  $('bgmSel').addEventListener('change', e=>setBgm(e.target.value, true));
  $('bgmVol').addEventListener('input', e=>{ BGM.vol=(+e.target.value)/100; bgm.volume=BGM.vol; $('bgmVolOut').value=e.target.value; lsSet('vt_bgm', BGM.mode?{ mode:BGM.mode, vol:BGM.vol }:null); });
  document.addEventListener('pointerdown', ()=>{ if (BGM.want){ BGM.acc=1; bgmTick(0); } }, true); document.addEventListener('keydown', ()=>{ if (BGM.want){ BGM.acc=1; bgmTick(0); } }, true); }
$('btnRec').addEventListener('click', () => setRec(true));
$('recExit').addEventListener('click', () => setRec(false));
// 전체화면: Fullscreen API. 지원 안 하는 브라우저(iOS Safari)는 버튼을 숨긴다. 녹화 모드와 같이 써도 된다
const fsOK=!!(document.documentElement.requestFullscreen); $('btnFull').hidden=!fsOK;
function toggleFull(){ if (!fsOK) return; if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen({ navigationUI:'hide' }).catch(()=>{}); }
$('btnFull').addEventListener('click', toggleFull);
document.addEventListener('fullscreenchange', ()=>{ const on=!!document.fullscreenElement; setBtn($('btnFull'), on?L("전체화면 종료"):L("전체화면")); $('btnFull').setAttribute('aria-pressed', String(on)); fit(); });
// ---- 단축키. 입력칸 포커스·수정키 조합·임베드·드롭다운이 이미 처리한 키(defaultPrevented)는 무시. ? 로 표를 연다
const KEYS=[['F',L("전체화면")],['R',L("타임랩스 리플레이 켜기 / 끄기")],['+  -',L("확대 / 축소")],['0',L("맞춤 배율 (마을을 더블클릭해도 돼요)")],['1 ~ 9  T',L("테마 고르기 · 다음 테마 (잠긴 테마는 여는 조건을 보여 줘요)")],['P',L("마을 사진 저장")],['H',L("발자국 켜기 / 끄기")],['D',L("화면 밝게 / 어둡게")],['B',L("도감")],['Tab',L("마을에 포커스 (아래 화살표 키의 전제)")],['← →',L("이전 · 다음 방문자 고르기 (TV 모드에서는 이전 · 다음 사이트)")],['↑ ↓',L("이전 · 다음 건물 고르기")],['Enter',L("고른 캐릭터 따라가기 켜기 / 끄기")],['Esc',L("선택 해제 · 녹화 모드·TV 모드·패널 닫기")],['?',L("이 표")]];
// ---- 통계 모달: 지금(메모리의 세션) / 오늘(00:00부터의 이벤트를 받아 브라우저에서 집계)
const ST={ tab:'now', timer:null, today:null };
function stBars(counts, label){ // '?'(알 수 없음)는 맨 아래로 내리고 흐리게. 막대 비율은 아는 값 기준
  const rows=Object.entries(counts).filter(([,n])=>n>0).sort((a,b)=>(a[0]==='?')-(b[0]==='?') || b[1]-a[1]).slice(0,8); const max=Math.max(1,...rows.filter(r=>r[0]!=='?').map(r=>r[1])); if (!rows.length) return L("<p class=\"st-sub\">아직 없어요</p>");
  return `<div class="bars">${rows.map(([k,n])=>`<span class="${k==='?'?'unk':''}">${esc(label?label(k):k)}</span><div class="bar ${k==='?'?'unk':''}"><span style="width:${Math.min(100,Math.round(n/max*100))}%"></span></div><span class="n ${k==='?'?'unk':''}">${n}</span>`).join('')}</div>`; }
function stCountry(cc){ return cc==='?'?L("알 수 없음"):`${flagEmoji(cc)} ${countryName(cc)}`; }
function stBuildingName(path){ return BY_PATH.get(path)?.name || path; }
function stPct(a,b){ return b?Math.round(a/b*100)+'%':'-'; }
// ---- 리텐션(로드맵 49): site_daily.cohorts(그날 세션을 첫 방문 날짜별로 센 것)로 코호트 D1·D7. 방문자 ID가 없어 세션 단위 근사치이고, 첫 방문 주(월요일 시작)로 묶어 보여 준다
async function stLoadRetention(){ if (!LIVE) return stCohorts(stDemoCohorts()); const j=await live.api(`/api/sites/${encodeURIComponent(CONN.site)}/daily?days=70`); return stCohorts(j.site||[]); }
function stAddDays(d,n){ const t=new Date(d+'T00:00:00Z'); t.setUTCDate(t.getUTCDate()+n); return t.toISOString().slice(0,10); }
function stCohorts(rows){ const by=new Map(rows.map(r=>[String(r.day).slice(0,10), r.cohorts||{}])); const days=[...by.keys()].sort(); if (!days.length) return { weeks:[], days:0 };
  const last=days[days.length-1], at=(d,c)=>+(by.get(d)?.[c]||0), weeks=new Map();
  for (const c of days){ const n=at(c,c); if (!n) continue; const wk=stAddDays(c, -((new Date(c+'T00:00:00Z').getUTCDay()+6)%7));
    const w=weeks.get(wk)||{ week:wk, n:0, d1:0, d1n:0, d7:0, d7n:0 }; w.n+=n; if (stAddDays(c,1)<=last){ w.d1n+=n; w.d1+=at(stAddDays(c,1),c); } if (stAddDays(c,7)<=last){ w.d7n+=n; w.d7+=at(stAddDays(c,7),c); } weeks.set(wk,w); }
  return { weeks:[...weeks.values()].sort((a,b)=>b.week.localeCompare(a.week)).slice(0,8), days:days.length, last }; }
function stDemoCohorts(){ const rows=[], n=i=>18+((i*7)%11); for (let i=56;i>=0;i--){ const d=stAddDays(new Date().toISOString().slice(0,10), -i), c={}; c[d]=n(i); if (i<56) c[stAddDays(d,-1)]=Math.round(n(i+1)*0.32); if (i<=49) c[stAddDays(d,-7)]=Math.round(n(i+7)*0.14); rows.push({ day:d, cohorts:c }); } return rows; }
function stRetentionHtml(r){ if (!r.weeks.length) return `<p class="st-sub">${LIVE?L("아직 코호트가 없어요. 일별 집계(site_daily)에 첫 방문 날짜가 쌓이기 시작한 뒤(SDK 2026-11-04 이후분)부터 보여요. DB 없는 로컬 서버는 비어 있어요."):L("데이터가 없어요.")}</p>`;
  const bar=(a,b)=>b?`<span class="rt-bar"><i style="width:${Math.round(a/b*100)}%"></i></span>${stPct(a,b)}`:'<span class="muted">–</span>';
  const t=r.weeks.reduce((m,w)=>{ m.n+=w.n; m.d1+=w.d1; m.d1n+=w.d1n; m.d7+=w.d7; m.d7n+=w.d7n; return m; },{ n:0, d1:0, d1n:0, d7:0, d7n:0 });
  return L("<p class=\"st-sub\">첫 방문 주(월요일 시작)별 세션 코호트 · 최근 {0}주 · D1 = 다음 날 다시 온 비율, D7 = 7일 뒤. 방문자 ID 없이 첫 방문 날짜만 세므로 세션 단위 근사치예요.</p>\n    <div class=\"st-tiles\"><div class=\"st-tile\">신규 세션<b>{1}</b></div><div class=\"st-tile\">D1 평균<b>{2}</b></div><div class=\"st-tile\">D7 평균<b>{3}</b></div></div>\n    <div class=\"st-block\"><h3>COHORT</h3><table class=\"rt\"><thead><tr><th>첫 방문 주</th><th>신규</th><th>D1</th><th>D7</th></tr></thead><tbody>{4}</tbody></table></div>", {0:r.weeks.length, 1:t.n.toLocaleString(), 2:stPct(t.d1,t.d1n), 3:stPct(t.d7,t.d7n), 4:r.weeks.map(w=>`<tr><td>${w.week.slice(5).replace('-','/')}~</td><td>${w.n}</td><td>${bar(w.d1,w.d1n)}</td><td>${bar(w.d7,w.d7n)}</td></tr>`).join('')}); }
// 지금 탭: 뼈대는 한 번 그리고, 5초마다 숫자·막대만 갈아 끼우고 목록은 줄 단위로 비교해 들어오고(in)·나가고(out)·바뀐(hit) 줄만 움직인다
function stNowShell(){ return L("<div class=\"st-tiles\"><div class=\"st-tile\">접속자<b data-k=\"n\">0</b></div><div class=\"st-tile\">재방문<b data-k=\"ret\">-</b></div><div class=\"st-tile\">평균 체류<b data-k=\"dwell\">-</b></div><div class=\"st-tile\">봇<b data-k=\"bots\">0</b></div></div>\n    <div class=\"st-cols\"><div class=\"st-block\"><h3>BUILDING</h3><div data-b=\"page\"></div></div><div class=\"st-block\"><h3>DEVICE</h3><div data-b=\"device\"></div></div><div class=\"st-block\"><h3>REFERRER</h3><div data-b=\"referrer\"></div></div><div class=\"st-block\"><h3>COUNTRY <span class=\"st-sub\">(추정)</span></h3><div data-b=\"country\"></div></div><div class=\"st-block\" data-blk=\"campaign\" hidden><h3>CAMPAIGN <span class=\"st-sub\">(UTM)</span></h3><div data-b=\"campaign\"></div></div></div>\n    <div class=\"st-block\"><h3>NOW <span data-k=\"n2\">0</span></h3><div class=\"st-list\" id=\"stNowList\"><p class=\"st-sub\" id=\"stNowEmpty\">지금은 아무도 없어요</p></div></div>"); }
// 통계 모달 "지금" 줄의 속성 태그(HTML 문자열). 정보 패널의 React PropTags(packages/ui/src/Info.tsx)와 같은 내용이고, 이 모달은 아직 innerHTML로 그려서 따로 둔다
function propTags(s){ if (!s) return ''; if (s.bot){ const b=BOTS.find(x=>x.name===s.bot); return L("<div class=\"tags\"><span class=\"tag bot\">봇 추정 · {0}</span><span class=\"tag\">접속자 수 제외</span></div>", {0:esc(b?b.ua:s.bot)}); }
  const p=s.props||{}, utm=[p.utm_source&&'source='+p.utm_source, p.utm_medium&&'medium='+p.utm_medium, p.utm_campaign&&'campaign='+p.utm_campaign].filter(Boolean).join(' · ');
  return `<div class="tags">${p.me?L("<span class=\"tag me\">나</span>"):''}${p.rare?`<span class="tag rare" title="${esc(RARE_BY_KEY[p.rare]?.text||'')}">✦ ${esc(rareLabel(p))}</span>`:''}<span class="tag">${esc(PROP_LABEL.device[p.device]||p.device||'?')}</span><span class="tag">${p.returning?L("재방문"):L("신규")}</span><span class="tag">${esc(PROP_LABEL.referrer[p.referrer]||p.referrer||'?')}</span>${p.country?`<span class="tag" title="${esc(p.country)}">${flagEmoji(p.country)} ${esc(countryName(p.country))}</span>`:''}${p.plan==='pro'?L("<span class=\"tag pro\">유료 회원</span>"):''}${p.campaign?`<span class="tag camp" title="${esc(utm)}"><i style="background:${esc(campaignColor(p.campaign))}"></i>${esc(p.campaign)}</span>`:''}</div>`; }
function stRowMain(s, now){ return L("{0} <span class=\"t\">· {1} · 페이지 {2}</span>{3}", {0:esc(stBuildingName(s.page)), 1:elapsed(now-s.startedAt), 2:1+s.events.filter(e=>e.type==='page_view').length, 3:propTags(s)}); }
function stNowUpdate(body){ const all=[...store.sessions.values()], hs=all.filter(s=>!s.bot), bots=all.length-hs.length, now=Date.now();
  const by=k=>hs.reduce((m,s)=>{ const v=k(s)||'?'; m[v]=(m[v]||0)+1; return m; },{});
  const dwell=hs.length?hs.reduce((a,s)=>a+(now-s.startedAt),0)/hs.length:0, ret=hs.filter(s=>s.props.returning).length;
  const set=(k,v)=>{ const el=body.querySelector(`[data-k="${k}"]`); if (el && el.textContent!==String(v)){ el.textContent=v; if (k==='n'||k==='bots') pop(el,'bump'); } };
  set('n',hs.length); set('n2',hs.length); set('ret',stPct(ret,hs.length)); set('dwell',hs.length?elapsed(dwell):'-'); set('bots',bots);
  const blocks={ page:[by(s=>s.page), stBuildingName], device:[by(s=>s.props.device), k=>PROP_LABEL.device[k]||k], referrer:[by(s=>s.props.referrer), k=>PROP_LABEL.referrer[k]||k], country:[by(s=>s.props.country), stCountry] };
  for (const [k,[c,l]] of Object.entries(blocks)){ const el=body.querySelector(`[data-b="${k}"]`); const h=stBars(c,l); if (el.innerHTML!==h) el.innerHTML=h; }
  { const camp=hs.filter(s=>s.props.campaign); const blk=body.querySelector('[data-blk="campaign"]'); if (blk){ blk.hidden=!camp.length; if (camp.length){ const c=camp.reduce((m,s)=>{ m[s.props.campaign]=(m[s.props.campaign]||0)+1; return m; },{}); const el=blk.querySelector('[data-b="campaign"]'); const h=stBars(c, k=>k); if (el.innerHTML!==h) el.innerHTML=h; } } }
  const list=$('stNowList'); if (!list) return; const seen=new Set(); hs.sort((a,b)=>b.startedAt-a.startedAt);
  let prev=null; // 새 줄은 시작 시각 순서대로 끼워 넣는다 (최근 입장이 위)
  for (const s of hs){ seen.add(s.id); let row=list.querySelector(`.st-row[data-sid="${CSS.escape(s.id)}"]`); const main=stRowMain(s, now);
    if (!row){ row=document.createElement('button'); row.className='st-row in'; row.dataset.sid=s.id; row.dataset.page=s.page; row.dataset.ev=s.events.length; const ch=world.chars.get(s.id); row.innerHTML=L("<span class=\"av\">{0}<span class=\"code\">#{1}</span></span><span class=\"main\">{2}</span><span class=\"t\">{3} 입장</span>", {0:ch?`<img src="${world.charImage(ch)}" alt="">`:`<img src="${A.iconUrl.person}" alt="">`, 1:s.code, 2:main, 3:hhmmss(s.startedAt)}); row.onclick=()=>{ hideEl($('sitePanel')); clearInterval(ST.timer); focusChar(s.id); }; row.addEventListener('animationend', ()=>row.classList.remove('in','hit'));
      if (prev) prev.after(row); else list.prepend(row); }
    else { if (row.classList.contains('out')) row.classList.remove('out'); const ch=world.chars.get(s.id), im=row.querySelector('.av img'); if (ch && im.dataset.ch!=='1'){ im.src=world.charImage(ch); im.dataset.ch='1'; } const m=row.querySelector('.main'); if (m.innerHTML!==main) m.innerHTML=main; const moved=row.dataset.page!==s.page, acted=+row.dataset.ev!==s.events.length; row.dataset.page=s.page; row.dataset.ev=s.events.length; if (moved||acted){ row.classList.remove('hit'); void row.offsetWidth; row.classList.add('hit'); } }
    prev=row; }
  list.querySelectorAll('.st-row').forEach(row=>{ if (seen.has(row.dataset.sid) || row.classList.contains('out')) return; row.classList.add('out'); row.addEventListener('animationend', ()=>row.remove(), {once:true}); setTimeout(()=>row.remove(), 400); });
  $('stNowEmpty').hidden=hs.length>0; }
function stAggregate(events, from, to){ const S=new Map(); for (const ev of events){ if (ev.event_type==='note') continue; const t=Date.parse(ev.timestamp)||0; const pr=ev.properties||{}; let s=S.get(ev.session_id); if (!s){ s={ start:t, end:t, views:0, props:null, bot:null, buys:0, amount:0, pages:{}, evs:{} }; S.set(ev.session_id,s); }
    s.start=Math.min(s.start,t); s.end=Math.max(s.end,t); if (pr.bot) s.bot=pr.bot; if (ev.event_type==='session_start'){ s.props=pr; if (pr.bot) s.bot=pr.bot; } if (ev.event_type==='page_view'||ev.event_type==='session_start'){ s.views++; const b=store.resolvePath(ev.page_path); s.pages[b]=(s.pages[b]||0)+1; } if (!SYS_EV.has(ev.event_type)){ s.evs[ev.event_type]=(s.evs[ev.event_type]||0)+1; if (evMeta(ev.event_type).value){ s.buys++; s.amount+=+pr.amount||0; } } }
  const all=[...S.values()], hs=all.filter(s=>!s.bot); const by=k=>hs.reduce((m,s)=>{ const v=k(s)||'?'; m[v]=(m[v]||0)+1; return m; },{}); const pages={}, evs={}; for (const s of hs){ for (const [b,n] of Object.entries(s.pages)) pages[b]=(pages[b]||0)+n; for (const [t,n] of Object.entries(s.evs)) evs[t]=(evs[t]||0)+n; }
  const dw=hs.filter(s=>s.end>s.start); const hours=new Array(24).fill(0); for (const s of hs) hours[new Date(s.start).getHours()]++;
  return { sessions:hs.length, bots:all.length-hs.length, views:hs.reduce((a,s)=>a+s.views,0), dwell:dw.length?dw.reduce((a,s)=>a+(s.end-s.start),0)/dw.length:0, returning:hs.filter(s=>s.props&&s.props.returning).length, buys:hs.reduce((a,s)=>a+s.buys,0), amount:hs.reduce((a,s)=>a+s.amount,0),
    hours, pages, evs, device:by(s=>s.props&&s.props.device), referrer:by(s=>s.props&&s.props.referrer), country:by(s=>s.props&&s.props.country) }; }
async function stLoadToday(){ const to=Date.now(), from=new Date().setHours(0,0,0,0); let events, truncated=false;
  if (LIVE){ const j=await live.api(`/api/sites/${encodeURIComponent(CONN.site)}/events?from=${new Date(from).toISOString()}&to=${new Date(to).toISOString()}`); events=j.events; truncated=!!j.truncated; }
  else events=REC.map(r=>r.ev).filter(ev=>(Date.parse(ev.timestamp)||0)>=from);
  return { ...stAggregate(events, from, to), from, to, truncated, n:events.length }; }
function stTodayHtml(d){ const h=new Date().getHours(), max=Math.max(1,...d.hours);
  return L("<p class=\"st-sub\">오늘 00:00부터 지금까지 · 이벤트 {0}건{1}</p>\n    <div class=\"st-tiles\"><div class=\"st-tile\">방문<b>{2}</b></div><div class=\"st-tile\">페이지뷰<b>{3}</b></div><div class=\"st-tile\">평균 체류<b>{4}</b></div><div class=\"st-tile\">재방문<b>{5}</b></div><div class=\"st-tile\">봇<b>{6}</b></div>{7}</div>\n    <div class=\"st-block\"><h3>BY HOUR</h3><div class=\"hist\">{8}</div><div class=\"hist-x\"><span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span></div></div>\n    <div class=\"st-cols\"><div class=\"st-block\"><h3>BUILDING</h3>{9}</div>{10}<div class=\"st-block\"><h3>DEVICE</h3>{11}</div><div class=\"st-block\"><h3>REFERRER</h3>{12}</div><div class=\"st-block\"><h3>COUNTRY <span class=\"st-sub\">(추정)</span></h3>{13}</div></div>", {0:d.n, 1:d.truncated?L(" (앞부분만)"):'', 2:d.sessions, 3:d.views, 4:d.dwell?elapsed(d.dwell):'-', 5:stPct(d.returning,d.sessions), 6:d.bots, 7:d.buys?L("<div class=\"st-tile\" title=\"이벤트 설정에서 '매출'을 켠 이벤트의 amount 합계\">매출<b>{0}건{1}</b></div>", {0:d.buys, 1:d.amount?' · '+d.amount.toLocaleString():''}):'', 8:d.hours.map((n,i)=>L("<i class=\"{0}\" style=\"height:{1}%\" title=\"{2}시 {3}명\"></i>", {0:i===h?'now':'', 1:Math.max(2,Math.round(n/max*100)), 2:i, 3:n})).join(''), 9:stBars(d.pages, stBuildingName), 10:Object.keys(d.evs).length?`<div class="st-block"><h3>EVENTS</h3>${stBars(d.evs, evLabel)}</div>`:'', 11:stBars(d.device, k=>PROP_LABEL.device[k]||k), 12:stBars(d.referrer, k=>PROP_LABEL.referrer[k]||k), 13:stBars(d.country, stCountry)}); }
// 모달 탭 전환(통계·도감): 높이를 지금 값에 고정해 두고 내용을 바꾼 뒤 새 높이로 0.2초 동안 늘리거나 줄인다(불러오는 동안도 줄어들지 않음). 주기 갱신(지금 탭)은 높이를 건드리지 않는다
async function morphSwap(body, fill){ const h0=body.offsetHeight; body.style.height=h0+'px'; body.style.overflow='hidden'; body.classList.add('switching'); await fill(); body.style.height='auto'; const h1=body.offsetHeight; body.style.height=h0+'px'; void body.offsetHeight; // 자연 높이를 재고 다시 고정(줄어드는 경우 scrollHeight는 고정 높이를 돌려줘서 못 쓴다)
    if (Math.abs(h1-h0)>1){ body.style.transition='height var(--t-slow) ease-out'; body.style.height=h1+'px'; await new Promise(r=>setTimeout(r,260)); }
    body.style.height=''; body.style.overflow=''; body.style.transition=''; body.classList.remove('switching'); }
function showStats(tab){ ST.tab=tab||ST.tab; clearInterval(ST.timer);
  panel(L("<h2>STATS <span class=\"muted\">{0}</span></h2><div class=\"tabs\"><button class=\"btn tab\" data-st=\"now\" aria-pressed=\"{1}\">지금</button><button class=\"btn tab\" data-st=\"today\" aria-pressed=\"{2}\">오늘</button><button class=\"btn tab\" data-st=\"funnel\" aria-pressed=\"{3}\">퍼널</button><button class=\"btn tab\" data-st=\"retention\" aria-pressed=\"{4}\">리텐션</button></div><div id=\"stBody\"></div><div class=\"row\"><button class=\"btn\" id=\"stClose\">닫기</button></div>", {0:esc(LIVE?(live.site?.domain||live.site?.name||''):L("데모")), 1:ST.tab==='now', 2:ST.tab==='today', 3:ST.tab==='funnel', 4:ST.tab==='retention'}), true);
  const body=$('stBody');
  const draw=async(switching)=>{ const fill=async()=>{ if (ST.tab==='now'){ if (!$('stNowList')) body.innerHTML=stNowShell(); stNowUpdate(body); }
      else if (ST.tab==='funnel'){ body.innerHTML=stFunnelHtml(); await stFunnelBind(body); }
      else if (ST.tab==='retention'){ if (!ST.ret || Date.now()-ST.ret.at>60000){ body.innerHTML=L("<p class=\"st-sub\">불러오는 중…</p>"); try { ST.ret={ at:Date.now(), data:await stLoadRetention() }; } catch(e){ body.innerHTML=`<p class="err">${esc(errText(e,L("집계를 읽지 못했어요")))}</p>`; return; } } body.innerHTML=stRetentionHtml(ST.ret.data); }
      else { if (!ST.today || Date.now()-ST.today.to>60000){ body.innerHTML=L("<p class=\"st-sub\">불러오는 중…</p>"); try { ST.today=await stLoadToday(); } catch(e){ body.innerHTML=`<p class="err">${esc(e.message)}</p>`; return; } } body.innerHTML=stTodayHtml(ST.today); }
      if (switching) pop(body,'fade'); };
    if (switching) await morphSwap(body, fill); else await fill(); };
  const close=()=>{ clearInterval(ST.timer); hideEl($('sitePanel')); };
  document.querySelectorAll('#sitePanel [data-st]').forEach(t=>t.onclick=()=>{ if (ST.tab===t.dataset.st) return; document.querySelectorAll('#sitePanel [data-st]').forEach(x=>x.setAttribute('aria-pressed',String(x===t))); ST.tab=t.dataset.st; draw(true); });
  $('stClose').onclick=close; draw(); ST.timer=setInterval(()=>{ if ($('sitePanel').hidden || !$('stBody')) return clearInterval(ST.timer); if (ST.tab==='now') draw(); }, 2000); }
$('btnStats').addEventListener('click', ()=>showStats()); $('statsBox').addEventListener('click', ()=>showStats('now'));
function showKeys(){ panel(L("<h2>KEYS</h2><dl class=\"keys\">{0}</dl><div class=\"row\"><button class=\"btn\" id=\"ksClose\">닫기</button></div>", {0:KEYS.map(([k,v])=>`<dt><kbd>${k}</kbd></dt><dd>${v}</dd>`).join('')})); $('ksClose').onclick=()=>hideEl($('sitePanel')); }
$('btnKeys').addEventListener('click', showKeys);
$('btnNote').addEventListener('click', ()=>live.showNote());
$('btnHooks').addEventListener('click', ()=>live.showHooks());
// ---- 도감: 테마(대표 건물 목록 → 고르면 그 테마의 캐릭터·건물) / 표식 뜻 / 오늘 찾아온 나라. 숫자는 통계 모달과 같은 오늘 집계(ST.today)를 쓴다
const DEX={ tab:'theme', view:null, err:null }; // view: 상세로 들어간 테마 키(null이면 목록)
const DEX_MARKS=[[{},L("표식 없음"),L("PC · 직접 방문 · 신규 · 주 국가. 가장 흔한 경우라 아무것도 안 붙어요")],[{me:true},L("왕관 · 금빛 옷"),L("사이트 주인(나). 내 사이트를 ?vt_me=1로 연 브라우저와 랜딩·미니 위젯에서 보는 내 캐릭터예요. 빨간 고리와 ME 표가 같이 떠요")],[{returning:true},L("모자"),L("전에 와 본 재방문자")],[{device:'mobile'},L("폰"),L("모바일로 접속")],[{device:'tablet'},L("태블릿"),L("태블릿으로 접속")],
  [{referrer:'search'},L("돋보기"),L("검색으로 들어왔어요")],[{referrer:'social'},L("말풍선"),L("SNS에서 들어왔어요")],[{referrer:'ad'},L("금색 점"),L("광고로 들어왔어요")],[{campaign:'nov_sale'},L("캠페인 깃발"),L("UTM(utm_campaign, 없으면 utm_source)을 달고 들어왔어요. 색은 캠페인 이름마다 달라서 지금 어떤 광고가 사람을 데려오는지 보여요")],[{plan:'pro'},L("금색 고리"),L("유료 회원 (사이트가 plan: pro를 보낼 때)")],
  [{country:'US'},L("깃발"),L("주 국가가 아닌 나라. 주 국가는 지금 사람 접속자의 과반이 온 나라예요")],[{bot:1},L("회색 로봇"),L("크롤러·봇. 접속자 수에 넣지 않아요")]];
function dexSample(pr){ const c=document.createElement('canvas'); c.width=34; c.height=34; const g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  const fr=(pr.bot?A.bot:pr.me?A.me[0]:A.char[0][0]).down[0], X=17, Y=31, x=X-fr.ax, y=Y-fr.ay; g.fillStyle='rgba(59,47,58,.18)'; g.fillRect(X-4,Y-1,8,2); if (pr.rare) drawRare(g,X,y,pr,0.3);
  if (pr.plan==='pro'||pr.me){ g.strokeStyle=pr.me?PAL.red:PAL.gold; g.lineWidth=1; g.beginPath(); g.ellipse(X+.5,Y+.5,7,3,0,0,Math.PI*2); g.stroke(); } // 마을과 같은 고리(drawChar)
  g.drawImage(fr.canvas,x,y); if (!pr.bot) drawMarks(g,X,x,y,fr,pr,null); return c.toDataURL(); }
// 다른 테마의 그림: 그 팔레트로 잠깐 바꿔 그리고 되돌린다(마을 자산 A는 그대로). 표지(광장 건물)는 목록에서, 나머지는 상세에 들어갈 때 테마마다 한 번 만든다
const THEME_ART=new Map();
function withPalette(k, fn){ const saved={...PAL}; Object.assign(PAL, BASE_PAL, THEMES[k].palette); try { return fn(THEMES[k]); } finally { for (const p of Object.keys(PAL)) delete PAL[p]; Object.assign(PAL, saved); } }
function themeArt(k, full){ const a=THEME_ART.get(k)||{}; THEME_ART.set(k,a);
  if (!a.cover) a.cover=withPalette(k, T=>{ const sp=BUILD[T.kinds.plaza[1]](); return { url:sp.toDataURL(), w:sp.width, h:sp.height }; });
  if (full && !a.kinds) withPalette(k, T=>{ const C=T.characters; a.shapes=C.shapes.map(sh=>sh.name); a.colors=C.colors.map(c=>({ name:c.name, B:c.B }));
    a.char=C.shapes.map(sh=>C.colors.map(col=>compileChar(sh,col,C.fixed,C.up).down[0].canvas.toDataURL()));
    a.kinds=Object.fromEntries(KINDS.map(kk=>{ const [name,look]=T.kinds[kk], sp=BUILD[look](); return [kk,{ name, url:sp.toDataURL(), w:sp.width }]; })); });
  return a; }
// 표지는 정수 배율로(픽셀이 뭉개지지 않게). 테마끼리 크기가 들쭉날쭉하지 않게 최대 2배까지만, 칸(boxW×boxH)에 안 들어가면 줄인다
const coverImg=(c,boxW,boxH)=>{ const z=Math.max(1,Math.min(2,Math.floor(Math.min(boxW/c.w,boxH/c.h)))); return `<img src="${c.url}" alt="" style="width:${c.w*z}px">`; };
const dexDate=t=>esc(new Date(t).toLocaleDateString(intlLocale(),{month:'long',day:'numeric'}));
// 테마 한 칸의 조건·상태 줄과 버튼(목록과 상세가 같이 쓴다)
function themeLines(k){ const r=unlRule(k), open=themeOpen(k), text=(r?.text&&L(r.text))||UNL_TEXT[k]||''; /* 서버 문구도 사전으로(로드맵 60) */
  const when=r&&open?(r.gift?L("선물로 열었어요"):r.unlocked_at?L("{0}에 열렸어요", {0:dexDate(r.unlocked_at)}):''):'';
  return `${text?`<span class="t">${esc(text)}</span>`:''}${open?(when?`<span class="t when">${when}</span>`:''):!r?'':`<span class="dx-bar" role="progressbar" aria-valuenow="${r.value}" aria-valuemax="${r.goal}"><i style="width:${r.value/r.goal*100}%"></i></span><span class="t">${r.value} / ${r.goal}</span>`}`; }
function themeButton(k){ const giftOn=UNL.data?.gifts?.left>0&&UNL.edit;
  return k===ENGINE.THEME_KEY?L("<button class=\"btn cur\" disabled>사용 중</button>"):themeOpen(k)?L("<button class=\"btn\" data-use=\"{0}\">사용</button>", {0:k}):giftOn?L("<button class=\"btn\" data-gift=\"{0}\" title=\"선물 하나로 이 테마를 열어요\">열기</button>", {0:k}):''; }
function dexThemeList(){ const D=UNL.data, n=THEME_KEYS.filter(themeOpen).length, gifts=D?.gifts;
  const head=!D?L("<p class=\"st-sub\">{0} 테마를 누르면 캐릭터와 건물을 볼 수 있어요.</p>", {0:live.status==='demo'?L("데모에서는 모든 테마가 열려 있어요. 실제 사이트에서는 {0} 테마부터 시작해서 조건이 채워질 때마다 하나씩 열려요.", {0:esc(THEMES[THEME_KEYS[0]].name)}):L("모든 테마가 열려 있어요.")})
    :L("<p class=\"st-sub\">열린 테마 <b>{0}</b>/{1} · 사이트에 실제로 일어난 일로 열려요(봇과 내 방문은 세지 않아요). 테마를 누르면 캐릭터와 건물을 볼 수 있어요.</p>\n      <p class=\"st-sub dx-gift\">{2}</p>", {0:n, 1:THEME_KEYS.length, 2:gifts.left>0?L("선물 <b>{0}</b>개가 있어요. {1}", {0:gifts.left, 1:UNL.edit?L("잠긴 테마 하나를 골라 바로 열 수 있어요."):L("주인이나 편집 멤버가 쓸 수 있어요.")}):L("다음 선물 {0} · 사이트를 만든 뒤 {1}일마다 잠긴 테마 하나를 골라 열 수 있어요.", {0:dexDate(gifts.next_at), 1:gifts.every_days})});
  return head+`<div class="dx-themes">${THEME_KEYS.map(k=>{ const a=themeArt(k);
    return L("<div class=\"dx-t{0}{1}\" data-tk=\"{2}\"><button type=\"button\" class=\"dx-cover\" data-tkgo=\"{3}\" aria-label=\"{4} 테마 자세히 보기\">{5}</button>\n      <div class=\"dx-row\"><div><b>{6}</b>{7}</div>{8}</div></div>", {0:themeOpen(k)?'':' off', 1:UNL.focus===k?' hit':'', 2:k, 3:k, 4:esc(THEMES[k].name), 5:coverImg(a.cover,170,132), 6:esc(THEMES[k].name), 7:themeLines(k), 8:themeButton(k)}); }).join('')}</div><p class="st-sub" id="dxMsg"></p>`; }
// 테마 상세: 그 테마의 캐릭터(형태×색)와 건물 12종. 건물 칸에는 이 마을에서 그 종류에 연결된 경로·지금 인원·오늘 조회
function dexThemeDetail(k){ const a=themeArt(k,true), open=themeOpen(k), d=ST.today, today=p=>d?(d.pages[p]||0):'…';
  return L("<div class=\"dx-head{0}\"><button class=\"btn back\" id=\"dxBack\" title=\"테마 목록으로\">◀ 목록</button><div class=\"dx-cover\">{1}</div><div><b>{2}</b>{3}{4}</div>{5}</div>\n    <div class=\"st-block\"><h3>CHARACTERS</h3><p class=\"st-sub\">형태 {6}가지 × 색 {7}가지. 외형은 방문자마다 무작위라 뜻은 없어요. 방문자에 대한 정보는 표식 탭에서 볼 수 있어요.</p>\n    <div class=\"dx-grid\" style=\"--n:{8}\"><span></span>{9}{10}</div></div>\n    <div class=\"st-block\"><h3>BUILDINGS</h3><p class=\"st-sub\">건물 {11}종 중 이 마을에 {12}종이 있어요. 어느 경로를 어느 건물로 보낼지는 설정 → 건물 설정에서 정해요.</p>\n    <div class=\"dx-builds\">{13}</div></div>\n    <p class=\"st-sub\" id=\"dxMsg\"></p>", {0:open?'':' off', 1:coverImg(a.cover,132,92), 2:esc(THEMES[k].name), 3:themeLines(k), 4:open?'':L("<span class=\"t\">잠긴 테마예요. 미리 보기만 할 수 있어요.</span>"), 5:themeButton(k), 6:a.shapes.length, 7:a.colors.length, 8:a.colors.length, 9:a.colors.map(c=>`<span class="dx-h"><i style="background:${c.B}"></i>${esc(c.name)}</span>`).join(''), 10:a.shapes.map((sh,i)=>`<span class="dx-r">${esc(sh)}</span>${a.colors.map((c,j)=>`<img src="${a.char[i][j]}" alt="${esc(c.name+' '+sh)}" title="${esc(c.name+' '+sh)}">`).join('')}`).join(''), 11:KINDS.length, 12:new Set(BUILDINGS.map(b=>b.kind)).size, 13:KINDS.map(kk=>{ const K=a.kinds[kk], bs=BUILDINGS.filter(b=>b.kind===kk);
      return `<div class="dx-b${bs.length?'':' off'}"><div class="dx-bimg"><img src="${K.url}" alt="" style="width:${K.w}px"></div><div><b>${esc(K.name)}</b>${bs.length?`<ul>${bs.map(b=>L("<li>{0}<code>{1}</code><span class=\"t\">지금 {2}명 · 오늘 조회 {3}</span></li>", {0:b.label?esc(b.label)+' ':'', 1:esc(b.path), 2:store.counts[b.path]||0, 3:today(b.path)})).join('')}</ul>`:L("<span class=\"t\">이 마을엔 아직 없어요</span>")}</div></div>`; }).join('')}); }
function dexMarksHtml(){ return L("<p class=\"st-sub\">방문자에 대해서는 외형 대신 표식이 말해 줘요. 보기 메뉴의 \"방문자 표시\"로 모두 끌 수 있어요.</p><div class=\"dx-marks\">{0}</div>", {0:DEX_MARKS.map(([pr,name,desc])=>`<div class="dx-mark"><img src="${dexSample(pr)}" alt=""><div><b>${name}</b><span>${desc}</span></div></div>`).join('')}); }
// 희귀 방문자 수집 칸(로드맵 36): 종류·조건·만난 횟수·마지막 날짜. 집계는 서버 해금 상태(unlocks.rares)에 쌓인다
function dexRareHtml(){ const D=UNL.data, list=D?.rares||RARE_DEFS.map(r=>({ ...r, n:null })), got=list.filter(r=>r.n>0).length, day=t=>t?new Date(t).toLocaleDateString(intlLocale(),{ month:'numeric', day:'numeric' }):'';
  const recs=D?.records?.log||[];
  return L("<p class=\"st-sub\">특별한 순간에 들어온 방문자는 반짝이며 머리 위에 표시가 떠요. 판정은 서버가 하고 만난 횟수가 여기에 쌓여요.{0}</p>\n    <div class=\"dx-marks\">{1}</div>\n    <h3>마을 기록</h3><p class=\"st-sub\">N번째 방문자, 동시 접속 최고, 첫 해외 방문자, 나라 수가 갱신될 때마다 남아요. \"카드\"를 누르면 지금 마을 모습에 얹은 공유 이미지를 만들어요.{2}</p>\n    {3}", {0:D?L(" 누적 방문 {0}명 · 마을 Lv.{1}{2} · 모은 종류 {3}/{4}", {0:(D.visits||0).toLocaleString(), 1:ENGINE.TOWN_LEVEL, 2:ENGINE.TOWN_LEVEL<5?L(" (다음 레벨 {0}명)", {0:TOWN_LEVEL_AT[ENGINE.TOWN_LEVEL+1].toLocaleString()}):'', 3:got, 4:list.length}):LIVE?L(" 이 서버는 아직 희귀 방문자 집계를 주지 않아요."):L(" 데모에서는 가끔 섞어 보여 줘요."), 1:list.map(r=>`<div class="dx-mark${r.n===0?' off':''}"><img src="${dexSample({ rare:r.key })}" alt=""><div><b>${esc(r.name)}</b><span>${esc(r.text)}</span>${r.n===null?'':`<span>${r.n>0?L("{0}번 만남 · 마지막 {1}", {0:r.n, 1:day(r.last)}):L("아직 못 만났어요")}</span>`}</div></div>`).join(''), 2:D?L(" 동시 접속 최고 {0}명.", {0:D.records?.maxOnline?.n||0}):'', 3:recs.length?`<div class="list">${recs.slice(0,12).map(m=>L("<div class=\"mb-row\"><span>{0} <span class=\"muted\">{1}</span></span><button class=\"btn mini\" type=\"button\" data-card=\"{2}\">카드</button></div>", {0:esc(m.text||''), 1:day(m.at), 2:esc(JSON.stringify({ text:m.text, at:m.at, kind:m.kind }))})).join('')}</div>`:`<p class="st-sub">${D?L("아직 기록이 없어요."):LIVE?'':L("데모에서는 기록이 쌓이지 않아요.")}</p>`}); }
function dexCountryHtml(){ const d=ST.today; if (!d) return DEX.err?`<p class="err">${esc(DEX.err)}</p>`:L("<p class=\"st-sub\">불러오는 중…</p>");
  const met=new Map(Object.entries(d.country).filter(([k])=>k!=='?')), known=Object.keys(FLAG_ROWS), got=known.filter(k=>met.has(k)).length, extra=[...met].filter(([k])=>!FLAG_ROWS[k]);
  const order=known.sort((a,b)=>(met.get(b)||0)-(met.get(a)||0) || countryName(a).localeCompare(countryName(b),intlLocale()));
  return L("<p class=\"st-sub\">오늘 찾아온 나라 <b>{0}</b>곳 · 픽셀 깃발 {1}개 중 {2}개를 모았어요. 봇은 세지 않고, 마을에서는 주 국가가 아닌 나라만 깃발을 달아요.</p>\n    <div class=\"dx-flags\">{3}</div>\n    {4}", {0:met.size, 1:known.length, 2:got, 3:order.map(k=>{ const n=met.get(k)||0; return `<div class="dx-f${n?'':' off'}" title="${esc(countryName(k))}${n?L(" · {0}명", {0:n}):L(" · 아직 안 왔어요")}"><img src="${A.flags[k].toDataURL()}" alt=""><span>${esc(countryName(k))}</span>${n?`<b>${n}</b>`:''}</div>`; }).join(''), 4:extra.length?L("<p class=\"st-sub\">깃발 그림이 없는 나라: {0}</p>", {0:extra.map(([k,n])=>L("{0} {1} {2}명", {0:flagEmoji(k), 1:esc(countryName(k)), 2:n})).join(' · ')}):''}); }
function dexThemeBind(body, go){ UNL.focus=null;
  // 카드는 포커스를 받지 않고(안에 버튼이 있어 nested-interactive) 표지 버튼(data-tkgo)이 키보드 길. 마우스는 카드 아무 데나 눌러도 된다
  body.querySelectorAll('[data-tk]').forEach(c=>{ c.onclick=e=>{ if (!e.target.closest('button') || e.target.closest('[data-tkgo]')) go(c.dataset.tk); }; });
  const back=$('dxBack'); if (back) back.onclick=()=>go(null);
  body.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>applyTheme(b.dataset.use, true));
  body.querySelectorAll('[data-gift]').forEach(b=>b.onclick=async()=>{ const k=b.dataset.gift; if (!await ask(L("선물로 \"{0}\" 테마를 열까요? 한 번 쓴 선물은 되돌릴 수 없어요.", {0:THEMES[k].name}),{ ok:L("열기") })) return; b.disabled=true;
    try { await live.api(`/api/sites/${encodeURIComponent(CONN.site)}/unlocks`,{ method:'POST', body:JSON.stringify({ theme:k }) }); } // 결과는 SSE 'unlocks'로 온다
    catch(e){ b.disabled=false; say($('dxMsg'),errText(e,L("선물을 쓰지 못했어요")),true); } }); }
function showDex(tab){ if (tab) { DEX.tab=tab; DEX.view=null; }
  panel(L("<h2>BOOK <span class=\"muted\" id=\"dxTheme\"></span></h2><div class=\"tabs\"><button class=\"btn tab\" data-dx=\"theme\">테마</button><button class=\"btn tab\" data-dx=\"marks\">표식</button><button class=\"btn tab\" data-dx=\"rare\">희귀</button><button class=\"btn tab\" data-dx=\"country\">나라</button></div><div id=\"dxBody\"></div><div class=\"row\"><button class=\"btn\" id=\"dxClose\">닫기</button></div>"), true);
  const body=$('dxBody'), tabs=document.querySelectorAll('#sitePanel [data-dx]');
  const swap=()=>morphSwap(body, ()=>{ fill(); pop(body,'fade'); body.scrollTop=0; });
  const go=k=>{ DEX.view=k; swap(); };
  const fill=()=>{ $('dxTheme').textContent=L("지금 {0} 테마", {0:THEMES[ENGINE.THEME_KEY].name}); tabs.forEach(t=>t.setAttribute('aria-pressed',String(t.dataset.dx===DEX.tab)));
    body.innerHTML=DEX.tab==='theme'?(DEX.view?dexThemeDetail(DEX.view):dexThemeList()):DEX.tab==='marks'?dexMarksHtml():DEX.tab==='rare'?dexRareHtml():dexCountryHtml(); if (DEX.tab==='theme') dexThemeBind(body, go); };
  DEX.redraw=()=>{ if ($('dxBody')===body && !$('sitePanel').hidden) fill(); }; fill();
  body.addEventListener('click', e=>{ const b=e.target.closest('[data-card]'); if (b) recordCard(JSON.parse(b.dataset.card)); }); // 마을 기록 → 카드
  tabs.forEach(t=>t.onclick=()=>{ if (DEX.tab===t.dataset.dx && !(t.dataset.dx==='theme' && DEX.view)) return; DEX.tab=t.dataset.dx; DEX.view=null; swap(); });
  $('dxClose').onclick=()=>hideEl($('sitePanel'));
  if (!ST.today || Date.now()-ST.today.to>60000){ DEX.err=null; stLoadToday().then(d=>{ ST.today=d; if (DEX.tab==='country'||DEX.view) DEX.redraw(); }).catch(e=>{ DEX.err=e.message; if (DEX.tab==='country') DEX.redraw(); }); } }
$('btnDex').addEventListener('click', ()=>showDex());
// ---- 하단 메뉴 열고 닫기. 목록은 body로 꺼내 버튼 위에 고정 배치(하단 바의 clip-path에 잘리지 않게). 버튼을 누르면 닫히고, 체크·슬라이더는 열린 채 둔다
const MENU={ open:null };
function menuClose(){ if (!MENU.open) return; const m=MENU.open; MENU.open=null; m.btn.setAttribute('aria-expanded','false'); hideEl(m.list); }
document.querySelectorAll('.menu').forEach(wrap=>{ const btn=wrap.querySelector('.menu-btn'), list=wrap.querySelector('.menu-list'); const right=wrap.classList.contains('menu-right'); list.classList.toggle('right', right); document.body.appendChild(list); const m={ btn, list };
  btn.addEventListener('click', ()=>{ if (MENU.open===m) return menuClose(); menuClose(); const r=btn.getBoundingClientRect(); list.style.bottom=(innerHeight-r.top+8)+'px'; if (right){ list.style.right=(innerWidth-r.right)+'px'; list.style.left='auto'; } else { list.style.left=Math.max(4,r.left)+'px'; list.style.right='auto'; } MENU.open=m; btn.setAttribute('aria-expanded','true'); showEl(list); });
  list.addEventListener('click', e=>{ const b=e.target.closest('button'); if (b && !b.closest('.group')) setTimeout(menuClose, 0); }); });
document.addEventListener('mousedown', e=>{ if (MENU.open && !e.target.closest('.menu,.menu-list')) menuClose(); });
addEventListener('resize', menuClose);
document.addEventListener('keydown', e=>{ if (e.key==='Escape' && MENU.open){ e.stopImmediatePropagation(); menuClose(); } }, true);
document.addEventListener('keydown', e => { if (e.defaultPrevented) return;
  if (e.key==='Escape'){ if ($('app').classList.contains('rec')) setRec(false); else if (!$('sitePanel').hidden) $('sitePanel').querySelector('#bsClose,#etClose,#emClose,#ksClose,#stClose,#dxClose,#shClose,#spBack')?.click(); else if (!cp.hidden) hideEl(cp); return; }
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,select,textarea,[contenteditable]')) return;
  const k=e.key; let done=true;
  switch (k){ case 'f': case 'F': toggleFull(); break; case 'r': case 'R': if (!$('btnReplay').disabled) $('btnReplay').click(); break;
    case '+': case '=': $('zoomIn').click(); break; case '-': case '_': $('zoomOut').click(); break; case '0': zoomTo(baseScale()); break;
    case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9': setTheme(THEME_KEYS[+k-1]); break; case 't': case 'T': setTheme(nextOpenTheme()); break;
    case 'p': case 'P': snapshotTown(); break; case 'h': case 'H': $('chkHeat').click(); break; case 'd': case 'D': setShell(document.documentElement.dataset.shell==='dark'?'light':'dark'); break; case 'b': case 'B': $('sitePanel').hidden||!$('dxBody') ? showDex() : hideEl($('sitePanel')); break;
    case 'ArrowRight': case 'ArrowLeft': if (TV.on && TV.list.length>1) tvShow(TV.i+(k==='ArrowRight'?1:-1)); else done=false; break;
    case '?': $('sitePanel').hidden ? showKeys() : hideEl($('sitePanel')); break; default: done=false; }
  if (done) e.preventDefault(); });
// ---- 키보드 순회(로드맵 57): 마을(#stage, role=application)에 포커스가 있을 때 ← →는 방문자(world.chars 순서), ↑ ↓는 건물(BUILDINGS 순서)을 차례로 고른다. 선택은 클릭과 같은 길(view.select → selectedId 하나)이라 정보 패널(aria-live)이 읽어 준다. Enter·Space는 고른 캐릭터 따라가기 켜기/끄기, Esc는 선택 해제. TV 모드의 ← →(사이트 넘기기)가 우선
function navChars(){ const out=[]; for (const ch of world.chars.values()){ if (ch.state==='despawn'||ch.state==='rise'||(ch.bot&&!world.showBots)) continue; out.push(ch.id); } return out; }
function stepPick(list, cur, dir){ if (!list.length) return null; const i=list.indexOf(cur); return list[i<0 ? (dir>0?0:list.length-1) : (i+dir+list.length)%list.length]; }
function centerOn(x,y){ setFollow(false); vp.scrollLeft=x*curS+town.offsetLeft-vp.clientWidth/2; vp.scrollTop=y*curS+town.offsetTop-vp.clientHeight/2; }
stage.addEventListener('keydown', e=>{ if (e.target!==stage || e.ctrlKey || e.metaKey || e.altKey) return; const k=e.key;
  if (k==='ArrowRight'||k==='ArrowLeft'){ if (TV.on && TV.list.length>1) return; const id=stepPick(navChars(), view.selectedId, k==='ArrowRight'?1:-1); if (id) focusChar(id); }
  else if (k==='ArrowDown'||k==='ArrowUp'){ const p=stepPick(BUILDINGS.map(b=>b.path), view.selectedId, k==='ArrowDown'?1:-1); if (!p) return; const b=BY_PATH.get(p); view.select(p); centerOn(b.x, (b.top+b.y)/2); }
  else if (k==='Enter'||k===' '){ if (!view.selectedId || !world.chars.get(view.selectedId)) return; setFollow(!follow); }
  else if (k==='Escape'){ if (!view.selectedId || !$('sitePanel').hidden || !cp.hidden || $('app').classList.contains('rec')) return; view.select(null); setFollow(false); }
  else return;
  e.preventDefault(); });
stage.addEventListener('dblclick', e=>{ if (e.target.closest('#sitePanel,#connPanel,#replayBar,#mini,#warnBar,button,input,select')) return; zoomTo(baseScale()); });
// ---- 마을 사진: 캔버스를 3배로 키우고 건물 이름표를 합성해 PNG로 저장 (P 키)
const UI_FONT=()=>getComputedStyle(document.body).fontFamily;
function drawLabels(g,S){ g.font=`${5*S}px ${UI_FONT()}`; g.textBaseline='alphabetic'; g.textAlign='center';
  for (const b of BUILDINGS){ const x=Math.min(W-36,Math.max(36,b.x))*S, y=Math.max(14,b.top-14)*S, w=Math.round(g.measureText(b.name).width)+4*S; g.fillStyle='rgba(59,47,58,.78)'; g.fillRect(Math.round(x-w/2),y-7*S,w,7*S); g.fillStyle='#fff8ea'; g.fillText(b.name,x,y-2*S+1); } }
function downloadBlob(blob, name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),3000); }
const fileStem=(d=new Date())=>{ const p=n=>String(n).padStart(2,'0'); return `visitown-${(live.site?.domain||'demo').replace(/[^a-z0-9.-]/gi,'_')}-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}`; };
function snapshotTown(){ const S=3, out=document.createElement('canvas'); out.width=W*S; out.height=H*S; const g=out.getContext('2d'); g.imageSmoothingEnabled=false; g.drawImage(cv,0,0,W*S,H*S);
  if ($('chkLabel').checked) drawLabels(g,S);
  pop($('town'),'flash'); sfx('shutter'); out.toBlob(blob=>{ if (!blob) return; const d=new Date(), p=n=>String(n).padStart(2,'0'); downloadBlob(blob, `${fileStem(d)}-${p(d.getHours())}${p(d.getMinutes())}.png`); },'image/png'); }
// ---- 타임랩스 영상: 리플레이 구간을 처음부터 끝까지 N초에 맞춰 돌리면서 캔버스 2배 + 이름표 + 날짜·시각·접속자 오버레이를 MediaRecorder로 녹화한다.
// 프레임은 rAF가 돌려야 쌓이므로 탭이 보여야 한다. 구간이 24시간이고 30초면 2880배속: 캐릭터는 10배속까지만 움직이고(리플레이와 같음) 인원 배지·발자국이 하루 흐름을 보여 준다
const EXP={ on:false, rec:null, cv:null, g:null, chunks:[], rate:0, S:2, cancel:false };
const EXP_OK=!!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream); if (!EXP_OK){ $('rpExport').hidden=true; $('rpLen').hidden=true; }
function expMime(){ for (const [m,ext] of [['video/webm;codecs=vp9','webm'],['video/webm;codecs=vp8','webm'],['video/webm','webm'],['video/mp4','mp4']]) if (MediaRecorder.isTypeSupported(m)) return [m,ext]; return [null,'webm']; }
function startExport(){ if (!replay.active || EXP.on) return; if (!REC.length) return note(L("이 구간에는 기록이 없어요. 다른 구간을 골라 주세요."));
  const secs=+$('rpLen').value||30, span=Math.max(1,replay.t1-replay.t0), S=EXP.S;
  EXP.cv=document.createElement('canvas'); EXP.cv.width=W*S; EXP.cv.height=H*S; EXP.g=EXP.cv.getContext('2d'); EXP.g.imageSmoothingEnabled=false; EXP.chunks=[]; EXP.cancel=false;
  const [mime,ext]=expMime(); EXP.ext=ext; let rec; try { rec=new MediaRecorder(EXP.cv.captureStream(30), { ...(mime?{ mimeType:mime }:{}), videoBitsPerSecond:4e6 }); } catch(e){ console.warn(e); return note(L("이 브라우저에서는 영상을 만들 수 없어요. 크롬이나 엣지에서 다시 해 주세요.")); }
  rec.ondataavailable=e=>{ if (e.data && e.data.size) EXP.chunks.push(e.data); }; rec.onstop=saveExport; EXP.rec=rec; EXP.rate=span/secs; EXP.on=true;
  EXP.people=countPeople(REC.map(r=>r.ev)); EXP.yesterday=LIVE && $('rpRange').value==='yesterday'; // 오버레이·공유 문구용 "N명이 다녀갔어요"(사람 세션 중복 제거)
  seekReplay(replay.t0); replay.playing=true; $('rpPlay').textContent='❚❚'; expLock(true); setBtn($('rpExport'),L("취소")); $('rpExport').classList.add('pink'); $('rpShare').disabled=true;
  drawExport(); rec.start(500); }
function expLock(on){ $('rpSeek').disabled=on; for (const id of ['rpSpeed','rpLen']){ const s=$(id); s.disabled=on; s.dispatchEvent(new Event('pxs-refresh')); } } // 픽셀 드롭다운 버튼도 같이 잠근다
function expLabel(){ if (!LIVE) return recTime(replay.cur); const d=new Date(replay.cur*1000), p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} (${L("일월화수목금토")[d.getDay()]}) ${p(d.getHours())}:${p(d.getMinutes())}`; }
function expBox(g, S, lines, right){ g.textBaseline='alphabetic'; g.textAlign='left'; let w=0; for (const [t,sz] of lines){ g.font=`${sz}px ${UI_FONT()}`; w=Math.max(w, g.measureText(t).width); } w=Math.round(w)+8*S; let h=4*S; for (const [,sz] of lines) h+=sz+2*S;
  const x=right? W*S-6*S-w : 6*S, y=6*S; g.fillStyle='rgba(59,47,58,.82)'; g.fillRect(x,y,w,h); g.fillStyle='#fff8ea'; let cy=y+3*S; for (const [t,sz] of lines){ g.font=`${sz}px ${UI_FONT()}`; cy+=sz; g.fillText(t, x+4*S, cy); cy+=2*S; } }
function drawExport(){ const g=EXP.g, S=EXP.S; g.drawImage(cv,0,0,W*S,H*S); if ($('chkLabel').checked) drawLabels(g,S);
  expBox(g,S,[[live.site?.name||live.site?.domain||L("Visitown 데모"), 6*S],[expLabel(), 9*S],[L("{0}{1}명이 다녀갔어요", {0:EXP.yesterday?L("어제 "):'', 1:EXP.people.toLocaleString()}), 6*S]]); expBox(g,S,[[L("접속자 {0}", {0:store.online}), 8*S],[L("이벤트 {0}", {0:store.totalEvents}), 6*S]], true);
  const pct=Math.round((replay.cur-replay.t0)/Math.max(1,replay.t1-replay.t0)*100); const txt=L("영상 만드는 중 {0}%", {0:pct}); if ($('rpRate').textContent!==txt) $('rpRate').textContent=txt; }
function finishExport(){ if (!EXP.on) return; EXP.on=false; try { EXP.rec.stop(); } catch { saveExport(); } }
function cancelExport(){ if (!EXP.on) return; EXP.cancel=true; finishExport(); }
async function saveExport(){ const chunks=EXP.chunks, share=EXP.share; EXP.chunks=[]; EXP.share=false; expLock(false); setBtn($('rpExport'),L("영상 저장")); $('rpExport').classList.remove('pink'); $('rpShare').disabled=false;
  if (EXP.cancel || !chunks.length){ if (replay.active) $('rpRate').textContent=`${replay.rate}x · ${EXP.cancel?L("영상 저장을 취소했어요"):L("영상이 비어 있어요")}`; return; }
  const blob=new Blob(chunks,{ type:EXP.rec?.mimeType||'video/webm' }), name=`${fileStem(LIVE?new Date(replay.t0*1000):new Date())}-timelapse.${EXP.ext}`;
  // 공유 버튼으로 시작했으면 공유 창부터(폰·지원 브라우저). 파일 공유가 안 되면 저장으로 떨어진다
  const r = share ? await shareBlob(blob, name, L("{0} · {1}{2}명이 다녀갔어요 · Visitown", {0:live.site?.name||live.site?.domain||L("Visitown 데모"), 1:EXP.yesterday?L("어제 "):'', 2:EXP.people.toLocaleString()})) : (downloadBlob(blob, name), 'saved');
  if (r==='cancel'){ if (replay.active) $('rpRate').textContent=L("{0}x · 공유를 취소했어요", {0:replay.rate}); return; } pop($('town'),'flash'); sfx('shutter');
  if (replay.active) $('rpRate').textContent=L("{0}x · 영상을 {1} ({2}MB)", {0:replay.rate, 1:r==='shared'?L("공유했어요"):L("저장했어요"), 2:(blob.size/1048576).toFixed(1)}); }
$('rpExport').addEventListener('click', () => EXP.on ? cancelExport() : startExport());
$('btnShot').addEventListener('click', snapshotTown);
// ---- 사진·영상 공유(로드맵 20): 지금 마을에 "어제 N명이 다녀갔어요" 문구를 얹어 가로(16:9)·정사각·세로(9:16)로 만들고 Web Share로 보내거나 저장한다.
// 어제 인원은 서버 site_daily(사람 세션 중복 제거)에서, 아직 집계가 없으면 어제 원본 이벤트에서 세션을 센다(앞부분만 받았으면 포기). 데모는 "지금 N명"
const SHARE={ ratio:'16:9', cap:true, yd:null, ydAt:0, src:null, busy:false };
const SHARE_OK=!!(navigator.share && navigator.canShare); if (SHARE_OK && EXP_OK) $('rpShare').hidden=false;
function countPeople(events){ const s=new Set(); for (const ev of events) if (ev.event_type!=='note' && ev.session_id && !(ev.properties&&ev.properties.bot)) s.add(ev.session_id); return s.size; }
function ymdLocal(d){ const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
async function yesterdayCount(){ if (!LIVE) return null; if (Date.now()-SHARE.ydAt<600000) return SHARE.yd; const d=new Date(); d.setHours(0,0,0,0); const y0=d.getTime()-86400000, key=ymdLocal(new Date(y0)); let n=null;
  try { const j=await live.api(`/api/sites/${encodeURIComponent(CONN.site)}/daily?days=3`); const row=(j.site||[]).find(r=>String(r.day).slice(0,10)===key); if (row) n=+row.sessions||0; } catch {}
  if (n===null){ try { const j=await live.api(`/api/sites/${encodeURIComponent(CONN.site)}/events?from=${new Date(y0).toISOString()}&to=${d.toISOString()}`); if (!j.truncated) n=countPeople(j.events); } catch {} }
  SHARE.yd=n; SHARE.ydAt=Date.now(); return n; }
// 글: name 사이트, main 큰 문구, sub 작은 문구. over(기록 카드 등)가 있으면 그걸 쓴다
function shareLines(yd, over){ const name=live.site?.name||live.site?.domain||L("Visitown 데모"); if (over) return [name, over.main, over.sub||'visitown.vercel.app']; const main=yd>0?L("어제 {0}명이 다녀갔어요", {0:yd.toLocaleString()}):L("지금 {0}명이 보고 있어요", {0:store.online}); return [name, main, 'visitown.vercel.app']; }
function shareText(yd, over){ const [name,main]=shareLines(yd, over); return `${name} · ${main} · Visitown`; }
// 글상자: 어두운 바탕에 밝은 글자. lines는 [글, 크기]. x·y는 왼쪽 위, 글자 크기는 u(=출력 폭/480)에 비례
function capBox(g, x, y, lines, u){ g.textBaseline='alphabetic'; g.textAlign='left'; let w=0, h=4*u; for (const [t,sz] of lines){ g.font=`${sz}px ${UI_FONT()}`; w=Math.max(w, g.measureText(t).width); h+=sz+2*u; } w=Math.round(w)+10*u;
  g.fillStyle='rgba(59,47,58,.84)'; g.fillRect(x,y,w,h); let cy=y+3*u; for (const [t,sz,col] of lines){ g.font=`${sz}px ${UI_FONT()}`; cy+=sz; g.fillStyle=col||'#fff8ea'; g.fillText(t, x+5*u, cy); cy+=2*u; } return { w, h }; }
function grabFrame(){ const c=document.createElement('canvas'); c.width=W; c.height=H; c.getContext('2d').drawImage(cv,0,0); return c; }
function composeShare(src, ratio, cap, yd, over){ const S=3; let ow=W*S, oh=H*S; if (ratio==='1:1'){ ow=oh=1080; } else if (ratio==='9:16'){ ow=1080; oh=1920; }
  const out=document.createElement('canvas'); out.width=ow; out.height=oh; const g=out.getContext('2d'); g.imageSmoothingEnabled=false; const u=ow/W;
  g.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#f1e6d2'; g.fillRect(0,0,ow,oh);
  // 가로는 그대로, 정사각은 세로를 꽉 채우고 가운데를 자르고, 세로는 가로를 꽉 채우고 위아래 여백에 문구를 크게 둔다
  let sc=S, dx=0, dy=0; if (ratio==='1:1'){ sc=oh/H; dx=Math.round((ow-W*sc)/2); } else if (ratio==='9:16'){ sc=ow/W; dy=Math.round((oh-H*sc)/2); }
  g.drawImage(src, dx, dy, Math.round(W*sc), Math.round(H*sc)); if ($('chkLabel').checked){ g.save(); g.translate(dx,dy); drawLabels(g, sc); g.restore(); }
  if (cap){ const [name,main,brand]=shareLines(yd, over);
    if (ratio==='9:16'){ g.fillStyle='#3b2f3a'; g.textAlign='center'; g.textBaseline='alphabetic'; g.font=`${13*u}px ${UI_FONT()}`; g.fillText(name, ow/2, dy-40*u); g.font=`${24*u}px ${UI_FONT()}`; g.fillText(main, ow/2, dy-12*u);
      g.fillStyle='#7d6d76'; g.font=`${9*u}px ${UI_FONT()}`; g.fillText(brand, ow/2, dy+H*sc+24*u); }
    else { capBox(g, 6*u, oh-6*u-((7*u+2*u)+(12*u+2*u)+(6*u+2*u)+4*u), [[name,7*u],[main,12*u],[brand,6*u,'#d9c9bd']], u); } }
  return out; }
function shareName(ratio, ext='png'){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${fileStem(d)}-${p(d.getHours())}${p(d.getMinutes())}-${ratio.replace(':','x')}.${ext}`; }
// 파일을 공유 창으로. 못 하면(지원 안 함·파일 거부) 저장으로 떨어진다. 사용자가 공유 창을 닫으면 아무것도 안 한다
async function shareBlob(blob, name, text){ const file=new File([blob], name, { type: blob.type||'application/octet-stream' });
  if (SHARE_OK && navigator.canShare({ files:[file] })){ try { await navigator.share({ files:[file], title:'Visitown', text }); return 'shared'; } catch(e){ if (e && e.name==='AbortError') return 'cancel'; } }
  downloadBlob(blob, name); return 'saved'; }
async function showShare(over){ SHARE.src=grabFrame(); if (over) SHARE.cap=true;
  panel(L("<h2>{0}</h2><p class=\"muted\">{1}</p>\n    <div class=\"row\"><div class=\"group\" role=\"group\" aria-label=\"비율\">{2}</div><label class=\"toggle\"><input type=\"checkbox\" id=\"shCap\"{3}>문구</label><button class=\"btn\" id=\"shRetake\">다시 찍기</button></div>\n    <p class=\"sh-prev\"><img id=\"shImg\" alt=\"공유 사진 미리보기\"></p>\n    <div class=\"row\">{4}<button class=\"btn{5}\" id=\"shSave\">저장</button><button class=\"btn\" id=\"shClose\">닫기</button><span class=\"muted\" id=\"shMsg\">{6}</span></div>", {0:over?esc(over.title||'RECORD'):'SHARE', 1:over?L("<b>{0}</b> 기록을 지금 마을 모습에 얹은 카드예요. 비율을 골라 공유하거나 저장해 보세요.", {0:esc(over.main)}):L("지금 마을 모습에 문구를 얹어 SNS에 올릴 사진을 만들어요. 비율을 고르면 미리보기가 바뀌고, \"다시 찍기\"로 지금 장면을 다시 잡아요."), 2:[['16:9',L("가로")],['1:1',L("정사각")],['9:16',L("세로")]].map(([v,l])=>`<button class="btn" data-ratio="${v}" aria-pressed="${SHARE.ratio===v}">${l}</button>`).join(''), 3:SHARE.cap?' checked':'', 4:SHARE_OK?L("<button class=\"btn primary\" id=\"shShare\">공유하기</button>"):'', 5:SHARE_OK?'':' primary', 6:LIVE?L("어제 인원을 불러오는 중…"):''}));
  const root=$('sitePanel'), msg=$('shMsg'); let yd=LIVE?SHARE.yd:null;
  const render=()=>{ const c=composeShare(SHARE.src, SHARE.ratio, SHARE.cap, yd, over); $('shImg').src=c.toDataURL(); $('shImg').style.aspectRatio=`${c.width}/${c.height}`; return c; };
  render(); if (LIVE && !over){ yesterdayCount().then(n=>{ yd=n; if (!root.contains(msg)) return; msg.textContent = n===null ? L("어제 집계가 아직 없어 지금 인원을 적어요") : ''; render(); }); } else if (over) msg.textContent='';
  root.querySelectorAll('[data-ratio]').forEach(b=>b.onclick=()=>{ SHARE.ratio=b.dataset.ratio; root.querySelectorAll('[data-ratio]').forEach(x=>x.setAttribute('aria-pressed', String(x===b))); render(); });
  $('shCap').onchange=e=>{ SHARE.cap=e.target.checked; render(); }; $('shRetake').onclick=()=>{ SHARE.src=grabFrame(); pop($('town'),'flash'); sfx('shutter'); render(); };
  const out=async(share)=>{ if (SHARE.busy) return; SHARE.busy=true; try { const c=render(); const blob=await new Promise(r=>c.toBlob(r,'image/png')); if (!blob) throw new Error('empty');
      const r=share ? await shareBlob(blob, shareName(SHARE.ratio), shareText(yd, over)) : (downloadBlob(blob, shareName(SHARE.ratio)), 'saved');
      if (r!=='cancel'){ pop($('town'),'flash'); sfx('shutter'); say(msg, r==='shared'?L("공유했어요"):L("저장했어요")); } } catch(e){ say(msg, errText(e,L("사진을 만들지 못했어요")), true); } finally { SHARE.busy=false; } };
  if (SHARE_OK) $('shShare').onclick=()=>out(true); $('shSave').onclick=()=>out(false); $('shClose').onclick=()=>hideEl(root); }
$('btnShare').addEventListener('click', ()=>showShare());
// ---- 기록 갱신 카드(로드맵 21): 서버 SSE 'milestone'(N번째 방문자·동시 접속 최고·첫 해외 방문자·나라 수). 피드·알림을 띄우고, 다른 패널이 안 열려 있으면 공유 카드를 바로 만든다.
// 지난 기록은 도감 희귀 탭 아래 "마을 기록"(해금 상태 records.log)에서 다시 카드로 만들 수 있다
const REC_ICON={ visits:'star', online:'person', foreign:'firework', countries:'flower' };
function recordWhen(at){ const d=new Date(at||Date.now()); return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()} · visitown.vercel.app`; }
function recordCard(m){ showShare({ title:'RECORD', main:m.text, sub:recordWhen(m.at) }); }
function onMilestone(m){ if (!m||!m.text) return; if (m.kind==='foreign' && m.country) m={ ...m, text:L("첫 해외 방문자가 왔어요 · {0}", {0:countryName(m.country)}) }; // 나라 코드 대신 한국어 이름
  if (m.kind==='visits' && m.n){ if (UNL.data) UNL.data.visits=Math.max(UNL.data.visits||0, m.n); setTownLevel(townLevelOf(m.n)); } // 100·1,000·10,000번째는 마을 레벨 경계이기도 하다(34)
  addFeed([{b:L("기록 갱신")}, ' · ', m.text, ' ', { btn:L("카드"), onClick:()=>recordCard({ text:m.text, at:m.at, kind:m.kind }) }], REC_ICON[m.kind]||'star', '', Date.parse(m.at)||Date.now(), 'sys unlock');
  notify(L("기록 갱신"), `${m.text} · ${live.site?.domain||live.site?.name||''}`, 'milestone_'+m.kind); sfx('unlock');
  if (UNL.data){ UNL.data.records=UNL.data.records||{ log:[] }; UNL.data.records.log.unshift({ kind:m.kind, n:m.n, country:m.country, at:m.at, text:m.text }); if (DEX.redraw) DEX.redraw(); }
  if ($('sitePanel').hidden && !replay.active) recordCard(m); }
// ---- 마을 성장(로드맵 34): 누적 방문(해금 상태 visits)으로 레벨 1~5(p3.js TOWN_LEVEL_AT). 레벨이 오르면 빈 자리에 장식이 늘고 대문 위 별이 는다(placeDecor GROWTH). 데모는 Lv.3
let townLevelSet=false;
function setTownLevel(lv){ lv=Math.max(1,Math.min(5,lv|0)); const el=$('townLv'); el.hidden=lv<2; el.textContent=`Lv.${lv}`; el.title=lv>=5?L("누적 방문 10만 명 · 마을이 다 자랐어요"):L("마을 레벨 · 누적 방문 {0}명 이상. 다음 레벨은 {1}명부터예요", {0:TOWN_LEVEL_AT[lv].toLocaleString(), 1:TOWN_LEVEL_AT[lv+1].toLocaleString()});
  if (lv===ENGINE.TOWN_LEVEL){ townLevelSet=true; return; } const up=lv>ENGINE.TOWN_LEVEL && townLevelSet; setTownLevelValue(lv); townLevelSet=true; placeDecor(); A.ground=buildGround(THEMES[ENGINE.THEME_KEY].decor.ground);
  if (up){ pop($('town'),'flash'); sfx('unlock'); addFeed([L("마을이 "), {b:`Lv.${lv}`}, L("로 자랐어요 · 누적 방문 {0}명. 장식이 늘었어요.", {0:TOWN_LEVEL_AT[lv].toLocaleString()})],'star','',Date.now(),'sys unlock'); } }
if (!LIVE){ setTownLevel(3); world.vitals={ '/search':{ LCP:{ p75:4800, n:12 }, INP:{ p75:620, n:12 }, CLS:{ p75:.08, n:12 }, level:'poor' } }; } // 데모: 도서관이 느린 페이지 예시
// ---- 퍼널(로드맵 30): 고른 건물 순서대로 다음 단계로 넘어간 비율·떠난 비율. 재료는 발자국과 같은 서버 trails(최근 2시간 이동, 반감기 30분 가중). 데모는 기록(REC)으로 같은 계산. "지도에 표시"면 길 위에 금색 띠(p5.js drawFunnel)
const FUNNEL={ steps:(lsGet('vt_funnel')||{}).steps||null, show:!!(lsGet('vt_funnel')||{}).show, moves:null, at:0 };
function funnelDefault(){ const by=k=>BUILDINGS.find(b=>b.kind===k)?.path; const s=[by('shop'),by('checkout')].filter(Boolean); return s.length>=2?s:BUILDINGS.slice(1,3).map(b=>b.path); }
async function funnelMoves(force){ if (!force && FUNNEL.moves && Date.now()-FUNNEL.at<60000) return FUNNEL.moves; let moves;
  if (LIVE){ moves=(await live.api(`/api/sites/${encodeURIComponent(CONN.site)}/trails`)).moves||[]; } else moves=movesFrom(REC.map(r=>r.ev), Date.now());
  FUNNEL.moves=moves; FUNNEL.at=Date.now(); return moves; }
function movesFrom(events, now, halfLife=1800){ const pos=new Map(), acc=new Map(), tau=halfLife/Math.LN2*1000; const add=(f,t,at)=>{ if (f===t) return; const k=`${f||''}\n${t||''}`; acc.set(k,(acc.get(k)||0)+Math.exp(-Math.max(0,now-at)/tau)); };
  for (const ev of events){ const pr=ev.properties||{}; if (pr.bot||ev.event_type==='note') continue; const t=Date.parse(ev.timestamp)||now, type=ev.event_type, cur=pos.get(ev.session_id);
    if (type==='page_leave'){ if (cur!==undefined){ add(cur,null,t); pos.delete(ev.session_id); } continue; } if (type==='heartbeat') continue;
    const to=(type==='session_start'||type==='page_view')?store.resolvePath(ev.page_path):cur; if (cur===undefined){ if (type==='session_start') add(null,to,t); pos.set(ev.session_id,to); } else if (to!==cur){ add(cur,to,t); pos.set(ev.session_id,to); } }
  return [...acc].map(([k,w])=>{ const [f,t]=k.split('\n'); return { from:f||null, to:t||null, w }; }); }
function funnelCalc(moves, steps){ const sum=(f,t)=>moves.filter(m=>m.from===f&&(t===undefined||m.to===t)).reduce((s,m)=>s+m.w,0); const edges=[];
  for (let i=0;i<steps.length-1;i++){ const out=sum(steps[i]), next=sum(steps[i],steps[i+1]), left=sum(steps[i],null); edges.push({ out, next, pct:out?next/out*100:0, drop:out?left/out*100:0, elsewhere:out?Math.max(0,100-(next+left)/out*100):0 }); } return edges; }
function funnelApply(edges){ world.funnel=FUNNEL.show&&FUNNEL.steps&&FUNNEL.steps.length>=2?{ steps:FUNNEL.steps, edges }:null; }
function funnelRestore(){ if (!FUNNEL.show || !FUNNEL.steps || FUNNEL.steps.length<2) return; funnelMoves(true).then(m=>funnelApply(funnelCalc(m, FUNNEL.steps))).catch(()=>{}); }
setInterval(()=>{ if (world.funnel && !replay.active) funnelRestore(); }, 120000);
function stFunnelHtml(){ const steps=FUNNEL.steps&&FUNNEL.steps.length>=2&&FUNNEL.steps.every(p=>BY_PATH.has(p))?FUNNEL.steps:funnelDefault(); FUNNEL.steps=steps;
  const opt=sel=>L("<option value=\"\">(없음)</option>")+BUILDINGS.map(b=>`<option value="${b.path}"${b.path===sel?' selected':''}>${esc(b.name)}</option>`).join('');
  return L("<p class=\"st-sub\">고른 건물 순서대로, 각 단계에서 다음 단계로 넘어간 비율과 마을을 떠난 비율이에요. 발자국과 같은 재료(최근 2시간 이동, 반감기 30분 가중)라 '최근 흐름'을 보여 줘요.</p>\n    <div class=\"row fn-steps\">{0}</div>\n    <label class=\"toggle\"><input type=\"checkbox\" id=\"fnShow\"{1}>지도에 표시 <span class=\"muted\">(금색 띠 굵기 = 넘어간 비율, 건물 위 금색 숫자 = 넘어온 %, 빨간 숫자 = 떠난 %)</span></label>\n    <div id=\"fnBody\"><p class=\"st-sub\">불러오는 중…</p></div>", {0:[0,1,2,3].map(i=>L("<select data-fn=\"{0}\" aria-label=\"{1}단계\">{2}</select>", {0:i, 1:i+1, 2:opt(steps[i]||'')})).join('<span class="muted">→</span>'), 1:FUNNEL.show?' checked':''}); }
function fnRows(edges, steps){ if (edges.length<1) return L("<p class=\"st-sub\">단계를 두 개 이상 골라 주세요.</p>"); if (edges.every(e=>!e.out)) return L("<p class=\"st-sub\">최근 2시간 안에 첫 단계에서 움직인 사람이 없어요.</p>");
  return `<div class="bars fn">${edges.map((e,i)=>L("<span>{0} → {1}</span><div class=\"bar\"><span style=\"width:{2}%\"></span></div><span class=\"n\">{3}%</span><span class=\"muted fn-sub\">떠남 {4}% · 다른 곳 {5}% · 이동 가중치 {6}</span>", {0:esc(BY_PATH.get(steps[i])?.name||steps[i]), 1:esc(BY_PATH.get(steps[i+1])?.name||steps[i+1]), 2:Math.min(100,Math.round(e.pct)), 3:Math.round(e.pct), 4:Math.round(e.drop), 5:Math.round(e.elsewhere), 6:e.out.toFixed(1)})).join('')}</div>`; }
async function stFunnelBind(root){ const steps=()=>[...root.querySelectorAll('[data-fn]')].map(s=>s.value).filter(Boolean), save=()=>lsSet('vt_funnel', { steps:FUNNEL.steps, show:FUNNEL.show });
  const apply=async(force)=>{ FUNNEL.steps=steps(); save(); let moves; try { moves=await funnelMoves(force); } catch(e){ const b=$('fnBody'); if (b) b.innerHTML=`<p class="err">${esc(errText(e,L("이동 기록을 읽지 못했어요")))}</p>`; return; } const edges=funnelCalc(moves, FUNNEL.steps); const b=$('fnBody'); if (b) b.innerHTML=fnRows(edges, FUNNEL.steps); funnelApply(edges); };
  root.querySelectorAll('[data-fn]').forEach(s=>s.addEventListener('change', ()=>apply(false))); $('fnShow').addEventListener('change', e=>{ FUNNEL.show=e.target.checked; save(); apply(false); }); await apply(true); }
$('rpShare').addEventListener('click', () => { if (EXP.on) return cancelExport(); EXP.share=true; startExport(); });
// ---- 효과음: src/sfx.js(SOUNDS·synth)로 합성, 파일 없음. 기본 꺼짐(vt_sound). 임베드는 무음, 방문자 소리는 리플레이 중 무음. 같은 소리 간격은 SOUNDS의 gap.
// 소리를 들어 보고 고치는 곳은 /design-system/#/sound. force는 하단 '소리'가 꺼져 있어도 울린다(이벤트 설정 미리 듣기·끄기 소리)
const SND={ on:false }, VISIT_SND=new Set(['enter','leave','bot','coin','chime','blip']);
function sfx(name, force){ if (!force && (!SND.on || (replay.active && VISIT_SND.has(name)))) return; try { synth.play(name); } catch {} }
document.addEventListener('click', e=>{ const b=e.target.closest?.('.btn,.pxs-btn,.menu-btn'); if (b && !b.disabled) sfx('click'); }, true);
document.addEventListener('change', e=>{ const t=e.target; if (t.type==='checkbox' && t.id!=='chkSound') sfx(t.checked?'on':'off'); }, true);
const chkSound=$('chkSound'); chkSound.addEventListener('change', ()=>{ SND.on=chkSound.checked; lsSet('vt_sound', SND.on||null); sfx(SND.on?'on':'off', true); }); if (lsGet('vt_sound')){ chkSound.checked=true; SND.on=true; }
// ---- PWA: 매니페스트 + 최소 서비스워커(오프라인 캐시 없음). 폰 홈 화면에 설치하면 전체화면처럼 뜬다
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('/sw.js').catch(()=>{});
// ---- 알림 (a) 한동안 이벤트가 없으면 "추적 스크립트가 빠진 것 같아요" 배너. 서버 스냅샷의 lastEventAt으로 시작해 이벤트마다 갱신. ?quiet=밀리초 는 테스트용
const QUIET_MS = +(new URLSearchParams(location.search).get('quiet')) || 30*60000;
const warnBar=$('warnBar'); let quietShown=false, quietSnoozed=0, quietMsg='';
function quietCheck(){ const stale = LIVE && live.status==='live' && !replay.active && live.lastEventAt && Date.now()-live.lastEventAt>=QUIET_MS && live.lastEventAt!==quietSnoozed;
  if (!stale){ if (quietShown){ quietShown=false; quietMsg=''; hideEl(warnBar); } return; }
  const mins=Math.floor((Date.now()-live.lastEventAt)/60000); const msg=L("{0} 이벤트가 없어요. 추적 스크립트가 빠진 것 같아요.", {0:mins>=60?Math.floor(mins/60)+L("시간째"):mins>=1?mins+L("분째"):L("한동안")});
  if (msg!==quietMsg){ quietMsg=msg; say($('warnMsg'), msg); }
  if (!quietShown){ quietShown=true; showEl(warnBar); } }
setInterval(quietCheck, 5000);
$('warnCheck').addEventListener('click', () => { if (live.site) live.showInstall(live.site); });
$('warnClose').addEventListener('click', () => { quietSnoozed=live.lastEventAt; quietCheck(); }); // 다음 이벤트가 오면 다시 재는 셈
// ---- 알림 (b) 접속자가 기준에 닿거나 알림을 켠 이벤트(이벤트 설정, 기본은 구매)가 오면 브라우저 알림. 기본 꺼짐, 설정은 vt_notify. 리플레이 중엔 보내지 않는다
const NTF = { ok: 'Notification' in window, cfg: { on:false, n:10, ...(lsGet('vt_notify')||{}) }, last:{} };
const chkNotify=$('chkNotify'), ntfN=$('ntfN'), ntfBox=$('ntfBox');
if (!NTF.ok){ chkNotify.parentElement.hidden=true; } else { chkNotify.checked = NTF.cfg.on && Notification.permission==='granted'; ntfN.value=NTF.cfg.n; ntfBox.hidden=!chkNotify.checked; }
function saveNtf(){ NTF.cfg={ on:chkNotify.checked, n:Math.min(999,Math.max(1,+ntfN.value||10)) }; ntfN.value=NTF.cfg.n; lsSet('vt_notify',NTF.cfg); ntfBox.hidden=!chkNotify.checked; }
chkNotify.addEventListener('change', async () => { if (chkNotify.checked && Notification.permission!=='granted'){ let p='denied'; try { p=await Notification.requestPermission(); } catch {} if (p!=='granted'){ chkNotify.checked=false; note(L("브라우저가 알림을 막고 있어요. 주소창 옆 사이트 설정에서 알림을 허용해 주세요.")); } }
  saveNtf(); if (chkNotify.checked) notify(L("알림을 켰어요"), L("접속자 {0}명부터, 그리고 알림을 켠 이벤트(기본: 구매)가 오면 알려 드릴게요.", {0:NTF.cfg.n}), 'on'); });
ntfN.addEventListener('change', saveNtf);
function notify(title, body, tag){ if (!NTF.ok || !NTF.cfg.on || Notification.permission!=='granted' || replay.active) return; const now=Date.now(); if (now-(NTF.last[tag]||0)<3000) return; NTF.last[tag]=now;
  try { const n=new Notification(title, { body, tag:'vt-'+tag, icon:A.iconUrl.house }); n.onclick=()=>{ window.focus(); n.close(); }; } catch {} }
$('btnReplay').addEventListener('click', () => replay.active ? exitReplay() : startReplay());
$('rpExit').addEventListener('click', exitReplay);
$('rpRange').addEventListener('change', () => { if (replay.active) { exitReplay(); startReplay(); } });
$('rpSpeed').addEventListener('change', () => { replay.rate=+$('rpSpeed').value; if (replay.active) $('rpRate').textContent=$('rpRate').textContent.replace(/^\d+x/, replay.rate+'x'); });
$('rpPlay').addEventListener('click', () => { if (EXP.on) return; if (replay.cur >= replay.t1) seekReplay(replay.t0); replay.playing = !replay.playing; $('rpPlay').textContent = replay.playing ? '❚❚' : '▶'; });
$('rpSeek').addEventListener('input', e => { if (EXP.on) return; const t = replay.t0 + (replay.t1 - replay.t0) * (+e.target.value / 1000); seekReplay(t); });
// ?export=yesterday 로 열면 연결되자마자 어제 하루를 리플레이해 영상으로 저장한다(아침 슬랙용 자동화: Playwright 등으로 열어 두고 다운로드만 받으면 된다)
const AUTO_EXPORT = new URLSearchParams(location.search).get('export'); let autoExported=false;
async function autoExport(){ if (autoExported || !AUTO_EXPORT || !LIVE || !EXP_OK) return; autoExported=true; const sel=$('rpRange'); const i=[...sel.options].findIndex(o=>o.value===AUTO_EXPORT); if (i<0) return; sel.selectedIndex=i; sel.dispatchEvent(new Event('pxs-refresh')); await startReplay(); if (replay.active && REC.length) startExport(); }

// 메인 루프
const emptyEl=$('empty');
let last=performance.now(), lastOnline=-1; // 헤더 숫자(접속자·봇·이벤트)는 React(HeaderStats)가 스토어를 250ms로 묶어 구독한다. 여기서는 알림 기준과 TV 숫자만 본다
function frame(now){ const gap=(now-last)/1000, dt=Math.max(0,Math.min(.05,gap)); last=now; const sdt=dt*speed;
  // 다른 탭에 있으면 rAF가 멈춰 이벤트만 쌓인다. 돌아왔을 때 밀린 걸음을 한꺼번에 걷지 않게 모두 지금 자리에 세우고, 발자국 감쇠도 밀린 만큼 적용한다
  if (gap>1 && !replay.active){ world.syncFromStore(); world.decayHeat(gap); }
  if (replay.active){ const rate=EXP.on?EXP.rate:replay.rate; if (LIVE) store.expire(); if (replay.playing){ replay.cur=Math.min(replay.t1, replay.cur+dt*rate); applyUntil(replay.cur); view.expire(); if (replay.cur>=replay.t1){ replay.playing=false; $('rpPlay').textContent='▶'; } }
    world.update(dt*Math.min(rate,10)); $('rpSeek').value=Math.round((replay.cur-replay.t0)/Math.max(1,replay.t1-replay.t0)*1000); $('rpTime').textContent=recTime(replay.cur); }
  else { if (!LIVE) sim.tick(sdt); else store.expire(); world.update(sdt); tickDemoWeather(dt); } bgmTick(dt); tickSeason(dt);
  world.render(townClock());
  if (EXP.on){ drawExport(); if (!replay.playing) finishExport(); } // 끝까지 돌면 마지막 프레임까지 그리고 저장
  const ph=townClock(), hh=Math.floor(ph*24), mm=Math.floor((ph*24-hh)*60/10)*10; ui.set({ clock:`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}` });
  if (store.online!==lastOnline){ if (lastOnline>=0 && lastOnline<NTF.cfg.n && store.online>=NTF.cfg.n) notify(L("접속자가 {0}명이에요", {0:store.online}), L("기준 {0}명에 닿았어요.", {0:NTF.cfg.n}), 'online'); lastOnline=store.online; if (TV.on) $('tvN').textContent=lastOnline; }
  emptyEl.hidden = !(view.sessions.size===0 && world.chars.size===0); tickZoom(); tickFollow(); drawMini();
  requestAnimationFrame(frame); }
requestAnimationFrame(frame);
if (CONN.gate) { showGate(); live.setStatus('demo',L("시작 화면")); } else if (LIVE) live.connect(); else live.setStatus('demo',L("데모 모드 · 가상 방문자"));

// 불변식: 건물별 인원 합계 == 사람 접속자 수
setInterval(() => { const sum=Object.values(store.counts).reduce((a,b)=>a+b,0); if (sum!==store.online) console.error('count mismatch', sum, store.online); }, 2000);

/* 실제 서버 연결로 바꿀 때: 시뮬레이터 대신 아래처럼 store.apply만 호출하면 된다.
function connectRealtime(url){ const es=new EventSource(url); es.onmessage=e=>store.apply(JSON.parse(e.data)); es.onerror=()=>setTimeout(()=>connectRealtime(url),3000); }
// 스냅샷 복원: GET /api/sites/:id/state → events.forEach(store.apply) 후 connectRealtime('/api/sites/:id/stream')
// 방문자 속성은 SDK가 session_start의 properties에 넣는다: { device, returning, referrer, plan, bot }
*/

// 테스트·콘솔용 손잡이(tests/smoke.test.js가 store·live·showStats를 본다). 모듈 스코프라 전역에 바로 보이지 않아서
window.__vt = { store, get view(){ return view; }, world, ui, sim, live, replay, showStats, showDex, applyTheme, startReplay, exitReplay };
}
