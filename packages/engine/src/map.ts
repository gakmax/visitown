import { BASE_PAL, BOT_COLOR, BOT_SHAPE, DIGIT_ROWS, FIXED_COMMON, FLAG_PAL, FLAG_ROWS, H, ICON_LEGEND, ICON_ROWS, KINDS, ME_COLOR, PAL, SEASON_PAL, SEASON_ROWS, THEMES, W } from './palette';

/* ---------- 2. MAP: 자리(슬롯) 표. 활성 건물에 따라 길 그래프·장식을 다시 만든다 ---------- */
// 자리 0은 항상 광장. 1~5는 안쪽 고리, 6~11은 바깥 고리(양 끝 기둥). x,y는 건물 바닥 중앙, node는 길 노드, roads는 그 자리까지 필요한 길.
// maxW/maxH는 그 자리에 놓을 수 있는 건물 크기 한도(바깥 고리는 작은 건물만).
export const SLOTS = [
  { id:0,  name:'중앙 광장',        x:240, y:162, node:'PLAZA', maxW:80, maxH:66, roads:[] },
  { id:1,  name:'위 가운데',        x:240, y:86,  node:'N1',  maxW:80, maxH:80, roads:[['PN','N1']] },
  { id:2,  name:'왼쪽 위',          x:132, y:118, node:'NW',  maxW:80, maxH:80, roads:[['PW','W1'],['W1','NW']] },
  { id:3,  name:'오른쪽 위',        x:348, y:118, node:'NE',  maxW:80, maxH:80, roads:[['PE','E1'],['E1','NE']] },
  { id:4,  name:'왼쪽 아래',        x:134, y:210, node:'SW',  maxW:80, maxH:66, roads:[['S1','SW']] },
  { id:5,  name:'오른쪽 아래',      x:346, y:210, node:'SE',  maxW:80, maxH:66, roads:[['S1','SE']] },
  { id:6,  name:'왼쪽 끝 위',       x:40,  y:66,  node:'WT',  maxW:68, maxH:60, roads:[['PW','W1'],['W1','AW'],['AW','AWT'],['AWT','WT']] },
  { id:7,  name:'오른쪽 끝 위',     x:440, y:66,  node:'ET',  maxW:68, maxH:60, roads:[['PE','E1'],['E1','AE'],['AE','AET'],['AET','ET']] },
  { id:8,  name:'왼쪽 끝 가운데',   x:40,  y:144, node:'WM',  maxW:68, maxH:60, roads:[['PW','W1'],['W1','AW'],['AW','WM']] },
  { id:9,  name:'오른쪽 끝 가운데', x:440, y:144, node:'EM',  maxW:68, maxH:60, roads:[['PE','E1'],['E1','AE'],['AE','EM']] },
  { id:10, name:'왼쪽 끝 아래',     x:40,  y:240, node:'WB',  maxW:68, maxH:60, roads:[['S1','SW'],['SW','AWB'],['AWB','AWB2'],['AWB2','WB']] },
  { id:11, name:'오른쪽 끝 아래',   x:440, y:240, node:'EB',  maxW:68, maxH:60, roads:[['S1','SE'],['SE','AEB'],['AEB','AEB2'],['AEB2','EB']] },
];
export const MAX_BUILDINGS = SLOTS.length;
export const NODES = {
  ENT:[240,262], S1:[240,215], PS:[240,188], PN:[240,112], PW:[202,150], PE:[278,150], PLAZA:[240,188], N1:[240,94],
  W1:[132,150], NW:[132,122], E1:[348,150], NE:[348,122], SW:[134,215], SE:[346,215],
  AW:[86,150], AWT:[86,72], WT:[40,72], WM:[40,150], AWB:[86,215], AWB2:[86,246], WB:[40,246],
  AE:[394,150], AET:[394,72], ET:[440,72], EM:[440,150], AEB:[394,215], AEB2:[394,246], EB:[440,246],
};
export const PLAZA_EDGES = [['PS','PW'],['PS','PE'],['PW','PN'],['PE','PN'],['PLAZA','PS']]; // 광장 안(돌바닥)은 길을 안 그린다
export const TRUNK_ROADS = [['ENT','S1'],['S1','PS']];
// 기본 6건물: 데모와, 설정이 없는 사이트가 쓴다. 자리 번호는 예전 맵과 같은 위치
export const DEFAULT_BUILDINGS = [
  { path:'/',          kind:'plaza',     slot:0 },
  { path:'/checkout',  kind:'checkout',  slot:1 },
  { path:'/products',  kind:'shop',      slot:2 },
  { path:'/search',    kind:'library',   slot:3 },
  { path:'/mypage',    kind:'home',      slot:4 },
  { path:'/community', kind:'community', slot:5 },
];
export const BUILDINGS: any[] = [];                 // 활성 건물 (layoutTown이 채운다). { path, kind, slot, label, x, y, node, spots, ... 에셋 }
export const BY_PATH = new Map<string, any>();
export let FALLBACK_PATH = '/';              // 어디에도 안 맞는 경로는 광장으로
export const ROADS = [], ADJ = {}; export let EDGES = [];
export function dist(a,b){ const [ax,ay]=NODES[a],[bx,by]=NODES[b]; return Math.hypot(ax-bx,ay-by); }
export function findPath(from,to){
  if (from===to) return [from];
  const d={[from]:0}, prev={}, open=new Set([from]);
  while (open.size){ let u=null; for (const n of open) if (u===null||d[n]<d[u]) u=n; open.delete(u); if (u===to) break;
    for (const v of ADJ[u]||[]){ const nd=d[u]+dist(u,v); if (d[v]===undefined||nd<d[v]){ d[v]=nd; prev[v]=u; open.add(v);} } }
  const out=[to]; let c=to; while (c!==from){ c=prev[c]; if(!c) return [from,to]; out.unshift(c); } return out;
}
export function frontSpots(cols, rows, dx=9, dy=8, startDy=2){ const out=[]; for (let r=0;r<rows;r++){ const offs=[0]; for(let i=1;i<=cols;i++){offs.push(i);offs.push(-i);} for (const o of offs.slice(0,cols*2+1)) out.push([o*dx + (r%2?dx/2:0), startDy + r*dy]); } return out; }
// 광장 분수 둘레 자리. 먼저 온 사람부터 분수 앞쪽(아래 반원)을 안쪽 고리·가운데부터 채우고, 앞이 다 차면 양옆(물받이와 겹친다), 그다음 분수 뒤로 간다
export function ringSpots(){ const out=[]; [[24,8],[32,12],[40,14]].forEach(([r,n],ring)=>{ for(let i=0;i<n;i++){ const a=-Math.PI/2 + i*(Math.PI*2/n) + (r===32?0.25:0); const dx=Math.round(Math.cos(a)*r), dy=Math.round(Math.sin(a)*r*0.75); out.push({ dx, dy, k:(dy<0?200:dy===0?100:0) + ring*10 + Math.abs(Math.atan2(dy, dx) - Math.PI/2) }); } });
  return out.sort((p,q)=>p.k-q.k).map(p=>[p.dx,p.dy]); }

