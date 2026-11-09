import { A, BUILDINGS, BY_PATH, CHIMNEY, DECOR, GATE, LAMPS, NODES, NO_LIGHT, SEASON, THEME_KEY, TOWN_LEVEL, findPath, mk } from './map';
import { H, PAL, W } from './palette';
import { EV_EFFECTS, RARE_BY_KEY, campaignColor, evMeta } from './store';
import type { TownStore } from './store';

/* ---------- 6. WORLD + RENDERER: store 변화를 받아 애니메이션만 담당 ---------- */
// 캔버스는 World 생성자로 받는다(DOM을 찾지 않는다). 모듈 변수인 이유: 그리기 함수 200여 곳이 ctx를 그대로 쓰고, 월드는 하나뿐이라서. Worker(47)에서는 OffscreenCanvas를 넣는다
let cv: HTMLCanvasElement; let ctx: CanvasRenderingContext2D;
export function canvasOf(){ return cv; }
export const WALK_SPEED = 30; export let dt_hint = 0.016;

export class World {
  store: TownStore; chars: Map<string, any>; particles: any[]; t: number; showBadges: boolean; showMarks: boolean; showBots: boolean; night: boolean; muted: boolean;
  weather: string; showWeather: boolean; wk: { rain: number; sunny: number; snow: number }; drops: any[]; flakes: any[]; showSeason: boolean; seasonAcc: number; rareAcc: number; sparkAcc: any;
  HW: number; HH: number; heat: Float32Array; heatCv: HTMLCanvasElement; heatCtx: CanvasRenderingContext2D; heatImg: ImageData; heatDirty: boolean; heatT: number; showHeat: boolean;
  dark: number; fires: any; funnel: any; stars: any; vitals: any; spots: any; onSelect: any;
  unsub: () => void;
  // 동작 줄이기(로드맵 57, prefers-reduced-motion): 캐릭터 걸음은 내용이라 남기고, 꾸밈 움직임(파티클·빗줄기·눈·반짝임·까딱이는 화살표·퍼널의 흐르는 점)만 끈다. 겉 화면(셸·임베드)이 matchMedia로 넣어 준다
  reduceMotion = false;
  // 보는 스토어 바꾸기(로드맵 54): 리플레이는 따로 만든 TownStore를 보여 주고, 그동안 라이브 스토어는 계속 쌓인다. 끝나면 다시 bind(라이브) + syncFromStore()
  bind(store: TownStore){ this.unsub?.(); this.store=store; this.unsub=store.on(c => this.onChange(c)); }
  constructor(store: TownStore, canvas: HTMLCanvasElement){ cv=canvas; ctx=cv.getContext('2d')!; ctx.imageSmoothingEnabled=false; this.store=store; this.chars=new Map(); this.particles=[]; this.t=0; this.showBadges=true; this.showMarks=true; this.showBots=true; this.night=true; this.muted=false;
    this.weather='clear'; this.showWeather=true; this.wk={ rain:0, sunny:0, snow:0 }; this.drops=[]; this.flakes=[]; this.showSeason=true; this.seasonAcc=0; this.rareAcc=0; /* 날씨(로드맵 35): 종류는 서버가 정하고 wk는 2초에 걸쳐 0↔1로 바뀌는 세기 */ this.sparkAcc={}; this.stars=Array.from({length:40},(_,i)=>[Math.floor((i*97)%W), Math.floor((i*53)%70), i%3]); this.unsub=store.on(c => this.onChange(c));
    // 발자국 히트맵: 사람의 건물 간 이동(입장·이동·퇴장)마다 그 길을 2px 격자에 찍는다(반감기 30분). 실시간이면 접속 때 서버가 보낸 최근 이동(trails)으로
    // 다시 채우므로 새로고침·탭·기기와 상관없이 같다. 캐릭터의 실제 걸음과는 무관. showHeat일 때만 땅 위에 그린다. 누적은 항상 해서 켜는 순간 바로 보인다
    this.HW=W/2; this.HH=H/2; this.heat=new Float32Array(this.HW*this.HH); this.heatCv=mk(this.HW, this.HH); this.heatCtx=this.heatCv.getContext('2d'); this.heatImg=this.heatCtx.createImageData(this.HW,this.HH); this.heatT=0; this.heatDirty=false; this.showHeat=false; }
  stamp(x,y,w=1){ const gx=Math.floor(x/2), gy=Math.floor(y/2), HW=this.HW, HH=this.HH, h=this.heat; if (gx<0||gy<0||gx>=HW||gy>=HH) return; h[gy*HW+gx]+=w; const n=w*.35; if (gx>0) h[gy*HW+gx-1]+=n; if (gx<HW-1) h[gy*HW+gx+1]+=n; if (gy>0) h[(gy-1)*HW+gx]+=n; if (gy<HH-1) h[(gy+1)*HW+gx]+=n; this.heatDirty=true; }
  // from/to는 건물 키, null이면 입구. 길찾기 노드를 이은 선을 2px마다 찍는다
  stampRoute(from,to,w=1){ const node=p=>{ if (p==null) return 'ENT'; const b=BY_PATH.get(this.store.resolvePath(p)); return b ? b.node : null; }; const a=node(from), b=node(to); if (!a||!b||a===b) return;
    const nodes=findPath(a,b); for (let i=1;i<nodes.length;i++){ const [x0,y0]=NODES[nodes[i-1]], [x1,y1]=NODES[nodes[i]]; const n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)/2)); for (let k=i===1?0:1;k<=n;k++) this.stamp(x0+(x1-x0)*k/n, y0+(y1-y0)*k/n, w); } }
  // 서버가 준 최근 이동으로 발자국을 통째로 다시 만든다. w는 서버가 이미 지금 시각 기준으로 감쇠한 값
  loadTrails(moves){ this.heat.fill(0); this.heatT=0; for (const m of moves||[]) this.stampRoute(m.from, m.to, m.w); this.heatDirty=true; }
  decayHeat(dt){ this.heatT+=dt; if (this.heatT<1) return; const k=Math.exp(-this.heatT/2600); this.heatT=0; const h=this.heat; let any=false; for (let i=0;i<h.length;i++){ if (h[i]>.02){ h[i]*=k; any=true; } else if (h[i]>0) { h[i]=0; any=true; } } if (any) this.heatDirty=true; }
  clearHeat(){ this.heat.fill(0); this.heatDirty=true; }
  paintHeat(){ const d=this.heatImg.data, h=this.heat; for (let i=0;i<h.length;i++){ const v=h[i]; const o=i*4; if (v<=0){ d[o+3]=0; continue; } const hot=Math.min(1,v/20); d[o]=120+Math.round(hot*50); d[o+1]=70-Math.round(hot*25); d[o+2]=40; d[o+3]=Math.round(140*(1-Math.exp(-v/8))); /* 한 번 지나간 길(v≈1.7)은 옅게(≈10%), 겹칠수록 진해지다 55%에서 멈춘다 */ } this.heatCtx.putImageData(this.heatImg,0,0); }
  reset(){ for (const ch of this.chars.values()) this.releaseSpot(ch); this.chars.clear(); this.particles.length=0; }
  // 스냅샷에서 즉시 복원: 걷는 연출 없이 각자 자리에 세운다 (리플레이 탐색, 재연결 복원용)
  syncFromStore(){ this.reset(); for (const s of this.store.sessions.values()){ const seedA=Math.floor(s.seed*6), seedB=Math.floor((s.seed*36)%6);
      const ch={ id:s.id, code:s.code, shape:seedA, color:seedB, x:0, y:0, dir:'down', state:'idle', st:0, path:[], spot:null, target:s.page, walkT:0, frame:0, speed:WALK_SPEED*(0.85+Math.random()*0.3), idlePhase:Math.random()*6, flash:0, turnAt:2+Math.random()*4, props:s.props, bot:s.bot };
      const sp=this.claimSpot(ch,s.page); ch.x=sp.x; ch.y=sp.y; if (s.bot) ch.speed=WALK_SPEED*2.2; this.chars.set(s.id,ch); } }
  onChange(c){ if (this.muted) return;
    if (c.type==='enter'){ this.spawn(c.session); if (!c.session.bot) this.stampRoute(null, c.session.page); }
    else if (c.type==='move'){ this.route(c.session.id, c.to); if (!c.session.bot) this.stampRoute(c.from, c.to); }
    else if (c.type==='leave'){ this.leave(c.session.id); if (!c.session.bot) this.stampRoute(c.session.page, null); }
    else if (c.type==='custom') this.customEffect(c.session.id, c.event, c.props);
  }
  // 오류(effect 'fire'): 그 캐릭터가 있는 건물에 10초 동안 불이 붙고 연기가 나며, 캐릭터는 1.5초 넘어진다. 같은 건물에 오류가 이어지면 시간이 연장된다
  fireAt(ch){ ch.fall=1.5; const s=this.store.sessions.get(ch.id); const path=s?s.page:ch.target; if (!path) return; this.fires=this.fires||new Map(); this.fires.set(path, this.t+10); this.burst(ch.x,ch.y-14,'smoke'); }
  spawn(s){ const seedA=Math.floor(s.seed*6), seedB=Math.floor((s.seed*36)%6);
    const ch={ id:s.id, code:s.code, shape:seedA, color:seedB, x:NODES.ENT[0]+(Math.random()*8-4), y:NODES.ENT[1], dir:'up', state:'spawn', st:0, path:[], spot:null, target:null, walkT:0, frame:0, speed:WALK_SPEED*(0.85+Math.random()*0.3), idlePhase:Math.random()*6, flash:0, turnAt:2+Math.random()*4, props:s.props, bot:s.bot };
    if (s.bot){ const b=BY_PATH.get(s.page); ch.x=NODES[b.node][0]; ch.y=NODES[b.node][1]+4; ch.state='drop'; ch.speed=WALK_SPEED*2.2; ch.dir='down'; }
    this.chars.set(s.id,ch); if (!s.bot) this.burst(ch.x,ch.y-6,'pop'); this.route(s.id, s.page, s.bot?null:'ENT'); if (s.props?.me){ this.store.select(s.id); ch.flash=4; } }
  claimSpot(ch,path){ const b=BY_PATH.get(path); let sp=b.spots.find(s=>!s.used); if(!sp){ const base=b.spots[b.spots.length-1]; sp={x:base.x+Math.round(Math.random()*40-20), y:base.y+Math.round(Math.random()*12-4), used:null, temp:true}; } sp.used=ch.id; ch.spot=sp; return sp; }
  releaseSpot(ch){ if(ch.spot){ ch.spot.used=null; ch.spot=null; } }
  startNode(ch: any, hint?: string | null){ if (hint) return hint; if (ch.state==='idle'||ch.state==='drop'||ch.path.length===0) return ch.target ? BY_PATH.get(ch.target).node : 'ENT'; const next=ch.path[0]; return next.node || (ch.target ? BY_PATH.get(ch.target).node : 'ENT'); }
  route(id: string, path: string, hint?: string | null){ const ch=this.chars.get(id); if(!ch) return; const b=BY_PATH.get(path);
    const from=ch.state==='drop' ? b.node : this.startNode(ch,hint); const keepHead = (!hint && ch.state==='walk' && ch.path.length && ch.path[0].node) ? ch.path[0] : null;
    this.releaseSpot(ch); const sp=this.claimSpot(ch,path); ch.target=path;
    const nodes=findPath(from,b.node); const pts=nodes.map(n=>({x:NODES[n][0],y:NODES[n][1],node:n})); if (keepHead) pts.shift();
    if (ch.state==='idle' && from===b.node && nodes.length===1) ch.path=[{x:sp.x,y:sp.y}]; else ch.path=[...(keepHead?[keepHead]:[]),...pts,{x:sp.x,y:sp.y}];
    if (ch.state!=='spawn'&&ch.state!=='drop') ch.state='walk'; ch.leaving=false; }
  leave(id){ const ch=this.chars.get(id); if(!ch) return; this.releaseSpot(ch); ch.target=null;
    if (ch.bot){ ch.state='rise'; ch.st=0; ch.path=[]; return; }
    const from=this.startNode(ch); const keepHead=(ch.state==='walk'&&ch.path.length&&ch.path[0].node)?ch.path[0]:null; const nodes=findPath(from,'ENT'); const pts=nodes.map(n=>({x:NODES[n][0],y:NODES[n][1],node:n})); if(keepHead) pts.shift();
    ch.path=[...(keepHead?[keepHead]:[]),...pts,{x:NODES.ENT[0],y:NODES.ENT[1]+6}]; ch.state='walk'; ch.leaving=true; }
  customEffect(id,type,props){ const ch=this.chars.get(id); if(!ch) return;
    if (type==='greet' && typeof props?.emoji==='string'){ ch.bubble={ type, emoji:props.emoji.slice(0,4), t:-0.6 }; return; } // 인사(로드맵 37): 이모지 말풍선 2초(t가 -0.6에서 시작해 1.5까지)
    const fx=EV_EFFECTS[evMeta(type).effect]||EV_EFFECTS.bolt; if (!fx.icon) return; ch.bubble={type,icon:fx.icon,t:0}; const x=ch.x,y=ch.y-16;
    if (fx.burst==='smoke'){ this.fireAt(ch); return; }
    if (fx.burst) this.burst(x, y+(fx.burst==='coins'?8:fx.burst==='fireworks'?-4:0), fx.burst); }
  burst(x,y,kind){ if (this.reduceMotion) return; const P=this.particles;
    if (kind==='pop') for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; P.push({x,y,vx:Math.cos(a)*34,vy:Math.sin(a)*22-10,g:40,life:.45,max:.45,col:i%2?PAL.white:PAL.gold,sz:2}); }
    if (kind==='poof') for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; P.push({x,y,vx:Math.cos(a)*18,vy:Math.sin(a)*12-6,g:0,life:.4,max:.4,col:PAL.white,sz:2}); }
    if (kind==='smoke') for(let i=0;i<7;i++){ P.push({x:x+Math.random()*10-5,y,vx:(Math.random()-.5)*6,vy:-14-Math.random()*8,g:-4,life:1.1+Math.random()*.5,max:1.6,col:i%3?PAL.metal:PAL.metal2,sz:2+(i%2),delay:i*.07}); }
    if (kind==='dust') for(let i=0;i<6;i++){ P.push({x:x+(i-3)*3,y,vx:(i-2.5)*12,vy:-10,g:30,life:.35,max:.35,col:PAL.stone2,sz:2}); }
    if (kind==='stars') for(let i=0;i<5;i++){ P.push({x:x+Math.random()*16-8,y:y-Math.random()*10,vx:0,vy:-8,g:0,life:.6+Math.random()*.4,max:1,col:PAL.gold,sz:0,kind:'star',delay:i*.08}); }
    if (kind==='fireworks') for(let s=0;s<2;s++) for(let i=0;i<14;i++){ const a=i/14*Math.PI*2+s; const sp=26+s*14; P.push({x:x+s*6-3,y:y-6-s*8,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-10,g:38,life:.9,max:.9,col:[PAL.red,PAL.gold,PAL.roofBlue,PAL.pink][(i+s)%4],sz:i%3?1:2,delay:s*.25,trail:true}); }
    if (kind==='coins') for(let i=0;i<6;i++){ P.push({x:x+Math.random()*8-4,y,vx:(Math.random()-.5)*40,vy:-60-Math.random()*40,g:160,life:1.2,max:1.2,col:PAL.gold,sz:0,kind:'coin',floor:y+2,delay:i*.05}); for(let k=0;k<2;k++) P.push({x:x+Math.random()*14-7,y:y-10-Math.random()*8,vx:0,vy:-14,g:0,life:.5,max:.5,col:PAL.white,sz:1,delay:.3+i*.08}); } }
  update(dt){ this.t+=dt; dt_hint=dt; const S=this.store;
    for (const ch of this.chars.values()){
      if (ch.flash>0) ch.flash-=dt;
      if (ch.fall>0) ch.fall-=dt;
      if (ch.bubble){ ch.bubble.t+=dt; if (ch.bubble.t>1.5) ch.bubble=null; }
      if (ch.state==='spawn'){ ch.st+=dt; if (ch.st>=.35) ch.state='walk'; continue; }
      if (ch.state==='drop'){ ch.st+=dt; if (ch.st>=.6){ ch.state='walk'; this.burst(ch.x,ch.y,'dust'); } continue; }
      if (ch.state==='rise'){ ch.st+=dt; if (ch.st>=.6) this.chars.delete(ch.id); continue; }
      if (ch.state==='despawn'){ ch.st+=dt; if (ch.st>=.3) this.chars.delete(ch.id); continue; }
      if (ch.state==='walk'){ if (ch.fall>0){ ch.frame=0; continue; } const tgt=ch.path[0]; if(!tgt){ ch.state=ch.leaving?'despawn':'idle'; ch.st=0; if(ch.leaving) this.burst(ch.x,ch.y-7,'poof'); if(ch.state==='idle') ch.dir='down'; continue; }
        const dx=tgt.x-ch.x, dy=tgt.y-ch.y, d=Math.hypot(dx,dy), step=ch.speed*dt;
        if (d<=step){ ch.x=tgt.x; ch.y=tgt.y; ch.path.shift(); } else { ch.x+=dx/d*step; ch.y+=dy/d*step; ch.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'); }
        ch.walkT+=dt; ch.frame=[0,1,0,2][Math.floor(ch.walkT*(ch.bot?14:8))%4]; }
      else { ch.turnAt-=dt; if (ch.turnAt<=0){ ch.turnAt=3+Math.random()*6; ch.dir=Math.random()<.6?'down':['left','right','up'][Math.floor(Math.random()*3)]; } ch.frame=0; }
    }
    this.decayHeat(dt); this.tickWeather(dt); this.tickSeason(dt);
    // 희귀 방문자(props.rare): 주위에 반짝임이 계속 돈다
    this.rareAcc+=dt; if (this.rareAcc>=.35){ this.rareAcc=0; for (const ch of this.chars.values()){ if (!ch.props?.rare || ch.bot || ch.state==='despawn' || ch.state==='rise') continue; this.particles.push({x:ch.x-9+Math.random()*18,y:ch.y-20+Math.random()*18,vx:0,vy:-5,g:0,life:.8,max:.8,col:PAL.gold,sz:0,kind:'spark'}); } }
    const P=this.particles; for (let i=P.length-1;i>=0;i--){ const p=P[i]; if (p.delay>0){ p.delay-=dt; continue; } p.life-=dt; if (p.life<=0){ P.splice(i,1); continue; } p.vy+=p.g*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; if (p.floor!==undefined && p.y>p.floor){ p.y=p.floor; p.vy*=-.45; p.vx*=.7; } if (p.trail) p.vx*=.98; }
    for (const b of BUILDINGS){ const n=S.counts[b.path]||0; if (n>=5){ this.sparkAcc[b.path]=(this.sparkAcc[b.path]||0)+dt*(n>=10?6:2.5); while (this.sparkAcc[b.path]>=1){ this.sparkAcc[b.path]-=1; P.push({x:b.left-6+Math.random()*(b.w+12),y:b.top-8+Math.random()*(b.h+8),vx:0,vy:-6,g:0,life:.7,max:.7,col:n>=10?PAL.gold:PAL.white,sz:0,kind:'spark'}); } } }
    if (this.reduceMotion) P.length=0; // 동작 줄이기: 이 프레임에 생긴 파티클(희귀 반짝임·건물 불꽃·날씨)까지 모두 버린다. render의 drawBuilding이 넣는 연기는 render의 그리기 가드가 거른다
  }
  render(phase=0.4){ const S=this.store, t=this.t; ctx.drawImage(A.ground,0,0);
    if (this.wk.snow>0){ ctx.fillStyle=`rgba(255,255,255,${(this.wk.snow*.3).toFixed(3)})`; ctx.fillRect(0,0,W,H); } // 크리스마스: 눈 쌓인 땅
    const h=phase*24; let dark=0, warm=0; if (!this.night) {} else if (h<5) dark=1; else if (h<7){ dark=1-(h-5)/2; warm=Math.sin((h-5)/2*Math.PI); } else if (h<17) dark=0; else if (h<19){ dark=(h-17)/2; warm=Math.sin((h-17)/2*Math.PI); } else dark=1;
    this.dark=dark;
    if (this.showHeat){ if (this.heatDirty){ this.heatDirty=false; this.paintHeat(); } ctx.drawImage(this.heatCv,0,0,W,H); }
    if (DECOR.pond) ctx.drawImage(A.pond[Math.floor(t*1.5)%2], DECOR.pond[0]-30, DECOR.pond[1]-16);
    const list=[];
    for (const b of BUILDINGS) list.push({y:b.y, draw:()=>this.drawBuilding(b,t)});
    for (const [x,y,s] of DECOR.trees) list.push({y, draw:()=>{ const T=A.tree[s]; ctx.drawImage(T.trunk,x-T.ax,y-T.ay); const sw=Math.round(Math.sin(t*1.6+x*.05)*T.sway); ctx.drawImage(T.canopy,x-T.ax+sw,y-T.ay);
      if (this.showSeason && SEASON==='xmas'){ const cols=['#ff5a5a','#ffe27a','#6fe07a','#6ab8ff'], cw=T.canopy.width-6, chh=Math.max(4,2*T.ax-4); for (let i=0;i<6;i++){ if (Math.floor(t*2+i)%3===0) continue; ctx.fillStyle=cols[(i+s)%4]; ctx.fillRect(x-T.ax+sw+3+((i*7+x)%cw), y-T.ay+2+((i*5+y)%chh), 1,1); } } }});
    if (this.showSeason) for (const d of DECOR.season) list.push({y:d.y, draw:()=>{ const sp=A.season[d.kind]; const img=sp[d.kind.startsWith('pumpkin')?(this.dark>.5?1:0):d.v]; ctx.drawImage(img, d.x-(img.width>>1), d.y-img.height+2); }});
    for (const [x,y] of LAMPS) list.push({y, draw:()=>{ ctx.drawImage(A.lamp,x-4,y-22); if (this.showSeason && SEASON==='seol') ctx.drawImage(A.season.lantern,x+4,y-18); ctx.globalAlpha=.12+.05*Math.sin(t*3+x); ctx.fillStyle=PAL.gold; ctx.fillRect(x-7,y-24,14,12); ctx.globalAlpha=1; }});
    list.push({y:GATE.y, draw:()=>{ ctx.drawImage(A.gate,GATE.x-17,GATE.y-8); // 마을 성장(로드맵 34): 대문 위에 레벨-1개의 작은 금색 별
      const n=Math.min(4,TOWN_LEVEL-1); for (let i=0;i<n;i++){ const sx=GATE.x-(n-1)*3+i*6, sy=GATE.y-20+(Math.floor(t*2+i)%2?0:-1); ctx.fillStyle=PAL.gold; ctx.fillRect(sx-1,sy,3,1); ctx.fillRect(sx,sy-1,1,3); ctx.fillStyle=PAL.white; ctx.fillRect(sx,sy,1,1); } }});
    for (const ch of this.chars.values()){ if (ch.bot && !this.showBots) continue; list.push({y:ch.state==='drop'||ch.state==='rise'?999:ch.y, draw:()=>this.drawChar(ch)}); }
    list.sort((a,b)=>a.y-b.y); for (const e of list) e.draw();
    if (!this.reduceMotion) for (const p of this.particles){ if (p.delay>0) continue; const k=p.life/p.max;
      if (p.kind==='coin'){ const f=Math.floor(p.life*10)%2; ctx.fillStyle=PAL.outline; ctx.fillRect(Math.round(p.x)-2,Math.round(p.y)-3,f?4:2,5); ctx.fillStyle=PAL.gold; ctx.fillRect(Math.round(p.x)-1,Math.round(p.y)-2,f?2:1,3); if(f){ctx.fillStyle=PAL.white; ctx.fillRect(Math.round(p.x)-1,Math.round(p.y)-2,1,1);} }
      else if (p.kind==='star'){ ctx.globalAlpha=k<.3?k/.3:1; ctx.drawImage(A.icons.star,Math.round(p.x)-6,Math.round(p.y)-6); ctx.globalAlpha=1; }
      else if (p.kind==='fly'){ if (Math.sin(p.life*9)>0){ ctx.globalAlpha=Math.min(1,k*2); ctx.fillStyle=p.col; ctx.fillRect(Math.round(p.x),Math.round(p.y),1,1); ctx.globalAlpha=.35; ctx.fillRect(Math.round(p.x)-1,Math.round(p.y)-1,3,3); ctx.globalAlpha=1; } }
      else if (p.kind==='bat'){ ctx.drawImage(A.season.bat[Math.floor(p.life*8)%2], Math.round(p.x)-3, Math.round(p.y+Math.sin(p.life*5)*3)-2); }
      else if (p.kind==='kite'){ const yy=Math.round(p.y+Math.sin(p.life*1.2)*6); ctx.drawImage(A.season.kite, Math.round(p.x)-3, yy); ctx.fillStyle=PAL.outline; for (let i=1;i<5;i++) ctx.fillRect(Math.round(p.x)-1-i*3, yy+9+i*2+Math.round(Math.sin(p.life*3+i)), 2,1); }
      else if (p.kind==='spark'){ ctx.globalAlpha=Math.sin(k*Math.PI); ctx.drawImage(A.icons.spark,Math.round(p.x)-6,Math.round(p.y)-6); ctx.globalAlpha=1; }
      else { ctx.globalAlpha=Math.min(1,k*2); ctx.fillStyle=p.col; ctx.fillRect(Math.round(p.x),Math.round(p.y),p.sz,p.sz); ctx.globalAlpha=1; } }
    for (const b of BUILDINGS){ const n=S.counts[b.path]||0; if (n>=10){ ctx.globalAlpha=.18+.1*Math.sin(t*5); ctx.fillStyle=PAL.gold; ctx.fillRect(b.left-4,b.top-6,b.w+8,b.h+8); ctx.globalAlpha=1; }
      if (this.showBadges && n>0) this.drawBadge(b.x, Math.max(8, b.top-10) - (n>=10?Math.round(Math.abs(Math.sin(t*4))*3):0), String(n), n>=10); } // 위 끝 자리는 캔버스 안으로
    const selB=this.store.selectedId ? BY_PATH.get(this.store.selectedId) : null; if (selB){ const b=selB; ctx.strokeStyle=PAL.gold; ctx.lineWidth=1; ctx.strokeRect(b.left-2.5,b.top-2.5,b.w+5,b.h+5); }
    this.drawFunnel(t);
    // 낮·밤: 노을 → 남색 틴트 → 가로등·창문 불빛 → 별
    if (warm>0){ ctx.fillStyle=`rgba(255,140,60,${(warm*.2).toFixed(3)})`; ctx.fillRect(0,0,W,H); }
    if (dark>0){ ctx.fillStyle=`rgba(22,26,72,${(dark*.5).toFixed(3)})`; ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation='lighter';
      for (const [x,y] of LAMPS){ for (let r=0;r<3;r++){ ctx.globalAlpha=dark*(.10-r*.025)*(1+.1*Math.sin(t*5+x)); ctx.fillStyle=this.showSeason&&SEASON==='seol'?'#ff9a6a':'#ffd27a'; ctx.fillRect(x-8-r*7,y-24-r*5,16+r*14,14+r*10); } }
      if (this.showSeason && SEASON==='halloween') for (const d of DECOR.season){ ctx.globalAlpha=dark*(.12+.04*Math.sin(t*4+d.x)); ctx.fillStyle='#ffb347'; ctx.fillRect(d.x-9,d.y-12,18,12); } // 호박 등불 빛
      for (const b of BUILDINGS){ if (NO_LIGHT.has(b.look)) continue; ctx.globalAlpha=dark*.16; ctx.fillStyle='#ffc46a'; ctx.fillRect(b.left+6,b.top+Math.floor(b.h*.4),b.w-12,Math.floor(b.h*.5)); ctx.globalAlpha=dark*.07; ctx.fillRect(b.left-2,b.y-4,b.w+4,10); }
      ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
      if (dark>.5){ ctx.fillStyle='#fff8d6'; for (const [x,y,k] of this.stars){ if (Math.sin(t*1.5+x)*.5+.5 < .25+k*.2) continue; ctx.globalAlpha=(dark-.5)*2*.8; ctx.fillRect(x,y,1,1); } ctx.globalAlpha=1; }
      if (dark>.6 && THEME_KEY!=='office' && Math.random()<dt_hint*4){ this.particles.push({x:Math.random()*W,y:120+Math.random()*120,vx:(Math.random()-.5)*10,vy:-4-Math.random()*6,g:0,life:2.5,max:2.5,col:'#d9ff7a',sz:1,kind:'fly'}); } }
    this.drawSnow(); this.drawWeather(t);
  }
  // ---- 퍼널(로드맵 30): this.funnel = { steps:[건물 키…], edges:[{ pct, drop }] }. 단계 사이 길을 금색 띠로(굵기 = 다음 단계로 간 비율), 각 단계 위에 비율 숫자, 이탈은 빨간 띠로 표시
  drawFunnel(t){ const f=this.funnel; if (!f || f.steps.length<2) return; const node=p=>BY_PATH.get(p)?.node;
    for (let i=0;i<f.steps.length-1;i++){ const a=node(f.steps[i]), b=node(f.steps[i+1]); if (!a||!b||a===b) continue; const e=f.edges[i]||{ pct:0 }; const w=1+Math.round(e.pct/100*7);
      const nodes=findPath(a,b); ctx.save(); ctx.globalAlpha=.55+.1*Math.sin(t*3); ctx.strokeStyle=PAL.gold; ctx.lineWidth=w; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); nodes.forEach((n,k)=>{ const [x,y]=NODES[n]; k?ctx.lineTo(x,y):ctx.moveTo(x,y); }); ctx.stroke();
      // 흐르는 점: 방향을 보여 준다
      ctx.globalAlpha=.9; ctx.fillStyle=PAL.white; let total=0; const segs=[]; for (let k=1;k<nodes.length;k++){ const [x0,y0]=NODES[nodes[k-1]],[x1,y1]=NODES[nodes[k]]; const L=Math.hypot(x1-x0,y1-y0); segs.push([x0,y0,x1,y1,L]); total+=L; }
      for (let d=this.reduceMotion?12:(t*30)%24; d<total; d+=24){ let acc=0; for (const [x0,y0,x1,y1,L] of segs){ if (d<=acc+L){ const k=(d-acc)/L; ctx.fillRect(Math.round(x0+(x1-x0)*k)-1, Math.round(y0+(y1-y0)*k)-1, 2, 2); break; } acc+=L; } }
      ctx.restore();
      const bb=BY_PATH.get(f.steps[i+1]); if (bb) this.drawBadge(bb.left-8, bb.top+Math.floor(bb.h/2), String(Math.round(e.pct)), true); } // 다음 단계 건물 왼쪽: 전 단계에서 넘어온 비율(%). 위쪽은 이름표가 가린다
    for (let i=0;i<f.steps.length-1;i++){ const e=f.edges[i]; const b=BY_PATH.get(f.steps[i]); if (!e||!b||e.drop<1) continue; const s=String(Math.round(e.drop)); const w=s.length*4+3, x0=Math.round(b.x+b.w/2+6-w/2); ctx.fillStyle=PAL.red; ctx.fillRect(x0,b.y-6,w,7); for (let k=0;k<s.length;k++){ const d=A.digits[s[k]]; if (d) ctx.drawImage(d.w,x0+2+k*4,b.y-5); } } } // 단계 건물 오른쪽 아래: 떠난 비율(빨강)
  // ---- 날씨(로드맵 35). 비: 하늘빛 빗줄기 + 땅에 튀는 물방울 + 푸른 틴트. 쨍쨍: 따뜻한 밝은 틴트 + 천천히 흐르는 빛줄기 + 반짝임. 세기(wk)는 2초에 걸쳐 바뀐다
  tickWeather(dt){ const on=this.showWeather, k=this.wk; const to=(v,g)=>v+Math.max(-dt/2,Math.min(dt/2,g-v));
    k.rain=to(k.rain, on&&this.weather==='rain'?1:0); k.sunny=to(k.sunny, on&&this.weather==='sunny'?1:0);
    if (k.rain>0){ const want=Math.round(110*k.rain); while (this.drops.length<want) this.drops.push({ x:Math.random()*(W+40)-20, y:Math.random()*H, l:5+Math.random()*5, v:150+Math.random()*70 }); if (this.drops.length>want) this.drops.length=want;
      for (const d of this.drops){ d.y+=d.v*dt; d.x-=d.v*dt*.18; if (d.y>H){ d.y=-d.l-Math.random()*20; d.x=Math.random()*(W+40)-20; if (Math.random()<.5) this.particles.push({x:d.x, y:H-2, vx:0, vy:0, g:0, life:.25, max:.25, col:'#dbeefd', sz:1}); } } }
    else this.drops.length=0;
    k.snow=to(k.snow, this.showSeason&&SEASON==='xmas'?1:0);
    if (k.snow>0){ const want=Math.round(90*k.snow); while (this.flakes.length<want) this.flakes.push({ x:Math.random()*(W+20)-10, y:Math.random()*H, v:14+Math.random()*16, ph:Math.random()*6.28, s:Math.random()<.3?2:1 }); if (this.flakes.length>want) this.flakes.length=want;
      for (const f of this.flakes){ f.y+=f.v*dt; f.ph+=dt*1.5; f.x+=Math.sin(f.ph)*8*dt; if (f.y>H){ f.y=-3-Math.random()*20; f.x=Math.random()*(W+20)-10; } } }
    else this.flakes.length=0;
    if (k.sunny>0 && Math.random()<dt*3*k.sunny) this.particles.push({x:Math.random()*W,y:Math.random()*H,vx:0,vy:-3,g:0,life:1,max:1,col:PAL.white,sz:0,kind:'spark'}); }
  // 계절 이벤트(로드맵 38): 할로윈 밤에는 박쥐가 가로질러 날고, 설날에는 연 하나가 14초마다 떠간다. 눈은 tickWeather의 wk.snow·flakes
  tickSeason(dt){ if (!this.showSeason || !SEASON) return; this.seasonAcc+=dt;
    if (SEASON==='halloween' && this.dark>.4 && Math.random()<dt*.5){ const vx=30+Math.random()*25, life=(W+16)/vx; this.particles.push({ x:-8, y:10+Math.random()*60, vx, vy:0, g:0, life, max:life, col:PAL.outline, sz:0, kind:'bat' }); }
    if (SEASON==='seol' && this.seasonAcc>14){ this.seasonAcc=0; if (!this.particles.some(p=>p.kind==='kite')){ const life=(W+16)/14; this.particles.push({ x:-8, y:14+Math.random()*30, vx:14, vy:0, g:0, life, max:life, col:PAL.red, sz:0, kind:'kite' }); } } }
  drawSnow(){ const k=this.wk.snow; if (k<=0 || this.reduceMotion) return; ctx.fillStyle=`rgba(255,255,255,${(k*.9).toFixed(3)})`; for (const f of this.flakes) ctx.fillRect(Math.round(f.x),Math.round(f.y),f.s,f.s); }
  drawWeather(t){ const k=this.wk; if (k.sunny>0){ ctx.fillStyle=`rgba(255,226,120,${(k.sunny*.1).toFixed(3)})`; ctx.fillRect(0,0,W,H);
      ctx.save(); ctx.globalAlpha=k.sunny*.07; ctx.fillStyle='#fff6c8'; for (let i=0;i<3;i++){ const x=((t*6+i*170)%(W+240))-120; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+70,0); ctx.lineTo(x+150,H); ctx.lineTo(x+60,H); ctx.closePath(); ctx.fill(); } ctx.restore(); }
    if (k.rain>0){ ctx.fillStyle=`rgba(40,56,96,${(k.rain*.2).toFixed(3)})`; ctx.fillRect(0,0,W,H); ctx.fillStyle=`rgba(205,225,250,${(k.rain*.7).toFixed(3)})`; if (!this.reduceMotion) for (const d of this.drops){ const x=Math.round(d.x), y=Math.round(d.y); for (let i=0;i<d.l;i++) ctx.fillRect(x-Math.round(i*.18), y-i, 1, 1); }
      if (!this.reduceMotion && Math.floor(t*10)%2===0){ ctx.fillStyle=`rgba(230,240,255,${(k.rain*.5).toFixed(3)})`; for (const d of this.drops){ if (d.y>H-6 && d.y<H) { ctx.fillRect(Math.round(d.x)-1,H-2,3,1); } } } } }
  drawBuilding(b,t){ ctx.drawImage(b.sprite,b.left,b.top); ctx.drawImage(b.sign, b.left-20<0 ? b.left+b.w+2 : b.left-20, b.y-22); // 왼쪽 끝 자리는 간판을 오른쪽에
    const fireUntil=this.fires&&this.fires.get(b.path); if (fireUntil!==undefined){ if (fireUntil<t) this.fires.delete(b.path); else this.drawFire(b,t,Math.min(1,fireUntil-t)); }
    // 느린 페이지(로드맵 28): 웹 바이탈 p75가 나쁜 건물은 지붕에서 회색 연기가 계속 오른다(poor는 진하게, ok는 옅게)
    const lv=this.vitals&&this.vitals[b.path]?.level; if (lv==='poor'||lv==='ok'){ if (Math.random()<dt_hint*(lv==='poor'?3:1)) this.particles.push({x:b.left+8+Math.random()*(b.w-16),y:b.top+2,vx:(Math.random()-.5)*4,vy:-7-Math.random()*4,g:-2,life:1.6,max:1.6,col:lv==='poor'?PAL.metal:PAL.metal2,sz:lv==='poor'?2:1}); }
    if (b.look==='fountain'){ const f=Math.floor(t*7)%4; const cx=b.x, top=b.top+2; ctx.fillStyle=PAL.white; for(let i=0;i<6;i++){ const h=(i+f)%4; ctx.fillRect(cx-3+i,top-4-h-(i%2),1,2); } ctx.fillStyle='#d8f0fb'; ctx.fillRect(cx-11+f,top+10,2,2); ctx.fillRect(cx+9-f,top+12,2,2); ctx.fillStyle=PAL.white; ctx.fillRect(cx-16+(f*3)%12,b.top+20,3,1); }
    if (b.look==='well'){ const f=Math.floor(t*3)%2; ctx.fillStyle=PAL.water2; ctx.fillRect(b.x-4+f,b.top+29,2,1); ctx.fillRect(b.x+2-f,b.top+30,2,1); }
    if (b.look==='tower'){ const f=Math.floor(t*4)%3; ctx.fillStyle=[PAL.gold,PAL.white,PAL.roofLilac][f]; ctx.fillRect(b.x-1,b.top-2-f,3,2); ctx.fillRect(b.x-4+f*3,b.top+4,1,1); }
    if (CHIMNEY[b.look]){ const cx=b.left+CHIMNEY[b.look]; for(let i=0;i<4;i++){ const ph=(t*.5+i*.9)%3.6; if (ph>3)continue; const r=1+ph*0.8; ctx.globalAlpha=.55*(1-ph/3); ctx.fillStyle=PAL.white; ctx.fillRect(Math.round(cx-r+Math.sin(ph*2+i)*2),Math.round(b.top-2-ph*9-r),Math.round(r*2),Math.round(r*2)); } ctx.globalAlpha=1; }
    if (b.look==='community'||b.look==='inn'||b.look==='tavern'){ const px=b.left+b.w-8, py=b.top-10; ctx.fillStyle=PAL.outline; ctx.fillRect(px,py,1,12); const f=Math.floor(t*6)%2; ctx.fillStyle=PAL.pink; ctx.fillRect(px+1,py,6,3); ctx.fillRect(px+1,py+3,f?4:6,2); }
    if (b.look==='meeting'||b.look==='archive'||b.look==='showroom'||b.look==='desk'||b.look==='training'||b.look==='cafeteria'){ const on=Math.floor(t*1.3+b.x)%7!==0; if(on){ ctx.globalAlpha=.08; ctx.fillStyle=PAL.gold; ctx.fillRect(b.left+6,b.top+12,b.w-12,b.h-18); ctx.globalAlpha=1; } }
    if (b.look==='lobby'){ const f=Math.floor(t*2)%2; ctx.fillStyle=f?PAL.leaf:PAL.gold; ctx.fillRect(b.left+34,b.top+9,2,2); }
    if (b.look==='serverroom'){ for (let i=0;i<4;i++){ const on=Math.floor(t*(5+i)+i*7)%3!==0; ctx.fillStyle=on?PAL.leaf:PAL.red; ctx.fillRect(b.left+13+i*10,b.top+36,1,1); } }
    if (b.look==='smithy'){ const f=Math.floor(t*6)%2; ctx.fillStyle=f?PAL.gold:PAL.red; ctx.fillRect(b.left+13+f,b.top+38,3,1); } }
  // 건물 불: 지붕 위 여러 곳에서 빨강·금색·흰 불꽃이 깜빡이고 연기가 올라간다. k는 꺼지기 직전 1초 동안 0→1로 줄어드는 세기
  drawFire(b,t,k){ const n=Math.max(2,Math.floor(b.w/16)); for (let i=0;i<n;i++){ const fx=b.left+6+Math.floor((b.w-12)*(i+.5)/n)+Math.round(Math.sin(t*7+i*2)*1.5), fy=b.top+2+Math.floor((i*7)%9); const f=Math.floor(t*9+i)%3, h=4+f+(i%2);
      ctx.globalAlpha=k; ctx.fillStyle=PAL.red; ctx.fillRect(fx-2,fy-h,5,h); ctx.fillStyle=PAL.gold; ctx.fillRect(fx-1,fy-h+1,3,h-2); ctx.fillStyle=PAL.white; ctx.fillRect(fx,fy-1,1,1); }
    ctx.globalAlpha=1; if (Math.random()<dt_hint*8*k) this.particles.push({x:b.left+8+Math.random()*(b.w-16),y:b.top,vx:(Math.random()-.5)*5,vy:-10-Math.random()*6,g:-3,life:1.4,max:1.4,col:Math.random()<.5?PAL.metal:PAL.metal2,sz:2}); }
  drawBadge(x,y,s,hot){ const w=s.length*4+3; const x0=Math.round(x-w/2); ctx.fillStyle=hot?PAL.gold:PAL.outline; ctx.fillRect(x0,y-4,w,9); ctx.fillRect(x0+Math.floor(w/2)-2,y+5,4,1); ctx.fillRect(x0+Math.floor(w/2)-1,y+6,2,1); if (hot){ ctx.fillStyle=PAL.outline; ctx.fillRect(x0-1,y-4,1,9); ctx.fillRect(x0+w,y-4,1,9); }
    for (let i=0;i<s.length;i++){ const d=A.digits[s[i]]; if (d) ctx.drawImage(hot?d.k:d.w, x0+2+i*4, y-2); } }
  drawChar(ch){ const pr=ch.props||{}; const set=ch.bot?A.bot[ch.dir]:pr.me?A.me[ch.shape][ch.dir]:A.char[ch.shape][ch.color][ch.dir]; const fr=set[ch.state==='walk'?ch.frame:0]; const S=this.store;
    let bob=0; if (ch.state==='idle') bob=Math.sin(this.t*2.2+ch.idlePhase)>0.3?-1:0;
    const X=Math.round(ch.x), Y=Math.round(ch.y); const x=Math.round(ch.x-fr.ax), y=Y-fr.ay+bob;
    if (ch.state==='drop'||ch.state==='rise'){ const k=ch.state==='drop'?1-ch.st/.6:ch.st/.6; const lift=Math.round(k*k*70); ctx.globalAlpha=1-k*.6; ctx.fillStyle='rgba(59,47,58,.18)'; ctx.fillRect(X-4,Y-1,8,2); ctx.globalAlpha=1; ctx.drawImage(fr.canvas,x,y-lift); ctx.fillStyle=PAL.water2; ctx.fillRect(X-1,y-lift-3,3,2); this.drawTag(X,y-lift-9,ch.bot); return; }
    ctx.fillStyle='rgba(59,47,58,.18)'; ctx.fillRect(X-4,Y-1,8,2);
    if (pr.plan==='pro' && this.showMarks){ ctx.strokeStyle=PAL.gold; ctx.lineWidth=1; ctx.globalAlpha=.7+.3*Math.sin(this.t*4); ctx.beginPath(); ctx.ellipse(X+.5,Y+.5,7,3,0,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }
    if (ch.state==='spawn'||ch.state==='despawn'){ const k=ch.state==='spawn'? Math.min(1,ch.st/.3) : 1-ch.st/.3; const sc=ch.state==='spawn'? (k<.7? k/.7*1.25 : 1.25-(k-.7)/.3*.25) : k; const w=fr.canvas.width*sc, h=fr.canvas.height*sc; ctx.drawImage(fr.canvas, Math.round(ch.x-w/2), Math.round(ch.y-h), Math.round(w), Math.round(h)); return; }
    const sel=this.store.selectedId===ch.id;
    // 주인 NPC(props.me): 금빛 옷·왕관(drawMarks)에 빨간 고리와 떠 있는 ME 표. 선택 화살표는 그 위에 뜬다
    if (pr.me){ ctx.strokeStyle=PAL.red; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(X+.5,Y+.5,7,3,0,0,Math.PI*2); ctx.stroke(); const ty=y-16+(Math.sin(this.t*3)>0?-1:0); this.drawTag(X,ty,'ME',PAL.red);
      if (sel||ch.flash>0){ const ay=ty-9-(this.reduceMotion?3:Math.round(Math.abs(Math.sin(this.t*6))*3)); ctx.fillStyle=PAL.gold; ctx.fillRect(X-3,ay,7,2); ctx.fillRect(X-2,ay+2,5,1); ctx.fillRect(X-1,ay+3,3,1); ctx.fillRect(X,ay+4,1,1); } }
    else if (sel||ch.flash>0){ ctx.strokeStyle=PAL.gold; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(X+.5,Y+.5,7,3,0,0,Math.PI*2); ctx.stroke(); const ay=y-9-(this.reduceMotion?3:Math.round(Math.abs(Math.sin(this.t*6))*3)); ctx.fillStyle=PAL.gold; ctx.fillRect(X-3,ay,7,2); ctx.fillRect(X-2,ay+2,5,1); ctx.fillRect(X-1,ay+3,3,1); ctx.fillRect(X,ay+4,1,1); }
    if (ch.fall>0){ ctx.save(); ctx.translate(X,Y); ctx.rotate(ch.fall>1.2?(1.5-ch.fall)/.3*Math.PI/2:Math.PI/2); ctx.drawImage(fr.canvas,x-X,y-Y); ctx.restore(); if (Math.floor(this.t*8)%2){ ctx.fillStyle=PAL.gold; ctx.fillRect(X+6,Y-12,1,1); ctx.fillRect(X+9,Y-9,1,1); ctx.fillRect(X+4,Y-7,1,1); } }
    else ctx.drawImage(fr.canvas,x,y);
    if (ch.bot) this.drawTag(X,y-8,ch.bot);
    else if (this.showMarks||pr.me) drawMarks(ctx, X, x, y, fr, pr, S.homeCountry, !this.showMarks);
    if (pr.rare && !ch.bot) drawRare(ctx, X, y, pr, this.t); // 희귀 방문자: 머리 위에 떠 있는 표시(표식 토글과 상관없이)
    if (ch.bubble){ const bt=ch.bubble.t; const by=y-16-Math.round(Math.min(1,Math.max(0,bt)*4)*2); ctx.globalAlpha=bt>1.2?(1.5-bt)/.3:1;
      if (ch.bubble.emoji){ ctx.fillStyle=PAL.outline; ctx.fillRect(X-9,by-3,18,17); ctx.fillStyle=PAL.white; ctx.fillRect(X-8,by-2,16,15); ctx.fillStyle=PAL.outline; ctx.fillRect(X-2,by+14,3,1); ctx.fillRect(X-1,by+15,1,1); ctx.font='11px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=PAL.outline; ctx.fillText(ch.bubble.emoji, X+.5, by+6); ctx.textAlign='start'; ctx.textBaseline='alphabetic'; }
      else if (ch.bubble.icon==='search'){ ctx.fillStyle=PAL.outline; ctx.fillRect(X-8,by-1,16,15); ctx.fillStyle=PAL.white; ctx.fillRect(X-7,by,14,13); ctx.fillStyle=PAL.outline; ctx.fillRect(X-2,by+14,3,1); ctx.fillRect(X-1,by+15,1,1); ctx.drawImage(A.icons.search,X-6,by+1); }
      else ctx.drawImage(A.icons[ch.bubble.icon]||A.icons.bolt,X-6,by+2);
      ctx.globalAlpha=1; } }
  drawTag(x: number, y: number, text: string, bg?: string){ const w=text.length*4+3, x0=Math.round(x-w/2); ctx.fillStyle=bg||PAL.metal2; ctx.fillRect(x0,y,w,7); for (let i=0;i<text.length;i++){ const d=A.digits[text[i]]; if (d) ctx.drawImage(d.w,x0+2+i*4,y+1); } }
  hit(px,py){ let best=null; for (const ch of this.chars.values()){ if (ch.state==='despawn'||ch.state==='rise'||(ch.bot&&!this.showBots)) continue; if (px>=ch.x-7&&px<=ch.x+7&&py>=ch.y-17&&py<=ch.y+1){ if(!best||ch.y>best.y) best=ch; } } if (best) return {kind:'char',id:best.id};
    for (const b of BUILDINGS) if (px>=b.left&&px<=b.left+b.w&&py>=b.top&&py<=b.y) return {kind:'building',b}; return null; }
  charImage(ch){ const fr=ch.bot?A.bot.down[0]:ch.props?.me?A.me[ch.shape].down[0]:A.char[ch.shape][ch.color].down[0]; return fr.canvas.toDataURL(); }
}
// 희귀 방문자 표시(로드맵 36): 종류별 아이콘이 머리 위에 떠서 까딱거린다. 도감 희귀 탭의 견본도 같이 쓴다
export function drawRare(g, X, y, pr, t){ const d=RARE_BY_KEY[pr.rare]; if (!d) return; const bob=Math.sin(t*3)>0?-1:0; g.drawImage(A.icons[d.icon]||A.icons.star, X-6, y-15+bob); }
// 캐릭터 표식. 마을(drawChar)과 도감 범례가 같이 쓴다. X는 발 중심, x·y는 스프라이트 왼쪽 위
export function drawMarks(g, X, x, y, fr, pr, home, crownOnly){ if (pr.me){ g.drawImage(A.icons.crown, x+fr.ax-5, y-4); if (crownOnly) return; } // 주인은 모자 대신 왕관. 방문자 표시를 꺼도 왕관은 남는다
  else if (pr.returning) g.drawImage(A.icons.hat, x+fr.ax-6, y-3);
  // 표식은 예외만: 재방문 모자, 모바일·태블릿, 검색·SNS·광고 유입, 주 국가(접속자 과반)가 아닌 나라의 깃발. PC·직접 유입·신규·주 국가는 아무것도 안 붙는다
  if (pr.country && pr.country!==home && A.flags[pr.country]){ g.fillStyle=PAL.outline; g.fillRect(X+7,y-4,1,10); g.drawImage(A.flags[pr.country], X+8, y-4); }
  if (pr.device==='mobile') g.drawImage(A.icons.phone, X+4, y+7); if (pr.device==='tablet'){ g.fillStyle=PAL.outline; g.fillRect(X+4,y+7,4,5); g.fillStyle=PAL.white; g.fillRect(X+5,y+8,2,3); }
  if (pr.referrer==='search'){ g.globalAlpha=.9; g.drawImage(A.icons.search, X-13, y+1); g.globalAlpha=1; } else if (pr.referrer==='social') g.drawImage(A.icons.bubble, X-13, y+2); else if (pr.referrer==='ad'){ g.fillStyle=PAL.gold; g.fillRect(X-9,y+4,3,3); g.fillStyle=PAL.outline; g.fillRect(X-8,y+5,1,1); }
  // 캠페인(UTM) 깃발: 왼쪽 깃대에 캠페인마다 다른 색의 삼각기. 광고 유입 점과 같은 쪽이라 깃대는 조금 위에 둔다
  if (pr.campaign){ g.fillStyle=PAL.outline; g.fillRect(X-9,y-6,1,9); const c=campaignColor(pr.campaign); g.fillStyle=c; g.fillRect(X-8,y-6,4,1); g.fillRect(X-8,y-5,3,1); g.fillRect(X-8,y-4,2,1); g.fillRect(X-8,y-3,1,1); } }
