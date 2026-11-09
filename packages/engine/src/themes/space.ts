import { BUILD, CHIMNEY, DECOR_KIND, NO_LIGHT, PX, iconMap, mk, shade, shadow } from '../map';
import { FIXED_COMMON, ICON_ROWS, PAL, THEMES, human } from '../palette';
import { L } from '@visitown/i18n';
// 우주 정거장 (space)
(()=>{
  const O=()=>PAL.outline;
  const cut=(p,fn)=>{ p.g.globalCompositeOperation='destination-out'; fn(); p.g.globalCompositeOperation='source-over'; };
  // 모듈 벽: 오른쪽 면 한 단계 어둡게 + 패널 이음선
  function hull(p,x,y,w,h,col=PAL.wall,sh=5){ p.r(x,y,w,h,col); p.r(x+w-sh,y,sh,h,shade(col,.86)); p.o(x,y,w,h); }
  function seams(p,x,y,w,h,step=10){ for(let k=x+step;k<x+w-6;k+=step) p.r(k,y+1,1,h-2,shade(PAL.wall,.9)); }
  // 돔: 오른쪽 그늘 초승달 + 왼쪽 위 하이라이트
  function dome(p,cx,cy,rx,ry,col){ p.ell(cx,cy,rx,ry,PAL.outline); p.ell(cx,cy,rx-1,ry-1,shade(col,.84)); p.ell(cx-2,cy,rx-3,ry-1,col); p.ell(cx-Math.round(rx*.42),cy-Math.round(ry*.5),Math.max(1,Math.round(rx*.2)),Math.max(1,Math.round(ry*.14)),'rgba(255,255,255,.55)'); }
  function port(p,cx,cy,r=3){ p.ellO(cx,cy,r,r,PAL.water); p.ell(cx+1,cy+1,Math.max(0,r-2),Math.max(0,r-2),PAL.water2); p.r(cx-1,cy-1,1,1,PAL.white); }
  function hatch(p,x,y,w,h,light=PAL.leaf){ p.r(x+1,y,w-2,h,O()); p.r(x,y+1,w,h-1,O()); p.r(x+1,y+1,w-2,h-1,PAL.metal2); p.r(x+2,y+2,w-4,h-2,PAL.metal); const m=x+Math.floor(w/2); p.r(m,y+1,1,h-1,O()); p.r(x+2,y+2,1,h-3,'rgba(255,255,255,.6)'); p.r(m-1,y-2,3,1,light); }
  function hazard(p,x,y,w,h=2){ for(let k=0;k<w;k+=2) p.r(x+k,y,Math.min(2,w-k),h,(k/2)%2?PAL.outline:PAL.gold); }
  function lamp(p,x,y,col){ p.r(x,y,2,2,col); p.r(x,y,1,1,'rgba(255,255,255,.75)'); }
  function plate(p,x,y,icon){ p.box(x,y,14,14,PAL.white); p.r(x+1,y+12,12,1,PAL.stone2); p.sprite(ICON_ROWS[icon],iconMap(),x+1,y+1); }
  function ring(p,cx,cy,rx,ry,col,t=3){ p.ell(cx,cy,rx,ry,O()); p.ell(cx,cy,rx-1,ry-1,col); p.ell(cx,cy,rx-t,ry-t,O()); cut(p,()=>p.ell(cx,cy,rx-t-1,ry-t-1,'#000')); }

  const SH = {
    astro: ['....oooo....','..ookkkkoo..','.okkkkkkkko.','.okppppppko.','.okpwppppko.','.okkppppkko.','.okkkkkkkko.','..okkkkkko..'],
    astroS:['....oooo....','..ookkkkoo..','.okkkkkkkko.','.oppppkkkko.','.opwppkkkko.','.okpppkkkko.','.okkkkkkkko.','..okkkkkko..'],
  };
  const ASTRO_BODY = { down:['..oBBBBBBo..','.oBBwwwwBBo.','.oBBwrrwBBo.','.oBBBBBBBBo.','.onoBBBBono.','..obbbbbbo..','...ff..gg...'],
                       side:['..oBBBBBBo..','.oBBBBBBkko.','.oBrBBBBkko.','.oBBBBBBkko.','.onBBBBBBBo.','..obbbbbbo..','...ff..gg...'] };
  const ENGI_BODY  = { down:['..oBBooBBo..','.oBbBBBBbBo.','.oBbBBBBbBo.','.okkkkrkkko.','.onoBBBBono.','..obbbbbbo..','...ff..gg...'],
                       side:['..oBBBBBBo..','.oBbBBBBBBo.','.oBbBBBBBBo.','.okkkkkkkko.','.onBBBBBBBo.','..obbbbbbo..','...ff..gg...'] };
  const SHAPES = [
    human(L("우주인"), SH.astro, SH.astroS, ASTRO_BODY),
    { name:L("외계인"),
      down:['..oo....oo..','.orro..orro.','..oko..oko..','...okooko...','..oBBBBBBo..','.oBhBBBBBBo.','oBhBBBBBBBBo','oBBeeBBeeBBo','oBBeeBBeeBBo','.oBBBBBBBBo.','..oBBBBBBo..','...oooooo...','..okBBBBko..','.oBoBBBBoBo.','..obbbbbbo..','...ff..gg...'],
      side:['..oo....oo..','.orro..orro.','..oko..oko..','...okooko...','..oBBBBBBo..','.oBhBBBBBBo.','oBhBBBBBBBBo','oeeBBBBBBBBo','oeeBBBBBBBBo','.oBBBBBBBBo.','..oBBBBBBo..','...oooooo...','..okBBBBko..','..oBoBBBBo..','..obbbbbbo..','...ff..gg...'] },
    { name:L("문어 외계인"),
      down:['............','............','....oooo....','..ooBBBBoo..','.oBhhBBBBBo.','oBhBBBBBBBBo','oBhBBBBBBBBo','oBBBBBBBBBBo','oBBeeBBeeBBo','oBBeeBBeeBBo','oBBBBBBBBBBo','.oBBBBBBBBo.','obBoBBBBoBbo','ob.obbbbo.bo','oo.oo..oo.oo','...ff..gg...'],
      side:['............','............','....oooo....','..ooBBBBoo..','.oBhhBBBBBo.','oBhBBBBBBBBo','oBhBBBBBBBBo','oBBBBBBBBBBo','oeeBBBBBBBBo','oeeBBBBBBBBo','oBBBBBBBBBBo','.oBBBBBBBBo.','obBoBBBBoBbo','ob.obbbbo.bo','oo.oo..oo.oo','...ff..gg...'] },
    { name:L("탐사 로봇"),
      down:['.......oo...','......orro..','..oooooooo..','.ohBBBBBBBo.','okeeeeeeeeko','okewweewweko','okeeeeeeeeko','.oBBBBBBBBo.','..oooooooo..','....okko....','..oooooooo..','.oBhBrrBBBo.','.oBBBBBBBBo.','.okkkkkkkko.','..obbbbbbo..','...ff..gg...'],
      side:['.......oo...','......orro..','..oooooooo..','.ohBBBBBBBo.','.oeeeeBBBko.','.oewweBBBko.','.oeeeeBBBko.','.oBBBBBBBBo.','..oooooooo..','....okko....','..oooooooo..','.oBhBBBBBBo.','.oBBBBBBkko.','.okkkkkkkko.','..obbbbbbo..','...ff..gg...'] },
    { name:L("우주 고양이"),
      down:['...oooooo...','..owLLLLLo..','.oLoLLLLoLo.','oLoBooooBoLo','oLoBBBBBBoLo','oLoBeBBeBoLo','oLoBBhhBBoLo','.oLooooooLo.','.okkkkkkkko.','..oBBBBBBo..','.oBBBwwBBBo.','.oBBBBBBBBo.','.oBoBBBBoBo.','..obbbbbbo..','...ff..gg...'],
      side:['...oooooo...','..owLLLLLo..','.oLoLLLLoLo.','oLoBooooBoLo','oLoBBBBBBoLo','oLoeBBBBBoLo','oLhhBBBBBoLo','.oLooooooLo.','.okkkkkkkko.','..oBBBBBBo..','.oBBBBBBkko.','.oBBBBBBkko.','.oBBBoBBBBo.','..obbbbbbo..','...ff..gg...'] },
    human(L("엔지니어"), ['....oooo....','..ooBhBBoo..','.oBBhBBBBBo.','obBBBBBBBBbo','.oooooooooo.','.okppkkppko.','.oSSSSSSSSo.','..oSSSSSSo..'],
                     ['....oooo....','..ooBhBBoo..','.oBBhBBBBBo.','obBBBBBBBBbo','.oooooooooo.','.okppkHHHHo.','.oSSSSHHHHo.','..oSSSHHHo..'], ENGI_BODY),
  ];

  THEMES.space = {
    name:L("우주 정거장"), order:9,
    palette:{ outline:'#232a3d', grass:'#8e9bb2', grass2:'#8492aa', grass3:'#6c7a93', dirt:'#b6c0d0', dirt2:'#8f9ab0', stone:'#cfd7e3', stone2:'#a4afc2',
      water:'#9fe8f2', water2:'#3fb6d6', wall:'#eef1f6', wall2:'#c8d0dd', wood:'#8a95ab', wood2:'#5c667e',
      roofPink:'#ee8a5c', roofBlue:'#5b78c9', roofGreen:'#55c49c', roofYellow:'#f4c45a', roofLilac:'#a68be0',
      white:'#ffffff', leaf:'#6fd17e', pink:'#f59bb0', red:'#ec5b5b', gold:'#ffb84a', metal:'#c6cdd9', metal2:'#8b95a8', skin:'#ffd9b3' },
    characters:{ shapes:SHAPES, colors:[
      { name:L("주황"), B:'#f08a4b', b:'#c4652e', h:'#ffbb8c' },{ name:L("시안"), B:'#4fc3d9', b:'#2f93ab', h:'#a4e8f3' },{ name:L("초록"), B:'#7dcf6a', b:'#55a548', h:'#b9eaa9' },
      { name:L("보라"), B:'#a07ad8', b:'#7756ad', h:'#cbb2ef' },{ name:L("은색"), B:'#c5ccd8', b:'#939cae', h:'#eef1f6' },{ name:L("남색"), B:'#4b5d9a', b:'#33416f', h:'#7d8fcb' }],
      fixed:{ ...FIXED_COMMON, o:'#232a3d', e:'#232a3d', f:'#232a3d', g:'#232a3d', p:'#4a6fb5', S:'#ffd9b3', n:'#e6eaf1', H:'#5a3a2a', k:'#e6eaf1', r:'#ff8a3d', L:'rgba(190,235,255,.45)' },
      up:{ e:'B', w:'k', p:'k', S:'H', r:'r', n:'n' } },
    kinds:{ plaza:[L("도킹 허브"),'space_plaza','star'], shop:[L("보급 상점"),'space_shop','cart'], library:[L("데이터 아카이브"),'space_library','book'], community:[L("승무원 라운지"),'space_community','heart'],
      home:[L("거주 모듈"),'space_home','house'], checkout:[L("크레딧 교환소"),'space_checkout','coin'], cafe:[L("우주 카페"),'space_cafe','coffee'], school:[L("훈련 시뮬레이터"),'space_school','bell'],
      clinic:[L("의무 모듈"),'space_clinic','cross'], post:[L("통신 안테나"),'space_post','mail'], factory:[L("엔진룸"),'space_factory','gear'], park:[L("온실 돔"),'space_park','flower'] },
    decor:{ tree:'space_tree', gate:'space_gate', pond:'space_pond', ground:'tile' },
  };

  Object.assign(BUILD, {
    // 도킹 허브: 착륙장 위 로켓 + 정비탑
    space_plaza(){ const c=mk(68,62), p=new PX(c); shadow(p,34,57,33,4);
      p.ellO(34,51,32,8,PAL.stone2); p.ellO(34,50,29,6,PAL.stone); p.ellO(34,50,13,3,PAL.stone2); p.r(30,50,9,1,PAL.gold);
      for (const [x,y] of [[5,51],[62,51],[14,45],[54,45],[14,56],[54,56]]) lamp(p,x,y,(x+y)%2?PAL.water2:PAL.gold);
      // 정비탑
      p.r(6,10,2,40,PAL.metal2); p.r(12,10,2,40,PAL.metal2); for(let y=12;y<50;y+=6){ p.r(8,y,4,1,PAL.metal2); p.r(8,y+3,1,1,PAL.metal2); p.r(11,y+3,1,1,PAL.metal2); } p.o(5,10,10,40); p.r(14,22,14,2,PAL.metal); p.o(14,22,14,2); p.box(6,6,8,5,PAL.red); p.r(7,7,2,1,'rgba(255,255,255,.6)');
      // 연료 탱크
      p.box(50,34,12,14,PAL.roofYellow); p.r(58,35,3,12,shade(PAL.roofYellow,.85)); p.ellO(56,34,6,2,PAL.roofYellow); p.r(51,40,10,1,shade(PAL.roofYellow,.75)); p.r(42,42,8,2,PAL.metal2); p.o(42,42,8,2);
      // 로켓
      const cx=34; for(let i=0;i<14;i++){ const w=Math.max(1,Math.round((i+1)/14*6)); p.r(cx-w,2+i,2*w,1,i<3?PAL.red:PAL.white); p.r(cx-w,2+i,1,1,O()); p.r(cx+w-1,2+i,1,1,O()); if(i>3) p.r(cx+w-2,2+i,1,1,PAL.wall2); }
      p.r(cx-1,1,2,1,O());
      p.r(cx-6,16,12,30,PAL.white); p.r(cx+2,16,4,30,PAL.wall2); p.o(cx-6,16,12,30); p.r(cx-5,20,10,2,PAL.roofPink); p.r(cx-5,38,10,2,PAL.roofPink); port(p,cx-1,28,3);
      for(let i=0;i<10;i++){ const w=1+Math.floor(i/2); p.r(cx-6-w,36+i,w,1,PAL.red); p.r(cx-7-w,36+i,1,1,O()); p.r(cx+6,36+i,w,1,shade(PAL.red,.82)); p.r(cx+6+w,36+i,1,1,O()); }
      p.r(cx-12,46,6,1,O()); p.r(cx+6,46,7,1,O()); p.box(cx-4,45,8,4,PAL.metal2); p.r(cx-3,46,6,1,PAL.metal);
      return c; },
    // 보급 상점: 주황 반원통 지붕 + 진열창 + 화물 상자
    space_shop(){ const c=mk(72,60), p=new PX(c); shadow(p,36,56,36,4);
      dome(p,38,24,28,14,PAL.roofPink); for(let k=16;k<62;k+=8) p.r(k,14,1,10,shade(PAL.roofPink,.8));
      hull(p,10,22,56,32); seams(p,10,22,56,32,14); hazard(p,11,23,54,2); p.r(10,25,56,1,O());
      p.box(14,30,28,18,PAL.water); p.r(15,31,26,16,'#cdeff6'); p.r(15,38,26,1,PAL.metal2); p.r(15,46,26,1,PAL.metal2); p.r(15,31,2,16,'rgba(255,255,255,.7)');
      ([[18,34,PAL.red],[23,34,PAL.gold],[28,34,PAL.leaf],[33,34,PAL.roofLilac],[19,42,PAL.roofBlue],[25,42,PAL.pink],[31,42,PAL.gold],[36,42,PAL.water2]] as any[]).forEach(([x,y,col])=>{ p.r(x,y,4,4,col); p.r(x,y,1,1,'rgba(255,255,255,.6)'); p.o(x,y,4,4); });
      hatch(p,48,36,12,18,PAL.leaf); plate(p,31,6,'cart');
      for (const [x,y] of [[1,44],[3,36]]) { p.box(x,y,9,8,PAL.roofYellow); p.r(x+1,y+3,7,1,shade(PAL.roofYellow,.75)); p.r(x+1,y+1,1,1,'rgba(255,255,255,.6)'); }
      return c; },
    // 데이터 아카이브: 파란 돔을 얹은 원통 탑 + 서버 베이
    space_library(){ const c=mk(60,76), p=new PX(c); shadow(p,30,72,28,4);
      p.r(29,0,2,8,PAL.metal2); p.r(27,0,6,1,O()); lamp(p,29,-0,PAL.water2);
      dome(p,30,22,20,15,PAL.roofBlue); p.r(14,16,32,1,shade(PAL.roofBlue,.8)); plate(p,23,8,'book');
      hull(p,10,22,40,46); p.r(10,22,40,3,PAL.roofBlue); p.o(10,22,40,3);
      for (const x of [14,34]) { p.box(x,28,12,26,'#2b3550'); for(let y=30;y<52;y+=3){ p.r(x+2,y,8,2,'#3e4a6b'); p.r(x+2+((y*7+x)%6),y,2,1,((y+x)%3)?PAL.water:PAL.leaf); } }
      p.r(27,28,6,26,PAL.wall2); p.r(29,30,2,22,PAL.water2);
      hatch(p,24,56,12,12,PAL.water2); p.r(6,66,48,3,PAL.stone2); p.o(6,66,48,3); p.r(4,69,52,3,PAL.stone2); p.o(4,69,52,3);
      return c; },
    // 승무원 라운지: 긴 초록 지붕 모듈 + 전망창 속 승무원들 + 하트 네온
    space_community(){ const c=mk(80,60), p=new PX(c); shadow(p,40,56,40,4);
      dome(p,40,22,38,12,PAL.roofGreen); for(let k=10;k<72;k+=10) p.r(k,14,2,2,PAL.white);
      hull(p,4,22,72,32); seams(p,4,22,72,32,12); p.r(4,22,72,2,shade(PAL.roofGreen,.8)); p.o(4,22,72,2);
      p.box(8,27,64,13,'#2b3550'); p.r(9,28,62,11,'#3b4d7a'); for(let k=12;k<70;k+=4) p.r(k,29,1,1,PAL.white); p.r(30,32,1,1,PAL.gold); p.r(55,30,1,1,PAL.white);
      ([[13,PAL.roofPink],[21,PAL.leaf],[49,PAL.roofLilac],[57,PAL.gold],[65,PAL.water2]] as any[]).forEach(([x,col])=>{ p.r(x,34,4,6,col); p.r(x,31,4,3,PAL.skin); p.r(x,30,4,1,O()); });
      p.r(9,38,62,1,PAL.metal2); for(let k=8;k<72;k+=16) p.r(k,27,1,13,PAL.metal2);
      hatch(p,33,40,14,14,PAL.pink); p.r(30,41,2,2,PAL.pink); p.r(48,41,2,2,PAL.pink);
      p.sprite(ICON_ROWS.heart,iconMap(),34,1);
      for (const x of [10,62]) { p.box(x,46,8,6,PAL.metal2); p.ell(x+4,44,4,2,PAL.leaf); p.r(x+3,42,2,2,PAL.pink); }
      return c; },
    // 거주 모듈: 다리 달린 캡슐 + 태양광 날개
    space_home(){ const c=mk(60,56), p=new PX(c); shadow(p,30,52,26,4);
      p.r(29,2,2,16,PAL.metal2); p.o(28,2,4,16);
      for (const x of [4,34]) { p.box(x,4,22,8,PAL.roofBlue); for(let k=x+4;k<x+22;k+=4) p.r(k,5,1,6,shade(PAL.roofBlue,.75)); p.r(x+1,7,20,1,shade(PAL.roofBlue,.75)); p.r(x+1,5,3,1,'rgba(255,255,255,.6)'); } p.r(26,7,8,2,PAL.metal2); p.o(26,7,8,2);
      for (const x of [14,44]) { p.r(x,42,2,8,PAL.metal2); p.r(x-2,49,6,2,PAL.metal2); p.o(x-2,49,6,2); }
      p.ellO(12,31,9,13,PAL.wall); p.ellO(48,31,9,13,shade(PAL.wall,.86)); p.r(12,18,36,27,PAL.wall); p.r(12,18,36,1,O()); p.r(12,44,36,1,O()); p.r(40,19,8,25,shade(PAL.wall,.93));
      p.r(4,23,52,3,PAL.roofLilac); p.r(5,23,50,1,'rgba(255,255,255,.4)');
      port(p,15,33,4); hatch(p,26,29,11,15,PAL.gold); port(p,44,33,3); p.r(8,29,2,1,O());
      return c; },
    // 크레딧 교환소: 금색 지붕 부스 + 떠 있는 코인 홀로그램
    space_checkout(){ const c=mk(62,60), p=new PX(c); shadow(p,31,56,30,4);
      p.g.globalAlpha=.45; for(let i=0;i<12;i++) p.r(31-1-Math.floor(i*.6),14+i,2+2*Math.floor(i*.6),1,PAL.water); p.g.globalAlpha=1;
      p.ellO(31,9,8,8,shade(PAL.gold,.85)); p.ell(30,8,6,6,PAL.roofYellow); p.ell(30,8,4,4,PAL.gold); p.r(29,5,2,7,PAL.roofYellow); p.r(27,6,1,1,PAL.white); p.r(26,7,1,3,PAL.white); for (const [x,y] of [[20,6],[42,10],[22,14]]) { p.r(x,y,1,1,PAL.water); }
      dome(p,31,30,26,8,PAL.roofYellow); hull(p,6,30,50,24); seams(p,6,30,50,24,12); p.r(6,30,50,2,shade(PAL.roofYellow,.75)); p.o(6,30,50,2);
      p.box(10,36,20,10,PAL.outline); p.r(11,37,18,8,'#2b3550'); p.r(12,38,10,1,PAL.leaf); p.r(12,40,14,1,PAL.water); p.r(12,42,6,1,PAL.gold); p.r(4,46,30,3,PAL.metal); p.o(4,46,30,3);
      hatch(p,38,38,12,16,PAL.gold); p.r(29,25,4,3,PAL.metal2); p.o(28,25,6,3);
      return c; },
    // 우주 카페: 분홍 돔 + 머그 네온 + 테라스 테이블
    space_cafe(){ const c=mk(62,54), p=new PX(c);
      dome(p,31,30,26,22,PAL.pink); for(let k=11;k<52;k+=7) p.r(k,22,4,1,shade(PAL.pink,.82)); cut(p,()=>p.r(0,31,62,23)); shadow(p,31,50,30,4); p.r(5,30,52,1,O());
      hull(p,8,30,46,18); hazard(p,9,31,44,1); p.box(12,34,18,10,PAL.water); p.r(13,35,16,8,'#cdeff6'); p.r(13,40,16,1,PAL.metal2); p.r(15,37,2,3,PAL.white); p.r(20,37,2,3,PAL.roofPink); p.r(25,37,2,3,PAL.gold);
      hatch(p,36,34,11,14,PAL.pink); plate(p,24,8,'coffee'); p.r(30,22,2,2,PAL.metal2);
      p.ellO(6,48,5,2,PAL.metal); p.r(5,44,2,3,PAL.white); p.r(5,48,2,4,PAL.metal2); p.ellO(56,48,5,2,PAL.metal); p.r(55,48,2,4,PAL.metal2);
      return c; },
    // 훈련 시뮬레이터: 자이로 링 두 개 + 가운데 조종 포드
    space_school(){ const c=mk(66,60), p=new PX(c); shadow(p,33,56,32,4);
      hull(p,4,36,58,18,PAL.wall); seams(p,4,36,58,18,10); p.r(4,36,58,2,PAL.roofBlue); p.o(4,36,58,2); port(p,11,45,3); port(p,20,45,3); hatch(p,27,40,12,14,PAL.water2); plate(p,44,38,'bell');
      p.r(31,30,4,8,PAL.metal2); p.o(30,30,6,8);
      ring(p,33,19,22,16,PAL.roofPink,3); ring(p,33,19,9,17,PAL.gold,3);
      p.ellO(33,19,7,7,PAL.white); p.ell(35,21,4,4,PAL.wall2); p.ell(32,18,5,5,PAL.white); p.r(30,16,7,4,PAL.water2); p.r(30,16,7,1,O()); p.r(31,17,2,1,PAL.water);
      return c; },
    // 의무 모듈: 흰 모듈 + 빨간 십자 돔 + 심전도 창
    space_clinic(){ const c=mk(60,58), p=new PX(c); shadow(p,30,54,29,4);
      dome(p,30,22,14,12,PAL.white); p.r(28,13,4,12,PAL.red); p.r(24,17,12,4,PAL.red); p.r(28,13,1,4,'rgba(255,255,255,.5)'); lamp(p,29,6,PAL.red);
      hull(p,4,22,52,30); seams(p,4,22,52,30,12); p.r(4,22,52,3,PAL.red); p.o(4,22,52,3); p.r(5,28,50,1,PAL.wall2);
      p.box(8,30,18,10,PAL.outline); p.r(9,31,16,8,'#203a35'); const ek=[3,3,3,3,1,5,0,3,3,3,3,2,3,3,3,3]; ek.forEach((v,i)=>p.r(9+i,32+v,1,1,PAL.leaf));
      hatch(p,32,34,14,18,PAL.red); port(p,51,34,2); p.box(8,43,18,8,PAL.white); p.r(9,44,16,2,PAL.roofGreen); p.r(10,47,14,1,PAL.stone2);
      return c; },
    // 통신 안테나: 큰 접시 + 받침대 + 신호
    space_post(){ const c=mk(64,60), p=new PX(c); shadow(p,32,56,30,4);
      hull(p,10,38,44,16); seams(p,10,38,44,16,11); p.r(10,38,44,2,PAL.roofYellow); p.o(10,38,44,2); hatch(p,35,42,11,12,PAL.water2); plate(p,15,40,'mail');
      p.r(29,26,6,12,PAL.metal2); p.o(28,26,8,12); p.r(30,27,1,10,PAL.metal); p.box(24,30,16,4,PAL.metal2);
      // 접시 (위로 기울어진 타원)
      p.ell(30,16,24,12,O()); p.ell(30,16,23,11,PAL.metal); p.ell(31,17,20,8,shade(PAL.metal,.85)); p.ell(29,15,18,6,PAL.white); p.ell(30,16,15,5,PAL.metal); p.ell(32,18,9,3,shade(PAL.metal,.8));
      p.r(30,6,2,10,PAL.metal2); p.r(29,16,4,2,PAL.metal2); p.box(28,3,6,4,PAL.metal2); lamp(p,30,1,PAL.red);
      p.g.globalAlpha=.8; for (const [r,a] of [[4,1],[7,.7],[10,.45]]) { p.g.globalAlpha=a; p.r(36+r,4-Math.floor(r/3),1,3+Math.floor(r/2),PAL.water2); p.r(37+r,3-Math.floor(r/3),1,1,PAL.water2); } p.g.globalAlpha=1;
      return c; },
    // 엔진룸: 어두운 금속 블록 + 원형 터빈 + 배기 노즐
    space_factory(){ const c=mk(68,58), p=new PX(c); shadow(p,34,54,33,4);
      p.box(44,2,8,16,PAL.metal2); p.r(45,3,2,14,PAL.metal); p.r(43,2,10,2,PAL.wood2); p.o(43,2,10,2); p.box(12,8,6,12,PAL.roofPink); p.r(13,9,1,10,'rgba(255,255,255,.4)');
      p.r(18,12,26,3,PAL.roofPink); p.o(18,12,26,3);
      hull(p,4,18,60,34,PAL.metal); p.r(4,18,60,3,PAL.wood2); p.o(4,18,60,3); for(let k=12;k<58;k+=12) p.r(k,21,1,30,PAL.metal2);
      p.ellO(22,36,13,13,PAL.wood2); p.ell(22,36,11,11,'#2b3550'); for(let a=0;a<8;a++){ const an=a*Math.PI/4+.3; for(let r=3;r<11;r++) p.r(22+Math.round(Math.cos(an)*r),36+Math.round(Math.sin(an)*r),1,1,PAL.metal2); }
      p.ellO(22,36,4,4,PAL.gold); p.ell(22,36,2,2,'#ffe9a8');
      for (const y of [24]) { p.box(42,y,18,8,PAL.wood2); for(let k=44;k<58;k+=3) p.r(k,y+2,2,4,PAL.roofPink); p.r(44,y+3,14,1,PAL.gold); }
      hazard(p,5,49,58,2); plate(p,45,34,'gear');
      return c; },
    // 온실 돔: 유리 돔 속 나무·꽃
    space_park(){ const c=mk(66,52), p=new PX(c); shadow(p,33,48,32,4);
      p.ell(33,36,30,30,O()); p.ell(33,36,29,29,'rgba(170,230,240,.55)'); cut(p,()=>p.r(0,37,66,20));
      p.r(4,36,58,1,O());
      p.r(16,26,3,10,PAL.wood2); p.ellO(17,22,8,7,PAL.leaf); p.ell(15,20,3,2,'#a6ecaa'); p.r(19,23,2,2,PAL.pink);
      p.r(44,24,3,12,PAL.wood2); p.ellO(45,19,7,8,'#4fb767'); p.ell(43,16,2,2,'#a6ecaa'); p.r(47,21,2,2,PAL.gold);
      p.r(29,30,2,6,PAL.wood2); p.ellO(30,28,5,4,PAL.leaf); for (const [x,y,col] of ([[9,33,PAL.pink],[25,34,PAL.gold],[36,33,PAL.white],[55,34,PAL.pink]] as any[])) { p.r(x-1,y,3,1,col); p.r(x,y-1,1,3,col); }
      for (const an of [-1.2,-.6,0,.6,1.2]) { for(let r=6;r<29;r++){ const x=33+Math.round(Math.sin(an)*r), y=36-Math.round(Math.cos(an)*r); p.r(x,y,1,1,'rgba(255,255,255,.35)'); } }
      p.r(10,14,1,6,'rgba(255,255,255,.75)'); p.r(12,10,1,3,'rgba(255,255,255,.75)');
      p.r(2,36,62,8,PAL.metal); p.r(52,36,12,8,PAL.metal2); p.o(2,36,62,8); p.r(3,37,60,1,PAL.white); for(let k=8;k<60;k+=10) lamp(p,k,40,PAL.leaf);
      return c; },
  });

  NO_LIGHT.add('space_plaza'); NO_LIGHT.add('space_park');   // 창 없는 착륙장·온실은 밤 불빛 없음
  CHIMNEY.space_factory = 48;                                 // 엔진룸 배기탑 연기

  // 장식: 조명 기둥(작음) / 통신 마스트(큼)
  DECOR_KIND.tree.space_tree = size => { const r=size?10:8, c=mk(2*r+3,2*r+12), p=new PX(c), cx=r+1, H=c.height; const trunk=mk(c.width,c.height), tp=new PX(trunk);
    tp.box(cx-4,H-4,9,4,PAL.metal2); tp.r(cx-3,H-3,7,1,PAL.metal); tp.box(cx-1,size?8:10,3,H-(size?12:14),PAL.metal2); tp.r(cx,size?9:11,1,H-(size?14:16),PAL.metal);
    if (size){ p.r(cx-6,8,13,2,PAL.metal2); p.o(cx-6,8,13,2); p.r(cx-6,4,2,4,PAL.metal2); p.r(cx+5,4,2,4,PAL.metal2); p.r(cx,0,1,8,PAL.metal2); lamp(p,cx-1,0,PAL.red); lamp(p,cx-6,2,PAL.water2); lamp(p,cx+5,2,PAL.water2); }
    else { p.box(cx-3,3,7,8,PAL.wall); p.r(cx-2,5,5,4,PAL.water); p.r(cx-2,5,1,2,PAL.white); p.r(cx-4,2,9,2,PAL.metal2); p.o(cx-4,2,9,2); p.r(cx,0,1,2,PAL.metal2); }
    return { canopy:c, trunk, ax:cx, ay:H, sway:0 }; };
  // 에어록 문
  DECOR_KIND.gate.space_gate = () => { const c=mk(34,30), p=new PX(c);
    p.box(0,4,34,26,PAL.metal2); p.r(1,5,32,1,PAL.metal); p.box(4,8,26,22,PAL.outline); p.r(5,9,11,21,PAL.metal); p.r(18,9,11,21,shade(PAL.metal,.9)); p.r(16,9,2,21,PAL.wood2);
    p.r(5,9,1,21,'rgba(255,255,255,.6)'); p.r(8,12,5,4,PAL.water); p.r(21,12,5,4,PAL.water); p.r(8,12,1,1,PAL.white); p.r(21,12,1,1,PAL.white);
    for (let y=20;y<30;y+=4){ hazard(p,5,y,11,2); hazard(p,18,y,11,2); }
    p.box(6,0,22,6,PAL.wall); p.r(7,2,20,2,'#2b3550'); for(let k=8;k<26;k+=3) p.r(k,2,2,2,(k/3)%2?PAL.leaf:PAL.water2); lamp(p,1,8,PAL.leaf); lamp(p,31,8,PAL.leaf);
    return c; };
  // 반응로 풀: 프레임마다 코어가 깜빡인다
  DECOR_KIND.pond.space_pond = frame => { const c=mk(60,32), p=new PX(c);
    p.ellO(30,16,29,14,PAL.metal2); p.ellO(30,15,25,11,PAL.metal); p.ellO(30,15,21,8,'#2b3550');
    p.ell(30,15,17,6,frame?PAL.water2:'#2f8fb0'); p.ell(30,15,11,4,frame?PAL.water:PAL.water2); p.ell(30,15,5,2,frame?PAL.white:PAL.water); p.ell(27,14,2,1,'rgba(255,255,255,.7)');
    for (const [x,y] of [[6,15],[54,15],[30,3],[30,27]]) { p.box(x-2,y-2,5,5,PAL.wall); lamp(p,x-1,y-1,frame?PAL.gold:PAL.roofPink); }
    return c; };
})();