// 장식 후보. 활성 건물·길과 겹치는 것은 layoutTown이 뺀다
export const TREES = [[30,28,1],[64,22,0],[18,74,1],[176,52,0],[304,54,1],[412,60,0],[466,70,1],[470,128,0],[14,128,0],[162,240,1],[318,240,1],[34,258,1],[66,252,0],[420,262,1],[456,246,0],[470,202,1],[150,180,0],[330,180,0],[190,96,0],[292,96,0],[96,98,1],[384,98,1],[40,190,0],[440,190,0]];
export const LAMPS = [[206,196],[274,196],[206,106],[274,106],[262,250]];
export const FLOWERS = [[44,52],[80,40],[26,100],[470,100],[440,80],[140,236],[340,236],[52,232],[428,232],[456,180],[190,236],[292,236],[170,70],[310,70],[216,250],[264,236],[104,236],[376,236],[150,130],[330,130]];
export const BUSHES = [[196,74],[286,74],[150,100],[330,100],[80,180],[400,180],[130,246],[350,246],[448,210],[26,190]];
export const FENCES = [[8,48,76],[398,236,72]];
export const POND_SPOTS = [[440,30],[40,30]];
export const GATE = { x:240, y:240 };
export const DECOR: Record<string, any> = { trees:[], flowers:[], bushes:[], fences:[], pond:null, season:[] };
export const hit = (r, x, y, w, h) => !(x+w < r[0] || x > r[0]+r[2] || y+h < r[1] || y > r[1]+r[3]);
// 사이트 설정(건물 목록) → 활성 건물·길 그래프·장식. 에셋(스프라이트·바닥)은 buildAssets()가 이어서 만든다
export function layoutTown(cfg){
  const list=(cfg&&cfg.length?cfg:DEFAULT_BUILDINGS).filter(c=>SLOTS[c.slot]).sort((a,b)=>a.slot-b.slot);
  BUILDINGS.length=0; BY_PATH.clear();
  for (const c of list){ const sl=SLOTS[c.slot]; const b: any={ path:c.path, kind:c.kind||'shop', slot:c.slot, label:c.name||'', x:sl.x, y:sl.y, node:sl.node, maxW:sl.maxW, maxH:sl.maxH };
    const base = c.slot===0 ? [240,150] : NODES[sl.node]; b.spots=(c.slot===0?ringSpots():frontSpots(3,3)).map(([dx,dy])=>({x:base[0]+dx, y:base[1]+dy, used:null}));
    BUILDINGS.push(b); BY_PATH.set(b.path,b); }
  const plaza=BUILDINGS.find(b=>b.slot===0)||BUILDINGS[0]; FALLBACK_PATH=plaza?plaza.path:'/';
  // 길: 트렁크 + 활성 자리마다 필요한 길의 합집합
  const seen=new Set(); ROADS.length=0; for (const e of [...TRUNK_ROADS, ...BUILDINGS.flatMap(b=>SLOTS[b.slot].roads)]){ const k=e.join('>'); if (seen.has(k)) continue; seen.add(k); ROADS.push(e); }
  EDGES=[...PLAZA_EDGES, ...ROADS]; for (const k in ADJ) delete ADJ[k]; for (const [a,b] of EDGES){ (ADJ[a] ||= []).push(b); (ADJ[b] ||= []).push(a); }
}
// 장식: 건물 발자국(앞마당 포함)·길·광장과 겹치는 후보는 뺀다. 스프라이트 크기를 알아야 하므로 buildAssets()가 부른다
export function placeDecor(){
  const blocks=BUILDINGS.map(b=>[b.left-3, b.top-3, b.w+6, b.h+26]);
  for (const [a,b] of ROADS){ const [ax,ay]=NODES[a],[bx,by]=NODES[b]; blocks.push([Math.min(ax,bx)-8, Math.min(ay,by)-8, Math.abs(ax-bx)+16, Math.abs(ay-by)+16]); }
  blocks.push([198,112,84,76]);
  const free=(x,y,w,h)=>!blocks.some(r=>hit(r,x,y,w,h));
  DECOR.trees=TREES.filter(([x,y])=>free(x-10,y-30,20,30)); DECOR.flowers=FLOWERS.filter(([x,y])=>free(x-6,y-4,12,8)); DECOR.bushes=BUSHES.filter(([x,y])=>free(x-8,y-5,16,10));
  DECOR.fences=FENCES.filter(([x,y,w])=>free(x,y-2,w,10)); DECOR.pond=POND_SPOTS.find(([x,y])=>free(x-31,y-17,62,34))||null;
  // 마을 성장(로드맵 34): 누적 방문 레벨(TOWN_LEVEL 1~5)만큼 빈 자리에 장식을 더 둔다. 후보는 격자점 중 건물·길·기존 장식에서 떨어진 곳, 순서는 시드 난수라 레벨이 올라도 앞의 장식은 그대로
  if (TOWN_LEVEL>1){ const rnd=seeded(31), taken=[...DECOR.trees,...DECOR.flowers,...DECOR.bushes]; if (DECOR.pond) taken.push(DECOR.pond); const cands=[];
    for (let y=24;y<H-10;y+=18) for (let x=14;x<W-10;x+=18){ const px=x+Math.floor(rnd()*8)-4, py=y+Math.floor(rnd()*8)-4; if (!free(px-9,py-26,18,28)) continue; if (taken.some(([tx,ty])=>Math.hypot(tx-px,ty-py)<16)) continue; cands.push([px,py]); }
    for (let i=cands.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [cands[i],cands[j]]=[cands[j],cands[i]]; }
    let k=0; const take=(n, into, map)=>{ for (let i=0;i<n && k<cands.length;i++){ const c=cands[k++]; if (taken.some(([tx,ty])=>Math.hypot(tx-c[0],ty-c[1])<14)) { i--; continue; } taken.push(c); into.push(map?map(c):c); } };
    for (let lv=2; lv<=Math.min(5,TOWN_LEVEL); lv++) for (const [n,kind] of GROWTH[lv]) take(n, DECOR[kind], kind==='trees'?c=>[c[0],c[1],(c[0]+c[1])%2]:null); }
  // 계절 이벤트(로드맵 38): SEASON이 켜져 있으면 빈 자리에 한정 장식을 둔다(시드 고정이라 자리는 늘 같다). 땅에 굽지 않고 p5가 건물·나무와 함께 y 정렬로 그린다
  DECOR.season=[]; const sd=SEASONS[SEASON]; if (sd){ const rnd=seeded(53), taken=[...DECOR.trees,...DECOR.flowers,...DECOR.bushes]; if (DECOR.pond) taken.push(DECOR.pond); const cands=[];
    for (let y=30;y<H-12;y+=20) for (let x=16;x<W-12;x+=20){ const px=x+Math.floor(rnd()*10)-5, py=y+Math.floor(rnd()*10)-5; if (!free(px-8,py-16,16,18)) continue; if (taken.some(([tx,ty])=>Math.hypot(tx-px,ty-py)<15)) continue; cands.push([px,py]); }
    for (let i=cands.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [cands[i],cands[j]]=[cands[j],cands[i]]; }
    let k=0; for (const [n,kind] of sd.decor) for (let i=0;i<n && k<cands.length;i++){ const c=cands[k++]; if (taken.some(([tx,ty])=>Math.hypot(tx-c[0],ty-c[1])<14)){ i--; continue; } taken.push(c); DECOR.season.push({ x:c[0], y:c[1], kind, v:i%2 }); } }
}
export let TOWN_LEVEL=1; export function setTownLevelValue(lv: number){ TOWN_LEVEL=lv; } // 1: 100명 미만 · 2: 100 · 3: 1,000 · 4: 10,000 · 5: 100,000 (p6.js setTownLevel)
export const GROWTH={ 2:[[5,'flowers'],[1,'bushes']], 3:[[3,'bushes'],[3,'trees'],[3,'flowers']], 4:[[4,'flowers'],[3,'trees'],[2,'bushes']], 5:[[4,'trees'],[4,'flowers']] };
export function townLevelOf(visits){ return visits>=100000?5:visits>=10000?4:visits>=1000?3:visits>=100?2:1; }
export const TOWN_LEVEL_AT=[0,0,100,1000,10000,100000];
// 계절 이벤트(로드맵 38): 날짜로 정해지는 한정 장식. 할로윈·크리스마스는 양력 구간, 설날은 음력이라 연도별 표(연휴 ±span일). p6 tickSeason()이 1분마다 seasonOf()를 보고 SEASON을 바꾼다(?season=키로 강제)
export const SEASONS: Record<string, any> = {
  halloween: { name:'할로윈', from:[10,24], to:[10,31], decor:[[5,'pumpkin'],[3,'pumpkin_s']], feed:'호박 등불을 놓았어요. 밤에는 박쥐가 날아요.' },
  xmas: { name:'크리스마스', from:[12,15], to:[12,31], decor:[[2,'snowman'],[4,'gift']], feed:'눈이 내리고 나무에 전구를 달았어요.' },
  seol: { name:'설날', days:{ 2026:[2,17], 2027:[2,6], 2028:[1,26], 2029:[2,13], 2030:[2,3], 2031:[1,23], 2032:[2,11], 2033:[1,31], 2034:[2,19], 2035:[2,8] }, span:2, decor:[[5,'pouch']], feed:'복주머니를 놓고 가로등에 등불을 달았어요. 새해 복 많이 받으세요.' },
};
export function seasonOf(d=new Date()){ const y=d.getFullYear(), m=d.getMonth()+1, day=d.getDate(), md=m*100+day;
  for (const [k,s] of Object.entries(SEASONS)){ if (s.from){ if (md>=s.from[0]*100+s.from[1] && md<=s.to[0]*100+s.to[1]) return k; continue; }
    const sd=s.days[y]; if (!sd) continue; const diff=Math.round((+new Date(y,m-1,day)-+new Date(y,sd[0]-1,sd[1]))/864e5); if (Math.abs(diff)<=s.span) return k; }
  return ''; }
export function setSeasonValue(s: string){ SEASON=s; }
export let SEASON='';
layoutTown(DEFAULT_BUILDINGS);

