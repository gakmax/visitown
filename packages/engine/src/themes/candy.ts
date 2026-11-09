import { BUILD, CHIMNEY, DECOR_KIND, NO_LIGHT, PX, door, glass, mk, roof, scallop, shade, shadow, win } from '../map';
import { FIXED_COMMON, PAL, THEMES } from '../palette';
import { L } from '@visitown/i18n';
// 과자 마을
(()=>{
  // ---- 과자 색(팔레트에 없는 포인트만)
  const CK='#eab26a', CK2='#c58646', GB='#c4773f', GB2='#94522a', BAND='#f2c08e', BAND2='#d89a62';
  const HL='rgba(255,255,255,.5)';

  // ---- 공용 헬퍼
  // 모양 채우기: inside(x,y)인 칸을 col(x,y)로 칠하고, 바깥과 맞닿은 칸은 외곽선
  function fillShape(p,x0,y0,w,h,inside,col){ for (let y=y0;y<y0+h;y++) for (let x=x0;x<x0+w;x++){ if (!inside(x,y)) continue; const edge=!inside(x-1,y)||!inside(x+1,y)||!inside(x,y-1)||!inside(x,y+1); p.r(x,y,1,1,edge?PAL.outline:col(x,y)); } }
  // 아이싱 흘러내림: (x,y)부터 아래로 방울, 방울 끝에 외곽선
  function drip(p,x,y,w,col,s=0){ const D=[0,1,3,1,0,0,2,0,1,4,1,0]; for (let k=0;k<w;k++){ const d=D[(k+s)%D.length]; p.r(x+k,y,1,2+d,col); p.r(x+k,y+2+d,1,1,shade(col,.8)); } }
  // 지팡이 사탕 줄무늬 기둥
  function cane(p,x,y,w,h,c1=PAL.red,c2=PAL.white){ for (let j=0;j<h;j++) for (let i=0;i<w;i++) p.r(x+i,y+j,1,1,((i+j)>>1)%2?c1:c2); p.r(x-1,y,1,h,PAL.outline); p.r(x+w,y,1,h,PAL.outline); p.r(x-1,y-1,w+2,1,PAL.outline); }
  // 박공(삼각) 지붕: 기울기 slope, 테두리 끊김 없이
  function gable(p,cx,top,h,slope,col,sh){ let prev=-1; for (let i=0;i<h;i++){ const hw=Math.floor(i*slope); const seg=Math.max(1,hw-prev); p.r(cx-hw,top+i,2*hw+1,1,col); if (sh) p.r(cx+1,top+i,hw,1,sh); p.r(cx-hw,top+i,seg,1,PAL.outline); p.r(cx+hw-seg+1,top+i,seg,1,PAL.outline); prev=hw; } const hw=Math.floor((h-1)*slope); p.r(cx-hw,top+h-1,2*hw+1,1,PAL.outline); }
  // 동그란 소용돌이 사탕
  function swirl(p,cx,cy,r,c1,c2){ fillShape(p,cx-r,cy-r,2*r+1,2*r+1,(x,y)=>(x-cx)**2+(y-cy)**2<=r*r+r*.8,(x,y)=>{ const d=Math.hypot(x-cx,y-cy), a=Math.atan2(y-cy,x-cx); return (Math.floor(a/(Math.PI/4)+d/2.6)%2+2)%2?c1:c2; }); p.r(cx-Math.ceil(r/2),cy-Math.ceil(r/2),2,1,HL); }
  // 젤리·구미 드롭(작은 반구)
  function gum(p,cx,by,col){ p.r(cx-1,by-4,3,1,PAL.outline); p.r(cx-2,by-3,1,3,PAL.outline); p.r(cx+2,by-3,1,3,PAL.outline); p.r(cx-1,by-3,3,3,col); p.r(cx-1,by-3,1,1,PAL.white); p.r(cx-2,by,5,1,PAL.outline); }
  function heart(p,cx,y,col){ p.sprite(['.oo.oo.','orrorro','orwrrro','.orrro.','..oro..','...o...'],{o:PAL.outline,r:col,w:PAL.white},cx-3,y); }
  function wall(p,x,y,w,h,c1,c2){ p.r(x,y,w,h,c1); p.r(x+w-5,y,5,h,c2); p.o(x,y,w,h); }

  THEMES.candy = {
    name:L("과자 마을"), order:7,
    palette:{ outline:'#4a2a38', grass:'#f4cbd5', grass2:'#ecb9c7', grass3:'#dd9db1', dirt:'#fbe5c2', dirt2:'#e2bb88', stone:'#fff2e2', stone2:'#ecc9b8',
      water:'#bdeee6', water2:'#5cc6b4', wall:'#fff3e3', wall2:'#efd6c0', wood:'#a3613d', wood2:'#6c3925',
      roofPink:'#f77fa6', roofBlue:'#7cc6f0', roofGreen:'#7fdcb8', roofYellow:'#ffcf5a', roofLilac:'#c08af0',
      white:'#ffffff', leaf:'#62cf96', pink:'#ff9cc0', red:'#e8435f', gold:'#ffbd3a', metal:'#e4d8e6', metal2:'#ad97b8', skin:'#ffe0c2' },
    characters:{
      shapes:[
        { name:L("마카롱"),
          down:['............','............','............','...oooooo...','.oohhBBBBoo.','oBhBBBBBBBBo','oBBeBBBBeBBo','oBpBBBBBBpBo','obbbbbbbbbbo','oSSSSSSSSSSo','oBhBBBBBBBBo','.obbbbbbbbo.','..oooooooo..','...ff..gg...'],
          side:['............','............','............','...oooooo...','.oohhBBBBoo.','oBhBBBBBBBBo','oBeBBBBBBBBo','opBBBBBBBBBo','obbbbbbbbbbo','oSSSSSSSSSSo','oBhBBBBBBBBo','.obbbbbbbbo.','..oooooooo..','...ff..gg...'] },
        { name:L("젤리곰"),
          down:['............','.oo......oo.','oBBo....oBBo','oBhBooooBBBo','.oBhBBBBBBo.','.oBBeBBeBBo.','.oBpBhhBpBo.','..oBBBBBBo..','.ooBhBBBBoo.','oBBoBhBBoBBo','oBboBBBBobBo','.oooBBBBooo.','..obBBBBbo..','..oboooobo..','...ff..gg...'],
          side:['............','..oo....oo..','.oBBo..oBBo.','.oBhBooBBBo.','.oBhBBBBBBo.','.oBeBBBBBBo.','.ohhBBBBpBo.','..oBBBBBBo..','..oBhBBBBo..','..oBoBBBBo..','..oBoBBBbo..','..ooBBBBbo..','..obBBBBbo..','..oboooobo..','...ff..gg...'] },
        { name:L("푸딩"),
          down:['............','.....oo.....','....orro....','...orwrro...','..ooHHHHoo..','.oHHHHHHHHo.','.oBHBHHBHBo.','.oBBeBBeBBo.','.oBpBBBBpBo.','oBhBBBBBBBBo','obBBBBBBBBbo','owwwwwwwwwwo','.oooooooooo.','...ff..gg...'],
          side:['............','.....oo.....','....orro....','...orwrro...','..ooHHHHoo..','.oHHHHHHHHo.','.oBHBHHBHBo.','.oeBBBBBBBo.','.opBBBBBBBo.','oBhBBBBBBBBo','obBBBBBBBBbo','owwwwwwwwwwo','.oooooooooo.','...ff..gg...'] },
        { name:L("컵케이크"),
          down:['............','.....oo.....','....oBho....','...oBBBBo...','..obbbbbbo..','.oBhBrBBrBo.','.oBBeBBeBBo.','oBBpBBBBpBBo','obbbbbbbbbbo','.okHkkkkHko.','.okHkkkkHko.','..okHkkHko..','..oooooooo..','...ff..gg...'],
          side:['............','.....oo.....','....oBho....','...oBBBBo...','..obbbbbbo..','.oBhBrBBrBo.','.oBeBBBBBBo.','oBpBBBBBBBBo','obbbbbbbbbbo','.okHkkkkHko.','.okHkkkkHko.','..okHkkHko..','..oooooooo..','...ff..gg...'] },
        { name:L("도넛"),
          down:['............','............','...oooooo...','..oBhBrBBo..','.oBhrBBBrBo.','oBrBeBBeBBBo','oBpBBooBBpBo','okBBo..oBBko','okBko..okBko','okkkkookkkko','.oHkkkkkkHo.','..oHHHHHHo..','...oooooo...','...ff..gg...'],
          side:['............','............','...oooooo...','..oBhBrBBo..','.oBhrBBBrBo.','oBeBBBBBrBBo','opBBBooBBBBo','okBBo..oBBko','okBko..okBko','okkkkookkkko','.oHkkkkkkHo.','..oHHHHHHo..','...oooooo...','...ff..gg...'] },
        { name:L("막대사탕"),
          down:['............','...oooooo...','..oBhwwBBo..','.oBhBBBBwBo.','oBwBeBBeBwBo','oBwBBBBBBwBo','oBwBpBBpBwBo','.oBwBBBBwBo.','..oBwwwwBo..','...oooooo...','.orrowworro.','..ooowwooo..','....owwo....','....owwo....','...ff..gg...'],
          side:['............','...oooooo...','..oBhwwBBo..','.oBhBBBBwBo.','oBeBBBBBBwBo','oBwBBBBBBwBo','opwBBBBBBwBo','.oBwBBBBwBo.','..oBwwwwBo..','...oooooo...','.orrowworro.','..ooowwooo..','....owwo....','....owwo....','...ff..gg...'] },
      ],
      colors:[
        { name:L("딸기"), B:'#ff6f9c', b:'#d84a78', h:'#ffb4cc' },{ name:L("민트"), B:'#4fd3ad', b:'#2ea486', h:'#a6f0d9' },{ name:L("레몬"), B:'#ffd23d', b:'#dca522', h:'#fff09c' },
        { name:L("소다"), B:'#5cb6ff', b:'#3a87d4', h:'#acdcff' },{ name:L("포도"), B:'#ad6ef0', b:'#814bc4', h:'#d8b6ff' },{ name:L("초코"), B:'#9a5636', b:'#6c3925', h:'#c98b62' }],
      fixed:{ ...FIXED_COMMON, o:'#4a2a38', e:'#4a2a38', f:'#4a2a38', g:'#4a2a38', p:'#ff86ad', S:'#fff1d9', n:'#fff1d9', H:'#b9652e', k:'#efb46a', r:'#e8435f', L:'#62cf96' },
      up:{ e:'B', p:'B', w:'w', n:'B', S:'S', r:'r' } },
    kinds:{ plaza:[L("케이크 분수"),'candy_plaza','fountain'], shop:[L("사탕 가게"),'candy_shop','cart'], library:[L("쿠키 도서관"),'candy_library','book'], community:[L("파티 홀"),'candy_community','heart'],
      home:[L("진저브레드 하우스"),'candy_home','house'], checkout:[L("초콜릿 동전 은행"),'candy_checkout','coin'], cafe:[L("디저트 카페"),'candy_cafe','mug'], school:[L("제과 학교"),'candy_school','bell'],
      clinic:[L("반창고 약국"),'candy_clinic','cross'], post:[L("편지 봉투 우체국"),'candy_post','mail'], factory:[L("초콜릿 공장"),'candy_factory','gear'], park:[L("젤리 정원"),'candy_park','flower'] },
    decor:{ tree:'candy_tree', gate:'candy_gate', pond:'candy_pond', ground:'grass' },
  };

  Object.assign(BUILD, {
    // 케이크 분수: 딸기우유 연못 가운데 3단 케이크
    candy_plaza(){ const c=mk(72,53), p=new PX(c); shadow(p,36,49,36,4);
      p.ellO(36,40,34,11,PAL.wall); p.ell(36,42,32,8,PAL.wall2); p.ellO(36,39,30,8,PAL.pink); p.ell(36,38,27,6,shade(PAL.pink,1.08));
      for (const [x,y] of [[6,40],[66,40],[20,49],[52,49],[36,51]]) { p.r(x,y,2,2,PAL.red); p.r(x,y,1,1,PAL.white); }
      p.r(11,37,5,1,PAL.white); p.r(57,39,4,1,PAL.white); p.r(17,43,3,1,HL); p.r(51,44,4,1,HL);
      p.box(18,24,37,15,PAL.wall); p.r(49,25,5,13,PAL.wall2); drip(p,19,25,35,PAL.roofPink,0); for (const x of [22,30,38,46]) { p.r(x,34,2,2,PAL.red); p.r(x,34,1,1,PAL.white); }
      p.box(23,14,27,11,PAL.roofPink); p.r(44,15,5,9,shade(PAL.roofPink,.85)); drip(p,24,15,25,PAL.white,4);
      p.box(28,5,17,10,PAL.wall); p.r(39,6,5,8,PAL.wall2); drip(p,29,6,15,PAL.roofPink,2);
      p.r(36,0,1,2,PAL.leaf); p.ellO(36,3,2,2,PAL.red); p.r(35,2,1,1,PAL.white);
      for (const x of [31,41]) { p.r(x,1,1,4,PAL.roofBlue); p.r(x,0,1,1,PAL.gold); }
      return c; },
    // 사탕 가게: 분홍 지붕 위에 커다란 포장 사탕, 줄무늬 차양, 사탕 병 진열창
    candy_shop(){ const c=mk(66,62), p=new PX(c); shadow(p,33,58,34,4);
      wall(p,7,26,52,32,PAL.wall,PAL.wall2); roof(p,1,12,64,14,PAL.roofPink,shade(PAL.roofPink,.86));
      for (const side of [-1,1]) for (let i=0;i<6;i++){ const x=33+side*(9+i); p.r(x,7-i,1,2*i+1,PAL.roofLilac); p.r(x,7-i,1,1,PAL.outline); p.r(x,7+i,1,1,PAL.outline); if (i===5) p.r(x,2,1,11,PAL.outline); }
      fillShape(p,24,2,19,11,(x,y)=>((x-33)/8.5)**2+((y-7)/5.5)**2<=1,(x,y)=>(((x-y)%6+6)%6<2)?PAL.white:PAL.red); p.r(28,4,2,1,HL);
      scallop(p,5,30,56,PAL.roofPink,PAL.white);
      p.box(11,40,24,15,PAL.water); p.r(12,41,22,13,'#e6faf6'); p.r(12,47,22,1,PAL.wood2);
      ([[13,PAL.red],[20,PAL.roofYellow],[27,PAL.roofGreen]] as any[]).forEach(([x,col])=>{ p.box(x,41,6,6,PAL.white); p.r(x,41,6,1,col); p.r(x+1,43,2,2,col); p.r(x+3,44,2,2,PAL.roofLilac); p.r(x+1,42,1,1,PAL.water); });
      ([[14,PAL.roofPink],[19,PAL.roofBlue],[24,PAL.gold],[29,PAL.roofLilac]] as any[]).forEach(([x,col])=>{ p.r(x,49,3,3,col); p.r(x,49,1,1,PAL.white); p.r(x+1,52,1,2,PAL.wood2); });
      door(p,42,42,11,16); p.r(37,44,1,13,PAL.white); swirl(p,37,43,3,PAL.roofGreen,PAL.white);
      return c; },
    // 쿠키 도서관: 펼친 책 지붕 + 초코칩 쿠키 벽, 웨하스 기둥
    candy_library(){ const c=mk(72,72), p=new PX(c); shadow(p,36,68,36,4);
      for (const cx of [19,52]) p.ellO(cx,27,18,17,PAL.roofBlue);
      for (const cx of [19,52]) { p.ellO(cx,28,16,15,PAL.white); for (let y=19;y<30;y+=3) p.r(cx-9,y,18,1,PAL.stone2); }
      p.r(35,12,2,20,PAL.outline); p.r(34,13,1,18,shade(PAL.roofBlue,.85)); p.r(37,13,1,18,shade(PAL.roofBlue,.85));
      wall(p,7,30,58,36,CK,CK2); p.r(8,31,52,1,HL);
      for (const [x,y] of [[11,47],[23,33],[44,36],[52,49],[30,62],[13,60],[56,60],[40,33]]) { p.r(x,y,2,2,PAL.wood2); }
      for (const x of [14,47]) { p.box(x,36,11,13,PAL.wood2); for (let k=0;k<4;k++) p.r(x+1+k*2+ (k>1?1:0),38,2,9,[PAL.red,PAL.roofBlue,PAL.gold,PAL.roofGreen][k]); p.r(x+1,42,9,1,PAL.wood2); p.r(x+1,37,9,1,PAL.outline); }
      p.box(28,46,16,20,PAL.wood); p.ellO(36,47,7,5,PAL.wood); p.r(29,47,14,19,PAL.wood); p.r(36,44,1,21,PAL.wood2); p.r(33,56,1,1,PAL.gold); p.r(39,56,1,1,PAL.gold); p.r(29,49,1,15,HL);
      for (const x of [9,58]) { p.box(x,52,5,14,PAL.wall); for (let y=54;y<65;y+=3) p.r(x+1,y,3,1,CK2); }
      p.box(5,66,62,3,PAL.stone2); p.r(6,67,60,1,PAL.stone);
      return c; },
    // 파티 홀: 젤리 돔 지붕, 가랜드, 풍선
    candy_community(){ const c=mk(78,64), p=new PX(c); shadow(p,39,60,39,4);
      p.r(39,1,1,9,PAL.outline); p.r(40,1,6,2,PAL.roofYellow); p.r(40,3,4,2,PAL.roofYellow); p.o(40,1,6,4); p.r(45,4,1,1,PAL.roofYellow); p.r(44,4,2,1,PAL.outline);
      p.ellO(39,31,34,22,PAL.roofLilac); p.ell(39,33,30,16,shade(PAL.roofLilac,.9)); p.ell(36,26,26,14,PAL.roofLilac);
      p.ell(26,17,8,3,shade(PAL.roofLilac,1.18)); p.r(22,15,5,1,PAL.white); p.r(20,17,2,1,PAL.white);
      for (const [x,y] of [[50,16],[58,22],[30,24],[46,25],[18,26]]) p.r(x,y,2,2,PAL.pink);
      wall(p,6,31,66,29,PAL.wall,PAL.wall2); p.r(4,30,70,3,shade(PAL.roofLilac,.8)); p.o(4,30,70,3);
      for (let k=8;k<68;k+=6){ const col=[PAL.roofPink,PAL.gold,PAL.roofGreen,PAL.roofBlue][(k/6|0)%4]; p.r(k,34,5,1,col); p.r(k+1,35,3,1,col); p.r(k+2,36,1,1,col); }
      p.r(7,33,64,1,PAL.outline);
      p.box(30,42,18,18,PAL.roofPink); p.r(31,43,16,1,HL); p.r(39,42,1,18,PAL.outline); p.r(36,51,1,2,PAL.gold); p.r(42,51,1,2,PAL.gold); p.r(28,40,22,2,PAL.roofLilac); p.o(28,40,22,2);
      for (const cx of [17,61]) { p.ellO(cx,47,5,5,PAL.water); p.r(cx,43,1,9,PAL.white); p.r(cx-4,47,9,1,PAL.white); p.r(cx-2,45,1,1,PAL.white); }
      for (const [x,y,col] of ([[4,14,PAL.roofPink],[9,9,PAL.roofYellow],[69,10,PAL.roofBlue],[74,15,PAL.roofGreen]] as any[])) { p.r(x,y+4,1,30-y-4,PAL.outline); p.ellO(x,y,3,4,col); p.r(x-1,y-2,1,2,PAL.white); p.r(x,y+5,1,1,col); }
      return c; },
    // 진저브레드 하우스: 생강 과자 벽, 하얀 아이싱 지붕, 검드롭
    candy_home(){ const c=mk(54,58), p=new PX(c); shadow(p,27,55,27,4);
      p.box(36,4,7,14,GB); p.r(37,5,1,12,HL); p.r(35,2,9,3,PAL.white); p.o(35,2,9,3);
      roof(p,1,10,52,15,PAL.white,PAL.stone2);
      wall(p,7,25,40,30,GB,GB2); drip(p,8,26,38,PAL.white,1);
      for (let k=5;k<50;k+=7) { const col=[PAL.red,PAL.roofGreen,PAL.roofYellow,PAL.roofLilac,PAL.roofPink,PAL.roofBlue,PAL.red][(k/7|0)%7]; gum(p,k,25,col); }
      gum(p,27,11,PAL.red);
      p.box(12,33,11,10,PAL.water); p.r(17,34,1,8,PAL.white); p.r(13,37,9,1,PAL.white); p.r(13,34,1,1,PAL.white); p.o(11,32,13,12,PAL.white); p.o(10,31,15,14);
      for (let x=11;x<24;x+=2) p.r(x,44,1,1,PAL.white);
      p.box(29,38,11,17,PAL.roofPink); p.r(30,39,1,15,HL); p.r(37,46,1,2,PAL.gold); p.ellO(34,38,5,3,PAL.roofPink); p.r(30,38,9,3,PAL.roofPink);
      cane(p,26,36,2,19); cane(p,41,36,2,19);
      for (const [x,col] of ([[12,PAL.roofGreen],[17,PAL.red],[22,PAL.roofYellow]] as any[])) { p.r(x,49,3,3,col); p.o(x-1,48,5,5); p.r(x,49,1,1,PAL.white); }
      return c; },
    // 초콜릿 동전 은행: 금박 박공 + 큰 동전, 초콜릿 벽, 웨하스 기둥
    candy_checkout(){ const c=mk(72,66), p=new PX(c); shadow(p,36,62,36,4);
      gable(p,36,9,16,2.1,PAL.roofYellow,shade(PAL.roofYellow,.88));
      p.ellO(36,18,5,5,PAL.gold); p.ell(36,18,3,3,shade(PAL.gold,.88)); p.r(35,16,1,4,PAL.gold); p.r(37,16,1,4,PAL.gold); p.r(35,15,3,1,PAL.gold); p.r(34,15,1,2,PAL.white);
      p.ellO(36,5,3,3,PAL.gold); p.r(35,4,1,1,PAL.white);
      p.box(3,24,66,6,PAL.roofYellow); p.r(4,25,64,1,PAL.white); for (let k=6;k<66;k+=5) p.r(k,27,2,2,shade(PAL.roofYellow,.85));
      wall(p,7,30,58,28,PAL.wood,PAL.wood2); for (let y=34;y<57;y+=5) for (let x=9;x<60;x+=8) p.r(x+((y/5|0)%2?4:0),y,5,1,shade(PAL.wood,.85));
      for (const x of [11,21,46,56]) { p.box(x,31,6,27,PAL.wall); p.r(x+1,32,1,25,PAL.white); p.r(x+4,32,1,25,PAL.wall2); p.r(x-1,30,8,2,PAL.wall2); p.o(x-1,30,8,2); }
      p.box(29,38,14,20,PAL.wood2); p.r(30,39,12,1,PAL.gold); p.r(35,39,2,19,PAL.outline); p.r(33,48,1,2,PAL.gold); p.r(38,48,1,2,PAL.gold); p.o(28,37,16,21,PAL.gold); p.o(27,36,18,22);
      p.box(3,58,66,3,PAL.stone2); p.r(4,59,64,1,PAL.stone); p.box(1,61,70,3,PAL.stone2); p.r(2,62,68,1,PAL.stone);
      return c; },
    // 디저트 카페: 민트 차양, 지붕 위 아이스크림콘
    candy_cafe(){ const c=mk(60,58), p=new PX(c); shadow(p,30,54,30,4);
      for (let i=0;i<13;i++){ const hw=Math.max(0,6-Math.floor(i/2)); p.r(30-hw,10+i,2*hw+1,1,CK); p.r(30-hw,10+i,1,1,PAL.outline); p.r(30+hw,10+i,1,1,PAL.outline); if (i%3===1) for (let x=30-hw+1;x<30+hw;x+=2) p.r(x,10+i,1,1,CK2); }
      p.ellO(30,10,7,5,PAL.pink); p.r(24,12,13,2,PAL.pink); p.r(23,13,15,1,PAL.outline); for (const x of [24,28,33,36]) p.r(x,14,1,1,PAL.outline); p.r(25,7,3,1,HL);
      p.ellO(30,4,5,4,shade(PAL.roofGreen,1.1)); p.r(27,2,2,1,HL); p.r(30,0,1,1,PAL.red);
      roof(p,2,20,56,10,PAL.roofGreen,shade(PAL.roofGreen,.86));
      wall(p,6,30,48,24,PAL.wall,PAL.wall2); scallop(p,6,30,48,PAL.roofGreen,PAL.white);
      p.box(10,40,16,11,PAL.water); p.r(11,41,14,9,'#e6faf6'); p.r(11,46,14,1,PAL.wood2);
      p.r(12,43,4,3,PAL.roofPink); p.r(12,43,4,1,PAL.white); p.r(18,43,5,3,PAL.wood); p.r(18,43,5,1,PAL.pink); p.r(14,48,3,2,PAL.roofYellow); p.r(19,48,3,2,PAL.roofLilac);
      door(p,37,39,10,15); p.r(29,42,6,6,PAL.white); p.o(28,41,8,8); p.sprite(['.www','w.ww','www.'],{w:PAL.wood2},30,43);
      return c; },
    // 제과 학교: 셰프 모자를 쓴 종탑
    candy_school(){ const c=mk(64,60), p=new PX(c); shadow(p,32,56,33,4);
      roof(p,2,22,60,10,PAL.roofBlue,shade(PAL.roofBlue,.85));
      wall(p,6,32,52,23,PAL.wall,PAL.wall2);
      p.box(24,12,16,22,PAL.wall); p.r(36,13,3,20,PAL.wall2); p.box(28,16,8,9,PAL.wood2); p.r(30,17,4,5,PAL.gold); p.r(29,21,6,1,PAL.gold); p.r(31,23,2,1,PAL.gold); p.r(30,17,1,2,PAL.white);
      p.box(24,8,16,5,PAL.white); p.r(24,10,16,1,PAL.stone2); p.o(24,8,16,5);
      p.ellO(27,5,4,4,PAL.white); p.ellO(37,5,4,4,PAL.white); p.ellO(32,4,5,4,PAL.white); p.r(25,6,14,3,PAL.white); p.r(34,6,4,1,PAL.stone2); p.r(29,3,2,1,PAL.stone2);
      for (const x of [10,18,43,51]) win(p,x,36,6,6); p.box(28,39,9,16,PAL.wood); p.r(32,40,1,14,PAL.wood2); p.r(30,46,1,1,PAL.gold); p.r(34,46,1,1,PAL.gold);
      for (const x of [11,44]) { p.r(x,46,10,6,PAL.wall2); p.o(x,46,10,6); p.r(x+2,48,6,2,CK); p.r(x+3,48,1,1,PAL.wood2); p.r(x+6,49,1,1,PAL.wood2); }
      return c; },
    // 반창고 약국: 지붕 위 커다란 반창고, 빨간 십자
    candy_clinic(){ const c=mk(58,56), p=new PX(c); shadow(p,29,52,29,4);
      p.r(15,14,2,6,PAL.outline); p.r(41,14,2,6,PAL.outline);
      p.r(8,5,42,10,BAND); p.r(7,6,1,8,BAND); p.r(50,6,1,8,BAND); p.r(8,12,42,2,BAND2); p.r(7,12,1,2,BAND2); p.r(50,12,1,2,BAND2);
      p.r(8,4,42,1,PAL.outline); p.r(8,15,42,1,PAL.outline); p.r(6,6,1,8,PAL.outline); p.r(51,6,1,8,PAL.outline); p.r(7,5,1,1,PAL.outline); p.r(50,5,1,1,PAL.outline); p.r(7,14,1,1,PAL.outline); p.r(50,14,1,1,PAL.outline);
      p.box(21,5,16,10,PAL.white); p.r(22,6,14,8,shade(BAND,1.12)); p.r(28,7,2,6,PAL.red); p.r(26,9,6,2,PAL.red);
      for (const [x,y] of [[11,8],[15,10],[11,11],[42,8],[46,10],[46,7]]) p.r(x,y,1,1,BAND2);
      p.box(3,18,52,5,PAL.roofGreen); p.r(4,19,50,1,HL);
      wall(p,5,22,48,28,PAL.white,PAL.stone);
      for (const x of [9,41]) win(p,x,27,8,8);
      p.box(23,25,12,11,PAL.white); p.r(28,26,2,9,PAL.red); p.r(24,29,10,3,PAL.red);
      glass(p,23,37,12,13); p.r(28,37,1,13,PAL.stone2);
      for (const [x,col] of ([[10,PAL.roofPink],[42,PAL.roofBlue]] as any[])) { p.box(x,40,7,4,PAL.white); p.r(x+1,41,3,2,col); p.r(x,44,1,6,PAL.outline); p.r(x+6,44,1,6,PAL.outline); }
      return c; },
    // 편지 봉투 우체국: 봉투 몸체 + 열린 분홍 덮개 지붕, 하트 봉인, 우표
    candy_post(){ const c=mk(58,56), p=new PX(c); shadow(p,29,52,29,4);
      gable(p,29,4,19,1.34,PAL.roofPink,shade(PAL.roofPink,.88)); p.r(26,8,3,1,HL);
      wall(p,5,22,48,30,PAL.wall,PAL.wall2);
      for (let x=6;x<=28;x++){ const y=23+Math.round((x-6)*14/22); p.r(x,y,1,1,shade(PAL.wall2,.85)); p.r(57-x,y,1,1,shade(PAL.wall2,.85)); }
      heart(p,29,14,PAL.red);
      p.box(41,25,9,10,PAL.white); p.r(43,27,5,6,PAL.roofBlue); p.r(44,29,3,2,PAL.white); for (let k=41;k<50;k+=2) { p.r(k,25,1,1,PAL.outline); p.r(k,34,1,1,PAL.outline); }
      door(p,24,38,10,14); win(p,9,37,8,8);
      p.box(41,40,8,8,PAL.red); p.ellO(45,40,4,2,PAL.red); p.r(42,40,6,2,PAL.red); p.r(43,42,4,1,PAL.outline); p.r(42,39,2,1,HL); p.r(44,48,2,3,PAL.outline);
      return c; },
    // 초콜릿 공장: 톱니 지붕, 사탕 굴뚝, 판초콜릿 간판, 초콜릿 통
    candy_factory(){ const c=mk(66,60), p=new PX(c); shadow(p,33,56,33,4);
      cane(p,9,2,5,22); cane(p,52,8,4,16,PAL.roofPink,PAL.white); p.r(8,1,7,2,PAL.wood2); p.o(8,0,7,3); p.r(51,7,6,2,PAL.wood2); p.o(51,6,6,3);
      for (let t=0;t<3;t++){ const x0=6+t*18; for (let i=0;i<10;i++){ const w=Math.min(18,Math.round((i+1)*1.8)); p.r(x0+18-w,15+i,w,1,PAL.roofPink); p.r(x0+18-w,15+i,1,1,PAL.outline); } p.r(x0+17,15,1,10,PAL.outline); p.r(x0+14,17,3,7,PAL.water); p.r(x0+14,17,1,7,PAL.white); }
      p.r(6,15,1,1,PAL.outline);
      wall(p,5,25,56,30,PAL.wood,PAL.wood2); p.r(5,25,56,2,PAL.wood2); p.o(5,25,56,2);
      p.box(21,30,26,13,PAL.wood2); for (let y=31;y<42;y+=5) for (let x=22;x<38;x+=4){ p.r(x,y,3,4,shade(PAL.wood,.95)); p.r(x,y,3,1,shade(PAL.wood,1.2)); }
      p.r(37,31,9,11,PAL.gold); p.r(37,31,1,11,PAL.outline); p.r(39,34,5,5,PAL.roofPink); p.r(40,35,1,1,PAL.white); p.r(38,32,7,1,HL);
      p.box(9,38,12,17,PAL.metal); for (let y=40;y<54;y+=3) p.r(10,y,10,1,PAL.metal2);
      p.r(51,32,6,3,PAL.metal2); p.o(51,32,6,3); p.r(55,35,2,6,PAL.metal2); p.o(54,35,4,7); p.r(55,42,2,3,PAL.wood2);
      p.box(48,45,14,10,PAL.metal); p.r(49,46,12,2,PAL.wood2); p.r(50,46,3,1,PAL.wood); p.r(49,50,12,1,PAL.metal2);
      return c; },
    // 젤리 정원: 민트 잔디 위 막대사탕 나무, 젤리 푸딩 동상, 검드롭
    candy_park(){ const c=mk(64,46), p=new PX(c);
      p.ellO(32,34,31,10,shade(PAL.leaf,1.25)); p.ell(32,36,28,7,shade(PAL.leaf,1.12));
      for (const [x,col] of ([[12,PAL.roofPink],[52,PAL.roofBlue]] as any[])) { p.box(x-1,14,3,22,PAL.white); p.r(x,15,1,20,PAL.stone2); swirl(p,x,10,7,col,PAL.white); }
      fillShape(p,22,14,21,17,(x,y)=>{ const t=(y-14)/16; const hw=6+t*4; return y<=30 && Math.abs(x-32.5)<=hw; },(x,y)=>((x-23)%5===0?shade(PAL.red,.85):(x<29?shade(PAL.red,1.15):PAL.red)));
      p.r(26,16,2,8,'rgba(255,255,255,.55)'); p.r(26,14,13,2,PAL.white); p.r(27,13,11,1,PAL.outline); p.r(25,14,1,2,PAL.outline); p.r(39,14,1,2,PAL.outline); p.r(28,16,2,2,PAL.white); p.r(35,16,1,3,PAL.white); p.r(32,10,1,3,PAL.leaf); p.ellO(32,10,2,2,PAL.red);
      p.r(20,30,25,3,PAL.white); p.o(20,30,25,3);
      for (const [x,y,col] of [[8,38,PAL.roofYellow],[16,41,PAL.roofLilac],[24,40,PAL.roofGreen],[40,40,PAL.roofPink],[48,41,PAL.roofYellow],[56,38,PAL.roofLilac],[5,31,PAL.roofGreen],[59,31,PAL.roofPink]]) gum(p,x,y,col);
      for (const [x,y,col] of ([[18,24,PAL.roofYellow],[46,25,PAL.roofLilac],[44,33,PAL.roofBlue],[18,33,PAL.pink]] as any[])) { p.r(x,y,4,2,col); p.o(x-1,y-1,6,4); p.r(x,y,1,1,PAL.white); }
      return c; },
  });
  NO_LIGHT.add('candy_plaza'); NO_LIGHT.add('candy_park');
  CHIMNEY.candy_home = 39; CHIMNEY.candy_factory = 11;

  // 막대사탕 나무 (크기 0: 분홍, 1: 민트·조금 큼)
  DECOR_KIND.tree.candy_tree = size => { const r=size?8:6, w=2*r+5, h=2*r+16, cx=r+2, c=mk(w,h), p=new PX(c), trunk=mk(w,h), tp=new PX(trunk);
    tp.box(cx-1,2*r,3,h-2*r,PAL.white); for (let y=2*r+2;y<h-1;y+=3) tp.r(cx,y,1,1,PAL.roofPink); tp.r(cx-3,h-1,7,1,PAL.outline);
    swirl(p,cx,r+1,r,size?PAL.roofGreen:PAL.roofPink,PAL.white);
    return { canopy:c, trunk, ax:cx, ay:h, sway:.7 }; };
  // 지팡이 사탕 아치 문
  DECOR_KIND.gate.candy_gate = () => { const c=mk(34,30), p=new PX(c), cx=16.5, cy=13;
    const inside=(x,y)=>{ if (x<0||x>33||y<0||y>29) return false; if (y<=cy){ const d=Math.hypot(x-cx,y-cy); return d>=11.2&&d<=16; } return (x>=1&&x<=5)||(x>=28&&x<=32); };
    fillShape(p,0,0,34,30,inside,(x,y)=>{ const k=y<=cy? Math.floor((Math.atan2(y-cy,x-cx)+Math.PI)*6)%2 : ((x+y)>>1)%2; return k?PAL.red:PAL.white; });
    p.box(9,12,16,8,PAL.roofPink); p.r(10,13,14,1,HL); heart(p,17,13,PAL.red); p.r(11,10,1,2,PAL.outline); p.r(22,10,1,2,PAL.outline);
    return c; };
  // 초콜릿 연못: 쿠키 테두리, 초콜릿, 마시멜로
  DECOR_KIND.pond.candy_pond = frame => { const c=mk(60,32), p=new PX(c);
    p.ellO(30,16,29,14,CK); for (const [x,y] of [[6,12],[12,24],[50,6],[54,20],[26,28],[40,27],[20,4]]) p.r(x,y,2,1,PAL.wood2);
    p.ellO(30,15,25,10,PAL.wood); p.ell(30,15,22,7,shade(PAL.wood,1.1));
    const s=frame?[[18,11,7],[34,17,6]]:[[20,12,6],[36,16,7]]; for (const [x,y,w] of s){ p.r(x,y,w,1,shade(PAL.wood,1.4)); p.r(x+2,y+1,w-3,1,shade(PAL.wood,1.25)); }
    p.box(41,9+(frame?1:0),6,4,PAL.white); p.r(42,9+(frame?1:0),3,1,PAL.pink); p.box(13,17,5,4,PAL.pink); p.r(14,17,2,1,PAL.white);
    p.r(48,20,7,2,CK2); p.o(47,19,9,4); p.r(49,20,1,1,PAL.wood2); p.r(52,20,1,1,PAL.wood2);
    return c; };
})();
