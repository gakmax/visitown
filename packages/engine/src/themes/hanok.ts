import { BUILD, CHIMNEY, DECOR_KIND, NO_LIGHT, PX, mk, shade, shadow } from '../map';
import { FIXED_COMMON, PAL, THEMES } from '../palette';
import { L } from '@visitown/i18n';
// 한옥 장터
(()=>{
  // ---------- 한옥 전용 색(PAL에 없는 것만) ----------
  const IN1='#594a4e', IN2='#6b5a5c', JU='#b5574b', JU_HI='#cf7a6a', NOK='#5fae96', NOK2='#3f8571', PLAQ='#5a3b2c';
  const FIRE='#f08a3c', FIRE2='#ffd36a', SOOT='#4a4048';
  const TONE = {
    grey: { t:'#7c8597', d:'#5f6779', l:'#a3abbb', r:'#4e5566' },
    blue: { t:'#6c7ca6', d:'#525f88', l:'#9aa8cc', r:'#414b6e' },
    green:{ t:'#5c9c90', d:'#437c72', l:'#8cc6b8', r:'#365f58' },
    brown:{ t:'#a07a68', d:'#7e5c4e', l:'#c6a290', r:'#5e443a' },
    dark: { t:'#5c5e6e', d:'#45465a', l:'#868a9c', r:'#34353f' },
  };

  // ---------- 마스크로 모양을 잡고 가장자리에 1px 외곽선을 자동으로 두르는 그리드 ----------
  function Grid(w,h){ const g=[]; for(let y=0;y<h;y++) g.push(new Array(w).fill(null)); return g; }
  function part(G,test,color,x0,y0,x1,y1){
    const inM=(x,y)=>x>=x0&&x<=x1&&y>=y0&&y<=y1&&test(x,y);
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ if(!inM(x,y)) continue;
      const edge=!inM(x-1,y)||!inM(x+1,y)||!inM(x,y-1)||!inM(x,y+1);
      if(G[y]&&x>=0&&x<G[0].length) G[y][x]= edge? PAL.outline : color(x,y); }
  }
  function rect(G,x,y,w,h,color){ part(G,()=>true,typeof color==='function'?color:()=>color,x,y,x+w-1,y+h-1); }
  function put(G,x,y,col){ if(G[y]&&x>=0&&x<G[0].length) G[y][x]=col; }
  function oval(G,cx,cy,rx,ry,color){ part(G,(x,y)=>((x-cx)/(rx+.5))**2+((y-cy)/(ry+.5))**2<=1, typeof color==='function'?color:()=>color, Math.floor(cx-rx-1),Math.floor(cy-ry-1),Math.ceil(cx+rx+1),Math.ceil(cy+ry+1)); }
  function flush(G,p){ for(let y=0;y<G.length;y++) for(let x=0;x<G[0].length;x++) if(G[y][x]) p.r(x,y,1,1,G[y][x]); }
  function start(w,h){ const c=mk(w,h), p=new PX(c), G=Grid(w,h); return { c, p, G }; }

  // 기와지붕: 처마선이 양 끝에서 들리고 옆선은 오목하게. 처마 밑 raf줄은 서까래. ridge>0이면 용마루와 양 끝 취두
  function giwa(G: any, {cx,half,top,eave,lift,T,flat,ridge,raf=2}: Record<string, any>){
    const D=x=>Math.abs(x-cx); flat = flat ?? half*.5; ridge = ridge ?? Math.round(half*.62);
    const ev=x=>eave-Math.round(lift*Math.pow(Math.min(1,D(x)/half),2.6));
    const k=eave-lift-top-1;
    const tp=x=>{ const d=D(x); if(d<=flat) return top; return top+Math.round(k*Math.pow(Math.min(1,(d-flat)/(half-flat)),.7)); };
    part(G,(x,y)=>D(x)<=half&&y>=tp(x)&&y<=ev(x)+raf,(x,y)=>{ const e=ev(x);
      if(y>e) return (y===e+raf&&x%2===0)?PAL.wood2:PAL.wood;
      if(y===e) return x%3===0?T.l:T.d;
      if(x%3===0) return T.d;
      return x>cx+half*.45?T.d:T.t; }, Math.floor(cx-half),Math.max(0,top),Math.ceil(cx+half),eave+raf);
    if(ridge>0){ const rt=x=>{ const d=D(x); return d<=ridge-8? top-3 : top-3-Math.round((d-(ridge-8))*.3); };
      part(G,(x,y)=>D(x)<=ridge&&y>=rt(x)&&y<=top+1,(x,y)=>y===rt(x)+1?PAL.stone2:T.r, Math.floor(cx-ridge),Math.max(0,top-6),Math.ceil(cx+ridge),top+1); }
  }
  // 초가지붕: 둥근 짚 더미. 위에 용마름(새끼 꼰 띠), 처마 끝은 짚 끝이 삐죽
  function choga(G,{cx,half,top,eave}){
    const Y=PAL.roofYellow, T={ t:Y, d:shade(Y,.82), l:shade(Y,1.07), r:shade(Y,.66) }, D=x=>Math.abs(x-cx), hh=eave-top;
    const inside=(x,y)=>y<=eave&&y>=top&&Math.pow(D(x)/half,3)+Math.pow((eave-y)/hh,2)<=1;
    part(G,inside,(x,y)=>{
      if(y>=eave-1) return x%2? T.r : T.d;
      if(D(x)<half*.55 && y<=top+2) return (x+y)%2? T.r : T.d;         // 용마름
      if((x+y*2)%7===0) return T.d;                                       // 짚 결
      if(x>cx+half*.5) return (x+y)%3? T.d : T.t;
      if(x<cx-half*.2 && y<top+hh*.5) return T.l;
      return T.t; }, Math.floor(cx-half)-1, top, Math.ceil(cx+half)+1, eave);
  }
  // 돌 기단: 줄눈, 오른쪽 면 어둡게
  function base(G,x,y,w,h){ rect(G,x,y,w,h,xx=>xx>=x+w-6?PAL.stone2:PAL.stone); const m=y+Math.floor(h/2);
    for(let xx=x+1;xx<x+w-1;xx++) put(G,xx,m,PAL.stone2);
    for(let yy=y+1;yy<y+h-1;yy++) for(let xx=x+1;xx<x+w-6;xx++) if((yy<m&&(xx-x)%10===4)||(yy>m&&(xx-x)%10===9)) put(G,xx,yy,PAL.stone2); }
  // 창호(띠살문): 흰 한지에 가는 살
  function changho(G,x,y,w,h){ rect(G,x,y,w,h,(xx,yy)=>((xx-x)%2===0&&(yy<y+3||yy>y+h-4))||yy===y+3||yy===y+h-4?PAL.wall2:PAL.white); }
  function pillar(G,x,y,h,col=JU,hi=JU_HI,w=4){ rect(G,x,y,w,h,xx=>xx===x+1?hi:col); }
  const hl=(p,x,y,w,a=.35)=>p.r(x,y,w,1,`rgba(255,255,255,${a})`);

  // ---------- 건물 12종 ----------
  Object.assign(BUILD, {
    // 정자 광장: 단청 띠 + 주칠 기둥 + 기와
    hanok_plaza(){ const W=76,H=62,{c,p,G}=start(W,H), cx=37.5; shadow(p,38,58,37,3);
      base(G,5,48,66,9);
      rect(G,29,53,18,6,x=>x>=43?PAL.stone2:PAL.stone); for(let x=30;x<46;x++) put(G,x,55,PAL.stone2);
      rect(G,9,23,58,21,(x,y)=>y<28?IN1:y<37?IN2:y===37?PAL.wood2:(x%8===4?'#c4875a':'#dba574'));
      rect(G,6,43,64,6,(x,y)=>y===44?'#e0aa78':(x>=64?PAL.wood2:PAL.wood)); for(let x=11;x<64;x+=8) put(G,x,45,PAL.wood2),put(G,x,46,PAL.wood2);
      const rail=(a,b)=>{ rect(G,a,37,b-a+1,3,PAL.wood); for(let x=a+2;x<b;x+=3) for(let y=40;y<43;y++) put(G,x,y,PAL.wood2); }; rail(10,26); rail(49,65);
      for(const x of [9,24,48,63]) pillar(G,x,23,21);
      rect(G,5,19,66,6,(x,y)=>y===20?NOK:((x%6===1||x%6===2)?(x%12<6?PAL.red:PAL.white):NOK2));
      giwa(G,{cx,half:37.5,top:4,eave:17,lift:9,T:TONE.grey,ridge:24});
      rect(G,31,24,14,6,PLAQ); for(const x of [34,37,40]) put(G,x,26,PAL.gold),put(G,x+1,27,PAL.gold);
      flush(G,p); hl(p,20,6,36); hl(p,6,49,58,.4); for(const x of [9,24,48,63]) p.r(x+1,25,1,17,'rgba(255,255,255,.15)'); return c; },

    // 저잣거리 가게: 기와 몸채 + 흰 차일 + 좌판 물건
    hanok_shop(){ const W=78,H=60,{c,p,G}=start(W,H), cx=38.5; shadow(p,39,56,38,4);
      rect(G,5,22,68,30,x=>x>=67?PAL.wall2:PAL.wall);
      for(const bx of [9,30,51]) rect(G,bx,30,18,20,(x,y)=>y===38||y===44?PAL.wood2:IN2);
      // 선반 물건: 단지·비단·바구니
      const goods=[PAL.roofBlue,PAL.red,PAL.gold,PAL.leaf,PAL.pink,PAL.white];
      for(const bx of [9,30,51]) for(const sy of [35,41]) for(let i=0;i<4;i++){ const gx=bx+2+i*4, col=goods[(bx+sy+i)%goods.length]; put(G,gx,sy,col); put(G,gx+1,sy,col); put(G,gx,sy+1,col); put(G,gx+1,sy+1,shade(col,.8)); put(G,gx,sy+2,col); put(G,gx+1,sy+2,shade(col,.8)); }
      for(const x of [5,27,48,70]) rect(G,x,22,3,30,xx=>xx===x+1?PAL.wood:PAL.wood2);
      giwa(G,{cx,half:38.5,top:7,eave:22,lift:6,T:TONE.grey,ridge:22});
      // 차일: 처마 아래로 뻗은 흰 천, 끝이 살짝 처짐
      for(const x of [2,73]) rect(G,x,27,3,28,xx=>xx===x+1?PAL.wood:PAL.wood2);
      part(G,(x,y)=>y>=26&&y<=29+((x-1)%12<6?0:1),(x,y)=>y>=29?PAL.wall2:(x%12<6?PAL.white:PAL.wall),1,26,76,30);
      // 좌판
      rect(G,8,46,62,5,(x,y)=>y===46+1?'#e0aa78':(x>=64?PAL.wood2:PAL.wood)); for(const x of [10,66]) rect(G,x,50,3,5,PAL.wood2);
      oval(G,15,43,3,3,'#a86a48'); oval(G,24,44,2,2,'#c98a5a'); oval(G,33,44,3,2,PAL.leaf); rect(G,40,41,6,5,PAL.red); rect(G,46,41,6,5,PAL.roofBlue); oval(G,58,44,3,2,PAL.gold);
      flush(G,p); hl(p,22,9,34); hl(p,2,27,72,.5); hl(p,8,47,56,.3); return c; },

    // 서고: 2층 누각, 푸른 기와
    hanok_library(){ const W=70,H=76,{c,p,G}=start(W,H), cx=34.5; shadow(p,35,72,33,4);
      base(G,4,63,62,8);
      rect(G,7,38,56,26,x=>x>=57?PAL.wall2:PAL.wall);
      rect(G,7,38,56,4,PAL.wood2);
      changho(G,11,44,9,19); changho(G,50,44,9,19);
      rect(G,24,43,22,21,(x,y)=>y===50||y===57?PAL.wood2:IN2);
      const sp=[PAL.red,PAL.roofBlue,PAL.gold,NOK,PAL.white,PAL.pink,'#8a6a9a'];
      for(const sy of [44,51,58]) for(let x=25;x<45;x++){ if((x*7+sy)%9===0) continue; const col=sp[(x*3+sy)%sp.length]; for(let y=sy+1;y<sy+6;y++) put(G,x,y,(y===sy+1&&x%3===0)?IN2:col); }
      for(const x of [7,20,46,59]) pillar(G,x,38,26);
      // 2층
      rect(G,15,14,40,20,x=>x>=50?PAL.wall2:PAL.wall);
      changho(G,19,18,10,12); changho(G,41,18,10,12);
      rect(G,30,17,10,7,PLAQ); for(const x of [32,35,38]) put(G,x,19,PAL.gold),put(G,x,21,PAL.gold);
      pillar(G,15,14,20); pillar(G,51,14,20);
      // 아래층 지붕(차양)
      giwa(G,{cx,half:34.5,top:30,eave:38,lift:3,T:TONE.blue,flat:23,ridge:0});
      // 2층 난간
      rect(G,13,26,44,4,PAL.wood); for(let x=15;x<56;x+=3) put(G,x,27,PAL.wood2),put(G,x,28,PAL.wood2);
      giwa(G,{cx,half:30.5,top:4,eave:16,lift:6,T:TONE.blue,ridge:19});
      flush(G,p); hl(p,22,6,26); hl(p,8,32,54,.3); hl(p,5,64,56,.4); return c; },

    // 주막: 초가 + 酒 깃발 + 평상
    hanok_community(){ const W=78,H=62,{c,p,G}=start(W,H), cx=48; shadow(p,42,58,36,4);
      rect(G,22,29,52,25,x=>x>=68?PAL.wall2:'#efe0c0');
      for(const x of [22,39,56,71]) rect(G,x,29,3,25,xx=>xx===x+1?PAL.wood:PAL.wood2);
      changho(G,26,33,11,15); rect(G,59,34,11,20,(x,y)=>y<37?IN1:IN2);
      oval(G,64,46,3,4,SOOT); put(G,63,44,'#6b5f68');
      choga(G,{cx,half:29,top:9,eave:31});
      // 초롱
      rect(G,25,33,1,2,PAL.outline); rect(G,23,35,5,6,(x,y)=>y===36||y===39?PAL.gold:PAL.red);
      // 평상 + 소반
      rect(G,24,47,34,5,(x,y)=>y===48?'#e0aa78':PAL.wood); for(const x of [26,54]) rect(G,x,51,3,5,PAL.wood2);
      rect(G,34,43,12,4,PAL.wood2); put(G,37,42,PAL.white); put(G,38,42,PAL.white); put(G,42,41,PAL.white); put(G,42,42,PAL.white);
      // 항아리
      oval(G,70,52,4,3,'#8a5a40');
      // 깃대 + 酒 깃발
      rect(G,3,2,3,55,xx=>xx===4?PAL.wood:PAL.wood2);
      rect(G,6,4,13,14,(x,y)=>x===7||x===17||y===5||y===16?PAL.red:PAL.white);
      for(const [x,y] of [[9,8],[9,10],[9,13],[11,8],[12,8],[13,8],[14,8],[15,8],[12,9],[14,9],[11,10],[12,10],[13,10],[14,10],[15,10],[11,11],[15,11],[11,12],[13,12],[15,12],[11,13],[12,13],[13,13],[14,13],[15,13]]) put(G,x,y,PAL.outline);
      flush(G,p); hl(p,24,12,22,.3); hl(p,24,48,32,.3); return c; },

    // 초가집: 둥근 초가 + 툇마루 + 장독
    hanok_home(){ const W=60,H=52,{c,p,G}=start(W,H), cx=29.5; shadow(p,30,48,29,4);
      rect(G,2,26,5,20,(x,y)=>y===27?PAL.stone2:PAL.dirt2);
      rect(G,8,25,44,20,x=>x>=46?PAL.wall2:'#efe0c0');
      for(const x of [8,21,38,49]) rect(G,x,25,3,20,xx=>xx===x+1?PAL.wood:PAL.wood2);
      changho(G,24,28,12,13); changho(G,12,30,7,7); changho(G,41,30,6,7);
      rect(G,7,40,46,4,(x,y)=>y===41?'#e0aa78':PAL.wood);
      base(G,6,43,48,4);
      choga(G,{cx,half:29,top:5,eave:27});
      oval(G,50,45,3,3,'#8a5a40'); oval(G,56,46,2,2,'#9a6a4a');
      flush(G,p); hl(p,10,9,14,.3); hl(p,51,43,1,.5); return c; },

    // 전당포: 짙은 기와 + 돌벽 + 엽전 장대
    hanok_checkout(){ const W=70,H=64,{c,p,G}=start(W,H), cx=40; shadow(p,38,60,32,4);
      rect(G,13,26,54,32,(x,y)=>y>=42?((x+((y-42)>>2)*4)%8===0||(y-42)%4===0?PAL.stone2:(x>=61?PAL.stone2:PAL.stone)):(x>=61?PAL.wall2:PAL.wall));
      rect(G,13,40,54,3,PAL.wood2);
      for(const bx of [17,53]){ rect(G,bx,29,9,9,IN1); for(let x=bx+2;x<bx+8;x+=2) for(let y=bx===53?30:30;y<37;y++) put(G,x,y,PAL.wood2); }
      rect(G,32,33,16,25,(x,y)=>x===39||x===40?PAL.outline:(y%5===0&&x%3===0?PAL.metal:PAL.wood2));
      put(G,38,45,PAL.gold); put(G,41,45,PAL.gold);
      giwa(G,{cx,half:29.5,top:8,eave:25,lift:6,T:TONE.dark,ridge:18});
      // 엽전 장대
      rect(G,5,36,3,22,xx=>xx===6?PAL.wood:PAL.wood2);
      oval(G,6,29,6,6,(x,y)=>(x<5&&y<28)?'#ffe08a':PAL.gold); rect(G,4,27,5,5,PAL.outline); put(G,6,29,PAL.grass);
      flush(G,p); p.g.clearRect(5,28,3,3); hl(p,24,10,30); return c; },

    // 찻집: 청기와 + 만월창 + 화로 주전자
    hanok_cafe(){ const W=62,H=56,{c,p,G}=start(W,H), cx=30.5; shadow(p,31,52,30,4);
      base(G,5,45,52,7);
      rect(G,8,24,46,22,x=>x>=48?PAL.wall2:PAL.wall);
      for(const x of [8,50]) pillar(G,x,24,22,PAL.wood,'#d8a070');
      oval(G,20,34,6,6,(x,y)=>(x-20)%3===0||(y-34)%3===0?PAL.wood2:PAL.white);
      changho(G,33,28,13,18);
      giwa(G,{cx,half:30.5,top:6,eave:22,lift:6,T:TONE.green,ridge:16});
      // 화로 + 주전자
      rect(G,1,47,10,6,PAL.stone2); oval(G,6,44,3,2,SOOT); rect(G,5,41,2,2,SOOT);
      flush(G,p); p.r(5,37,1,2,'rgba(255,255,255,.7)'); p.r(6,35,1,2,'rgba(255,255,255,.5)'); hl(p,16,8,28); hl(p,6,46,46,.4); return c; },

    // 서당: 맞배 기와 + 흰 창호 + 큰 현판
    hanok_school(){ const W=66,H=58,{c,p,G}=start(W,H), cx=32.5; shadow(p,33,54,32,4);
      base(G,4,47,58,7);
      rect(G,7,24,52,22,x=>x>=53?PAL.wall2:PAL.wall);
      for(const bx of [11,22,34,45]) changho(G,bx,30,10,13);
      for(const x of [7,20,31,43,55]) rect(G,x,24,3,22,xx=>xx===x+1?PAL.wood:PAL.wood2);
      rect(G,6,43,54,4,(x,y)=>y===44?'#e0aa78':PAL.wood);
      giwa(G,{cx,half:32.5,top:9,eave:23,lift:3,T:TONE.grey,flat:24,ridge:26});
      rect(G,22,24,22,7,PLAQ); for(const x of [25,29,33,37,40]) put(G,x,26,PAL.white),put(G,x,27,PAL.white),put(G,x+1,28,PAL.white);
      // 서안과 책
      rect(G,26,40,14,4,PAL.wood2); rect(G,29,38,5,3,PAL.roofBlue);
      flush(G,p); hl(p,10,11,46); hl(p,6,48,52,.4); return c; },

    // 약방: 갈색 기와 + 약장 + 호리병
    hanok_clinic(){ const W=62,H=58,{c,p,G}=start(W,H), cx=30.5; shadow(p,31,54,30,4);
      base(G,4,48,54,6);
      rect(G,7,25,48,24,x=>x>=49?PAL.wall2:PAL.wall);
      rect(G,15,29,32,19,(x,y)=>((x-15)%5===0||(y-29)%5===3)?PAL.wood2:((x-15)%5===3&&(y-29)%5===1?PAL.gold:PAL.wood));
      for(const x of [7,52]) rect(G,x,25,3,24,xx=>xx===x+1?PAL.wood:PAL.wood2);
      giwa(G,{cx,half:30.5,top:7,eave:24,lift:6,T:TONE.brown,ridge:17});
      // 약초 다발
      for(const x of [11,13]){ rect(G,x,27,1,2,PAL.outline); rect(G,x-1,29,3,5,PAL.leaf); }
      // 호리병 간판
      rect(G,56,26,1,3,PAL.outline); oval(G,56,31,2,2,'#e2b85a'); oval(G,56,36,3,3,'#e2b85a'); put(G,55,33,PAL.red); put(G,56,33,PAL.red); put(G,57,33,PAL.red);
      flush(G,p); hl(p,16,9,28); hl(p,6,49,48,.4); return c; },

    // 파발소: 작은 기와 + 파발마 + 영기
    hanok_post(){ const W=66,H=56,{c,p,G}=start(W,H); shadow(p,33,52,32,4);
      rect(G,4,24,40,26,x=>x>=38?PAL.wall2:PAL.wall);
      rect(G,8,30,12,20,(x,y)=>y<33?IN1:IN2); changho(G,24,30,12,12);
      for(const x of [4,21,41]) rect(G,x,24,3,26,xx=>xx===x+1?PAL.wood:PAL.wood2);
      giwa(G,{cx:23.5,half:23.5,top:9,eave:24,lift:5,T:TONE.grey,ridge:13});
      // 영기
      rect(G,59,3,3,50,xx=>xx===60?PAL.wood:PAL.wood2);
      part(G,(x,y)=>x>=48&&x<=59&&y>=4&&y<=16&&(x-48)>=(y-4)*0.9-1,(x,y)=>y<7||x>57?PAL.gold:PAL.red,47,4,59,16);
      flush(G,p);
      // 말(왼쪽 보기)
      const HORSE=['..o.o...................','.oHoHo..................','.oBBBHo.................','oBeBBHHo................','oBBBBBHHo...............','oSBBBBBHo...............','.ooSBBBBHoooooooooooo...','...oBBBBBBBBBBBBBBBBBo..','...oBBBBBrrrrrrBBBBBBo..','....oBBBBrrrrrrBBBBBBHo.','....oBBBBBkkkkBBBBBBBoHo','.....oBBBBBBBBBBBBBBBo.H','.....oBBoooooooooBBBBo.H','.....oBooBo.....oBooBo..','.....oBooBo.....oBooBo..','.....okooko.....okooko..'];
      p.sprite(HORSE,{o:PAL.outline,B:'#a8744c',H:'#4a3a34',e:PAL.outline,S:'#c89470',r:PAL.red,k:SOOT},31,37); p.r(36,44,8,1,'rgba(255,255,255,.3)');
      hl(p,10,11,26); return c; },

    // 대장간: 너와 지붕 + 화덕 불 + 모루 + 돌 굴뚝
    hanok_factory(){ const W=64,H=56,{c,p,G}=start(W,H), cx=32; shadow(p,32,52,31,4);
      rect(G,11,0,8,26,(x,y)=>y===1?PAL.stone:(x>=16?PAL.stone2:(y%4===0?PAL.stone2:PAL.stone)));
      rect(G,6,24,52,26,(x,y)=>y<30?IN1:IN2);
      // 너와 지붕(맞배, 판자결)
      part(G,(x,y)=>y>=9&&y<=26&&Math.abs(x-cx)<=18+(y-9)*1.1,(x,y)=>y>=25?PAL.wood:((x>>2)%2?PAL.wood2:shade(PAL.wood2,.86)),2,9,61,26);
      for(const x of [22,32,42]) put(G,x,12,PAL.stone2),put(G,x+1,12,PAL.stone2);
      for(const x of [6,55]) rect(G,x,24,3,26,xx=>xx===x+1?PAL.wood:PAL.wood2);
      // 화덕
      rect(G,10,33,17,15,(x,y)=>(y-33)%4===0||(x+((y-33)>>2)*3)%6===0?PAL.stone2:PAL.stone);
      rect(G,13,37,11,7,(x,y)=>y<39?FIRE2:(x+y)%3?FIRE:PAL.red);
      // 모루 + 망치
      rect(G,31,38,13,4,PAL.metal2); rect(G,35,42,5,6,SOOT); rect(G,46,32,2,8,PAL.wood); rect(G,44,31,6,3,PAL.metal);
      // 물통
      rect(G,48,42,9,8,(x,y)=>y===43?PAL.water:PAL.wood);
      for(const [x,y] of [[29,28],[29,29],[30,30],[28,30],[30,31],[28,31],[30,32],[28,32]]) put(G,x,y,PAL.metal); for(const [x,y] of [[38,28],[38,29],[38,30],[38,31],[37,28],[39,28]]) put(G,x,y,PAL.metal2);
      flush(G,p); p.r(13,37,11,1,'rgba(255,240,180,.6)'); p.g.globalAlpha=.25; p.r(8,48,24,1,FIRE); p.g.globalAlpha=1; for(const [x,y] of [[36,35],[39,34],[34,33]]) p.r(x,y,1,1,FIRE2); hl(p,14,11,10,.25); return c; },

    // 연못 정원: 연꽃 연못 + 홍교 + 괴석
    hanok_park(){ const W=66,H=52,{c,p,G}=start(W,H);
      p.ell(33,36,32,14,PAL.grass2); p.ell(33,37,28,11,shade(PAL.grass2,1.03));
      // 대나무 숲(뒤)
      for(const x of [54,58,62]) rect(G,x,6+(x%4)*2,3,32,(xx,yy)=>yy%6===0?'#4f8a52':(xx===x+1?'#9bd08f':'#6fb26c'));
      // 괴석
      part(G,(x,y)=>{ const w=[2,3,3,4,4,5,5,5,5,5,6,6,6,6,6,6][y-18]??0; return Math.abs(x-9)<=w&&y>=18&&y<=33; },(x,y)=>(x===8&&y===23)||(x===11&&y===28)?PAL.metal2:x>10?PAL.metal2:PAL.metal,2,18,16,33);
      // 연못(돌 테두리)
      part(G,(x,y)=>((x-34)/24.5)**2+((y-37)/10.5)**2<=1,(x,y)=>(x*3+y)%7===0?PAL.stone2:PAL.stone,8,26,60,48);
      part(G,(x,y)=>((x-34)/21.5)**2+((y-37)/7.5)**2<=1,(x,y)=>y===30?PAL.water2:((x+y*3)%11===0?PAL.water2:PAL.water),11,29,57,45);
      // 연잎
      for(const [x,y,r] of [[18,38,3],[26,42,2],[44,41,3],[50,36,2],[38,44,2]]) oval(G,x,y,r,Math.max(1,r-1),PAL.leaf);
      // 홍교(붉은 난간 나무다리)
      const yt=x=>27+Math.round(4*((x-34)/12)**2);
      part(G,(x,y)=>Math.abs(x-34)<=12&&y>=yt(x)&&y<=yt(x)+3,(x,y)=>y===yt(x)+1?'#d6a070':PAL.wood,21,26,47,35);
      flush(G,p);
      for(let x=23;x<=45;x++){ p.r(x,yt(x)-3,1,1,PAL.red); if((x-23)%4===0) p.r(x,yt(x)-3,1,3,PAL.red); }
      p.r(23,yt(23)-4,1,1,PAL.outline); p.r(45,yt(45)-4,1,1,PAL.outline); p.r(34,yt(34)-4,1,1,PAL.outline);
      for(const [x,y] of [[18,36],[44,39],[26,41],[50,35]]){ p.r(x,y-1,1,1,PAL.pink); p.r(x-1,y,3,1,PAL.pink); p.r(x,y,1,1,PAL.white); }
      for(const [x,y,d] of [[54,9,-1],[58,7,1],[62,11,1],[54,17,-1],[58,15,-1],[62,20,1],[58,24,1]]){ for(let i=0;i<4;i++) p.r(x+1+d*(i+1),y+(i>>1),1,1,i<2?'#5fa060':'#4f8a52'); for(let i=0;i<3;i++) p.r(x+1+d*(i+1),y-1+i,1,1,'#7cbf7a'); }
      p.r(30,40,6,1,'rgba(255,255,255,.6)'); p.r(14,34,4,1,'rgba(255,255,255,.5)'); hl(p,7,20,3,.5); return c; },
  });

  // ---------- 장식: 소나무 · 홍살문 · 연꽃 연못 ----------
  DECOR_KIND.tree.hanok_tree = size => {
    const w=size?30:24, h=size?36:30, c=mk(w,h), trunk=mk(w,h), G=Grid(w,h), T=Grid(w,h), cx=Math.floor(w/2);
    const BARK='#a8583e', BARK2='#7a3e2c', L1='#3f7a52', L2='#5a9a64', L3='#86bf7c';
    // 굽은 붉은 줄기
    const tx=y=>cx-1+Math.round(Math.sin((h-y)/7)*2);
    part(T,(x,y)=>y>=h*0.35&&y<h&&x>=tx(y)-1&&x<=tx(y)+2+(y>h-3?1:0),(x,y)=>x>=tx(y)+1?BARK2:BARK,0,0,w-1,h-1);
    // 납작한 구름 모양 잎 덩어리 3층
    const blobs = size ? [[cx-1,3,6,3],[cx+5,8,8,4],[cx-6,11,8,4],[cx+1,17,11,4]] : [[cx-1,3,5,3],[cx+4,7,7,3],[cx-5,10,7,3],[cx+1,15,9,3]];
    for(const [bx,by,rx,ry] of blobs) part(G,(x,y)=>{ const k=((x-bx)/(rx+.5))**2+((y-by)/(ry+.5))**2; return k<=1 && !(y===by+ry && (x+bx)%3===0); },(x,y)=>y<=by-ry+1?L3:(y>=by+ry-1||x>bx+rx*.6)?L1:((x+y)%4===0?L1:L2), bx-rx-1,by-ry-1,bx+rx+1,by+ry+1);
    flush(G,new PX(c)); flush(T,new PX(trunk));
    return { canopy:c, trunk, ax:cx, ay:h, sway:.5 };
  };
  DECOR_KIND.gate.hanok_gate = () => {
    const c=mk(34,30), p=new PX(c), G=Grid(34,30), R=PAL.red, R2=shade(PAL.red,.8);
    // 홍살(화살 모양 붉은 살)
        rect(G,0,7,34,3,R2); rect(G,1,11,32,3,R); for(let x=7;x<=27;x+=3) if(x<13||x>21) put(G,x,6,PAL.outline);
    for(const x of [2,28]) rect(G,x,8,4,22,xx=>xx===x+1?shade(PAL.red,1.15):R);
    oval(G,17,4,3,3,(x,y)=>y<4?PAL.red:PAL.roofBlue);
    flush(G,p); for(let x=7;x<=27;x+=3){ if(x>=13&&x<=21) continue; p.r(x,2,1,5,R); p.r(x-1,2,3,1,R); p.r(x,1,1,1,PAL.outline); p.r(x-1,2,1,1,PAL.outline); p.r(x+1,2,1,1,PAL.outline); } hl(p,1,12,32,.3); return c;
  };
  DECOR_KIND.pond.hanok_pond = frame => {
    const c=mk(60,32), p=new PX(c), G=Grid(60,32);
    oval(G,30,16,28,13,(x,y)=>(x+y)%5===0?PAL.stone2:PAL.stone);
    oval(G,30,15,25,10,PAL.water);
    for(const [x,y,r] of [[14,18,3],[42,11,3],[23,10,2],[46,20,2],[34,21,2]]) oval(G,x,y,r,Math.max(1,r-1),PAL.leaf);
    flush(G,p);
    p.ell(30,15,20,7,shade(PAL.water,1.06)); for(const [x,y,r] of [[14,18,3],[42,11,3],[23,10,2],[46,20,2],[34,21,2]]){ p.ell(x,y,r-1,Math.max(0,r-2),PAL.leaf); p.r(x,y-1,1,1,PAL.outline); }
    for(const [x,y] of [[15,16],[42,9],[34,19]]){ p.r(x,y-1,1,1,PAL.pink); p.r(x-1,y,3,1,PAL.pink); p.r(x,y,1,1,PAL.white); }
    const s=frame?[[20,13,5],[36,16,4]]:[[24,14,4],[38,15,5]]; for(const [x,y,w] of s){ p.r(x,y,w,1,'rgba(255,255,255,.8)'); }
    return c;
  };

  // 굴뚝 연기·밤 불빛(생김새 이름 기준)
  if (typeof CHIMNEY!=='undefined') Object.assign(CHIMNEY, { hanok_home:4, hanok_factory:15, hanok_community:64 });
  if (typeof NO_LIGHT!=='undefined') { NO_LIGHT.add('hanok_park'); NO_LIGHT.add('hanok_plaza'); }

  // ---------- 캐릭터 6종 ----------
  const BODY = { down:['..oBBwwBBo..','.oBBBwwBBBo.','.oBrrrrrrBo.','onBBBBBBBBno','.oBBBBBBBBo.','obbbbbbbbbbo','...ff..gg...'],
                 side:['..oBBBBBBo..','.oBwwBBBBBo.','.orrrrrrrro.','.onBBBBBBBo.','.oBBBBBBBBo.','.obbbbbbbbbo','...ff..gg...'] };
  const sh = (name, down, side) => ({ name, down, side, human:true });
  const SHAPES = [
    sh(L("선비"),
      ['....oooo....','...okkkko...','...okkkko...','ooookkkkoooo','okkkkkkkkkko','oooHSSSSHooo','..oSeSSeSo..','..opSSSSpo..','...oSHHSo...', ...BODY.down],
      ['....oooo....','...okkkko...','...okkkko...','ooookkkkoooo','okkkkkkkkkko','oooSSSHHHooo','..oSeSSHHo..','..oSSSSSHo..','..oHHSSSo...', ...BODY.side]),
    sh(L("상인"),
      ['....oooo....','...oLLLLo...','..owLLLLwo..','.oLLLLLLLLo.','oLLLLLLLLLLo','oooHSSSSHooo','..oSeSSeSo..','..opSSSSpo..','...oSSSSo...',
       '..orBwwBro..','.oBBrwwrBBo.','.okkkkkkkko.','onBBBBBBBBno','.obbbbbbbbo.','..obboobbo..','...ff..gg...'],
      ['....oooo....','...oLLLLo...','..owLLLLwo..','.oLLLLLLLLo.','oLLLLLLLLLLo','oooSSSHHHooo','..oSeSSHHo..','..oSSSSSHo..','...oSSSSooo.',
       '..oBBBBBBrro','.oBwwBBBBrro','.okkkkkkkrro','.onBBBBBBooo','.obbbbbbbbo.','..obboobbo..','...ff..gg...']),
    sh(L("아낙"),
      ['............','............','....oooo....','..ooHHHHoo..','.oHHHHHHHHo.','.oHHSSSSHHo.','.oHSeSSeSHo.','.oHpSSSSpHo.','..ooSSSSoo..',
       '..ohhrrhho..','.onhhhrhhno.','.oBBBBBBBBo.','oBBBBBBBBBBo','oBBBBBBBBBBo','obbbbbbbbbbo','...ff..gg...'],
      ['............','............','...ooooo....','..oHHHHHo...','.oHHHHHHHo..','.oSSSHHHHoo.','.oSeSSHHkHHk','.opSSSHHoHHo','..oSSSSHooo.',
       '..orhhhhho..','.onhhhhhhho.','.oBBBBBBBBo.','oBBBBBBBBBBo','oBBBBBBBBBBo','obbbbbbbbbbo','...ff..gg...']),
    sh(L("포졸"),
      ['.....oo...w.','....orro..w.','...okrrko.r.','..okkkkkkoo.','okkkkkkkkkko','oooHSSSSHooo','..oSeSSeSoo.','..opSSSSpoo.','...oSSSSo.o.',
       '..oBBwwBBoo.','.oBBBwwBBBo.','.okkkkkkkko.','onBBBBBBBBno','.oBBBBBBBBo.','obbbbbbbbbbo','...ff..gg...'],
      ['.....oo...w.','....orro..w.','...okrrko.r.','..okkkkkkoo.','okkkkkkkkkko','oooSSSHHHooo','..oSeSSHHoo.','..oSSSSSHoo.','...oSSSSo.o.',
       '..oBBBBBBoo.','.oBwwBBBBBo.','.okkkkkkkko.','.onBBBBBBno.','.oBBBBBBBBo.','.obbbbbbbbbo','...ff..gg...']),
    sh(L("동자"),
      ['............','............','............','....oooo....','..ooHHHHoo..','.oHHHHHHHHo.','.oHSSSSSSHo.','.oSeSSSSeSo.','.opSSSSSSpo.','..ooSSSSoo..',
       '..oBBwwBBo..','.onBrrrrBno.','..oBBBBBBo..','..obbbbbbo..','..obboobbo..','...ff..gg...'],
      ['............','............','............','....oooo....','..ooHHHHoo..','.oHHHHHHHHo.','.oSSSHHHHHo.','.oSeSSHHHHo.','.opSSSHHHHo.','..oSSSSoHo..',
       '..oBBBBBoHo.','.onBrrrrorro','..oBBBBBBoo.','..obbbbbbo..','..obboobbo..','...ff..gg...']),
    { name:L("도깨비"),
      down:['.o........o.','oLo......oLo','oLLo....oLLo','.oLLooooLLo.','oHHHHHHHHHHo','oHBBHBBHBBHo','oBBweBBewBBo','oBBweBBewBBo','oBBBBBBBBBBo','.oBwBBBBwBo.',
            'onBBBBBBBBno','.oBBBBBBBBo.','.oLoLLLoLLo.','.oLLoLLLoLo.','..oBBooBBo..','...ff..gg...'],
      side:['.o........o.','oLo......oLo','oLLo....oLLo','.oLLooooLLo.','oHHHHHHHHHHo','oBBBHHHHHHHo','owwBBHHHHHHo','oweBBBHHHHHo','oBBBBBBHHHHo','.owBBBBBBBo.',
            '.onBBBBBBBo.','.oBBBBBBBBo.','.oLoLLLoLLo.','.oLLoLLLoLo.','..oBBooBBo..','...ff..gg...'] },
  ];

  THEMES.hanok = {
    name:L("한옥 장터"), order:3,
    palette:{ outline:'#3a3036', grass:'#b5d39c', grass2:'#a5c68a', grass3:'#86ad70', dirt:'#d9c39d', dirt2:'#bea37b', stone:'#e3ddcf', stone2:'#c2b9a6',
      water:'#9dd0d6', water2:'#62a6b4', wall:'#f4ecd8', wall2:'#dccfb2', wood:'#bb875a', wood2:'#8a5c3d',
      roofPink:'#d98a7a', roofBlue:'#7c8aad', roofGreen:'#8cc0a0', roofYellow:'#e3c378', roofLilac:'#b8a7d4',
      white:'#fffaf0', leaf:'#6aa868', pink:'#eea3a8', red:'#c9564a', gold:'#e9b949', metal:'#b5b7bf', metal2:'#888c99', skin:'#f8d8b8' },
    characters:{ shapes:SHAPES, colors:[
        { name:L("옥색"), B:'#a8d8c8', b:'#7db4a2', h:'#d2eee4' },{ name:L("쪽빛"), B:'#4f6fa8', b:'#384f80', h:'#7f9bd0' },{ name:L("다홍"), B:'#e0604f', b:'#b04437', h:'#f0907f' },
        { name:L("송화"), B:'#efd77a', b:'#c8ad52', h:'#f8eab0' },{ name:L("연분홍"), B:'#f4b8c4', b:'#d690a0', h:'#fbdce2' },{ name:L("먹색"), B:'#55505e', b:'#3e3a46', h:'#7d7888' }],
      fixed:{ ...FIXED_COMMON, o:'#3a3036', e:'#3a3036', f:'#3a3036', g:'#3a3036', S:'#f8d8b8', n:'#f8d8b8', H:'#2f2a33', k:'#5d5a72', r:'#b8403a', L:'#e2c06a', w:'#fffaf0' },
      up:{ S:'H', e:'H', p:'H', w:'B', n:'B', r:'r' } },
    kinds:{ plaza:[L("정자 광장"),'hanok_plaza','star'], shop:[L("저잣거리"),'hanok_shop','cart'], library:[L("서고"),'hanok_library','book'], community:[L("주막"),'hanok_community','mug'],
      home:[L("초가집"),'hanok_home','house'], checkout:[L("전당포"),'hanok_checkout','coin'], cafe:[L("찻집"),'hanok_cafe','coffee'], school:[L("서당"),'hanok_school','bell'],
      clinic:[L("약방"),'hanok_clinic','cross'], post:[L("파발소"),'hanok_post','mail'], factory:[L("대장간"),'hanok_factory','gear'], park:[L("연못 정원"),'hanok_park','flower'] },
    decor:{ tree:'hanok_tree', gate:'hanok_gate', pond:'hanok_pond', ground:'grass' },
  };
})();