/* ---------- 3. PIXEL HELPERS + ASSET BUILDERS (테마 바꾸면 buildAssets()가 전부 다시 만든다) ---------- */
// 스프라이트용 캔버스 공장. 기본은 DOM 캔버스이고, Worker(로드맵 47)에서는 setCanvasFactory로 OffscreenCanvas를 넣는다. 엔진은 document를 직접 찾지 않는다
export let makeCanvas: (w: number, h: number) => HTMLCanvasElement = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export function setCanvasFactory(fn: (w: number, h: number) => HTMLCanvasElement){ makeCanvas = fn; }
export function mk(w: number, h: number){ return makeCanvas(w, h); }
export class PX {
  c: HTMLCanvasElement; g: CanvasRenderingContext2D;
  constructor(cv: HTMLCanvasElement){ this.c=cv; this.g=cv.getContext('2d'); this.g.imageSmoothingEnabled=false; }
  r(x: number, y: number, w: number, h: number, col?: string){ this.g.fillStyle=col; this.g.fillRect(x,y,w,h); }
  o(x,y,w,h,col=PAL.outline){ this.r(x,y,w,1,col); this.r(x,y+h-1,w,1,col); this.r(x,y,1,h,col); this.r(x+w-1,y,1,h,col); }
  box(x: number, y: number, w: number, h: number, fill?: string, col?: string){ this.r(x,y,w,h,fill); this.o(x,y,w,h,col); }
  ell(cx,cy,rx,ry,col){ for(let dy=-ry;dy<=ry;dy++){ const k=1-(dy*dy)/((ry+0.5)*(ry+0.5)); if(k<0)continue; const dx=Math.floor(rx*Math.sqrt(k)); this.r(cx-dx,cy+dy,2*dx+1,1,col);} }
  ellO(cx,cy,rx,ry,fill,col=PAL.outline){ this.ell(cx,cy,rx,ry,col); this.ell(cx,cy,rx-1,ry-1,fill); }
  tri(cx,top,h,col){ for(let i=0;i<h;i++){ this.r(cx-i,top+i,2*i+1,1,col);} }
  sprite(rows,map,x,y){ for(let j=0;j<rows.length;j++){ const row=rows[j]; for(let i=0;i<row.length;i++){ const ch=row[i]; if(ch==='.')continue; const col=map[ch]; if(!col)continue; this.r(x+i,y+j,1,1,col);} } }
}
export function win(p,x,y,w=7,h=7){ p.box(x,y,w,h,PAL.water); p.r(x+Math.floor(w/2),y+1,1,h-2,PAL.white); p.r(x+1,y+Math.floor(h/2),w-2,1,PAL.white); p.r(x+1,y+1,1,1,PAL.white); p.r(x-1,y+h,w+2,1,PAL.wood2); }
export function door(p,x,y,w=9,h=13){ p.box(x,y,w,h,PAL.wood); p.r(x+Math.floor(w/2),y+1,1,h-2,PAL.wood2); p.r(x+w-3,y+Math.floor(h/2),1,1,PAL.gold); p.r(x+1,y+1,1,h-2,'rgba(255,255,255,.3)'); }
export function roof(p,x,y,w,h,col,shade){ for(let i=0;i<h;i++){ const ins=h-1-i; p.r(x+ins,y+i,w-2*ins,1,col); p.r(x+ins,y+i,1,1,PAL.outline); p.r(x+w-1-ins,y+i,1,1,PAL.outline); if(i>1&&i%3===0) for(let k=x+ins+2;k<x+w-1-ins;k+=4) p.r(k+(i%2?0:2),y+i,2,1,shade); } p.r(x+h-1,y,w-2*(h-1),1,PAL.outline); p.r(x,y+h-1,w,1,PAL.outline); p.r(x+h,y+1,w-2*h,1,'rgba(255,255,255,.45)'); }
export function scallop(p,x,y,w,c1,c2){ for(let k=0;k<w;k+=4){ p.r(x+k,y,4,6,(k/4)%2?c1:c2); p.r(x+k+1,y+6,2,1,(k/4)%2?c1:c2); } p.r(x,y,w,1,PAL.outline); p.r(x,y+6,w,1,PAL.outline); for(let k=0;k<w;k+=4){ p.r(x+k,y+6,1,1,PAL.outline); p.r(x+k+1,y+7,2,1,PAL.outline);} }
export function shadow(p,cx,cy,rx,ry){ p.g.globalAlpha=.18; p.ell(cx,cy,rx,ry,PAL.outline); p.g.globalAlpha=1; }
export function timber(p,x,y,w,h){ p.r(x,y,w,1,PAL.wood2); p.r(x,y+h-1,w,1,PAL.wood2); for(let k=x;k<x+w;k+=12){ p.r(k,y,1,h,PAL.wood2); p.r(k+6,y+Math.floor(h/2),1,Math.ceil(h/2),PAL.wood2); } }
export function glass(p,x,y,w,h){ p.box(x,y,w,h,PAL.water); p.r(x+1,y+1,2,h-2,'rgba(255,255,255,.55)'); for(let k=x+Math.floor(w/3);k<x+w-1;k+=Math.floor(w/3)) p.r(k,y,1,h,PAL.stone2); }
export function shade(hex,amt){ const n=parseInt(hex.slice(1),16); const f=c=>Math.max(0,Math.min(255,Math.round(c*amt))); return '#'+[(n>>16)&255,(n>>8)&255,n&255].map(f).map(v=>v.toString(16).padStart(2,'0')).join(''); }

