import { BUILD, CHIMNEY, DECOR_KIND, NO_LIGHT, PX, door, mk, roof, shade, shadow, win } from '../map';
import { DIGIT_ROWS, FIXED_COMMON, PAL, THEMES, human } from '../palette';
import { L } from '@visitown/i18n';
// 서부 개척 마을
(()=>{
  // ---- 작은 글자(3×5). DIGIT_ROWS에 없는 글자만 보탠다
  const FONT = { ...DIGIT_ROWS,
    S:['111','100','111','001','111'], W:['10001','10001','10101','10101','01010'], M:['10001','11011','10101','10001','10001'], N:['1001','1101','1011','1001','1001'], H:['101','101','111','101','101'], K:['101','110','100','110','101'],
    Y:['101','101','010','010','010'], U:['101','101','101','101','111'], F:['111','100','110','100','100'] };
  const word = (p,s,x,y,col) => { for (const ch of s){ const rows=FONT[ch]; if (rows) for (let j=0;j<5;j++) for (let i=0;i<rows[j].length;i++) if (rows[j][i]==='1') p.r(x+i,y+j,1,1,col); x+=(rows?rows[0].length:3)+1; } };
  const wordW = s => [...s].reduce((a,ch)=>a+(FONT[ch]?FONT[ch][0].length:3)+1,0)-1;
  const line = (p,x0,y0,x1,y1,col) => { const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0)); for (let i=0;i<=n;i++) p.r(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),1,1,col); };
  // 판자벽: 가로 판자 줄 + 오른쪽 면 어둡게 + 외곽선
  const planks = (p,x,y,w,h,col,step=4) => { p.r(x,y,w,h,col); for (let k=y+step;k<y+h-1;k+=step) p.r(x,k,w,1,shade(col,.86)); p.r(x+w-5,y,5,h,shade(col,.84)); for (let k=y+step;k<y+h-1;k+=step) p.r(x+w-5,k,5,1,shade(col,.72)); p.o(x,y,w,h); };
  const hl = (p,x,y,w,h) => p.r(x,y,w,h,'rgba(255,255,255,.35)');
  // 바퀴: 테두리·바퀴살·축
  const wheel = (p,cx,cy,r,rim,hub) => { p.ellO(cx,cy,r,r,rim); p.ell(cx,cy,r-2,r-2,shade(rim,.6)); for (const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]) line(p,cx-dx*(r-2),cy-dy*(r-2),cx+dx*(r-2),cy+dy*(r-2),rim); p.box(cx-1,cy-1,3,3,hub); };
  const barrel = (p,x,y,w=7,h=9) => { p.box(x,y,w,h,PAL.wood); p.r(x+1,y+2,w-2,1,PAL.metal2); p.r(x+1,y+h-3,w-2,1,PAL.metal2); p.r(x+w-2,y+1,1,h-2,PAL.wood2); hl(p,x+1,y+1,1,h-2); };
  const crate = (p,x,y,w=8,h=7) => { p.box(x,y,w,h,PAL.wood); line(p,x+1,y+1,x+w-2,y+h-2,PAL.wood2); line(p,x+w-2,y+1,x+1,y+h-2,PAL.wood2); p.o(x,y,w,h); };
  const dark = '#3a2622';

  THEMES.west = {
    name:L("서부"), order:5,
    palette:{ outline:'#3a2a24', grass:'#dcc287', grass2:'#cfb276', grass3:'#a99a52', dirt:'#c99467', dirt2:'#a6764d', stone:'#e3c9a0', stone2:'#c3a27a',
      water:'#8fc6d8', water2:'#5b9cba', wall:'#ecdcbc', wall2:'#d4bf98', wood:'#ab7a4c', wood2:'#7a5034',
      roofPink:'#b9573b', roofBlue:'#6886a0', roofGreen:'#7f975c', roofYellow:'#dca94a', roofLilac:'#977a96',
      white:'#fff7e6', leaf:'#6f9a4c', pink:'#e8957c', red:'#bf4336', gold:'#efbc45', metal:'#bcb6a8', metal2:'#857f74', skin:'#f2c9a0' },
    characters:{ shapes:[], colors:[
      { name:L("적갈"), B:'#b8603e', b:'#88422a', h:'#dc8c66' },{ name:L("청바지"), B:'#5d7fae', b:'#425d84', h:'#8ea9cf' },{ name:L("모래"), B:'#d9b273', b:'#ad874e', h:'#f0d5a0' },
      { name:L("세이지"), B:'#809c66', b:'#5d7549', h:'#abc391' },{ name:L("자두"), B:'#8f5070', b:'#673750', h:'#b87e9a' },{ name:L("먹색"), B:'#5e504a', b:'#3f3430', h:'#8a7a72' }],
      fixed:{ ...FIXED_COMMON, o:'#3a2a24', e:'#3a2a24', f:'#3a2a24', g:'#3a2a24', w:'#fff7e6', S:'#f2c9a0', n:'#f2c9a0', p:'#e8957c', H:'#6a4228', k:'#8a5a34', r:'#efbc45', L:'#6aa04e', W:'#fff7e6', Q:'#a8a296' },
      up:{ S:'H', e:'H', p:'H', w:'B', n:'B', r:'k' } },
    kinds:{ plaza:[L("급수탑 광장"),'west_plaza','fountain'], shop:[L("잡화점"),'west_shop','cart'], library:[L("신문사"),'west_library','book'], community:[L("살룬"),'west_community','mug'],
      home:[L("통나무집"),'west_home','house'], checkout:[L("은행"),'west_checkout','coin'], cafe:[L("커피 마차"),'west_cafe','coffee'], school:[L("단칸 교실"),'west_school','bell'],
      clinic:[L("의사 진료소"),'west_clinic','cross'], post:[L("역마차 정류장"),'west_post','mail'], factory:[L("광산 입구"),'west_factory','gear'], park:[L("목장 울타리"),'west_park','flower'] },
    decor:{ tree:'west_tree', gate:'west_gate', pond:'west_pond', ground:'grass' },
  };

  // ---- 캐릭터 6종 (머리 8줄 + 몸 7줄 = 15줄)
  const BODY_BELT = { down:['..oBBooBBo..','.oBBBwwBBBo.','.oBBBwwBBBo.','.okkkrrkkko.','.onoBBBBono.','..obbbbbbo..','...ff..gg...'],
                      side:['..oBBBBBBo..','.oBBwBBBBBo.','.oBBwBBBBBo.','.orkkkkkkko.','.onBBBBBBBo.','..obbbbbbo..','...ff..gg...'] };
  const BODY_VEST = { down:['..oBBooBBo..','.okkBwwBkko.','.okkBwwBrko.','.okkBBBrrro.','.onoBBBBono.','..obbbbbbo..','...ff..gg...'],
                      side:['..oBBBBBBo..','.oBrwBBBkko.','.orrrBBBkko.','.oBrBBBBkko.','.onBBBBBBBo.','..obbbbbbo..','...ff..gg...'] };
  const BODY_DRESS = { down:['..oBBooBBo..','.oBBwwwwBBo.','.oBBwwwwBBo.','.oBBwwwwBBo.','.onBwwwwBno.','.obbbbbbbbo.','...ff..gg...'],
                       side:['..oBBBBBBo..','.oBwwBBBBBo.','.oBwwBBBBBo.','.oBwwBBBBBo.','.onwwBBBBBo.','.obbbbbbbbo.','...ff..gg...'] };
  const BODY_MINER = { down:['..oBBooBBo..','.oBkBwwBkBo.','.oBkBwwBkBo.','.oBkBBBBkBo.','.onoBBBBono.','..obbbbbbo..','...ff..gg...'],
                       side:['..oBBBBBBo..','.oBBwBBkBBo.','.oBBwBBkBBo.','.oBBBBBkBBo.','.onBBBBBBBo.','..obbbbbbo..','...ff..gg...'] };
  const SHAPES = [
    human(L("카우보이"), ['....oooo....','...oBhBBo...','..obbbbbbo..','oooBBBBBBooo','oBBBBBBBBBBo','.oHSSSSSSHo.','.oSeSSSSeSo.','..opSSSSpo..'],
                     ['....oooo....','...oBhBBo...','..obbbbbbo..','oooBBBBBBooo','oBBBBBBBBBBo','.oSSSHHHHHo.','.oSeSSHHHHo.','..opSSHHHo..'], BODY_BELT),
    human(L("보안관"), ['...oooooo...','...oWWWWo...','...oWrWWo...','ooooWWWWoooo','oWWWWWWWWWWo','.oSeSSSSeSo.','.oSHHHHHHSo.','..oSSSSSSo..'],
                   ['...oooooo...','...oWWWWo...','...oWrWWo...','ooooWWWWoooo','oWWWWWWWWWWo','.oSeSSHHHHo.','.oHHHSHHHHo.','..oSSSSSSo..'], BODY_VEST),
    human(L("광부"), ['....oooo....','...orwrQo...','..oQQQQQQo..','.oQQQQQQQQo.','.oHSSSSSSHo.','.oSeSSSSeSo.','.oSHHHHHHSo.','..oHHHHHHo..'],
                 ['....oooo....','..orrQQQo...','..oQQQQQQo..','.oQQQQQQQQo.','.oSSSHHHHHo.','.oSeSSHHHHo.','.oHHHHHHHHo.','..oHHHHHHo..'], BODY_MINER),
    human(L("정착민"), ['...oooooo...','..ohhhhhho..','.ohhhhhhhho.','.ohbHHHHbho.','.ohSeSSeSho.','.ohpSSSSpho.','.ohhSSSShho.','..oobwwboo..'],
                   ['...oooooo...','..ohhhhhho..','.ohhhhhhhho.','.obSSHhhhho.','.obeSShhhho.','.obpSShhhho.','.ohSSShhhho.','..oowwboo...'], BODY_DRESS),
    { name:L("말"), down:['..oo....oo..','..oBo..oBo..','..oBBHHBBo..','..oBHHHHBo..','.oBBBHHBBBo.','.oBeBBBBeBo.','..oBBwwBBo..','..okkkkkko..','..oBBwwBBo..','..oSSSSSSo..','..oSeSSeSo..','...oSSSSo...','.oBBooooBBo.','oBBBBBBBBBBo','.obbbbbbbbo.','...ff..gg...'],
              side:['....oo......','...oBo......','..oBBBoo....','.oBBBBHHo...','.oBeBBBHHo..','oBBBBBBBHo..','oSSSBBBBHo..','oSeSoBBBBHo.','oSSSooBBBHo.','.ooo.oBBBBo.','.....oBBBBo.','..ooBBBBBBoo','.oBBBBBBBBBo','.obbBBBBbbbo','..oobbbboo..','...ff..gg...'] },
    { name:L("선인장"), down:['.....oo.....','....oBBo....','...oBrrBo...','...ooBBoo...','..oLLLLLLo..','o.oLLLLLLo.o','oLoLeLLeLoLo','oLoLpLLpLoLo','oLLLLoLLLLLo','.ooLLLLLLoo.','..oLLoLLLo..','.oBBBBBBBBo.','..oBhBBBBo..','..obbbbbbo..','...ff..gg...'],
                 side:['.....oo.....','....oBBo....','...oBrrBo...','...ooBBoo...','..oLLLLLLo..','o.oLLLLLLo.o','oLoeLLLLLoLo','oLopLLLLLoLo','oLLLLLoLLLLo','.ooLLLLLLoo.','..oLLLoLLo..','.oBBBBBBBBo.','..oBhBBBBo..','..obbbbbbo..','...ff..gg...'] },
  ];
  THEMES.west.characters.shapes = SHAPES;

  Object.assign(BUILD, {
    // 급수탑 광장: 기둥 위 물탱크 + 물받이
    west_plaza(){ const c=mk(56,64), p=new PX(c); shadow(p,28,61,27,4);
      for (const x of [9,20,33,44]) { p.box(x,40,4,21,PAL.wood); p.r(x+1,41,1,19,'rgba(255,255,255,.25)'); }
      for (const [a,b] of [[13,20],[37,44]]) { line(p,a,43,b-1,56,PAL.wood2); line(p,a,56,b-1,43,PAL.wood2); }
      p.box(5,37,46,4,PAL.wood2); hl(p,6,38,44,1);
      p.r(8,17,40,21,PAL.wood); for (let x=12;x<44;x+=4) p.r(x,18,1,19,shade(PAL.wood,.84)); p.r(43,17,5,21,PAL.wood2); hl(p,9,18,2,19);
      for (const y of [21,32]) { p.r(8,y,40,2,PAL.metal2); p.r(8,y,40,1,PAL.metal); }
      p.o(8,17,40,21);
      for (let i=0;i<15;i++){ const hw=Math.round(2+i*1.5); p.r(28-hw,3+i,2*hw+1,1,i%4===3?shade(PAL.roofPink,.85):PAL.roofPink); p.r(28-hw,3+i,1,1,PAL.outline); p.r(28+hw,3+i,1,1,PAL.outline); if (i>2) p.r(28-hw+2,3+i,2,1,'rgba(255,255,255,.3)'); }
      p.r(27,2,3,1,PAL.outline); p.r(4,17,49,1,PAL.outline); p.r(27,0,3,3,PAL.wood2); p.o(27,0,3,3);
      p.box(1,27,8,3,PAL.metal2); p.box(1,29,3,9,PAL.metal2); p.r(2,38,1,2,PAL.water2);
      p.box(14,51,28,9,PAL.wood); p.r(15,52,26,3,PAL.water); p.r(17,52,6,1,PAL.white); p.r(15,55,26,1,PAL.wood2); p.r(37,52,4,7,shade(PAL.wood,.84)); p.o(14,51,28,9);
      return c; },
    // 잡화점: 넓은 가짜 정면 + 차양 현관 + 진열창
    west_shop(){ const c=mk(74,66), p=new PX(c); shadow(p,37,63,37,4);
      p.r(5,4,64,28,PAL.roofGreen); p.r(64,4,5,28,shade(PAL.roofGreen,.84)); p.o(5,4,64,28); p.box(3,1,68,4,PAL.wood2); hl(p,4,2,66,1);
      p.box(12,9,50,11,PAL.wall); p.r(13,10,48,1,PAL.white); word(p,'GENERAL',37-Math.floor(wordW('GENERAL')/2),12,PAL.outline);
      win(p,14,22,7,6); win(p,53,22,7,6);
      planks(p,7,32,60,26,PAL.wall);
      p.box(1,30,72,4,PAL.wood2); for (let k=3;k<72;k+=6) p.r(k,31,3,2,PAL.wood);
      for (const x of [3,68]) { p.box(x,34,3,24,PAL.wood2); }
      for (const x of [11,45]) { p.box(x,37,18,15,PAL.water); p.r(x+1,38,16,13,'#cfe6ea'); p.r(x+1,38,2,13,PAL.white); p.r(x+1,44,16,1,PAL.wood2);
        ([[3,40,PAL.red],[7,40,PAL.gold],[11,40,PAL.leaf],[4,46,PAL.roofBlue],[9,46,PAL.pink],[13,46,PAL.gold]] as any[]).forEach(([dx,y,col])=>{ p.r(x+dx,y,3,3,col); p.r(x+dx,y,1,1,'rgba(255,255,255,.5)'); }); }
      p.box(31,38,12,20,PAL.wood); p.r(37,39,1,18,PAL.wood2); p.box(32,40,4,7,PAL.water); p.box(38,40,4,7,PAL.water); p.r(35,50,1,1,PAL.gold); p.r(39,50,1,1,PAL.gold);
      p.box(0,57,74,5,PAL.wood); for (let k=6;k<74;k+=8) p.r(k,58,1,3,PAL.wood2); hl(p,1,58,72,1);
      barrel(p,6,49); crate(p,60,50,9,8); crate(p,62,44,7,6);
      return c; },
    // 신문사: 계단식 꼭대기의 2층 가짜 정면 + 인쇄기 창 + 신문 뭉치
    west_library(){ const c=mk(62,74), p=new PX(c); shadow(p,31,71,30,4);
      p.box(21,0,20,6,PAL.roofBlue); p.box(12,4,38,6,PAL.roofBlue); hl(p,22,1,18,1); hl(p,13,5,8,1); hl(p,41,5,8,1);
      p.r(4,9,54,60,PAL.roofBlue); p.r(53,9,5,60,shade(PAL.roofBlue,.84)); for (let y=13;y<68;y+=4) p.r(5,y,48,1,shade(PAL.roofBlue,.92)); p.o(4,9,54,60); p.box(2,8,58,3,PAL.wood2);
      p.box(9,13,44,10,PAL.white); word(p,'NEWS',31-Math.floor(wordW('NEWS')/2),15,PAL.outline); p.r(11,21,40,1,PAL.stone2);
      for (const x of [10,27,44]) win(p,x,27,8,9);
      p.box(2,40,58,3,PAL.wood2);
      p.box(8,45,24,17,dark); p.box(11,50,15,10,PAL.metal2); p.r(12,48,13,2,PAL.metal); p.o(11,48,15,2); p.box(14,46,8,3,PAL.white); p.r(27,52,4,8,PAL.white); p.r(27,54,4,1,PAL.stone2); p.r(9,46,2,15,'rgba(255,255,255,.25)'); p.r(8,62,24,1,PAL.wood2);
      p.box(37,45,13,5,PAL.water); p.r(38,46,2,3,PAL.white); door(p,37,50,13,19);
      for (const [x,y] of [[52,62],[53,57]]) { p.box(x,y,8,6,PAL.white); p.r(x+1,y+2,6,1,PAL.stone2); p.r(x+3,y,1,6,PAL.wood2); }
      return c; },
    // 살룬: 노란 2층 정면 + 발코니 + 스윙 도어
    west_community(){ const c=mk(80,66), p=new PX(c); shadow(p,40,63,40,4);
      p.box(24,0,32,6,PAL.roofYellow); p.r(39,1,2,4,PAL.red); hl(p,25,1,13,1);
      p.r(4,5,72,56,PAL.roofYellow); p.r(71,5,5,56,shade(PAL.roofYellow,.84)); for (let y=9;y<60;y+=4) p.r(5,y,66,1,shade(PAL.roofYellow,.9)); p.o(4,5,72,56); p.box(2,4,76,3,PAL.wood2);
      p.box(13,9,54,10,PAL.red); hl(p,14,10,52,1); word(p,'SALOON',40-Math.floor(wordW('SALOON')/2),11,PAL.white);
      for (const x of [9,23,50,64]) { win(p,x,21,7,8); p.r(x-2,21,2,8,PAL.red); p.r(x+7,21,2,8,PAL.red); }
      p.box(0,32,80,3,PAL.wood2); p.r(1,27,78,1,PAL.wood); p.r(0,26,80,1,PAL.outline); for (let k=2;k<79;k+=3) p.r(k,28,1,4,PAL.wood2);
      for (const x of [2,25,52,75]) p.box(x,35,3,25,PAL.wood2);
      for (const x of [8,56]) { p.box(x,40,16,10,PAL.water); p.r(x+1,41,2,8,PAL.white); p.r(x+8,41,1,8,PAL.white); p.r(x-1,50,18,1,PAL.wood2); }
      p.box(31,38,18,22,dark); p.r(36,41,2,2,PAL.gold); p.r(43,43,2,2,PAL.gold);
      for (const x of [32,40]) { p.box(x,45,8,10,PAL.wood); for (let k=x+2;k<x+7;k+=2) p.r(k,46,1,8,PAL.wood2); p.r(x+1,44,6,1,PAL.wood); p.r(x+2,43,4,1,PAL.outline); }
      p.box(0,59,80,5,PAL.wood); for (let k=7;k<80;k+=9) p.r(k,60,1,3,PAL.wood2); hl(p,1,60,78,1);
      barrel(p,26,51,6,8);
      return c; },
    // 통나무집: 통나무 벽 + 녹슨 박공 지붕 + 돌 굴뚝 + 현관
    west_home(){ const c=mk(56,54), p=new PX(c); shadow(p,28,51,28,4);
      p.box(40,0,9,20,PAL.stone2); for (let y=2;y<20;y+=4) { p.r(41,y,3,2,PAL.stone); p.r(45,y+2,3,2,PAL.stone); } p.r(39,0,11,2,PAL.metal2); p.o(39,0,11,2);
      p.r(6,22,44,28,PAL.wood); for (let y=22;y<50;y+=4) { p.r(6,y,44,1,'rgba(255,255,255,.18)'); p.r(6,y+3,44,1,PAL.wood2); } p.r(45,22,5,28,'rgba(58,42,36,.25)'); p.o(6,22,44,28);
      for (let y=23;y<49;y+=4) { p.r(4,y,3,3,PAL.wall2); p.o(4,y,3,3); p.r(49,y,3,3,PAL.wall2); p.o(49,y,3,3); }
      roof(p,1,8,54,15,PAL.roofPink,shade(PAL.roofPink,.85));
      win(p,11,29,9,8); p.r(9,29,2,8,PAL.roofGreen); p.r(20,29,2,8,PAL.roofGreen);
      p.box(26,31,26,3,PAL.wood2); p.box(27,34,2,16,PAL.wood2); p.box(49,34,2,16,PAL.wood2);
      door(p,33,36,10,14); p.r(36,33,4,1,PAL.gold); p.r(36,32,1,1,PAL.gold); p.r(39,32,1,1,PAL.gold);
      p.r(10,43,1,6,PAL.wood2); p.r(16,43,1,6,PAL.wood2); p.r(10,45,7,2,PAL.wood); p.o(10,45,7,2); p.r(9,49,9,1,PAL.wood2);
      return c; },
    // 은행: 회색 돌 + 삼각 박공 + 동전 문장 + 쇠창살 창
    west_checkout(){ const c=mk(66,66), p=new PX(c); shadow(p,33,63,33,4);
      p.tri(33,0,13,PAL.metal); for (let i=0;i<13;i++){ p.r(33-i,i,1,1,PAL.outline); p.r(33+i,i,1,1,PAL.outline); } p.ellO(33,8,4,4,PAL.gold); p.r(32,6,1,3,PAL.white); p.r(33,6,1,5,shade(PAL.gold,.8));
      p.box(3,12,60,5,PAL.metal); hl(p,4,13,58,1); p.r(4,15,58,1,PAL.metal2);
      p.r(6,17,54,41,PAL.metal); for (let y=21;y<58;y+=4){ p.r(7,y,52,1,shade(PAL.metal,.86)); for (let x=8+(y%8?0:5);x<58;x+=10) p.r(x,y-3,1,3,shade(PAL.metal,.86)); } p.r(55,17,5,41,PAL.metal2); p.o(6,17,54,41);
      p.box(18,19,30,9,PAL.outline); word(p,'BANK',33-Math.floor(wordW('BANK')/2),21,PAL.gold);
      for (const x of [9,45]) { p.box(x,31,12,15,PAL.water); p.r(x+1,32,2,13,PAL.white); for (let k=x+3;k<x+11;k+=3) p.r(k,32,1,13,PAL.outline); p.box(x-1,46,14,2,PAL.metal2); p.box(x-1,29,14,2,PAL.metal2); }
      for (const x of [23,39]) { p.box(x,30,4,28,PAL.white); p.r(x+3,31,1,26,PAL.stone2); p.box(x-1,29,6,2,PAL.stone2); }
      p.box(28,36,10,22,PAL.wood2); p.r(32,37,1,20,PAL.outline); p.r(30,46,1,2,PAL.gold); p.r(34,46,1,2,PAL.gold); p.r(29,38,8,1,PAL.metal2);
      p.box(18,57,30,3,PAL.metal2); p.box(14,59,38,4,PAL.metal); hl(p,15,60,36,1);
      return c; },
    // 커피 마차: 흰 포장 마차 + 모닥불 위 커피 주전자
    west_cafe(){ const c=mk(66,54), p=new PX(c); shadow(p,30,51,30,4);
      for (let x=4;x<=46;x++){ const dx=(x-25)/21.5, top=Math.round(29-17*Math.sqrt(Math.max(0,1-dx*dx))); p.r(x,top,1,29-top,PAL.white); p.r(x,top,1,1,PAL.outline); if (x===4||x===46) p.r(x,top,1,29-top,PAL.outline); }
      for (const x of [12,20,28,36]) { const dx=(x-25)/21.5, top=Math.round(29-17*Math.sqrt(1-dx*dx)); p.r(x,top+1,1,28-top,PAL.stone2); }
      p.r(40,18,6,10,'rgba(58,42,36,.25)'); word(p,'COFFEE',25-Math.floor(wordW('COFFEE')/2),20,PAL.wood2);
      p.box(4,28,44,11,PAL.wood); p.r(5,32,42,1,PAL.wood2); p.r(5,35,42,1,PAL.wood2); hl(p,5,29,42,1); p.r(43,29,4,9,PAL.wood2);
      p.r(0,38,6,2,PAL.wood2); p.o(0,38,6,2);
      wheel(p,13,43,7,PAL.wood2,PAL.gold); wheel(p,38,42,9,PAL.wood2,PAL.gold);
      line(p,51,28,56,47,PAL.wood2); line(p,61,28,56,47,PAL.wood2); p.r(53,27,7,1,PAL.wood2); p.r(56,28,1,4,PAL.outline);
      p.box(53,32,7,6,PAL.metal2); p.r(54,33,2,2,PAL.metal); p.r(52,34,1,2,PAL.metal2); p.r(60,33,1,2,PAL.metal2);
      p.r(55,29,1,1,'rgba(255,255,255,.7)'); p.r(57,26,1,1,'rgba(255,255,255,.6)');
      p.r(50,47,12,2,PAL.wood2); p.o(50,47,12,2); p.r(53,42,6,5,PAL.red); p.r(54,40,4,3,PAL.gold); p.r(55,43,2,3,PAL.white); p.r(52,44,1,3,PAL.gold); p.r(59,43,1,4,PAL.gold);
      return c; },
    // 단칸 교실: 붉은 벽 + 흰 종탑
    west_school(){ const c=mk(60,60), p=new PX(c); shadow(p,30,57,30,4);
      p.tri(30,0,7,PAL.wood2); for (let i=0;i<7;i++){ p.r(30-i,i,1,1,PAL.outline); p.r(30+i,i,1,1,PAL.outline); } p.r(23,7,15,1,PAL.outline);
      p.box(24,8,13,12,PAL.white); p.r(26,10,9,7,dark); p.r(29,11,3,4,PAL.gold); p.r(28,14,5,1,PAL.gold); p.r(29,11,1,2,PAL.white); p.r(33,9,3,10,PAL.stone2);
      roof(p,2,17,56,12,PAL.wood2,shade(PAL.wood2,.78));
      planks(p,6,29,48,27,PAL.roofPink,3); p.r(6,29,2,27,PAL.white); p.r(52,29,2,27,PAL.white); p.o(6,29,48,27);
      for (const x of [10,42]) { p.box(x-1,34,10,12,PAL.white); win(p,x,35,8,10); }
      p.box(17,30,26,7,PAL.white); word(p,'SCHOOL',30-Math.floor(wordW('SCHOOL')/2),31,PAL.outline);
      p.box(24,39,12,17,PAL.white); door(p,25,40,10,16);
      p.box(22,55,16,3,PAL.stone2);
      return c; },
    // 의사 진료소: 흰 벽 + 보라 지붕 + 붉은 십자 + DOCTOR
    west_clinic(){ const c=mk(56,56), p=new PX(c); shadow(p,28,53,28,4);
      roof(p,2,8,52,14,PAL.roofLilac,shade(PAL.roofLilac,.85));
      p.box(21,2,14,13,PAL.white); p.r(27,4,2,9,PAL.red); p.r(23,7,10,3,PAL.red);
      planks(p,6,22,44,31,PAL.white);
      p.box(12,25,32,7,PAL.wall); word(p,'DOCTOR',28-Math.floor(wordW('DOCTOR')/2),26,PAL.outline);
      win(p,10,35,11,9); for (const [x,col] of ([[12,PAL.red],[15,PAL.leaf],[18,PAL.roofBlue]] as any[])) { p.r(x,40,2,3,col); p.r(x,39,2,1,PAL.white); }
      p.box(29,33,16,3,PAL.roofLilac); door(p,31,36,11,17); p.r(33,38,7,4,PAL.water); p.o(33,38,7,4);
      p.r(8,47,14,2,PAL.wood); p.o(8,47,14,2); p.r(9,49,1,3,PAL.wood2); p.r(20,49,1,3,PAL.wood2);
      return c; },
    // 역마차 정류장: 붉은 역마차 + 노란 바퀴 + 짐 + 우편 자루
    west_post(){ const c=mk(66,58), p=new PX(c); shadow(p,33,55,32,4);
      p.r(58,8,2,46,PAL.wood2); p.o(57,8,4,46); p.box(46,10,18,9,PAL.white); word(p,'MAIL',55-Math.floor(wordW('MAIL')/2),12,PAL.red);
      p.box(16,9,32,6,PAL.wood2); p.box(18,4,10,6,PAL.wood); p.r(18,6,10,1,PAL.wood2); p.box(29,5,8,5,PAL.roofBlue); p.box(38,6,8,4,PAL.wall);
      p.box(12,14,40,26,PAL.red); p.r(47,15,4,24,shade(PAL.red,.8)); hl(p,13,15,33,1);
      p.g.clearRect(12,39,1,1); p.g.clearRect(51,39,1,1); p.r(13,39,1,1,PAL.outline); p.r(50,39,1,1,PAL.outline);
      p.r(14,30,36,1,PAL.gold); p.r(14,36,36,1,PAL.gold);
      p.box(16,18,10,9,dark); p.r(17,19,8,3,PAL.gold); p.box(36,18,10,9,dark); p.r(37,19,8,3,PAL.gold); p.box(28,18,6,18,shade(PAL.red,.85)); p.r(32,26,1,2,PAL.gold);
      p.box(6,9,10,5,PAL.wood2); hl(p,7,10,8,1); line(p,3,27,11,23,PAL.wood2); line(p,3,28,11,24,PAL.wood2); p.r(2,26,2,3,PAL.outline); p.r(0,38,13,2,PAL.wood2); p.o(0,38,13,2);
      wheel(p,16,44,8,PAL.roofYellow,PAL.wood2); wheel(p,44,43,10,PAL.roofYellow,PAL.wood2);
      p.ellO(58,50,6,4,PAL.wall2); p.box(56,43,5,4,PAL.wall2); p.r(55,46,7,1,PAL.wood2); p.box(55,48,7,5,PAL.white); line(p,56,49,58,51,PAL.red); line(p,60,49,58,51,PAL.red);
      return c; },
    // 광산 입구: 붉은 바위 언덕 + 나무 갱도 + 레일 + 광석 수레
    west_factory(){ const c=mk(66,58), p=new PX(c); shadow(p,33,55,33,4);
      const top = x => Math.round(6 + (x-33)*(x-33)/26 + ((x*7)%5===0?1:0));
      for (let x=1;x<65;x++){ const t=top(x); if (t>52) continue; p.r(x,t,1,53-t,PAL.roofPink); for (let y=t+5;y<53;y+=6) p.r(x,y+((x>>3)%2),1,1,shade(PAL.roofPink,.8)); if (x>=48) p.r(x,t,1,53-t,'rgba(58,42,36,.18)'); p.r(x,t,1,1,PAL.outline); if (x<48) p.r(x,t+1,1,1,'rgba(255,255,255,.3)'); }
      for (let x=1;x<65;x++){ const t=top(x), l=top(x-1), r=top(x+1); if (t<=52) { if (l>t+1) p.r(x,t,1,Math.min(l,53)-t,PAL.outline); if (r>t+1) p.r(x,t,1,Math.min(r,53)-t,PAL.outline); } }
            for (const [x,y] of [[12,36],[50,30],[16,46],[54,44],[40,14]]) { p.r(x,y,2,1,PAL.gold); p.r(x+1,y+1,1,1,shade(PAL.gold,.8)); }
      p.box(19,22,28,4,PAL.wood); hl(p,20,23,26,1); p.box(20,26,4,27,PAL.wood); p.box(42,26,4,27,PAL.wood); p.r(24,26,18,27,'#241814'); p.r(25,26,16,1,PAL.wood2);
      p.box(23,15,20,8,PAL.wall); p.r(26,22,1,1,PAL.outline); p.r(39,22,1,1,PAL.outline); word(p,'MINE',33-Math.floor(wordW('MINE')/2),17,PAL.outline);
      for (let y=40;y<56;y+=3) p.r(23,y,20,1,PAL.wood2); p.r(26,38,1,18,PAL.metal); p.r(39,38,1,18,PAL.metal);
      p.box(25,40,16,9,PAL.metal2); p.r(26,41,14,1,PAL.metal); p.r(26,38,4,3,PAL.gold); p.r(30,37,5,4,PAL.metal); p.r(35,38,4,3,PAL.gold); p.r(27,38,1,1,PAL.white); p.o(25,40,16,9); p.r(27,49,3,2,PAL.outline); p.r(36,49,3,2,PAL.outline);
      p.box(15,30,4,5,PAL.gold); p.r(16,31,2,3,'#fff0b0'); p.r(16,28,2,2,PAL.outline);
      line(p,51,52,58,40,PAL.wood2); p.r(55,38,7,2,PAL.metal); p.r(54,39,1,2,PAL.metal); p.r(62,39,1,2,PAL.metal); p.o(55,38,7,2);
      return c; },
    // 목장 울타리: 흙 마당 + 울타리 + 풍차 + 건초
    west_park(){ const c=mk(66,54), p=new PX(c);
      p.ellO(30,40,29,11,PAL.dirt,PAL.dirt2); for (const [x,y] of [[14,40],[24,44],[38,37],[44,45],[20,35]]) p.r(x,y,2,1,PAL.dirt2);
      line(p,47,40,51,10,PAL.metal2); line(p,59,40,55,10,PAL.metal2); line(p,48,34,58,24,PAL.metal2); line(p,49,24,57,16,PAL.metal2); line(p,48,30,58,30,PAL.metal2); line(p,49,20,57,20,PAL.metal2); p.r(47,40,1,1,PAL.outline); p.r(59,40,1,1,PAL.outline);
      for (let a=0;a<12;a++){ const ang=a*Math.PI/6; line(p,53+Math.round(Math.cos(ang)*2),8+Math.round(Math.sin(ang)*2),53+Math.round(Math.cos(ang)*7),8+Math.round(Math.sin(ang)*7),a%2?PAL.white:PAL.metal); }
      p.box(51,6,5,5,PAL.red); p.r(57,7,6,2,PAL.metal2); p.box(61,4,5,7,PAL.white); p.o(61,4,5,7);
      p.box(42,38,18,6,PAL.wood); p.r(43,39,16,2,PAL.water); p.r(45,39,4,1,PAL.white); p.r(55,39,4,4,PAL.wood2);
      for (const [x,y] of [[9,32],[18,30]]) { p.box(x,y,11,8,PAL.roofYellow); p.r(x+1,y+3,9,1,shade(PAL.roofYellow,.8)); p.r(x+8,y+1,2,6,shade(PAL.roofYellow,.85)); hl(p,x+1,y+1,6,1); }
      p.box(13,24,11,7,PAL.roofYellow); p.r(14,27,9,1,shade(PAL.roofYellow,.8)); hl(p,14,25,6,1);
      p.r(1,44,64,2,PAL.wood); p.r(1,48,64,2,PAL.wood); p.r(1,46,64,1,PAL.wood2); p.r(1,50,64,1,PAL.wood2);
      for (let k=1;k<65;k+=7) { p.box(k,41,3,12,PAL.wood2); p.r(k+1,42,1,10,'rgba(255,255,255,.2)'); }
      return c; },
  });
  // 밤 창문 불빛이 없는 것(탑·마차·울타리)과 굴뚝 연기
  for (const k of ['west_plaza','west_cafe','west_post','west_park','west_factory']) NO_LIGHT.add(k);
  CHIMNEY.west_home = 44;

  // ---- 장식: 선인장(나무 자리) · 목장 문 · 물웅덩이
  DECOR_KIND.tree.west_tree = size => {
    const h=size?30:22, w=size?19:17, c=mk(w,h), p=new PX(c), t=mk(w,h), bw=7, bx=Math.floor((w-bw)/2), cx=bx+3;
    // 몸통·팔을 한 덩어리 칸으로 모은 뒤 바깥 칸만 외곽선으로 칠한다
    const M=new Set<string>(), key=(x: number,y: number)=>x+','+y, cut: any[]=[];
    const rect=(x: number,y: number,rw: number,rh: number,round?: boolean)=>{ for (let j=0;j<rh;j++) for (let i=0;i<rw;i++) M.add(key(x+i,y+j)); if (round) cut.push([x,y],[x+rw-1,y]); };
    const la=Math.round(h*.42), lj=Math.round(h*.62), ra=Math.round(h*.2), rj=Math.round(h*.42);
    rect(bx,0,bw,h-1,true); rect(bx-5,la,5,lj-la+4,true); rect(bx-4,lj,5,4); rect(bx+bw,ra,5,rj-ra+4,true); rect(bx+bw-1,rj,5,4);
    for (const [x,y] of cut) M.delete(key(x,y));
    const has=(x,y)=>M.has(key(x,y));
    for (const k of M){ const [x,y]=k.split(',').map(Number); const edge=!has(x-1,y)||!has(x+1,y)||!has(x,y-1)||!has(x,y+1);
      p.r(x,y,1,1, edge?PAL.outline : !has(x-2,y)?'#8fbf6a' : !has(x+2,y)?shade(PAL.leaf,.78) : PAL.leaf); }
    for (let y=4;y<h-3;y+=4) { p.r(cx-1,y,1,1,shade(PAL.leaf,.8)); p.r(cx+2,y+2,1,1,shade(PAL.leaf,.8)); p.r(bx-1+((y/4)%2?0:bw+1),y+1,1,1,PAL.white); }
    p.r(cx-1,0,3,1,PAL.pink); p.r(cx,0,1,1,PAL.gold); p.r(cx,1,1,1,PAL.pink);
    p.r(bx-1,h-1,bw+2,1,PAL.dirt2);
    return { canopy:c, trunk:t, ax:Math.floor(w/2), ay:h, sway:0 }; };
  DECOR_KIND.gate.west_gate = () => { const c=mk(34,30), p=new PX(c);
    for (const x of [1,29]) { p.box(x,4,4,26,PAL.wood); p.r(x+1,5,1,24,'rgba(255,255,255,.3)'); p.r(x+3,5,1,24,PAL.wood2); }
    p.box(0,2,34,5,PAL.wood2); hl(p,1,3,32,1); p.r(0,1,3,1,PAL.wood2); p.r(31,1,3,1,PAL.wood2);
    p.r(10,7,1,4,PAL.outline); p.r(23,7,1,4,PAL.outline); p.box(8,10,18,9,PAL.wall); p.r(9,11,16,1,PAL.white);
    p.sprite(['..oooooo..','.oggggggo.','ogo....ogo','ogo....ogo','ogo....ogo','.o......o.'],{o:PAL.outline,g:PAL.metal},12,12);
    p.r(14,13,1,1,PAL.outline); p.r(19,13,1,1,PAL.outline);
    return c; };
  DECOR_KIND.pond.west_pond = frame => { const c=mk(60,32), p=new PX(c);
    p.ellO(28,17,26,12,PAL.roofPink); p.ell(28,16,23,9,shade(PAL.roofPink,.8)); p.ellO(28,17,22,9,PAL.water); p.ell(28,16,19,6,shade(PAL.water,1.08));
    const r=frame?[[17,14,5],[32,19,4]]:[[19,15,4],[34,18,5]]; for (const [x,y,w] of r) { p.r(x,y,w,1,PAL.white); p.r(x+1,y+2,w-2,1,'rgba(255,255,255,.6)'); }
    for (const [x,y] of [[6,12],[48,10],[44,25],[10,24]]) { p.box(x,y,5,4,PAL.roofPink); p.r(x+1,y+1,2,1,'rgba(255,255,255,.35)'); }
    for (const x of [8,10,12]) { p.r(x,5+(x%4),1,9-(x%4),PAL.leaf); p.r(x,4+(x%4),1,1,PAL.wood2); }
    p.box(46,18,13,7,PAL.wood); p.r(47,19,11,2,PAL.water2); p.r(48,19,3,1,PAL.white); p.r(54,19,3,5,PAL.wood2); p.r(47,25,1,3,PAL.wood2); p.r(57,25,1,3,PAL.wood2);
    return c; };
})();
