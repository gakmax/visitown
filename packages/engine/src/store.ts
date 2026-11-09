import type { VtEvent, Session, StoreChange, Listener, PageMapping, EventConfig } from './types';
import { BUILDINGS, BY_PATH, FALLBACK_PATH } from './map';
import { PAL } from './palette';

/* ---------- 4. STATE STORE (세션 맵 + 건물별 인원). 렌더러와 분리. 실제 SSE도 store.apply(event)만 호출하면 된다 ---------- */
export const EVENT_LABEL = { session_start:'입장', page_view:'페이지 이동', heartbeat:'하트비트', page_leave:'퇴장', timeout:'연결 끊김' };
// 커스텀 이벤트 표현. 내장 기본값(EV_DEFAULTS) 위에 사이트 설정(서버 sites.event_config, SSE snapshot.eventTypes·eventtypes)을 덮는다.
// 처음 보는 이름은 이름 그대로 + 번개. 효과·소리 id는 server/store.js의 EFFECTS·SOUNDS와 같다
export const SYS_EV = new Set(['session_start','page_view','heartbeat','page_leave']);
export const EV_EFFECTS = { star:{ name:'별', icon:'star', burst:'stars' }, coin:{ name:'동전', icon:'coin', burst:'coins' }, firework:{ name:'폭죽', icon:'firework', burst:'fireworks' }, heart:{ name:'하트', icon:'heart', burst:'stars' }, cart:{ name:'장바구니', icon:'cart', burst:'stars' }, mail:{ name:'편지', icon:'mail', burst:'stars' }, search:{ name:'돋보기', icon:'search', burst:null }, bolt:{ name:'번개', icon:'bolt', burst:'stars' }, fire:{ name:'불 (건물에 불, 캐릭터 넘어짐)', icon:'fire', burst:'smoke' }, none:{ name:'지도에 안 보임', icon:null, burst:null } };
export const EV_SOUNDS = { none:'소리 없음', coin:'동전', chime:'차임', blip:'삑' };
export const EV_BASE = { label:'', effect:'bolt', sound:'none', notify:false, value:false, feed:true };
export const EV_DEFAULTS = { search:{ label:'검색', effect:'search' }, product_click:{ label:'상품 클릭', effect:'star' }, sign_up:{ label:'회원가입', effect:'firework', sound:'chime' }, purchase:{ label:'구매', effect:'coin', sound:'coin', notify:true, value:true }, js_error:{ label:'오류', effect:'fire' }, greet:{ label:'인사', effect:'none' } }; // greet: 미니 위젯 이모지 인사(로드맵 37). 지도 효과 대신 이모지 말풍선(p5.js customEffect)
export let EV_CFG = new Map<string, EventConfig>();
export function setEventConfig(list){ EV_CFG = new Map((list||[]).map(c=>[c.type,c])); }
export function evDefault(type){ return { ...EV_BASE, label:type, ...(EV_DEFAULTS[type]||{}) }; }
export function evMeta(type: string){ const d=evDefault(type), c: Partial<EventConfig>=EV_CFG.get(type)||{}; const m={ ...d }; for (const k of Object.keys(EV_BASE)) if (c[k]!==undefined && c[k]!=='') m[k]=c[k]; m.renamed=!!c.label; return m; }
export function evLabel(type){ return EVENT_LABEL[type] || evMeta(type).label; }
export const PROP_LABEL = { device:{ mobile:'모바일', desktop:'PC', tablet:'태블릿' }, referrer:{ search:'검색 유입', social:'SNS 유입', direct:'직접 방문', ad:'광고 유입' }, plan:{ pro:'유료 회원', free:'일반' } };
export const BOTS = [ { name:'GOOGLE', ua:'Googlebot', w:5 }, { name:'BING', ua:'Bingbot', w:2 }, { name:'GPT', ua:'GPTBot', w:2 }, { name:'NAVER', ua:'Yeti', w:3 } ];
// 캠페인 표식 이름: utm_campaign이 없으면 utm_source. 깃발 색은 이름의 해시로 정해 같은 캠페인은 같은 색
export function campaignOf(pr){ const c=pr.utm_campaign||pr.utm_source; return c ? String(c).slice(0,40) : null; }
export const CAMPAIGN_COLS=['gold','red','water2','leaf','roofLilac','pink','roofBlue','wood'];
export function campaignColor(name){ let h=0; for (const ch of String(name)) h=(h*31+ch.charCodeAt(0))>>>0; return PAL[CAMPAIGN_COLS[h%CAMPAIGN_COLS.length]]; }
export function sessionCode(id){ let h=0; for(const ch of id) h=(h*31+ch.charCodeAt(0))>>>0; return String.fromCharCode(65+h%26)+String(h%100).padStart(2,'0'); }
export function josa(code, pair){ const d=code[code.length-1]; const open='2459'.includes(d); return pair[open?0:1]; }