export const BUILD = {
  // --- 아늑 ---
  fountain(){ const c=mk(62,38), p=new PX(c); shadow(p,31,35,31,4); p.ellO(31,26,30,11,PAL.stone); p.ell(31,25,27,8,PAL.stone2); p.ellO(31,24,26,7,PAL.water); p.ell(31,23,8,2,'rgba(255,255,255,.35)'); p.box(27,9,9,15,PAL.stone); p.r(28,10,1,13,PAL.white); p.r(34,10,1,13,PAL.stone2); p.ellO(31,9,13,4,PAL.stone); p.ellO(31,8,10,2,PAL.water); p.box(29,2,5,6,PAL.stone); p.r(30,3,1,4,PAL.white); return c; },
  shop(){ const c=mk(66,58), p=new PX(c); shadow(p,33,54,34,5); p.r(7,18,52,36,PAL.wall); p.r(54,18,5,36,PAL.wall2); p.o(7,18,52,36); roof(p,1,4,64,14,PAL.roofPink,shade(PAL.roofPink,.88)); scallop(p,5,26,56,PAL.roofPink,PAL.white);
    p.box(11,36,22,15,PAL.water); p.r(12,37,20,13,'#cfeaf7'); p.r(12,37,2,13,PAL.white); p.r(12,44,20,1,PAL.wood2); p.r(12,50,20,1,PAL.wood2);
    ([[14,40,PAL.red],[19,40,PAL.gold],[24,40,PAL.leaf],[29,40,PAL.roofLilac],[14,46,PAL.roofBlue],[20,46,PAL.pink],[26,46,PAL.gold]] as any[]).forEach(([x,y,col])=>{p.r(x,y,3,3,col);p.r(x,y,1,1,'rgba(255,255,255,.5)')});
    door(p,40,40,10,14); win(p,15,20,6,5); win(p,45,20,6,5); p.r(35,50,4,3,PAL.leaf); p.r(35,54,4,1,PAL.wood2); return c; },
  library(){ const c=mk(70,66), p=new PX(c); shadow(p,35,62,36,5); p.r(7,16,56,46,PAL.wall); p.r(58,16,5,46,PAL.wall2); p.o(7,16,56,46); roof(p,1,2,68,14,PAL.roofBlue,shade(PAL.roofBlue,.85)); p.r(7,38,56,1,PAL.wood2);
    for(const x of [12,24,36,48]){ p.box(x,20,8,10,PAL.water); p.r(x+2,19,4,1,PAL.outline); p.r(x+3,21,1,8,PAL.white); p.r(x+1,25,6,1,PAL.white); }
    p.box(24,40,22,22,PAL.wood); p.r(35,41,1,20,PAL.wood2); p.r(32,51,1,1,PAL.gold); p.r(38,51,1,1,PAL.gold); for(const x of [11,53]){ p.box(x,40,5,22,PAL.stone); p.r(x+1,41,1,20,PAL.white); p.r(x-1,40,7,2,PAL.stone2); p.o(x-1,40,7,2); }
    win(p,17,43,6,7); win(p,47,43,6,7); p.r(5,62,60,2,PAL.stone2); p.o(5,62,60,2); p.r(3,64,64,2,PAL.stone2); p.o(3,64,64,2); return c; },
  community(){ const c=mk(78,56), p=new PX(c); shadow(p,39,52,40,5); p.r(7,14,64,38,PAL.wall); p.r(66,14,5,38,PAL.wall2); p.o(7,14,64,38); roof(p,1,0,76,14,PAL.roofGreen,shade(PAL.roofGreen,.85));
    for(let k=8;k<70;k+=6) p.r(k,18,3,3,(k/6)%2?PAL.roofGreen:PAL.pink); p.r(8,17,62,1,PAL.outline); p.r(8,21,62,1,PAL.outline);
    p.box(31,34,16,18,PAL.wood); p.r(39,35,1,16,PAL.wood2); p.r(36,43,1,1,PAL.gold); p.r(42,43,1,1,PAL.gold); p.r(29,32,20,2,PAL.wood2); p.o(29,32,20,2);
    win(p,12,28,8,8); win(p,22,28,6,6); win(p,50,28,6,6); win(p,58,28,8,8); for(const x of [12,58]){ p.r(x,40,8,8,PAL.leaf); p.r(x+2,38,4,2,PAL.leaf); p.r(x,48,8,1,PAL.wood2); p.r(x+3,42,2,2,PAL.pink);} return c; },
  house(){ const c=mk(50,52), p=new PX(c); shadow(p,25,48,26,5); p.box(36,0,7,12,PAL.stone2); p.r(35,0,9,2,PAL.stone); p.o(35,0,9,2); p.r(7,18,36,30,PAL.wall); p.r(38,18,5,30,PAL.wall2); p.o(7,18,36,30); roof(p,1,6,48,13,PAL.roofPink,shade(PAL.roofPink,.88));
    win(p,13,24,8,8); p.r(12,33,10,3,PAL.wood); p.o(12,33,10,3); p.r(13,31,2,2,PAL.pink); p.r(16,31,2,2,PAL.gold); p.r(19,31,2,2,PAL.pink); door(p,27,34,9,14); p.r(28,33,7,1,PAL.wood); p.r(29,32,5,1,PAL.outline); p.r(27,22,3,3,PAL.water); p.o(26,21,5,5); return c; },
  stall(){ const c=mk(54,46), p=new PX(c); shadow(p,27,43,27,4); p.r(4,10,2,32,PAL.wood2); p.r(48,10,2,32,PAL.wood2); for(let k=0;k<52;k+=4) p.r(1+k,2,4,9,(k/4)%2?PAL.roofYellow:PAL.white); p.r(1,2,52,1,PAL.outline); p.r(0,0,54,2,PAL.roofYellow); p.o(0,0,54,2);
    for(let k=0;k<52;k+=4){ p.r(1+k,11,4,1,(k/4)%2?PAL.roofYellow:PAL.white); p.r(1+k,12,2,1,PAL.outline); p.r(1+k,11,1,1,PAL.outline);} p.r(0,2,1,10,PAL.outline); p.r(53,2,1,10,PAL.outline);
    p.box(6,28,42,14,PAL.wood); p.r(7,29,40,1,'#dba878'); for(let k=10;k<46;k+=8) p.r(k,31,1,10,PAL.wood2); p.r(4,26,46,3,PAL.wood2); p.o(4,26,46,3); p.box(10,19,10,8,PAL.stone); p.r(12,21,6,2,PAL.water); p.r(13,24,2,2,PAL.gold); p.r(16,24,2,2,PAL.red);
    ([[26,22,PAL.red],[30,22,PAL.red],[34,22,PAL.gold],[38,22,PAL.gold],[42,22,PAL.leaf]] as any[]).forEach(([x,y,col])=>{p.r(x,y,3,4,col);p.r(x,y,1,1,'rgba(255,255,255,.5)');}); p.r(24,26,22,1,PAL.wood2); p.sprite(ICON_ROWS.coin,iconMap(),21,30); return c; },
  // --- RPG ---
  well(){ const c=mk(44,44), p=new PX(c); shadow(p,22,41,22,4); p.r(8,10,2,24,PAL.wood2); p.r(34,10,2,24,PAL.wood2); roof(p,2,0,40,10,PAL.wood,PAL.wood2); p.ellO(22,32,17,7,PAL.stone2); p.ellO(22,30,14,5,'#3a4a5a'); p.ell(22,29,8,2,PAL.water2); p.r(16,24,12,2,PAL.stone); p.o(15,23,14,4); p.r(21,10,2,14,PAL.wood2); p.box(18,13,8,5,PAL.wood); p.r(21,15,2,8,PAL.outline); p.box(19,21,6,4,PAL.metal); return c; },
  armory(){ const c=mk(64,60), p=new PX(c); shadow(p,32,56,32,5); p.r(7,20,50,36,PAL.wall); p.r(52,20,5,36,PAL.wall2); p.o(7,20,50,36); timber(p,8,21,48,34); roof(p,1,6,62,14,PAL.wood2,shade(PAL.wood2,.8)); p.box(44,0,7,12,PAL.stone2);
    p.box(12,32,16,12,PAL.wood2); p.r(13,33,14,10,'#4a3a3a'); p.sprite(ICON_ROWS.sword,iconMap(),15,32); door(p,36,42,10,14); win(p,14,24,6,5); p.box(10,47,8,9,PAL.stone2); p.r(12,45,4,2,PAL.red); p.r(11,49,6,1,PAL.metal); return c; },
  tower(){ const c=mk(48,80), p=new PX(c); shadow(p,24,76,20,4); p.r(10,26,28,50,PAL.stone); p.r(32,26,6,50,PAL.stone2); p.o(10,26,28,50); for(let y=30;y<74;y+=6) for(let x=12;x<36;x+=8) p.r(x+(y/6%2?4:0),y,5,1,PAL.stone2);
    p.tri(24,2,22,PAL.roofBlue); p.r(2,23,44,3,PAL.roofBlue); p.o(2,23,44,3); for(let i=0;i<22;i++){ p.r(24-i,2+i,1,1,PAL.outline); p.r(24+i,2+i,1,1,PAL.outline);} p.r(23,0,3,2,PAL.gold); p.r(24,-1,1,1,PAL.gold);
    for(const y of [32,48]){ p.box(20,y,8,10,PAL.water2); p.r(22,y-1,4,1,PAL.outline); p.r(23,y+2,2,2,PAL.gold); } door(p,19,62,10,14); p.r(14,70,2,2,PAL.gold); p.r(33,66,2,2,PAL.gold); return c; },
  inn(){ const c=mk(80,60), p=new PX(c); shadow(p,40,56,40,5); p.r(7,18,66,38,PAL.wall); p.r(68,18,5,38,PAL.wall2); p.o(7,18,66,38); timber(p,8,19,64,36); roof(p,1,4,78,14,PAL.roofPink,shade(PAL.roofPink,.85));
    p.box(33,36,14,20,PAL.wood); p.r(40,37,1,18,PAL.wood2); p.r(37,46,1,1,PAL.gold); p.r(43,46,1,1,PAL.gold); for(const x of [12,22,54,64]) win(p,x,24,7,7); win(p,14,40,8,8); win(p,58,40,8,8);
    p.box(56,20,2,16,PAL.wood2); p.box(58,22,16,10,PAL.roofYellow); p.sprite(ICON_ROWS.mug,iconMap(),60,21); p.r(20,38,3,3,PAL.gold); p.r(20,35,3,3,PAL.gold); return c; },
  cabin(){ const c=mk(50,50), p=new PX(c); shadow(p,25,46,25,5); p.box(36,0,6,12,PAL.stone2); p.r(7,18,36,28,PAL.wood); for(let y=20;y<46;y+=4) p.r(8,y,34,1,PAL.wood2); p.r(38,18,5,28,PAL.wood2); p.o(7,18,36,28); roof(p,1,6,48,13,PAL.roofGreen,shade(PAL.roofGreen,.8));
    win(p,13,24,8,8); door(p,27,32,9,14); p.r(14,40,6,4,PAL.wood2); p.r(14,40,3,2,PAL.wood); p.r(17,42,3,2,PAL.wood); return c; },
  treasury(){ const c=mk(56,46), p=new PX(c); shadow(p,28,43,28,4); p.r(4,10,2,32,PAL.wood2); p.r(50,10,2,32,PAL.wood2); for(let k=0;k<52;k+=4) p.r(2+k,2,4,9,(k/4)%2?PAL.roofPink:PAL.roofYellow); p.r(2,2,52,1,PAL.outline); p.r(1,0,54,2,PAL.roofPink); p.o(1,0,54,2);
    for(let k=0;k<52;k+=4){ p.r(2+k,11,4,1,(k/4)%2?PAL.roofPink:PAL.roofYellow); p.r(2+k,12,2,1,PAL.outline);} p.box(8,26,40,16,PAL.wood); p.r(9,27,38,1,'#dba878'); p.r(6,24,44,3,PAL.wood2); p.o(6,24,44,3);
    p.sprite(ICON_ROWS.chest,iconMap(),22,28); p.sprite(ICON_ROWS.coin,iconMap(),10,28); p.sprite(ICON_ROWS.coin,iconMap(),36,28); p.box(14,16,8,8,PAL.stone); p.r(16,18,4,4,PAL.gold); return c; },
  // --- 오피스 ---
  lobby(){ const c=mk(64,42), p=new PX(c); shadow(p,32,39,32,4); p.box(6,20,52,16,PAL.wall); p.r(6,20,52,2,PAL.roofBlue); p.o(6,20,52,16); p.r(8,28,48,1,PAL.stone2); p.box(22,4,20,14,PAL.roofBlue); p.r(24,6,16,10,PAL.wall); p.sprite(ICON_ROWS.house,iconMap(),26,7);
    p.box(8,24,8,6,PAL.wall2); p.r(10,26,4,2,PAL.water); p.r(46,22,8,8,PAL.leaf); p.r(48,20,4,2,PAL.leaf); p.box(47,30,6,6,PAL.wood); p.r(26,22,12,3,PAL.stone); p.r(28,26,2,2,PAL.pink); p.r(34,26,2,2,PAL.gold); return c; },
  showroom(){ const c=mk(66,54), p=new PX(c); shadow(p,33,51,33,4); p.r(5,8,56,42,PAL.wall); p.r(56,8,5,42,PAL.wall2); p.o(5,8,56,42); p.box(3,2,60,8,PAL.roofBlue); p.r(5,4,56,1,PAL.white); p.sprite(ICON_ROWS.cart,iconMap(),27,0);
    glass(p,8,16,44,26); for(const [x,y,col] of ([[12,22,PAL.red],[20,22,PAL.gold],[28,22,PAL.leaf],[36,22,PAL.roofPink],[44,22,PAL.water2],[14,32,PAL.roofLilac],[26,32,PAL.gold],[38,32,PAL.red]] as any[])){ p.box(x,y,6,6,col); p.r(x+1,y+1,1,1,'rgba(255,255,255,.5)'); }
    p.r(9,29,42,1,PAL.stone2); p.r(9,39,42,1,PAL.stone2); p.box(54,16,6,24,PAL.water); p.r(54,16,6,2,PAL.stone2); return c; },
  archive(){ const c=mk(70,60), p=new PX(c); shadow(p,35,57,35,4); p.r(5,8,60,48,PAL.wall); p.r(60,8,5,48,PAL.wall2); p.o(5,8,60,48); p.box(3,2,64,8,PAL.roofBlue); p.sprite(ICON_ROWS.book,iconMap(),29,0);
    for(const x of [9,25,41]){ p.box(x,14,14,40,PAL.wood2); for(let y=16;y<52;y+=9){ p.r(x+1,y,12,7,PAL.wood); for(let k=0;k<4;k++) p.r(x+2+k*3,y+1,2,5,[PAL.red,PAL.water2,PAL.roofGreen,PAL.gold][(k+y)%4]); } }
    p.box(57,14,6,40,PAL.metal2); for(let y=16;y<52;y+=5){ p.r(58,y,4,3,PAL.metal); p.r(59,y+1,1,1,PAL.leaf); } return c; },
  meeting(){ const c=mk(78,54), p=new PX(c); shadow(p,39,51,39,4); p.r(5,8,68,42,PAL.wall); p.r(68,8,5,42,PAL.wall2); p.o(5,8,68,42); p.box(3,2,72,8,PAL.roofBlue); p.sprite(ICON_ROWS.heart,iconMap(),33,0);
    glass(p,8,14,62,30); p.ellO(39,36,22,6,PAL.wood); p.r(20,34,38,1,'rgba(255,255,255,.3)'); for(const x of [22,32,42,52]){ p.box(x,25,6,5,PAL.roofBlue); p.box(x,41,6,5,PAL.roofBlue);} p.box(34,18,12,8,PAL.white); p.r(35,19,10,6,PAL.water); p.r(37,21,6,2,PAL.roofGreen); p.r(6,46,66,1,PAL.stone2); return c; },
  desk(){ const c=mk(46,44), p=new PX(c); shadow(p,23,41,23,4); p.box(3,6,40,30,PAL.wall2); p.r(3,6,40,2,PAL.roofBlue); p.o(3,6,40,30); p.r(5,12,36,1,PAL.stone2);
    p.box(8,24,30,10,PAL.wood); p.r(9,25,28,1,'rgba(255,255,255,.3)'); p.r(9,34,2,6,PAL.wood2); p.r(35,34,2,6,PAL.wood2); p.box(16,14,14,10,PAL.outline); p.r(17,15,12,8,PAL.water); p.r(18,16,4,1,PAL.white); p.r(18,18,8,1,PAL.roofGreen); p.r(18,20,6,1,PAL.roofGreen); p.r(22,24,2,1,PAL.outline);
    p.box(10,19,5,5,PAL.white); p.r(11,20,3,3,PAL.wood2); p.r(32,18,5,6,PAL.leaf); p.box(33,24,3,3,PAL.wood); p.r(14,27,10,1,PAL.stone2); return c; },
  cashier(){ const c=mk(56,46), p=new PX(c); shadow(p,28,43,28,4); p.box(4,0,48,10,PAL.roofBlue); p.sprite(ICON_ROWS.coin,iconMap(),22,-1); p.r(6,10,2,16,PAL.metal2); p.r(48,10,2,16,PAL.metal2);
    p.box(6,26,44,16,PAL.wall); p.r(6,26,44,2,PAL.roofBlue); p.o(6,26,44,16); p.box(12,16,12,10,PAL.metal2); p.r(14,18,8,3,PAL.water); p.r(14,22,2,2,PAL.gold); p.r(18,22,2,2,PAL.red); p.box(30,18,8,8,PAL.white); p.r(32,20,4,2,PAL.roofBlue); p.r(32,23,4,1,PAL.outline); p.r(40,20,6,6,PAL.stone2); p.r(41,21,4,4,PAL.gold); p.r(9,34,38,1,PAL.stone2); return c; },
  // --- 아늑 추가 6종 (바깥 고리에도 들어가도록 68×60 이하)
  cafe(){ const c=mk(60,52), p=new PX(c); shadow(p,30,49,30,4); p.r(6,18,48,30,PAL.wall); p.r(49,18,5,30,PAL.wall2); p.o(6,18,48,30); roof(p,2,6,56,12,PAL.roofGreen,shade(PAL.roofGreen,.85)); scallop(p,6,24,48,PAL.red,PAL.white);
    p.box(10,34,14,10,PAL.water); p.r(11,35,12,8,'#cfeaf7'); p.r(11,39,12,1,PAL.wood2); p.r(13,36,2,2,PAL.pink); p.r(18,36,2,2,PAL.gold); p.r(14,41,4,2,PAL.roofLilac); door(p,40,34,10,14);
    p.box(26,33,8,8,PAL.white); p.r(27,34,6,6,PAL.wood2); p.r(28,35,3,3,PAL.wall); p.r(31,36,1,1,PAL.wall); p.ellO(14,47,5,2,PAL.wood); p.r(13,45,3,1,PAL.wood2); return c; },
  school(){ const c=mk(66,58), p=new PX(c); shadow(p,33,55,33,4); p.r(6,22,54,32,PAL.wall); p.r(55,22,5,32,PAL.wall2); p.o(6,22,54,32); roof(p,2,12,62,10,PAL.roofBlue,shade(PAL.roofBlue,.85));
    p.box(27,4,12,12,PAL.wall); p.r(26,3,14,2,PAL.roofBlue); p.o(26,3,14,2); p.r(32,0,2,3,PAL.gold); p.box(30,7,6,6,PAL.white); p.r(32,8,1,2,PAL.outline); p.r(32,10,2,1,PAL.outline);
    for (const x of [10,20,38,48]) win(p,x,27,7,7); p.box(29,36,8,18,PAL.wood); p.r(33,37,1,16,PAL.wood2); p.r(31,45,1,1,PAL.gold); p.r(35,45,1,1,PAL.gold); win(p,10,40,7,7); win(p,48,40,7,7);
    p.r(8,8,1,14,PAL.outline); p.r(9,8,6,4,PAL.red); p.r(9,9,6,1,PAL.white); return c; },
  clinic(){ const c=mk(58,56), p=new PX(c); shadow(p,29,53,29,4); p.r(5,12,48,40,PAL.white); p.r(48,12,5,40,PAL.stone); p.o(5,12,48,40); p.r(5,12,48,4,PAL.roofBlue); p.o(5,12,48,4);
    p.box(22,2,14,12,PAL.white); p.o(22,2,14,12); p.r(28,4,2,8,PAL.red); p.r(25,7,8,2,PAL.red); win(p,9,20,8,8); win(p,41,20,8,8); win(p,9,34,8,8); win(p,41,34,8,8);
    p.r(21,30,16,3,PAL.roofBlue); p.o(21,30,16,3); glass(p,23,34,12,18); p.r(28,34,1,18,PAL.stone2); p.r(10,46,8,5,PAL.leaf); p.r(11,44,2,2,PAL.pink); p.r(15,45,2,2,PAL.white); return c; },
  post(){ const c=mk(56,50), p=new PX(c); shadow(p,28,47,28,4); p.r(5,16,46,30,PAL.roofYellow); p.r(46,16,5,30,shade(PAL.roofYellow,.85)); p.o(5,16,46,30); roof(p,1,4,54,12,PAL.red,shade(PAL.red,.85));
    p.box(20,19,16,11,PAL.white); p.sprite(ICON_ROWS.mail,iconMap(),22,18); win(p,8,22,8,7); door(p,38,32,9,14); win(p,9,34,8,8);
    p.box(22,36,8,10,PAL.red); p.r(23,37,6,1,PAL.white); p.r(24,40,4,2,PAL.outline); p.r(25,46,2,2,PAL.outline); return c; },
  workshop(){ const c=mk(64,56), p=new PX(c); shadow(p,32,53,32,4); p.box(46,0,7,14,PAL.stone2); p.r(45,0,9,2,PAL.stone); p.o(45,0,9,2);
    p.r(6,18,52,34,PAL.wall2); p.r(53,18,5,34,shade(PAL.wall2,.9)); p.o(6,18,52,34); timber(p,7,19,50,32); roof(p,2,8,60,10,PAL.wood2,shade(PAL.wood2,.8));
    p.box(10,24,12,10,PAL.water); p.r(11,25,10,8,'#cfeaf7'); p.r(15,25,1,8,PAL.white); p.box(26,30,20,22,PAL.wood); p.r(36,31,1,20,PAL.wood2); p.r(27,31,18,1,'#dba878'); for (const y of [36,44]) p.r(27,y,18,1,PAL.wood2);
    p.box(44,20,12,12,PAL.white); p.sprite(ICON_ROWS.gear,iconMap(),44,20); p.r(10,40,8,10,PAL.stone2); p.r(11,38,6,3,PAL.metal); p.r(12,41,4,1,PAL.metal2); return c; },
  park(){ const c=mk(64,44), p=new PX(c); p.ellO(32,34,30,8,PAL.grass2,PAL.grass3); p.r(2,28,60,1,PAL.wood2); p.r(2,32,60,1,PAL.wood2); for (let k=2;k<62;k+=6){ if (k>=26&&k<=36) continue; p.r(k,26,2,10,PAL.wood); p.r(k,25,2,1,PAL.outline); }
    p.r(2,28,24,1,PAL.wood2); p.r(38,28,24,1,PAL.wood2); p.box(30,10,4,16,PAL.wood); p.ellO(32,10,10,8,PAL.leaf); p.ell(29,7,4,2,'#a4e0a4'); p.r(35,12,2,2,PAL.pink);
    p.r(8,13,14,2,PAL.wood); p.r(8,16,14,3,PAL.wood); p.o(8,16,14,3); p.r(9,19,2,4,PAL.wood2); p.r(19,19,2,4,PAL.wood2);
    for (const [x,y,col] of ([[44,16,PAL.pink],[50,14,PAL.gold],[56,18,PAL.roofLilac],[47,21,PAL.white],[54,22,PAL.pink]] as any[])) { p.r(x-1,y,3,1,col); p.r(x,y-1,1,3,col); p.r(x,y,1,1,col===PAL.gold?PAL.red:PAL.gold); }
    p.r(26,22,1,14,PAL.wood2); p.r(37,22,1,14,PAL.wood2); p.r(26,21,12,2,PAL.wood2); p.r(28,19,8,2,PAL.wood2); p.r(29,20,2,1,PAL.pink); p.r(33,20,2,1,PAL.pink); return c; },
  // --- RPG 추가 6종
  tavern(){ const c=mk(62,56), p=new PX(c); shadow(p,31,53,31,4); p.r(6,20,50,32,PAL.wall); p.r(51,20,5,32,PAL.wall2); p.o(6,20,50,32); timber(p,7,21,48,30); roof(p,2,6,58,14,PAL.roofPink,shade(PAL.roofPink,.85));
    win(p,10,26,8,7); win(p,44,26,8,7); door(p,26,38,10,14); p.box(38,30,2,10,PAL.wood2); p.box(40,32,14,10,PAL.roofYellow); p.sprite(ICON_ROWS.mug,iconMap(),41,31);
    p.box(9,42,8,10,PAL.wood); p.r(10,45,6,1,PAL.wood2); p.r(10,48,6,1,PAL.wood2); p.r(12,43,2,8,'rgba(255,255,255,.2)'); p.r(18,46,6,6,PAL.wood2); return c; },
  academy(){ const c=mk(60,58), p=new PX(c); shadow(p,30,55,30,4); p.r(6,18,48,36,PAL.stone); p.r(49,18,5,36,PAL.stone2); p.o(6,18,48,36); for (let y=22;y<52;y+=6) for (let x=8;x<52;x+=8) p.r(x+(y/6%2?4:0),y,5,1,PAL.stone2);
    p.r(4,14,52,4,PAL.stone2); p.o(4,14,52,4); for (let k=4;k<56;k+=8){ p.r(k,10,4,4,PAL.stone2); p.o(k,10,4,4); }
    p.r(14,20,8,16,PAL.roofBlue); p.r(14,34,8,2,PAL.gold); p.r(17,24,2,2,PAL.gold); p.r(38,20,8,16,PAL.red); p.r(38,34,8,2,PAL.gold); p.r(41,24,2,2,PAL.gold);
    p.box(25,38,10,16,PAL.wood); p.r(30,39,1,14,PAL.wood2); p.r(28,46,1,1,PAL.gold); p.r(8,40,2,12,PAL.wood2); p.r(5,42,8,5,PAL.wood); p.r(7,37,4,4,PAL.wood); p.r(8,38,2,2,PAL.outline);
    p.box(42,44,10,8,PAL.wood2); p.r(43,45,8,2,PAL.metal); p.r(44,48,6,1,PAL.metal); return c; },
  healer(){ const c=mk(54,52), p=new PX(c); shadow(p,27,49,27,4); p.ellO(27,22,25,12,PAL.roofGreen); p.ell(27,19,20,7,shade(PAL.roofGreen,1.1)); p.r(7,22,40,26,PAL.wall); p.r(42,22,5,26,PAL.wall2); p.o(7,22,40,26);
    p.box(21,2,12,10,PAL.white); p.o(21,2,12,10); p.r(26,4,2,6,PAL.red); p.r(24,6,6,2,PAL.red); win(p,11,28,8,7); door(p,30,34,9,14);
    p.r(10,38,10,10,PAL.leaf); p.r(12,36,2,2,PAL.pink); p.r(16,37,2,2,PAL.white); p.r(10,48,10,1,PAL.wood2); p.r(42,30,3,6,PAL.gold); p.r(42,30,3,1,PAL.outline); return c; },
  dovecote(){ const c=mk(48,58), p=new PX(c); shadow(p,24,55,22,4); p.r(14,20,20,34,PAL.wall); p.r(30,20,4,34,PAL.wall2); p.o(14,20,20,34); roof(p,8,8,32,12,PAL.wood2,shade(PAL.wood2,.8)); p.r(22,2,4,6,PAL.wood2); p.r(21,2,6,1,PAL.outline);
    for (const [x,y] of [[17,24],[27,24],[17,32],[27,32],[17,40],[27,40]]) { p.r(x,y,4,4,PAL.outline); p.r(x+1,y+1,2,2,'#4a3a3a'); } p.r(20,26,2,2,PAL.white); p.r(28,34,2,2,PAL.white); door(p,20,44,8,10);
    p.r(6,32,1,10,PAL.wood2); p.box(1,24,11,9,PAL.white); p.sprite(ICON_ROWS.mail,iconMap(),1,22); p.r(36,46,10,8,PAL.wood2); p.r(37,47,8,2,PAL.roofYellow); return c; },
  smithy(){ const c=mk(62,54), p=new PX(c); shadow(p,31,51,31,4); p.box(44,0,7,14,PAL.stone2); p.r(43,0,9,2,PAL.stone); p.o(43,0,9,2);
    p.r(6,18,50,32,PAL.stone); p.r(51,18,5,32,PAL.stone2); p.o(6,18,50,32); for (let y=22;y<50;y+=6) for (let x=8;x<54;x+=8) p.r(x+(y/6%2?4:0),y,5,1,PAL.stone2); roof(p,2,8,58,10,PAL.wood2,shade(PAL.wood2,.8));
    p.r(8,28,26,22,'#3a2a2a'); p.o(8,28,26,22); p.r(10,40,10,8,PAL.stone2); p.r(12,38,6,3,PAL.red); p.r(13,39,4,1,PAL.gold); p.r(24,42,8,4,PAL.metal2); p.r(23,41,10,1,PAL.metal); p.r(26,46,4,4,PAL.wood2);
    p.box(40,22,12,12,PAL.white); p.sprite(ICON_ROWS.gear,iconMap(),40,22); p.r(40,40,12,10,PAL.wood); p.r(41,41,2,8,PAL.metal); p.r(45,41,2,8,PAL.metal); p.r(49,41,2,8,PAL.metal2); return c; },
  garden(){ const c=mk(62,44), p=new PX(c); p.r(2,8,58,30,PAL.dirt); p.o(2,8,58,30); for (let r=0;r<3;r++) for (let x=6;x<56;x+=8){ const y=12+r*8; p.r(x,y+2,5,2,PAL.dirt2); p.r(x+1,y,3,2,[PAL.leaf,'#5fa060',PAL.roofGreen][(x/8+r)%3]); p.r(x+2,y-1,1,1,r%2?PAL.pink:PAL.gold); }
    for (let k=2;k<60;k+=6) p.r(k,38,4,4,PAL.stone2); p.r(2,40,58,1,PAL.outline); p.r(29,4,2,30,PAL.wood2); p.r(23,10,14,2,PAL.wood2); p.r(26,2,8,6,PAL.roofYellow); p.o(26,2,8,6); p.r(28,4,1,1,PAL.outline); p.r(31,4,1,1,PAL.outline);
    p.box(46,26,10,8,PAL.wood); p.r(47,27,8,1,PAL.wood2); return c; },
  // --- 오피스 추가 6종
  cafeteria(){ const c=mk(62,50), p=new PX(c); shadow(p,31,47,31,4); p.r(5,10,52,36,PAL.wall); p.r(52,10,5,36,PAL.wall2); p.o(5,10,52,36); p.box(3,4,56,8,PAL.roofBlue); p.sprite(ICON_ROWS.coffee,iconMap(),25,2);
    glass(p,8,18,46,22); p.r(10,32,42,1,PAL.stone2); for (const x of [12,24,36]) { p.ellO(x+4,30,4,2,PAL.wood); p.r(x+3,31,2,4,PAL.wood2); } p.box(44,22,8,10,PAL.metal2); p.r(45,23,6,3,PAL.white); p.r(46,27,4,2,PAL.red); p.r(8,42,46,2,PAL.stone2); return c; },
  training(){ const c=mk(64,54), p=new PX(c); shadow(p,32,51,32,4); p.r(5,10,54,40,PAL.wall); p.r(54,10,5,40,PAL.wall2); p.o(5,10,54,40); p.box(3,4,58,8,PAL.roofBlue); p.sprite(ICON_ROWS.bell,iconMap(),26,2);
    glass(p,8,16,48,28); p.box(14,20,24,12,PAL.white); p.r(16,23,10,1,PAL.roofGreen); p.r(16,26,16,1,PAL.roofGreen); p.r(16,29,8,1,PAL.red); for (const x of [12,22,32,42]) { p.box(x,36,8,4,PAL.wood); p.r(x+2,33,4,3,PAL.roofBlue); }
    p.r(40,20,10,6,PAL.outline); p.r(41,21,8,4,PAL.water); p.r(8,46,48,2,PAL.stone2); return c; },
  medical(){ const c=mk(56,52), p=new PX(c); shadow(p,28,49,28,4); p.r(5,12,46,36,PAL.white); p.r(46,12,5,36,PAL.stone); p.o(5,12,46,36); p.box(3,6,50,8,PAL.roofGreen); p.sprite(ICON_ROWS.cross,iconMap(),22,4);
    glass(p,8,20,18,14); p.r(28,22,8,6,PAL.white); p.r(29,23,6,4,PAL.water); p.box(32,34,14,14,PAL.water); p.r(39,34,1,14,PAL.stone2); p.r(33,35,2,12,'rgba(255,255,255,.55)');
    p.box(9,38,14,8,PAL.white); p.r(10,39,12,2,PAL.roofGreen); p.r(11,42,10,1,PAL.stone2); p.r(28,40,6,8,PAL.leaf); p.box(29,46,4,3,PAL.wood); return c; },
  mailroom(){ const c=mk(56,48), p=new PX(c); shadow(p,28,45,28,4); p.r(5,10,46,34,PAL.wall); p.r(46,10,5,34,PAL.wall2); p.o(5,10,46,34); p.box(3,4,50,8,PAL.roofBlue); p.sprite(ICON_ROWS.mail,iconMap(),22,1);
    for (const x of [8,20,32]) { p.box(x,16,10,26,PAL.wood2); for (let y=18;y<40;y+=6){ p.r(x+1,y,8,4,PAL.wood); p.r(x+2,y+1,6,2,[PAL.roofYellow,PAL.white,PAL.wall][(y/6)%3]); } }
    p.box(44,30,6,12,PAL.red); p.r(45,31,4,2,PAL.white); p.r(46,36,2,1,PAL.outline); p.r(7,42,42,1,PAL.stone2); return c; },
  serverroom(){ const c=mk(60,54), p=new PX(c); shadow(p,30,51,30,4); p.r(5,10,50,40,PAL.wall2); p.r(50,10,5,40,shade(PAL.wall2,.9)); p.o(5,10,50,40); p.box(3,4,54,8,PAL.roofBlue); p.sprite(ICON_ROWS.gear,iconMap(),24,2);
    p.r(8,16,44,30,'#2b2d3a'); p.o(8,16,44,30); for (const x of [11,21,31,41]) { p.box(x,18,8,26,PAL.metal2); for (let y=20;y<42;y+=4){ p.r(x+1,y,6,2,PAL.metal); p.r(x+2,y,1,1,PAL.leaf); p.r(x+5,y,1,1,(x+y)%3?PAL.leaf:PAL.red); } } p.r(8,46,44,2,PAL.stone2); return c; },
  lounge(){ const c=mk(62,44), p=new PX(c); p.ellO(31,30,30,12,PAL.roofBlue); p.ell(31,30,27,9,shade(PAL.roofBlue,1.25)); p.box(12,24,20,8,PAL.roofPink); p.r(12,22,20,2,shade(PAL.roofPink,.85)); p.r(13,32,2,3,PAL.wood2); p.r(29,32,2,3,PAL.wood2);
    p.ellO(44,30,7,3,PAL.wood); p.r(43,26,2,4,PAL.wood2); p.r(43,24,3,3,PAL.white); p.r(44,25,1,1,PAL.wood2); for (const [x,y] of [[6,14],[54,14]]) { p.box(x-3,y+8,7,6,PAL.wood); p.ellO(x,y+2,6,6,PAL.leaf); p.ell(x-2,y,2,1,'#a4e0a4'); }
    p.box(22,6,18,12,PAL.metal2); p.r(23,7,16,10,PAL.water); p.r(25,9,12,1,PAL.white); p.r(25,12,8,1,PAL.white); return c; },
};
export const CHIMNEY: Record<string, number> = { house:39, cabin:39, armory:47, workshop:49, smithy:47 };   // 굴뚝 연기가 나는 생김새와 굴뚝 x(건물 왼쪽 기준)
export const NO_LIGHT = new Set(['fountain','well','stall','treasury','park','garden','lounge']); // 밤에 창문 불빛이 없는 생김새
export function iconMap(){ return Object.fromEntries(Object.entries(ICON_LEGEND).map(([k,v])=>[k,PAL[v]])); }

