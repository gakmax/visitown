import { BUILD, CHIMNEY, DECOR_KIND, NO_LIGHT, PX, door, glass, iconMap, mk, roof, scallop, shade, shadow, timber, win } from '../map';
import { FIXED_COMMON, ICON_ROWS, PAL, THEMES, human } from '../palette';
// 농장 (farm)
(()=>{
  const SPOT='#4e3a2d', HAY='#e2bf62', HAY2='#c49c45', PUMP='#d9822b', DARK='#4a3528', BURLAP='#cdb48a';

  // ---- 캐릭터: 농부(밀짚모자)·소·돼지·닭·양·강아지
  // 고정 글자: k 밀짚 r 부리(뒷모습에선 몸색) R 빨강(볏·띠·목걸이, 뒷모습에도 남음) Y 뿔 K 얼룩 T 셔츠 n 농부 눈·장갑
  const FARMER = human('농부',
    ['....oooo....','...okkkko...','.ooRRRRRRoo.','okkkkkkkkkko','.oHSSSSSSHo.','.oHSnSSnSHo.','.oHSSSSSSHo.','..oSSSSSSo..'],
    ['....oooo....','...okkkko...','.ooRRRRRRoo.','okkkkkkkkkko','.oSSSSHHHHo.','.oSnSSHHHHo.','.oSSSSHHHHo.','..oSSSSSSo..'],
    { down:['..oTTooTTo..','.oTBBBBBBTo.','.oTBwBBwBTo.','.oTBBBBBBTo.','.onoBBBBono.','..obbbbbbo..','...ff..gg...'],
      side:['..oTTTTTTo..','.oBBTBBBBBo.','.oBBTBBBBBo.','.oBBBBBBBBo.','.onBBBBBBBo.','..obbbbbbo..','...ff..gg...'] });
  const SHAPES = [
    FARMER,
    { name:'소',
      down:['.oo......oo.','oYYo....oYYo','.ooYooooYoo.','.oBBBBBBKKo.','oBBBBBBBKKBo','oBBeBBBBeBBo','oKBeBBBBeBBo','oKKBBBBBBBBo','oBppppppppBo','oBpeppppepBo','.oBppppppBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'],
      side:['..oo....oo..','.oYYo..oYYo.','..ooYooYoo..','.oBBBBBBKKo.','oBBBBBBBKKBo','oBeBBBBBBBBo','oBeBBBBBBKBo','oBBBBBBBKKBo','oppppBBBBBBo','oopppBBBBBBo','.opppBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'] },
    { name:'돼지',
      down:['............','oooo....oooo','obbBo..oBbbo','.obBBooBBbo.','oBBBBBBBBBBo','oBBeBBBBeBBo','oBBeBBBBeBBo','oBBBppppBBBo','oBBpeppepBBo','oBBBppppBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'],
      side:['............','oooo....oooo','obbBo..oBbbo','.obBBooBBbo.','oBBBBBBBBBBo','oBeBBBBBBBBo','oBeBBBBBBBBo','opppBBBBBBBo','pepBBBBBBBBo','opppBBBBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'] },
    { name:'닭',
      down:['...o.oo.o...','..oRoRRoRo..','..oRRRRRRo..','..ooBBBBoo..','.oBBBBBBBBo.','.oBeBBBBeBo.','.oBBBrrBBBo.','oBBBBppBBBBo','ohBBBBBBBBho','oBbBBBBBBbBo','.obBBBBBBbo.','..obbbbbbo..','...ff..gg...'],
      side:['...o.oo.....','..oRoRRo....','..oRRRRo....','.ooBBBBoo...','.oBBBBBBo.o.','.oBeBBBBooBo','orrBBBBBBBBo','.opBBhhhBBBo','.oBBBhhhBBo.','.oBBBBBBBBo.','.obBBBBBbo..','..obbbbbo...','...ff..gg...'] },
    { name:'양',
      down:['............','..oo.oo.oo..','.oBhoBBoBBo.','oBhBBBBBBBBo','oBBewwwweBBo','oBewewweweBo','oBewwwwwweBo','oBewwppwweBo','oBBewwwweBBo','oBBBeeeeBBBo','oBhBBBBBBBBo','.oBBBBBBBBo.','.obBbBBbBbo.','..oooooooo..','...ff..gg...'],
      side:['............','..oo.oo.oo..','.oBhoBBoBBo.','oBhBBBBBBBBo','owwoBBBBBBBo','oewwoBBBBBBo','owwwoBBBBBBo','pwwwoBBBBBBo','owwoBBBBBBBo','oooBBBBBBBBo','oBhBBBBBBBBo','.oBBBBBBBBo.','.obBbBBbBbo.','..oooooooo..','...ff..gg...'] },
    { name:'강아지',
      down:['............','...oooooo...','.ooBhBBBBoo.','oHHoBBBBoHHo','oHHBBBBBBHHo','oHHBeBBeBHHo','oHHBeBBeBHHo','oHHBwwwwBHHo','.oHBweewBHo.','.ooBBwwBBoo.','.oRRRRRRRRo.','.obBBBBBBbo.','..oobbbboo..','...ff..gg...'],
      side:['............','...ooooo....','..oBhBBBoo..','.oBBBBBoHHo.','.oBBBBBoHHo.','.oBeBBBoHHo.','ooBeBBBBoHo.','ewwBBBBBBoo.','owwwBBBBBBo.','.owwBBBBBBo.','.oRRRRRRRRo.','.obBBBBBBbo.','..oobbbboo..','...ff..gg...'] },
  ];

  THEMES.farm = {
    name:'농장', order:8,
    palette:{ outline:'#3a2c22', grass:'#b9c98c', grass2:'#a8b97b', grass3:'#8ba264', dirt:'#d9c08f', dirt2:'#b99c6a', stone:'#ddd4be', stone2:'#b7ab91',
      water:'#9cc6cf', water2:'#6a9fb2', wall:'#f2e7cd', wall2:'#dccaa4', wood:'#b27c4c', wood2:'#7d5133',
      roofPink:'#b84a3a', roofBlue:'#7d97ab', roofGreen:'#8aa766', roofYellow:'#e0b85a', roofLilac:'#cf8556',
      white:'#fbf6ea', leaf:'#7aa957', pink:'#e3998b', red:'#c4483c', gold:'#e6b443', metal:'#bdb9ad', metal2:'#8c887c', skin:'#f2cba0' },
    characters:{ shapes:SHAPES, colors:[
      { name:'크림', B:'#efe4c8', b:'#cbbd98', h:'#fbf6e8' },{ name:'밀짚', B:'#e2c47c', b:'#bd9c52', h:'#f3dfa8' },{ name:'황토', B:'#cf9a62', b:'#a6733f', h:'#e8c191' },
      { name:'적갈', B:'#b0614a', b:'#86432f', h:'#cf8a72' },{ name:'청회', B:'#8399ac', b:'#5f7487', h:'#adbecd' },{ name:'흑갈', B:'#6f5644', b:'#4e3a2d', h:'#967b66' }],
      fixed:{ ...FIXED_COMMON, o:'#3a2c22', e:'#3a2c22', f:'#3a2c22', g:'#3a2c22', w:'#fbf6ea', p:'#e8a092', S:'#f2cba0', n:'#4a3426', H:'#7a5236', k:'#e6c46a', r:'#e39a3c', R:'#c4483c', Y:'#f1e5c4', K:SPOT, T:'#c25a48', L:'#7aa957' },
      up:{ S:'H', n:'H' } },
    kinds:{ plaza:['마을 장터','farm_plaza','fountain'], shop:['농산물 직판장','farm_shop','cart'], library:['마을 문고','farm_library','book'], community:['마을 회관','farm_community','heart'],
      home:['농가','farm_home','house'], checkout:['저울 계산대','farm_checkout','coin'], cafe:['우유 가판대','farm_cafe','mug'], school:['시골 분교','farm_school','bell'],
      clinic:['동물 병원','farm_clinic','cross'], post:['시골 우체국','farm_post','mail'], factory:['풍차 방앗간','farm_factory','gear'], park:['과수원','farm_park','flower'] },
    decor:{ tree:'farm_tree', gate:'farm_gate', pond:'farm_pond', ground:'grass' },
  };

  // ---- 헬퍼
  const gable=(p,x,y,w,h,col)=>roof(p,x,y,w,h,col,shade(col,.85));
  const planksV=(p,x,y,w,h,col,step=3)=>{ for(let k=x+step;k<x+w-1;k+=step) p.r(k,y+1,1,h-2,col); };
  const planksH=(p,x,y,w,h,col,step=3)=>{ for(let k=y+step;k<y+h-1;k+=step) p.r(x+1,k,w-2,1,col); };
  const hi='rgba(255,255,255,.4)';
  // 묶은 자루(위가 오므라지고 곡식이 살짝 보임)
  function sack(p,cx,y,col,grain){ p.ellO(cx,y+8,5,4,col); p.r(cx+2,y+6,3,5,shade(col,.88)); p.r(cx-3,y+6,1,3,'rgba(255,255,255,.4)'); p.box(cx-2,y+2,5,4,col); p.r(cx-3,y,7,3,col); p.o(cx-3,y,7,3); p.r(cx-2,y+1,5,1,grain); p.r(cx-2,y+3,5,1,PAL.wood2); }
  // 세로 줄무늬 천막 지붕(박공): 위가 좁은 사다리꼴
  function tent(p,x,y,w,h,c1,c2){ for(let i=0;i<h;i++){ const ins=h-1-i; for(let k=x+ins;k<x+w-ins;k++) p.r(k,y+i,1,1,Math.floor((k-x)/4)%2?c1:c2); p.r(x+ins,y+i,1,1,PAL.outline); p.r(x+w-1-ins,y+i,1,1,PAL.outline); }
    p.r(x+h-1,y,w-2*(h-1),1,PAL.outline); p.r(x,y+h-1,w,1,PAL.outline); }
  // 사과·호박 같은 열매 상자
  function crate(p,x,y,w,h,fruit){ p.box(x,y,w,h,PAL.wood); p.r(x+1,y+Math.floor(h/2),w-2,1,PAL.wood2); p.r(x+1,y+1,w-2,1,hi);
    for(let k=x+1;k<x+w-2;k+=3){ p.r(k,y-2,3,2,fruit); p.r(k,y-2,1,1,'rgba(255,255,255,.5)'); } p.r(x,y-2,1,2,PAL.outline); p.r(x+w-1,y-2,1,2,PAL.outline); }
  function hay(p,x,y,w,h){ p.box(x,y,w,h,HAY); for(let k=x+2;k<x+w-1;k+=3) p.r(k,y+1,1,h-2,HAY2); p.r(x+1,y+Math.floor(h/2),w-2,1,PAL.wood2); p.r(x+1,y+1,w-2,1,'rgba(255,255,255,.35)'); }
  function appleTree(p,cx,cy,r,trunkH){ p.box(cx-2,cy+r-3,5,trunkH,PAL.wood2); p.ellO(cx,cy,r,r-1,PAL.leaf); p.ell(cx+1,cy+2,r-2,r-4,shade(PAL.leaf,.88)); p.ell(cx-Math.round(r/3),cy-Math.round(r/3),Math.max(1,Math.round(r/3)),Math.max(1,Math.round(r/4)),'#a6cf86');
    const ap=[[-4,1],[3,-3],[4,3],[-1,4],[-5,-3],[1,0]]; for(const [dx,dy] of ap){ if (Math.abs(dx)>r-2||Math.abs(dy)>r-3) continue; p.r(cx+dx,cy+dy,2,2,PAL.red); p.r(cx+dx,cy+dy,1,1,'#ef9a86'); } }

  Object.assign(BUILD, {
    // 마을 장터: 줄무늬 천막 지붕을 얹은 우물 + 건초더미 + 사과 상자
    farm_plaza(){ const c=mk(64,46), p=new PX(c); shadow(p,32,43,31,4);
      hay(p,3,34,14,9); hay(p,5,27,11,8);
      crate(p,47,35,14,8,PAL.red); p.ellO(56,42,4,3,PUMP); p.r(56,38,1,2,PAL.leaf);
      p.box(21,10,3,24,PAL.wood); p.box(40,10,3,24,PAL.wood); p.r(22,11,1,22,hi);
      p.r(20,30,24,10,PAL.stone); p.r(39,30,5,10,PAL.stone2); for(let y=33;y<40;y+=3) for(let x=21;x<43;x+=6) p.r(x+((y/3)%2?3:0),y,4,1,PAL.stone2); p.o(20,30,24,10);
      p.ellO(32,30,13,4,PAL.stone); p.ellO(32,30,10,2,'#2f3a3a'); p.r(28,30,6,1,PAL.water2);
      p.r(23,14,18,2,PAL.wood2); p.o(23,14,18,2); p.r(32,16,1,7,PAL.outline); p.box(29,22,7,5,PAL.wood); p.r(30,23,5,1,PAL.metal);
      tent(p,11,4,42,10,PAL.roofPink,PAL.white); for(let k=12;k<52;k+=4){ p.r(k,14,3,1,(k/4)%2?PAL.white:PAL.roofPink); p.r(k+1,15,1,1,(k/4)%2?PAL.white:PAL.roofPink); } p.r(32,0,1,5,PAL.outline); p.r(33,0,4,2,PAL.gold); p.r(33,2,2,1,PAL.gold); return c; },
    // 농산물 직판장: 초록 지붕 창고 + 줄무늬 차양 + 채소 상자
    farm_shop(){ const c=mk(76,62), p=new PX(c); shadow(p,38,58,37,5);
      p.r(6,18,64,40,PAL.wood); planksV(p,6,18,64,40,PAL.wood2,4); p.r(64,18,6,40,PAL.wood2); p.o(6,18,64,40);
      gable(p,1,4,74,15,PAL.roofGreen);
      p.r(10,30,56,14,DARK); p.r(10,36,56,1,PAL.wood2); for(let x=12;x<64;x+=4){ p.r(x,33,2,3,[PAL.red,PUMP,PAL.leaf,PAL.gold][(x/4)%4]); p.r(x,39,2,3,[PAL.leaf,PAL.red,PAL.gold,PUMP][(x/4)%4]); }
      scallop(p,5,22,66,PAL.roofGreen,PAL.white);
      crate(p,8,46,18,10,PAL.red); crate(p,29,46,18,10,PUMP); crate(p,50,46,18,10,PAL.leaf);
      p.box(28,0,20,9,PAL.wall); p.r(29,1,18,1,PAL.white); for(const [x,col] of ([[32,PAL.red],[38,PUMP],[44,PAL.leaf]] as any[])){ p.ellO(x,5,2,2,col); p.r(x,2,1,1,PAL.leaf); p.r(x-1,4,1,1,'rgba(255,255,255,.6)'); } return c; },
    // 마을 문고: 가파른 갈색 지붕, 둥근 다락창, 책 간판
    farm_library(){ const c=mk(60,70), p=new PX(c); shadow(p,30,66,29,4);
      p.r(8,30,44,36,PAL.wall); p.r(46,30,6,36,PAL.wall2); p.o(8,30,44,36); p.r(9,56,42,9,PAL.stone2); for(let x=10;x<50;x+=5) p.r(x+((x/5)%2?2:0),60,3,1,PAL.stone); p.r(9,56,42,1,PAL.outline);
      gable(p,2,4,56,27,PAL.wood2); p.ellO(30,20,5,5,PAL.water); p.r(30,16,1,9,PAL.white); p.r(26,20,9,1,PAL.white);
      for(const x of [11,41]){ p.box(x,37,8,12,DARK); for(let k=0;k<6;k++) p.r(x+1+k,38+(k%2),1,10-(k%2),[PAL.red,PAL.roofBlue,PAL.gold,PAL.leaf,PAL.white,PAL.roofLilac][k]); p.r(x-1,49,10,1,PAL.wood2); }
      p.box(21,33,18,14,PAL.white); p.sprite(ICON_ROWS.book,iconMap(),24,34);
      door(p,25,50,10,16); p.r(23,65,14,1,PAL.stone2); return c; },
    // 마을 회관: 초가 지붕 긴 회관, 깃발 장식
    farm_community(){ const c=mk(78,60), p=new PX(c); shadow(p,39,56,38,5);
      p.r(6,26,66,30,PAL.wall); p.r(66,26,6,30,PAL.wall2); p.o(6,26,66,30); timber(p,7,27,64,28);
      gable(p,0,4,78,24,PAL.roofYellow); for(let i=0;i<40;i++){ const y=8+(i*7)%18, x=12+(i*13)%54; p.r(x,y,1,3,HAY2); }
      for(let k=1;k<77;k+=3) p.r(k,27,2,1+(k%2),HAY2); p.r(1,27,76,1,PAL.outline);
      p.r(7,29,64,1,PAL.wood2); for(let k=0;k<10;k++){ const x=10+k*6, col=[PAL.red,PAL.white,PAL.roofGreen][k%3]; p.r(x,30,5,1,col); p.r(x+1,31,3,1,col); p.r(x+2,32,1,1,col); }
      p.box(30,36,18,20,PAL.wood); p.r(39,37,1,18,PAL.wood2); p.r(36,46,1,1,PAL.gold); p.r(42,46,1,1,PAL.gold); p.r(28,34,22,2,PAL.wood2); p.o(28,34,22,2);
      for(const x of [11,20,51,60]) win(p,x,38,7,7); p.r(11,50,16,4,PAL.leaf); p.r(51,50,16,4,PAL.leaf); p.r(13,49,2,2,PAL.pink); p.r(22,49,2,2,PAL.gold); p.r(55,49,2,2,PAL.pink); p.r(62,49,2,2,PAL.white); return c; },
    // 농가: 빨간 박공(gambrel) 헛간집 + 사일로
    farm_home(){ const c=mk(78,66), p=new PX(c); shadow(p,40,62,38,5);
      p.box(60,4,6,12,PAL.stone2); p.r(59,3,8,2,PAL.stone); p.o(59,3,8,2);
      const cx=49, hw=y=> y<18 ? 3+Math.round((y-8)*1.8) : 21+Math.round((y-18)*0.5);
      let prev=null; for(let y=8;y<=30;y++){ const w=hw(y); p.r(cx-w,y,2*w+1,1,PAL.roofPink); if(y%3===0) for(let k=cx-w+2;k<cx+w-1;k+=4) p.r(k+(y%2?0:2),y,2,1,shade(PAL.roofPink,.85)); const a=prev===null?w:Math.min(prev,w), b2=prev===null?w:Math.max(prev,w); p.r(cx-b2,y,b2-a+1,1,PAL.outline); p.r(cx+a,y,b2-a+1,1,PAL.outline); prev=w; }
      p.r(cx-3,8,7,1,PAL.outline); p.r(cx-2,9,5,1,'rgba(255,255,255,.45)'); p.r(cx-21,18,43,1,PAL.white); p.r(cx-21,30,43,1,PAL.white);
      const red=shade(PAL.roofPink,.88); p.r(25,31,49,31,red); planksV(p,25,31,49,31,shade(PAL.roofPink,.72),3); p.r(68,31,6,31,shade(PAL.roofPink,.72)); p.o(25,31,49,31); p.r(25,30,49,1,PAL.outline);
      p.box(43,20,12,10,PAL.white); p.r(44,21,10,8,HAY); p.r(45,24,8,1,HAY2);
      p.box(38,42,22,20,PAL.white); p.r(40,44,18,16,red); for(let i=0;i<16;i++){ p.r(40+Math.round(i*17/15),44+i,1,1,PAL.white); p.r(57-Math.round(i*17/15),44+i,1,1,PAL.white); } p.r(48,43,2,18,PAL.white); p.o(38,42,22,20);
      win(p,28,40,7,7); p.r(27,48,9,3,PAL.wood); p.o(27,48,9,3); p.r(28,46,2,2,PAL.gold); p.r(32,46,2,2,PAL.pink); win(p,63,40,7,7);
      p.r(4,14,16,48,PAL.stone); p.r(16,14,4,48,PAL.stone2); for(let y=20;y<60;y+=7) p.r(5,y,15,1,PAL.stone2); p.o(4,14,16,48); p.r(6,15,2,46,'rgba(255,255,255,.45)');
      p.ellO(12,14,8,7,PAL.metal); p.ell(10,11,3,2,PAL.white); p.r(11,6,2,2,PAL.metal2); p.r(4,14,16,1,PAL.outline); return c; },
    // 저울 계산대: 지붕 아래 접시저울 + 곡식 자루 + 동전
    farm_checkout(){ const c=mk(64,54), p=new PX(c); shadow(p,32,51,31,4);
      p.r(6,12,3,26,PAL.wood2); p.r(55,12,3,26,PAL.wood2); gable(p,1,1,62,12,PAL.roofLilac);
      p.r(32,13,1,3,PAL.outline); p.ellO(32,20,5,5,PAL.white); p.r(32,17,1,3,PAL.red); for(const [x,y] of [[29,18],[35,18],[28,21],[36,21]]) p.r(x,y,1,1,PAL.metal2); p.r(31,25,3,3,PAL.metal2);
      p.r(26,28,1,4,PAL.metal2); p.r(38,28,1,4,PAL.metal2); p.r(26,27,13,1,PAL.metal2); p.r(25,32,15,2,PAL.metal); p.o(25,32,15,2); p.r(27,30,3,2,PAL.red); p.r(30,30,3,2,PAL.leaf); p.r(33,30,3,2,PAL.red);
      sack(p,14,23,BURLAP,HAY); sack(p,50,23,BURLAP,PAL.white);
      p.box(4,37,56,14,PAL.wood); planksH(p,4,37,56,14,PAL.wood2,4); p.r(3,35,58,3,PAL.wood2); p.o(3,35,58,3); p.box(24,38,16,12,PAL.wall); p.sprite(ICON_ROWS.coin,iconMap(),26,39); return c; },
    // 우유 가판대: 젖소 무늬 매대 + 지붕 위 큰 우유병
    farm_cafe(){ const c=mk(54,60), p=new PX(c); shadow(p,27,57,26,4);
      p.r(5,30,44,26,PAL.white); p.r(43,30,6,26,PAL.stone); p.o(5,30,44,26);
      for(const [x,y,w,h] of [[7,46,6,4],[16,51,5,3],[30,47,7,4],[40,52,4,3],[25,52,3,2],[44,44,3,4]]) p.r(x,y,w,h,SPOT);
      p.r(9,33,36,10,DARK); p.r(9,39,36,1,PAL.wood2); for(let x=11;x<43;x+=4){ p.r(x,35,2,4,PAL.white); p.r(x,35,2,1,PAL.roofBlue); } p.r(8,43,38,3,PAL.wood); p.o(8,43,38,3);
      scallop(p,4,25,46,PAL.roofBlue,PAL.white); p.r(3,22,48,4,PAL.roofBlue); p.o(3,22,48,4); p.r(4,23,46,1,hi);
      p.box(18,7,18,16,PAL.white); p.r(19,6,16,2,PAL.white); p.o(19,5,16,2); p.r(19,7,16,1,PAL.white); p.box(23,2,8,5,PAL.white); p.box(22,0,10,3,PAL.roofBlue);
      p.r(19,12,16,6,PAL.roofBlue); p.r(19,12,16,1,PAL.outline); p.r(19,17,16,1,PAL.outline); p.r(24,14,2,2,PAL.white); p.r(28,14,2,2,PAL.white); p.r(25,13,4,1,PAL.white);
      p.r(20,8,2,4,'rgba(170,200,220,.5)'); p.r(33,8,2,14,PAL.stone); p.o(18,7,18,16); return c; },
    // 시골 분교: 초록 지붕, 종탑, 판자벽
    farm_school(){ const c=mk(64,60), p=new PX(c); shadow(p,32,57,31,4);
      p.box(26,4,12,14,PAL.wall); p.r(28,8,8,8,DARK); p.ellO(32,12,3,3,PAL.gold); p.r(31,15,2,1,PAL.gold); p.r(32,7,1,2,PAL.outline);
      for(let i=0;i<7;i++){ p.r(32-i-1,-1+i+1,2*i+3,1,PAL.roofGreen); p.r(32-i-1,i,1,1,PAL.outline); p.r(32+i+1,i,1,1,PAL.outline); } p.r(24,6,17,2,PAL.roofGreen); p.o(24,6,17,2);
      p.r(6,26,52,30,PAL.wall); planksH(p,6,26,52,30,PAL.wall2,3); p.r(52,26,6,30,PAL.wall2); p.o(6,26,52,30);
      gable(p,2,14,60,13,PAL.roofGreen);
      for(const x of [10,19,38,47]) win(p,x,32,7,8); door(p,27,40,10,16); p.r(25,38,14,2,PAL.wood2); p.o(25,38,14,2); p.r(25,56,14,2,PAL.stone2); p.o(25,56,14,2);
      p.r(9,46,10,8,PAL.outline); p.r(10,47,8,6,'#4f6b55'); p.r(11,49,4,1,PAL.white); p.r(11,51,6,1,PAL.white); return c; },
    // 동물 병원: 흰 벽 + 주황 지붕 + 십자 간판 + 발자국 팻말
    farm_clinic(){ const c=mk(60,56), p=new PX(c); shadow(p,30,53,29,4);
      p.r(8,24,46,28,PAL.white); p.r(48,24,6,28,PAL.stone); p.o(8,24,46,28); gable(p,4,12,54,13,PAL.roofLilac);
      p.box(23,0,16,15,PAL.white); p.r(30,2,3,11,PAL.red); p.r(26,6,11,3,PAL.red);
      win(p,12,29,8,8); win(p,42,29,8,8); glass(p,24,34,13,18); p.r(30,34,1,18,PAL.stone2); p.r(22,31,17,3,PAL.roofLilac); p.o(22,31,17,3);
      p.r(6,44,2,10,PAL.wood2); p.box(1,34,13,11,PAL.wall); p.r(5,39,5,4,SPOT); p.r(4,37,2,2,SPOT); p.r(7,36,2,2,SPOT); p.r(10,37,2,2,SPOT);
      p.r(42,44,9,7,PAL.leaf); p.r(44,42,2,2,PAL.pink); p.r(48,43,2,2,PAL.white); p.r(42,51,9,1,PAL.wood2); return c; },
    // 시골 우체국: 파란 지붕 통나무집 + 빨간 시골 우편함
    farm_post(){ const c=mk(60,56), p=new PX(c); shadow(p,30,53,29,4);
      p.r(5,22,40,30,PAL.wood); planksH(p,5,22,40,30,PAL.wood2,4); p.r(40,22,5,30,PAL.wood2); p.o(5,22,40,30);
      gable(p,1,8,48,15,PAL.roofBlue); p.box(15,24,20,11,PAL.white); p.sprite(ICON_ROWS.mail,iconMap(),19,23);
      win(p,9,38,8,7); door(p,25,38,10,14);
      p.r(51,38,2,15,PAL.wood2); p.r(44,30,14,8,PAL.red); p.r(45,29,12,1,PAL.red); p.o(44,30,14,8); p.r(45,28,12,1,PAL.outline); p.r(44,29,1,1,PAL.outline); p.r(57,29,1,1,PAL.outline);
      p.r(45,31,1,6,shade(PAL.red,.75)); p.r(46,31,10,1,'rgba(255,255,255,.4)'); p.r(58,24,1,10,PAL.outline); p.r(56,24,2,3,PAL.gold); p.o(55,24,3,4); return c; },
    // 풍차 방앗간: 흰 탑 + 빨간 모자 + X자 날개 + 밀가루 자루
    farm_factory(){ const c=mk(60,60), p=new PX(c); shadow(p,30,57,24,4);
      for(let y=18;y<56;y++){ const hw=7+Math.round((y-18)*0.2); p.r(30-hw,y,2*hw+1,1,PAL.wall); p.r(30+hw-3,y,3,1,PAL.wall2); p.r(30-hw,y,1,1,PAL.outline); p.r(30+hw,y,1,1,PAL.outline); }
      p.r(22,55,17,1,PAL.outline); p.r(22,36,17,1,PAL.wall2); door(p,26,43,8,12); p.box(28,26,5,6,PAL.water);
      p.r(21,17,19,2,PAL.wood2); p.o(21,17,19,2); for(let i=0;i<8;i++){ p.r(30-i-1,9+i,2*i+3,1,PAL.roofPink); p.r(30-i-1,9+i,1,1,PAL.outline); p.r(30+i+1,9+i,1,1,PAL.outline); } p.r(29,8,3,1,PAL.outline);
      const cx=30, cy=17;
      for(let y=0;y<44;y++) for(let x=4;x<57;x++){ const X=x-cx, Y=y-cy; for(const [dx,dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]){ const u=(X*dx+Y*dy)/Math.SQRT2, v=(-X*dy+Y*dx)/Math.SQRT2;
        if (u<2||u>26) continue; if (Math.abs(v)<0.75) p.r(x,y,1,1,PAL.wood2); else if (u>=7&&v>0&&v<4.6){ const edge=v>3.8||u>25.3||u<7.7; p.r(x,y,1,1,edge?PAL.outline:(Math.round(u)%4===0?PAL.wood:PAL.white)); } } }
      p.ellO(cx,cy,2,2,PAL.wood); sack(p,9,45,PAL.white,PAL.wall2); sack(p,51,45,PAL.white,PAL.wall2); return c; },
    // 과수원: 울타리 안 사과나무 세 그루 + 사과 바구니
    farm_park(){ const c=mk(66,50), p=new PX(c); p.ellO(33,40,32,9,PAL.grass2,PAL.grass3);
      appleTree(p,14,20,10,14); appleTree(p,52,20,10,14); appleTree(p,33,14,11,20);
      p.r(2,38,62,1,PAL.wood2); p.r(2,42,62,1,PAL.wood2); for(let k=2;k<64;k+=6){ p.r(k,36,2,10,PAL.wood); p.r(k,35,2,1,PAL.outline); }
      p.box(27,40,13,7,PAL.wood); p.r(28,42,11,1,PAL.wood2); p.r(28,44,11,1,PAL.wood2); for(let x=28;x<39;x+=3){ p.r(x,38,3,2,PAL.red); p.r(x,38,1,1,'#ef9a86'); } p.o(26,37,15,1); return c; },
  });
  CHIMNEY.farm_home=63;
  for (const k of ['farm_plaza','farm_checkout','farm_park']) NO_LIGHT.add(k);

  // ---- 장식: 사과나무, 농장 나무 문, 오리 연못
  DECOR_KIND.tree.farm_tree = size => { const r=size?10:8, c=mk(2*r+3,2*r+12), p=new PX(c), cx=r+1; const trunk=mk(c.width,c.height), tp=new PX(trunk);
    tp.box(cx-2,2*r-2,5,12,PAL.wood2); tp.r(cx-1,2*r-1,1,10,'rgba(255,255,255,.25)');
    p.ellO(cx,r+1,r,r-1,PAL.leaf); p.ell(cx+1,r+3,r-2,r-4,shade(PAL.leaf,.88)); p.ell(cx-Math.round(r/3),r-2,Math.round(r/2.5),Math.round(r/4),'#a6cf86');
    for (const [dx,dy] of (size?[[-5,2],[3,-3],[5,3],[-1,5],[-6,-2]]:[[-4,2],[3,-2],[2,4],[-3,-3]])) { p.r(cx+dx,r+1+dy,2,2,PAL.red); p.r(cx+dx,r+1+dy,1,1,'#ef9a86'); }
    return { canopy:c, trunk, ax:cx, ay:c.height, sway:1 }; };
  DECOR_KIND.gate.farm_gate = () => { const c=mk(34,30), p=new PX(c);
    for (const x of [1,28]){ for(let k=0;k<5;k++) p.r(x+k,(k%2)?0:1,1,3,k%2?HAY:HAY2); p.box(x,4,5,26,PAL.wood); p.r(x+1,5,1,24,'rgba(255,255,255,.3)'); p.r(x+3,5,1,24,PAL.wood2); p.r(x,3,5,1,PAL.outline); }
    p.box(0,3,34,5,PAL.wood2); p.r(1,4,32,1,'rgba(255,255,255,.25)'); p.r(0,3,2,5,PAL.wood); p.o(0,3,2,5); p.r(32,3,2,5,PAL.wood); p.o(32,3,2,5);
    p.r(11,8,1,2,PAL.outline); p.r(22,8,1,2,PAL.outline); p.box(8,10,18,9,PAL.wall); p.r(9,11,16,1,PAL.white);
    p.r(13,15,8,3,PAL.roofPink); for(let i=0;i<3;i++) p.r(17-i-1,12+i,2*i+2,1,PAL.roofPink); p.r(16,16,2,2,PAL.white); p.r(10,16,2,2,HAY); p.r(22,16,2,2,HAY);
    p.r(6,14,22,1,PAL.wood2); p.r(6,20,22,1,PAL.wood2); return c; };
  DECOR_KIND.pond.farm_pond = frame => { const c=mk(60,32), p=new PX(c);
    p.ellO(30,16,29,14,PAL.grass3); p.ellO(30,15,26,11,PAL.water); p.ell(30,14,22,8,shade(PAL.water,1.07));
    for (const [x,y,w] of (frame?[[16,11,5],[40,19,4]]:[[18,12,4],[38,18,5]])) { p.r(x,y,w,1,PAL.white); }
    p.ell(46,10,3,2,PAL.leaf); p.r(46,9,1,1,PAL.pink);
    const dx=frame?1:0, X=22+dx, Y=16; p.r(X-1,Y+4,10,1,'rgba(255,255,255,.5)'); p.ellO(X+4,Y+2,5,2,PAL.white); p.r(X+7,Y-1,3,1,PAL.white); p.box(X,Y-3,4,4,PAL.white); p.o(X,Y-3,4,4); p.r(X+1,Y-2,2,2,PAL.white); p.r(X+1,Y-2,1,1,PAL.outline); p.r(X-2,Y-1,2,1,PAL.gold); p.r(X+3,Y+1,3,1,PAL.metal);
    for (const x of [6,9,52,55]) { p.r(x,9,1,10,PAL.leaf); p.r(x,7,1,3,PAL.wood2); }
    return c; };
})();