export class TownStore {
  now: () => number; ttl: number; isMe: (sid: string) => boolean; sessions: Map<string, Session>; counts: Record<string, number>; seen: Set<string>; seenQ: string[]; totalEvents: number; duplicates: number; stale: number; listeners: Set<Listener>;
  pages?: { path: string; re: RegExp | null }[]; bots = 0; homeCountry: string | null = null; frozen = false; selectedId: string | null = null;
  // isMe: 세션이 '나'(대시보드 주인이 자기 사이트를 볼 때)인지. UI 전역(ME_SID)을 엔진이 읽지 않도록 넣어 준다
  constructor({ now = () => Date.now(), ttl = 45000, isMe = () => false }: { now?: () => number; ttl?: number; isMe?: (sid: string) => boolean } = {}) {
    this.now = now; this.ttl = ttl; this.isMe = isMe;
    this.sessions = new Map(); this.counts = {}; this.seen = new Set(); this.seenQ = [];
    this.totalEvents = 0; this.duplicates = 0; this.stale = 0; this.listeners = new Set();
    for (const b of BUILDINGS) this.counts[b.path] = 0;
  }
  on(fn: Listener){ this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  subscribe(fn: Listener){ return this.on(fn); }
  emit(change: StoreChange){ for (const fn of this.listeners) fn(change); }
  // 선택된 캐릭터·건물 id(migration.md 2절): 캔버스 클릭도 피드 클릭도 여기에 쓰고, 정보 패널·따라가기는 이 값만 본다
  select(id: string | null){ if (id === this.selectedId) return; this.selectedId = id; this.emit({ type:'select', id }); }
  // 실제 연동: 서버가 준 사이트별 매핑(패턴 → 건물 키). 건물 키 자체(서버 스냅샷의 page)는 그대로 통과, 어디에도 안 맞으면 광장.
  setPages(pages: PageMapping[] | null | undefined){ this.pages = (pages||[]).map(pg => { let re=null; if (pg.pattern) { try { re=new RegExp(pg.pattern); } catch {} } return { path: pg.path, re }; }); }
  // 건물 목록(layoutTown)이 바뀐 뒤: 인원표를 새 건물 키로 다시 만들고, 사라진 건물에 있던 세션은 원래 경로로 다시 배정한다
  setBuildings(){ this.counts = {}; for (const b of BUILDINGS) this.counts[b.path] = 0; for (const s of this.sessions.values()) if (!BY_PATH.has(s.page)) s.page = this.resolvePath(s.path || s.page); this.recount(); }
  resolvePath(p: string): string{ if (BY_PATH.has(p)) return p; if (this.pages) { for (const pg of this.pages) if (pg.re ? pg.re.test(p) : pg.path === p) return BY_PATH.has(pg.path) ? pg.path : FALLBACK_PATH; } return FALLBACK_PATH; }
  remember(id: string){ this.seen.add(id); this.seenQ.push(id); if (this.seenQ.length > 5000) this.seen.delete(this.seenQ.shift()); }
  create(ev: VtEvent, ts: number){ const pr: Record<string, any> = ev.properties || {}; const s: Session = { id: ev.session_id, code: sessionCode(ev.session_id), page: this.resolvePath(ev.page_path), path: ev.path || ev.page_path, startedAt: ev.started_at || Date.now(), lastSeen: this.now(), lastTs: ts, events: [], seed: Math.random(),
      props: { device: pr.device || 'desktop', returning: !!pr.returning, referrer: pr.referrer || 'direct', plan: pr.plan || 'free', me: !!pr.me || this.isMe(ev.session_id), country: /^[A-Z]{2}$/.test(pr.country||'') ? pr.country : null,
        campaign: campaignOf(pr), utm_source: pr.utm_source || null, utm_medium: pr.utm_medium || null, utm_campaign: pr.utm_campaign || null,
        rare: RARE_BY_KEY[pr.rare] ? pr.rare : null, visitNo: Number.isFinite(pr.visit_no) ? pr.visit_no : null }, bot: pr.bot || null };
    this.sessions.set(s.id, s); return s; }
  apply(ev: VtEvent){
    if (!ev || !ev.event_id || !ev.session_id) return;
    if (this.seen.has(ev.event_id)) { this.duplicates++; this.emit({ type:'duplicate', event: ev }); return; }
    if (ev.event_type === 'note') { this.remember(ev.event_id); this.emit({ type:'note', event: ev }); return; } // 리플레이 메모: 세션도 숫자도 아니다
    this.remember(ev.event_id); this.totalEvents++;
    const ts = Date.parse(ev.timestamp) || Date.now();
    let s = this.sessions.get(ev.session_id);
    const changes: StoreChange[] = []; const type = ev.event_type;
    if (type === 'page_leave') { if (s) { this.sessions.delete(s.id); changes.push({ type:'leave', session:s, reason: (ev.properties && ev.properties.reason === 'timeout') ? 'timeout' : 'leave' }); } }
    else if (type === 'session_start' || type === 'page_view' || type === 'heartbeat') {
      if (!s) { s = this.create(ev, ts); changes.push({ type:'enter', session:s }); }
      else if (type !== 'heartbeat' && ev.page_path) {
        if (ts < s.lastTs) { this.stale++; }
        else { s.path = ev.path || ev.page_path; const to = this.resolvePath(ev.page_path); if (to !== s.page) { const from = s.page; s.page = to; changes.push({ type:'move', session:s, from, to }); } } } }
    else { if (!s) { s = this.create(ev, ts); changes.push({ type:'enter', session:s }); } changes.push({ type:'custom', session:s, event:type, props: ev.properties||{} }); }
    if (s && this.sessions.has(s.id)) { s.lastSeen = this.now(); s.lastTs = Math.max(s.lastTs, ts); if (type !== 'heartbeat') { s.events.push({ type, at: ts, page: ev.page_path }); if (s.events.length > 8) s.events.shift(); } }
    this.recount();
    this.emit({ type:'event', event: ev, session: s, moved: changes.some(c => c.type === 'move') });
    for (const c of changes) this.emit(c);
  }
  reset(){ this.sessions.clear(); this.seen.clear(); this.seenQ.length = 0; this.bots = 0; this.recount(); }
  expire(){ if (this.frozen) return; const now = this.now(); for (const s of [...this.sessions.values()]) if (now - s.lastSeen > this.ttl) { this.sessions.delete(s.id); this.recount(); this.emit({ type:'leave', session:s, reason:'timeout' }); } }
  recount(){ for (const k in this.counts) this.counts[k] = 0; let bots = 0; const cc: Record<string, number> = {}; for (const s of this.sessions.values()) { if (s.bot) { bots++; continue; } this.counts[s.page] = (this.counts[s.page] || 0) + 1; if (s.props.country) cc[s.props.country] = (cc[s.props.country] || 0) + 1; } this.bots = bots;
    let home: string | null = null, best = 0; for (const k in cc) if (cc[k] > best) { best = cc[k]; home = k; } this.homeCountry = (best >= 2 && best * 2 > this.sessions.size - bots) ? home : null; }
  get online(){ return this.sessions.size - (this.bots || 0); }   // 사람만. 봇은 따로 센다
  recentCount(path: string, windowMs: number){ const t = Date.now() - windowMs; let n = 0; for (const s of this.sessions.values()) if (s.page === path && !s.bot) for (const e of s.events) if (e.at >= t) n++; return n; }
}

/* ---------- 5. SIMULATOR: 서버 이벤트 형식을 흉내내는 가상 방문자 ---------- */
export const TRANSITIONS = {
  '/':          [['/products',38],['/search',16],['/community',14],['/mypage',6],['/checkout',2],['leave',14],['search',6],['/',4]],
  '/products':  [['product_click',40],['/checkout',14],['/',10],['/search',8],['/products',6],['leave',22]],
  '/search':    [['search',40],['/products',28],['/community',8],['/',8],['leave',16]],
  '/community': [['sign_up',12],['/',16],['/products',12],['/mypage',10],['/community',10],['leave',40]],
  '/mypage':    [['sign_up',16],['/products',24],['/',18],['/community',10],['leave',32]],
  '/checkout':  [['purchase',52],['/products',16],['/',10],['leave',22]],
};
// 희귀 방문자(로드맵 36) 종류. 판정은 서버(server/unlocks.js RARES, 같은 값)가 하고 세션 props.rare·visit_no로 온다. 데모는 randomProps가 가끔 섞는다
export const RARE_DEFS = [
  { key:'first', name:'첫 손님', text:'이 사이트의 첫 번째 방문자', icon:'heart' },
  { key:'milestone', name:'기념 손님', text:'100 · 500 · 1,000 · 7,777번째처럼 특별한 번호의 방문자', icon:'star' },
  { key:'pioneer', name:'개척자', text:'처음 보는 나라에서 온 첫 방문자', icon:'firework' },
  { key:'owl', name:'올빼미', text:'새벽 3시대에 들어온 방문자', icon:'moon' },
];
export const RARE_BY_KEY = Object.fromEntries(RARE_DEFS.map(r=>[r.key,r]));
export function rareLabel(pr){ const d=RARE_BY_KEY[pr?.rare]; if (!d) return ''; return pr.rare==='milestone'&&pr.visitNo ? `${pr.visitNo.toLocaleString()}번째 방문자` : d.name; }
export const PERSONAS = [
  { name:'shopper',  w:4, bias:{ '/products':1.6, '/checkout':1.8, product_click:1.4, purchase:1.3, leave:.7 } },
  { name:'browser',  w:4, bias:{ '/search':1.4, search:1.4, '/products':1.2, leave:.9 } },
  { name:'social',   w:2, bias:{ '/community':2.2, sign_up:1.4, '/mypage':1.3, leave:.8 } },
  { name:'bouncer',  w:2, bias:{ leave:3, product_click:.6 } },
];
export function pick(list){ let t=0; for (const [,w] of list) t+=w; let r=Math.random()*t; for (const [v,w] of list){ r-=w; if (r<=0) return v; } return list[0][0]; }
export function randomProps(){ const utm=pick([['nov_sale',1],['insta_reel',1],[null,10]]); const rare=pick([['milestone',1],['pioneer',1],['owl',1],[null,45]]); return { ...(utm?{ utm_campaign:utm, utm_source:utm==='insta_reel'?'instagram':'newsletter' }:{}), ...(rare?{ rare, visit_no: rare==='milestone'?pick([[1000,3],[500,2],[7777,1],[10000,1]]):undefined }:{}), device: pick([['desktop',55],['mobile',40],['tablet',5]]), returning: Math.random()<0.35, referrer: pick([['direct',40],['search',30],['social',20],['ad',10]]), plan: Math.random()<0.15?'pro':'free', country: pick([['KR',58],['US',10],['JP',8],['CN',4],['TW',3],['VN',3],['GB',2],['DE',2],['IN',2],['BR',1],['FR',1],['ID',1],['CA',1],['AU',1],['PT',1],[null,2]]) }; }

export class Simulator {
  store: TownStore; running: boolean; target: number; clock: number; visitors: Map<string, any>; spawnAcc: number; seq: number; botsOn: boolean; botAcc: number; onSend?: (ev: VtEvent) => void;
  constructor(store: TownStore){ this.store=store; this.running=true; this.target=18; this.clock=0; this.visitors=new Map(); this.spawnAcc=0; this.seq=0; this.botsOn=true; this.botAcc=0; }
  get clockMs(){ return this.clock*1000; }
  newEvent(v: any, type: string, page?: string, props?: Record<string, any>): VtEvent{ return { event_id:`evt_${(++this.seq).toString(36)}_${Math.random().toString(36).slice(2,6)}`, site_id:'site_demo', session_id:v.id, event_type:type, page_path:page ?? v.page, timestamp:new Date().toISOString(), properties:props||{} }; }
  send(ev){ this.onSend?.(ev); this.store.apply(ev); if (Math.random()<0.03) this.store.apply(ev); }
  snapshotEvents(){ return [...this.visitors.values()].map(v => this.newEvent(v,'session_start',v.page,v.props)); } // 재연결 시 서버 스냅샷에 해당 // 3%는 재전송(중복) 흉내 → store가 무시해야 함
  spawn(extra: Record<string, any> = {}){ const persona=extra.persona||pick(PERSONAS.map(p=>[p,p.w])); const entry=extra.page||pick([['/',70],['/products',20],['/search',6],['/community',4]]);
    const v={ id:'sess_'+Math.random().toString(36).slice(2,10), page:entry, persona, nextAt:this.clock+this.dwell(), hbAt:this.clock+15, dieAt:this.clock+30+Math.random()*120, ghost:Math.random()<0.1, props:{...randomProps(),...(extra.props||{})} };
    if (extra.me){ v.ghost=false; v.dieAt=this.clock+240; }
    this.visitors.set(v.id,v); this.send(this.newEvent(v,'session_start',entry,v.props)); this.send(this.newEvent(v,'page_view',entry)); return v; }
  spawnBot(){ const bot=pick(BOTS.map(b=>[b,b.w])); const pages=['/','/products','/search','/community','/mypage']; const v={ id:'bot_'+Math.random().toString(36).slice(2,10), page:pages[Math.floor(Math.random()*pages.length)], bot:bot.name, crawl:[...pages].sort(()=>Math.random()-.5), nextAt:this.clock+1.5, hbAt:this.clock+15, dieAt:this.clock+8+Math.random()*12, ghost:true, props:{bot:bot.name, ua:bot.ua, device:'desktop'} };
    this.visitors.set(v.id,v); this.send(this.newEvent(v,'session_start',v.page,v.props)); return v; }
  dwell(){ return 3+Math.random()*12; }
  leave(v: any, forced?: boolean){ this.visitors.delete(v.id); if (v.bot){ this.send(this.newEvent(v,'page_leave')); return; } if (v.ghost && !forced) return; this.send(this.newEvent(v,'page_leave')); }
  act(v){ if (v.bot){ if (this.clock>v.dieAt || !v.crawl.length){ this.leave(v,true); return; } const p=v.crawl.pop(); if (p!==v.page){ v.page=p; this.send(this.newEvent(v,'page_view',p)); } v.nextAt=this.clock+1.2+Math.random()*2; return; }
    const opts=TRANSITIONS[v.page].map(([a,w])=>[a, w*(v.persona.bias[a]||1)]); let a=pick(opts); if (this.clock>v.dieAt) a='leave';
    if (a==='leave') { this.leave(v); return; }
    if (a.startsWith('/')) { if (a!==v.page) { v.page=a; this.send(this.newEvent(v,'page_view',a)); } } else this.send(this.newEvent(v,a));
    v.nextAt=this.clock+this.dwell(); }
  fire(v){ const custom=TRANSITIONS[v.page].filter(([a])=>!a.startsWith('/')&&a!=='leave'); const a=custom.length?custom[0][0]:'search'; this.send(this.newEvent(v,a)); }
  humans(){ return [...this.visitors.values()].filter(v=>!v.bot); }
  tick(dt){ if (!this.running) return; this.clock+=dt;
    const n=this.humans().length;
    if (n<this.target){ const rate=0.25+Math.min(2.5,(this.target-n)*0.25); this.spawnAcc+=dt*rate; while(this.spawnAcc>=1){ this.spawnAcc-=1; this.spawn(); } }
    else { this.spawnAcc=0; if (n>this.target && Math.random()<dt*Math.min(3,(n-this.target)*0.4+0.3)) { const hs=this.humans().filter(v=>!v.props.me); if (hs.length) this.leave(hs[Math.floor(Math.random()*hs.length)],true); } }
    if (this.botsOn && this.target>0){ this.botAcc+=dt; if (this.botAcc>14+Math.random()*10){ this.botAcc=0; this.spawnBot(); } }
    for (const v of [...this.visitors.values()]){ if (this.clock>=v.hbAt){ v.hbAt+=15; if(!v.ghost||this.clock<v.dieAt-20) this.send(this.newEvent(v,'heartbeat')); } if (this.clock>=v.nextAt) this.act(v); }
    this.store.expire(); }
  addOne(){ this.spawn(); }
  removeOne(){ const vs=this.humans(); if (vs.length) this.leave(vs[Math.floor(Math.random()*vs.length)],true); }
  clearAll(){ for (const v of [...this.visitors.values()]) this.leave(v,true); }
  randomEvent(){ const vs=this.humans(); if (!vs.length) return; this.fire(vs[Math.floor(Math.random()*vs.length)]); }
  spawnMe(){ const old=this.humans().find(v=>v.props.me); if (old) this.leave(old,true); return this.spawn({ me:true, page:'/', props:{ me:true, device:'desktop', referrer:'direct', returning:false, plan:'free' }, persona:PERSONAS[1] }); }
}