export function charFrame(rows,map,kind,f){
  const h=rows.length, w=rows[0].length, cv=mk(w+6,h+1), p=new PX(cv), ox=3, bob=f?1:0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const ch=rows[y][x]; if(ch==='.'||ch==='f'||ch==='g')continue; p.r(ox+x,y+1-bob,1,1,map[ch]||'#f0f'); }
  const s = kind==='l'?-1:1;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const ch=rows[y][x]; if(ch!=='f'&&ch!=='g')continue;
    if(f===0){ p.r(ox+x,y+1,1,1,map[ch]); continue; }
    if(kind==='v'){ const stand = f===1?'f':'g'; if(ch===stand){ p.r(ox+x,y,1,2,map[ch]); } }
    else { const fwd = f===1?'f':'g'; if(ch===fwd){ p.r(ox+x+s*2,y,1,2,map[ch]); } else { p.r(ox+x-s,y+1,1,1,map[ch]); } } }
  return { canvas:cv, ax:ox+w/2, ay:h+1 };
}
export function compileChar(shape,col,fixed,upMap){ const map={...fixed, B:col.B, b:col.b, h:col.h}; const up=shape.down.map(r=>r.replace(/[ewpSrn]/g,m=>upMap[m]||'B')); const right=shape.side.map(r=>[...r].reverse().join(''));
  const fr=(rows,k)=>[0,1,2].map(f=>charFrame(rows,map,k,f)); return { down:fr(shape.down,'v'), up:fr(up,'v'), left:fr(shape.side,'l'), right:fr(right,'r') }; }

// 테마 파일이 자기 장식을 등록하는 곳(src/themes/*.js). 없는 종류는 아래 기본 그림으로 그린다
export const DECOR_KIND: Record<string, Record<string, any>> = { tree:{}, gate:{}, pond:{} };
export function makeTree(kind,size){ if (DECOR_KIND.tree[kind]) return DECOR_KIND.tree[kind](size); const r=size?10:8, c=mk(2*r+3,2*r+12), p=new PX(c), cx=r+1; const trunk=mk(c.width,c.height), tp=new PX(trunk);
  if (kind==='pot'){ tp.box(cx-4,2*r+2,9,8,PAL.wood); tp.r(cx-5,2*r+1,11,2,PAL.wood2); tp.o(cx-5,2*r+1,11,2); tp.r(cx-1,2*r-2,2,5,PAL.wood2); p.ellO(cx,r+2,r-2,r-1,PAL.leaf); p.ell(cx-r/3,r-1,r/3,r/4,'#a4e0a4'); p.r(cx+2,r+3,2,2,'#58a862'); return { canopy:c, trunk, ax:cx, ay:c.height, sway:.4 }; }
  if (kind==='pine'){ tp.box(cx-2,2*r-2,5,12,PAL.wood2); p.tri(cx,0,r-2,'#4f8f52'); p.tri(cx,r-5,r,'#5fa060'); p.tri(cx,2*r-9,r+1,'#6fb070'); for(let i=0;i<r-2;i++){ p.r(cx-i,i,1,1,PAL.outline); p.r(cx+i,i,1,1,PAL.outline);} for(let i=0;i<r;i++){ p.r(cx-i,r-5+i,1,1,PAL.outline); p.r(cx+i,r-5+i,1,1,PAL.outline);} for(let i=0;i<r+1;i++){ p.r(cx-i,2*r-9+i,1,1,PAL.outline); p.r(cx+i,2*r-9+i,1,1,PAL.outline);} p.r(cx-r,2*r-8+r,2*r+1,1,PAL.outline); p.r(cx-2,r+2,2,2,PAL.red); return { canopy:c, trunk, ax:cx, ay:c.height, sway:.6 }; }
  tp.box(cx-2,2*r-2,5,12,PAL.wood); tp.r(cx-1,2*r-1,1,10,'rgba(255,255,255,.3)'); p.ellO(cx,r+1,r,r-1,PAL.leaf); p.ell(cx,r+3,r-2,r-4,'#67b86d'); p.ell(cx-r/3,r-2,r/2.5,r/4,'#a4e0a4'); p.r(cx-2,r+4,2,2,PAL.pink); p.r(cx+3,r-1,2,2,PAL.pink); return { canopy:c, trunk, ax:cx, ay:c.height, sway:1.2 }; }
export function makeSeason(){ const im={ ...SEASON_PAL, o:PAL.outline }, sp=(rows: string[],map?: Record<string, string>)=>{ const c=mk(rows[0].length,rows.length); new PX(c).sprite(rows,map||im,0,0); return c; }, R=SEASON_ROWS;
  return { pumpkin:[sp(R.pumpkin), sp(R.pumpkin,{...im,k:SEASON_PAL.y})], pumpkin_s:[sp(R.pumpkin_s), sp(R.pumpkin_s,{...im,k:SEASON_PAL.y})], bat:[sp(R.bat0),sp(R.bat1)],
    snowman:[sp(R.snowman),sp(R.snowman)], gift:[sp(R.gift), sp(R.gift,{...im,G:SEASON_PAL.B,R:SEASON_PAL.Y})], pouch:[sp(R.pouch), sp(R.pouch,{...im,R:SEASON_PAL.B})], lantern:sp(R.lantern), kite:sp(R.kite) }; }
export function makeLamp(){ const c=mk(8,22), p=new PX(c); p.r(3,6,2,16,PAL.wood2); p.r(1,21,6,1,PAL.outline); p.box(1,1,6,6,PAL.gold); p.r(2,2,4,4,'#fff3b0'); p.r(3,0,2,1,PAL.outline); return c; }
export function makeGate(kind){ if (DECOR_KIND.gate[kind]) return DECOR_KIND.gate[kind](); const c=mk(34,30), p=new PX(c); const im=iconMap();
  if (kind==='glass'){ p.box(1,2,32,28,PAL.metal2); glass(p,3,4,13,24); glass(p,18,4,13,24); p.r(15,10,1,6,PAL.outline); p.r(18,10,1,6,PAL.outline); p.box(10,0,14,4,PAL.roofBlue); p.r(13,1,8,2,PAL.white); return c; }
  if (kind==='stone'){ p.box(0,4,6,26,PAL.stone2); p.box(28,4,6,26,PAL.stone2); p.r(1,5,1,24,PAL.white); p.r(29,5,1,24,PAL.white); p.box(0,0,34,6,PAL.stone); p.r(3,8,1,4,PAL.outline); p.r(2,6,3,3,PAL.red); p.r(3,5,1,1,PAL.gold); p.r(30,8,1,4,PAL.outline); p.r(29,6,3,3,PAL.red); p.r(30,5,1,1,PAL.gold); return c; }
  p.box(1,6,4,24,PAL.wood); p.box(29,6,4,24,PAL.wood); p.r(2,7,1,22,'rgba(255,255,255,.3)'); p.r(30,7,1,22,'rgba(255,255,255,.3)'); p.box(0,2,34,6,PAL.wood2); p.r(1,3,32,1,'rgba(255,255,255,.2)'); p.sprite(ICON_ROWS.house,im,11,0); p.r(8,4,2,2,PAL.gold); p.r(24,4,2,2,PAL.gold); return c; }
export function makeSign(icon){ const c=mk(18,22), p=new PX(c); p.r(8,14,2,8,PAL.wood2); p.box(0,0,18,16,PAL.wall); p.r(1,1,16,1,PAL.white); p.sprite(ICON_ROWS[icon],iconMap(),3,2); return c; }
export function makePond(kind,frame){ if (DECOR_KIND.pond[kind]) return DECOR_KIND.pond[kind](frame); const c=mk(60,32), p=new PX(c);
  if (kind==='lounge'){ p.ellO(30,16,29,14,PAL.roofBlue); p.ell(30,16,26,11,shade(PAL.roofBlue,1.25)); p.ellO(30,16,9,5,PAL.wood); for(const [x,y] of [[14,16],[46,16],[30,6],[30,26]]) p.box(x-3,y-2,6,5,PAL.roofPink); p.sprite(ICON_ROWS.coffee,iconMap(),24+(frame?1:0),9); return c; }
  p.ellO(30,16,29,14,PAL.stone2); p.ellO(30,15,26,11,PAL.water); p.ell(30,15,23,8,shade(PAL.water,1.08)); const r=frame?[[20,12,6],[36,18,4]]:[[22,13,5],[38,17,5]]; for(const [x,y,w] of r){ p.r(x,y,w,1,PAL.white); p.r(x+2,y+2,w-2,1,'rgba(255,255,255,.6)'); }
  p.ell(14,19,4,2,PAL.leaf); p.r(14,18,1,2,PAL.water); p.r(13,17,2,2,PAL.pink); p.ell(44,12,3,2,PAL.leaf); return c; }
export function seeded(s){ return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
export function buildGround(kind){ const c=mk(W,H), p=new PX(c), rnd=seeded(7);
  p.r(0,0,W,H,PAL.grass);
  if (kind==='tile'){ for(let y=0;y<H;y+=12) for(let x=0;x<W;x+=12) if(((x/12)+(y/12))%2===0) p.r(x,y,12,12,PAL.grass2); }
  else { for(let i=0;i<520;i++){ const x=Math.floor(rnd()*W), y=Math.floor(rnd()*H); p.r(x,y,1,1,PAL.grass2); p.r(x+1,y-1,1,1,PAL.grass2); if(rnd()<.5) p.r(x+2,y,1,1,PAL.grass2); } for(let i=0;i<70;i++){ p.r(Math.floor(rnd()*W),Math.floor(rnd()*H),2,1,PAL.grass3); } }
  for(const [a,b] of ROADS){ const [ax,ay]=NODES[a],[bx,by]=NODES[b]; const x0=Math.min(ax,bx),x1=Math.max(ax,bx),y0=Math.min(ay,by),y1=Math.max(ay,by); let x=x0-6,y=y0-6,w=x1-x0+12,h=y1-y0+12; if(a==='ENT'||b==='ENT') h+=8; p.r(x,y,w,h,PAL.dirt); p.r(x,y,w,1,PAL.dirt2); p.r(x,y+h-1,w,1,PAL.dirt2); p.r(x,y,1,h,PAL.dirt2); p.r(x+w-1,y,1,h,PAL.dirt2); }
  if (kind!=='tile') for(const [a,b] of ROADS){ const [ax,ay]=NODES[a],[bx,by]=NODES[b]; const x0=Math.min(ax,bx)-5,x1=Math.max(ax,bx)+5,y0=Math.min(ay,by)-5,y1=Math.max(ay,by)+5; for(let i=0;i<10;i++) p.r(x0+Math.floor(rnd()*(x1-x0)), y0+Math.floor(rnd()*(y1-y0)), 2,1, PAL.dirt2); }
  p.ellO(240,150,42,34,PAL.stone,PAL.stone2); for(let y=118;y<184;y++) for(let x=200;x<282;x++){ const dx=x-240,dy=y-150; if(dx*dx/(40*40)+dy*dy/(32*32)>1)continue; if(((x>>2)+(y>>2))%2===0) p.r(x,y,1,1,shade(PAL.stone,1.03)); }
  for(const [x,y,w] of DECOR.fences){ const fc=kind==='tile'?PAL.metal2:PAL.wood, fc2=kind==='tile'?PAL.metal:PAL.wood2; p.r(x,y+2,w,1,fc); p.r(x,y+5,w,1,fc); for(let k=0;k<=w;k+=6){ p.r(x+k,y,2,8,fc2); p.r(x+k,y-1,2,1,PAL.outline);} }
  if (kind!=='tile'){ for(const [x,y] of DECOR.flowers){ const cols=[PAL.pink,PAL.white,PAL.roofLilac,PAL.gold]; for(let k=0;k<4;k++){ const fx=x+Math.floor(rnd()*10)-5, fy=y+Math.floor(rnd()*6)-3, col=cols[Math.floor(rnd()*4)]; p.r(fx-1,fy,3,1,col); p.r(fx,fy-1,1,3,col); p.r(fx,fy,1,1,PAL.gold===col?PAL.red:PAL.gold); p.r(fx,fy+2,1,1,PAL.grass3);} }
    for(const [x,y] of DECOR.bushes){ p.ellO(x,y,7,4,PAL.leaf); p.ell(x-2,y-1,3,1,'#a4e0a4'); p.r(x+2,y+1,1,1,PAL.pink); } }
  else { for(const [x,y] of DECOR.bushes){ p.box(x-3,y-2,7,5,PAL.roofBlue); p.r(x-2,y-1,5,1,shade(PAL.roofBlue,1.3)); } for(const [x,y] of DECOR.flowers) { p.r(x,y,3,3,PAL.stone2); p.r(x,y,1,1,PAL.white); } }
  for(const [x,y] of [[60,60],[420,120],[140,250],[300,258],[40,150]]){ p.r(x,y,3,2,PAL.stone2); p.r(x,y,2,1,PAL.stone); }
  return c; }

export const A: Record<string, any> = {}; // 현재 테마의 모든 에셋
// 화면(DOM)용 아이콘 주소. 다크 겉 화면에서는 외곽선(o)을 글자색으로 바꿔 어두운 패널에서도 모양이 보이게 한다. 마을 캔버스는 A.icons 그대로
// 겉 화면 정보(밝기·글자색)는 UI가 setShellInfo로 넣어 준다(setShell은 p6.js의 밝기 저장 함수라 이름을 피했다). 엔진이 document를 읽지 않게 하기 위해서다
export const SHELL = { dark: false, ink: '#3b2f3a' };
export function setShellInfo(dark: boolean, ink: string){ SHELL.dark = dark; if (ink) SHELL.ink = ink; }
export function buildIconUrls(){ const dark=SHELL.dark; A.iconUrl={};
  const im={ ...iconMap(), o:SHELL.ink };
  for (const [n,rows] of Object.entries(ICON_ROWS)){ if (!dark){ A.iconUrl[n]=A.icons[n].toDataURL(); continue; } const c=mk(12,12); new PX(c).sprite(rows,im,0,0); A.iconUrl[n]=c.toDataURL(); } }
export let THEME_KEY = 'cozy';
export function buildAssets(key){ const T=THEMES[key]; THEME_KEY=key; Object.assign(PAL, BASE_PAL, T.palette);
  const im=iconMap(); A.icons={}; for (const [n,rows] of Object.entries(ICON_ROWS)){ const c=mk(12,12); new PX(c).sprite(rows,im,0,0); A.icons[n]=c; } buildIconUrls();
  A.digits={}; for(const [d,rows] of Object.entries(DIGIT_ROWS)){ const w=mk(3,5); new PX(w).sprite(rows,{'1':PAL.white},0,0); const k=mk(3,5); new PX(k).sprite(rows,{'1':PAL.outline},0,0); A.digits[d]={w,k}; }
  const C=T.characters; A.char=C.shapes.map(sh=>C.colors.map(col=>compileChar(sh,col,C.fixed,C.up))); A.shapes=C.shapes; A.colors=C.colors;
  A.me=C.shapes.map(sh=>compileChar(sh,ME_COLOR,C.fixed,C.up)); // 주인 NPC: 형태별 금빛 옷 한 벌
  A.bot=compileChar(BOT_SHAPE,BOT_COLOR,{...FIXED_COMMON,r:'#e8707f'},{ S:'B', e:'B', p:'B', r:'B', w:'b', n:'B' });
  // 건물 종류 카탈로그: 종류마다 스프라이트 하나(같은 종류 건물은 공유). 설정 화면의 미리보기·크기 검사에도 쓴다
  A.kinds={}; for (const k of KINDS){ const [name,look,icon]=T.kinds[k]; const sprite=BUILD[look](); A.kinds[k]={ name, look, icon, sprite, w:sprite.width, h:sprite.height, url:sprite.toDataURL() }; }
  for (const b of BUILDINGS){ const k=A.kinds[b.kind]||A.kinds.shop; b.name=b.label||k.name; b.look=k.look; b.icon=k.icon; b.sprite=k.sprite; b.w=k.w; b.h=k.h; b.left=b.x-Math.floor(b.w/2); b.top=b.y-b.h; b.sign=makeSign(k.icon); }
  placeDecor();
  A.tree=[makeTree(T.decor.tree,0),makeTree(T.decor.tree,1)]; A.lamp=makeLamp(); A.gate=makeGate(T.decor.gate); A.season=makeSeason(); A.pond=[makePond(T.decor.pond,0),makePond(T.decor.pond,1)]; A.ground=buildGround(T.decor.ground);
  A.badges={ hat:A.icons.hat, phone:A.icons.phone, bubble:A.icons.bubble, search:A.icons.search };
  A.flags={}; for (const [cc,rows] of Object.entries(FLAG_ROWS)){ const c=mk(6,6); new PX(c).sprite(rows,FLAG_PAL,0,0); A.flags[cc]=c; } }
export function kindFits(kind, slotId){ const k=A.kinds&&A.kinds[kind], sl=SLOTS[slotId]; return !!(k&&sl) && k.w<=sl.maxW && k.h<=sl.maxH; }
// 첫 에셋 빌드는 UI(p6.js)가 캔버스 공장·겉 화면 정보를 넣은 뒤 buildAssets(key)로 부른다. 모듈을 읽는 것만으로는 DOM을 건드리지 않는다
