import { BUILD, CHIMNEY, DECOR_KIND, NO_LIGHT, PX, door, iconMap, mk, roof, scallop, shade, shadow, timber, win } from '../map';
import { FIXED_COMMON, ICON_ROWS, PAL, THEMES } from '../palette';
import { L } from '@visitown/i18n';
// 숲속 (forest)
(()=>{
  const OL = '#2e2620';
  // ---- 캐릭터 6종: 다람쥐(큰 꼬리) · 부엉이(귀깃·둥근 눈) · 고슴도치(가시) · 개구리(위로 솟은 눈) · 무당벌레(더듬이·점) · 버섯 요정(점박이 갓)
  const SHAPES = [
    { name:L("다람쥐"),
      down:['.......oooo.','......ohhBBo','.o...oohBBbo','oBoooBoohBbo','oBBBBBBohBbo','oBeBBeBoBBbo','oBeBBeBoBBbo','opBSSBpoBBbo','.oBSSBoohBbo','.oBBBBBohBbo','.onSSSnoBBbo','.oBSSSBoBbo.','..oobbbbboo.','...ff..gg...'],
      side:['.......oooo.','......ohhBBo','....o.oohBbo','...oBo.ohBbo','..oBBBoohBbo','.oBBBBBohBbo','.oeBBBBoBBbo','ooSpBBBoBBbo','oSSBBBBohBbo','.oBBBBBohBbo','..onSSBoBBbo','..oBSSBoBbo.','..oobbbbboo.','...ff..gg...'] },
    { name:L("부엉이"),
      down:['............','............','.oo......oo.','.oBo....oBo.','.oBBooooBBo.','oBBBBBBBBBBo','oBwwwBBwwwBo','oBwewBBwewBo','oBwwwrrwwwBo','obBSSrrSSBbo','obBSbSSbSBbo','.obBSSSSBbo.','..oobbbboo..','...ff..gg...'],
      side:['............','............','..oo....oo..','..oBo..oBo..','.oBBBooBBBo.','oBBBBBBBBBBo','oBwwwBBBBBbo','oBwewBBBBBbo','rrwwwBBBBBbo','oBSSSBBbbBbo','oBSbSBbBBbbo','.oSSSBbbbbo.','..oobbbboo..','...ff..gg...'] },
    { name:L("고슴도치"),
      down:['............','............','.o..o..o..o.','oBooBooBooBo','oBbBBbbBBbBo','obBbBBBBbBbo','oBbSSSSSSbBo','obSeSSSSeSbo','oBSeSSSSeSBo','obSpSeeSpSbo','.oBSSSSSSBo.','.obnSSSSnbo.','..oobbbboo..','...ff..gg...'],
      side:['............','............','....o..o..o.','...oBooBooBo','..oSBbBBbBBo','.oSSSBbBbBbo','.oeSSSBbBBbo','oSSSSSSBbBbo','ooSpSSBBbBbo','.oSSSSBbBbbo','..onSSBbBbo.','..oSSSbBbbo.','..oobbbboo..','...ff..gg...'] },
    { name:L("개구리"),
      down:['............','............','............','.ooo....ooo.','ohwwo..owwho','oBweBooBewBo','oBBBBBBBBBBo','opBBBBBBBBpo','oBeBBBBBBeBo','oBBeeeeeeBBo','.oBSSSSSSBo.','onBSSSSSSBno','.obbSSSSbbo.','..oobbbboo..','...ff..gg...'],
      side:['............','............','............','..ooo.......','.ohwwo......','.oewBoooooo.','oBBBBBBBBBBo','oBBBBBBBBBBo','opBBBBBBBBbo','oeeeeeBBBBbo','.oSSSSBBBBo.','..onSSBBBbo.','..obbbbbbbo.','..oobbbboo..','...ff..gg...'] },
    { name:L("무당벌레"),
      down:['............','.o........o.','..o......o..','...oooooo...','..oBhBBBBo..','.oBhBBBBBBo.','.oBeBBBBeBo.','.oBeBBBBeBo.','.opBBBBBBpo.','.okkkkkkkko.','ohBBBooBBBho','oBooBooBooBo','oBooBooBooBo','.oBBBooBBBo.','..oobbbboo..','...ff..gg...'],
      side:['............','..o.........','...o........','...ooooooo..','..oBhBBBBBo.','.oBhBBBBBBo.','.oeBBBBBBBo.','.oeBBBBBBBo.','.opBBBBBBBo.','..okkkkkkko.','.ohBBBBBBBo.','.oBooBBBooBo','.oBooBBBooBo','..oBBBBBBo..','..oobbbboo..','...ff..gg...'] },
    { name:L("버섯 요정"),
      down:['....oooo....','..ooMMMMoo..','.oMWWMMMMMo.','oMMWWMMWWMMo','oMMMMMMWWMMo','oWWMMMMMMMMo','oMMMMMMMMWWo','.oooooooooo.','..oBBBBBBo..','..oBSSSSBo..','..oSeSSeSo..','..opSSSSpo..','...oLLLLo...','..onLLLLno..','..oLLLLLLo..','...ff..gg...'],
      side:['....oooo....','..ooMMMMoo..','.oMWWMMMMMo.','oMMWWMMWWMMo','oMMMMMMWWMMo','oWWMMMMMMMMo','oMMMMMMMMWWo','.oooooooooo.','..oBBBBBBo..','..oSSSBBBo..','..oeSSBBBo..','..oSpSBBBo..','...oLLLLo...','...onLLLo...','..oLLLLLLo..','...ff..gg...'] },
  ];
  NO_LIGHT.add('forest_plaza'); NO_LIGHT.add('forest_park'); NO_LIGHT.add('forest_community');
  CHIMNEY.forest_home = 44; CHIMNEY.forest_factory = 53;

  THEMES.forest = {
    name:L("숲속"), order:4,
    palette:{ outline:OL, grass:'#74ab5c', grass2:'#689f52', grass3:'#558b44', dirt:'#cfae78', dirt2:'#a9875a', stone:'#cfc9b2', stone2:'#a29b82',
      water:'#94cbd6', water2:'#5a9fb6', wall:'#f2e5c6', wall2:'#d8c49c', wood:'#b07a4c', wood2:'#7a5034',
      roofPink:'#e27d63', roofBlue:'#6d97b8', roofGreen:'#86bd5e', roofYellow:'#efc455', roofLilac:'#b39acb',
      white:'#fffbec', leaf:'#5fae58', pink:'#f0a0a4', red:'#d44a3c', gold:'#f2c042', metal:'#bdb8a6', metal2:'#8c8775', skin:'#f5d6ac' },
    characters:{ shapes:SHAPES, colors:[
        { name:L("도토리"), B:'#b9773f', b:'#8a5328', h:'#dda56f' },{ name:L("이끼"), B:'#7fae55', b:'#5a8a3a', h:'#acd283' },{ name:L("꿀"), B:'#e5b34a', b:'#b98426', h:'#f6da8f' },
        { name:L("블루베리"), B:'#6d83c4', b:'#4a5e98', h:'#a0b2e4' },{ name:L("자두"), B:'#9b6fb5', b:'#714a8c', h:'#c6a6da' },{ name:L("단풍"), B:'#e0713e', b:'#b14f25', h:'#f4a77f' }],
      fixed:{ ...FIXED_COMMON, o:OL, e:OL, f:OL, g:OL, S:'#f6e7c8', n:'#f6e7c8', H:'#7a5034', k:'#3f3530', r:'#ec9a3c', L:'#6fbb55', M:'#d8483a', W:'#fff8ea' },
      up:{ S:'B', e:'B', p:'B', w:'B', n:'B', r:'B' } },
    kinds:{ plaza:[L("큰 나무 광장"),'forest_plaza','star'], shop:[L("열매 가게"),'forest_shop','cart'], library:[L("부엉이 도서관"),'forest_library','book'], community:[L("모닥불 모임터"),'forest_community','heart'],
      home:[L("버섯집"),'forest_home','house'], checkout:[L("도토리 저금통"),'forest_checkout','coin'], cafe:[L("꿀벌 찻집"),'forest_cafe','mug'], school:[L("나뭇잎 학교"),'forest_school','bell'],
      clinic:[L("약초 오두막"),'forest_clinic','cross'], post:[L("다람쥐 우편함"),'forest_post','mail'], factory:[L("개미 공방"),'forest_factory','gear'], park:[L("꽃밭"),'forest_park','flower'] },
    decor:{ tree:'forest_tree', gate:'forest_gate', pond:'forest_pond', ground:'grass' },
  };

  // ---- 헬퍼
  const LEAF_D='#3f7f3e', LEAF_L='#93cf6a';
  // 겹친 타원 덩어리(나뭇잎): 외곽선 → 어두운 면 → 밝은 면 → 하이라이트
  function blob(p, list, fill=PAL.leaf, dark=LEAF_D, light=LEAF_L){
    for (const [x,y,rx,ry] of list) p.ell(x,y,rx+1,ry+1,PAL.outline);
    for (const [x,y,rx,ry] of list) p.ell(x,y,rx,ry,dark);
    for (const [x,y,rx,ry] of list) p.ell(x,y-1,Math.max(1,rx-1),Math.max(1,ry-2),fill);
    for (const [x,y,rx,ry] of list) if (rx>5) p.ell(x-Math.round(rx/3),y-Math.round(ry/2),Math.round(rx/3),Math.max(1,Math.round(ry/4)),light);
  }
  // 아래쪽을 잘라낸 반타원(갓·지붕)
  function dome(w,h,cx,cy,rx,ry,cut,fill){ const c=mk(w,h), q=new PX(c); q.ellO(cx,cy,rx,ry,fill); q.g.clearRect(0,cut,w,h); q.r(cx-rx,cut-1,2*rx+1,1,PAL.outline); return {c,q}; }
  function bark(p,x,y,w,h){ p.r(x,y,w,h,PAL.wood); p.r(x+w-Math.max(2,Math.floor(w/4)),y,Math.max(2,Math.floor(w/4)),h,PAL.wood2); for(let k=x+3;k<x+w-3;k+=5) for(let yy=y+2;yy<y+h-2;yy+=7) p.r(k,yy+(k%3),1,4,PAL.wood2); p.r(x+1,y,1,h,'rgba(255,255,255,.25)'); p.o(x,y,w,h); }
  function sign(p,x,y,icon){ p.box(x,y,16,14,PAL.wall); p.r(x+1,y+1,14,1,PAL.white); p.sprite(ICON_ROWS[icon],iconMap(),x+2,y+1); }
  function flame(p,x,y){ p.r(x-3,y-4,7,4,PAL.red); p.r(x-2,y-7,5,3,PAL.red); p.r(x-1,y-9,3,2,PAL.red); p.r(x,y-11,1,2,PAL.red); p.r(x-2,y-4,5,3,PAL.gold); p.r(x-1,y-6,3,2,PAL.gold); p.r(x,y-8,1,2,PAL.gold); p.r(x-1,y-3,3,2,PAL.white); }

  Object.assign(BUILD, {
    // 큰 나무 광장: 마을 한가운데 커다란 참나무, 줄기에 둥근 문, 가지에 등불
    forest_plaza(){ const c=mk(80,64), p=new PX(c); shadow(p,40,60,38,4);
      for (let y=28;y<60;y++){ const w=7+(y>47?Math.round(Math.pow((y-47)/12,2)*10):0); p.r(40-w,y,2*w,1,PAL.wood); p.r(40+w-4,y,4,1,PAL.wood2); p.r(40-w,y,1,1,PAL.outline); p.r(40+w-1,y,1,1,PAL.outline); }
      p.r(23,59,34,1,PAL.outline); for (const x of [27,52]) p.r(x,57,1,2,PAL.wood2); for (const [x,y] of [[36,32],[43,38],[35,44],[44,50]]) p.r(x,y,1,4,PAL.wood2); p.r(34,29,1,26,'rgba(255,255,255,.22)');
      p.r(36,48,9,11,PAL.wood2); p.r(37,47,7,1,PAL.wood2); p.o(36,48,9,11); p.r(37,47,7,1,PAL.outline); p.r(36,48,1,1,PAL.outline); p.r(44,48,1,1,PAL.outline); p.r(37,49,7,10,'#5a3a26'); p.r(42,53,1,1,PAL.gold);
      blob(p, [[40,15,24,13],[17,24,14,9],[63,24,14,9],[40,27,22,7],[26,11,12,8],[54,11,12,8]]);
      for (const [x,y] of [[14,28],[64,30]]){ p.r(x,y-4,1,4,PAL.outline); p.box(x-2,y,5,6,PAL.gold); p.r(x-1,y+1,3,4,'#fff3b0'); }
      for (const [x,y] of [[22,18],[56,16],[44,8],[30,26]]){ p.r(x,y,2,2,PAL.red); p.r(x,y,1,1,PAL.white); }
      for (const [x,col] of ([[24,PAL.red],[57,PAL.roofYellow]] as any[])){ p.r(x,56,1,3,PAL.white); p.ellO(x,55,3,2,col); p.r(x-1,54,1,1,PAL.white); } return c; },
    // 열매 가게: 통나무 오두막 + 빨강·하양 줄무늬 차양 + 열매 상자
    forest_shop(){ const c=mk(66,60), p=new PX(c); shadow(p,33,57,33,4);
      p.r(6,22,54,34,PAL.wood); for(let y=25;y<55;y+=4) p.r(7,y,52,1,PAL.wood2); p.r(55,22,5,34,PAL.wood2); p.o(6,22,54,34); for(let y=24;y<54;y+=4){ p.r(4,y,3,3,PAL.wood); p.o(4,y,3,3); p.r(5,y+1,1,1,PAL.wall2); }
      roof(p,1,8,64,15,PAL.roofGreen,shade(PAL.roofGreen,.8)); for (const [x,y] of [[20,14],[38,12],[48,18],[12,20]]) p.r(x,y,3,1,LEAF_L);
      scallop(p,4,28,56,PAL.red,PAL.white); p.r(4,28,1,7,PAL.outline); p.r(59,28,1,7,PAL.outline);
      p.box(10,38,24,12,'#5a3a26'); p.r(11,39,22,1,PAL.wood2); for (const [x,col] of ([[12,PAL.red],[17,PAL.roofLilac],[22,PAL.gold],[27,PAL.red]] as any[])){ p.r(x,41,4,3,col); p.r(x,41,1,1,'rgba(255,255,255,.6)'); } p.r(11,45,22,1,PAL.wood2); for (const [x,col] of ([[13,PAL.wood2],[19,PAL.leaf],[25,PAL.pink]] as any[])) p.r(x,46,4,3,col);
      door(p,42,40,11,16);
      for (const [x,col] of ([[8,PAL.red],[20,PAL.gold]] as any[])){ p.box(x,50,10,7,PAL.wood); p.r(x+1,52,8,1,PAL.wood2); for(let k=0;k<4;k++) p.r(x+1+k*2,49-(k%2),2,2,col); } return c; },
    // 부엉이 도서관: 속이 빈 큰 나무 탑, 파란 고깔 지붕, 구멍에서 부엉이가 내다본다
    forest_library(){ const c=mk(60,78), p=new PX(c); shadow(p,30,75,27,4);
      bark(p,11,24,38,51); for (const [x,d] of [[8,-1],[48,1]]){ p.r(x,68,4,7,PAL.wood); p.o(x,68,4,7); } p.r(9,68,2,1,PAL.wood); p.r(49,68,2,1,PAL.wood);
      for (let i=0;i<22;i++){ const hw=Math.round(i*1.1); p.r(30-hw,2+i,2*hw+1,1,PAL.roofBlue); if(i%4===3) for(let k=30-hw+2;k<30+hw-1;k+=4) p.r(k,2+i,2,1,shade(PAL.roofBlue,.82)); p.r(30-hw,2+i,1,1,PAL.outline); p.r(30+hw,2+i,1,1,PAL.outline); }
      p.r(5,24,51,3,PAL.roofBlue); p.o(5,24,51,3); p.r(6,25,49,1,'rgba(255,255,255,.35)'); p.r(29,0,3,2,PAL.gold); p.r(30,-1,1,1,PAL.gold);
      p.ellO(30,38,8,7,'#3a2a20'); p.ell(30,41,5,3,'#4a3626');
      p.r(25,35,10,8,PAL.roofLilac); p.r(25,33,2,2,PAL.roofLilac); p.r(33,33,2,2,PAL.roofLilac); p.r(26,36,3,3,PAL.white); p.r(31,36,3,3,PAL.white); p.r(27,37,1,1,PAL.outline); p.r(32,37,1,1,PAL.outline); p.r(29,39,2,2,PAL.gold); p.r(25,42,10,1,PAL.wood2);
      for (const x of [14,38]){ p.box(x,48,9,11,'#5a3a26'); p.r(x-1,47,11,1,PAL.wood2); for(let k=0;k<3;k++){ p.r(x+1+k*2+(k>1?1:0),50,2,8,[PAL.red,PAL.roofBlue,PAL.gold][k]); } }
      p.r(24,59,13,16,'#3a2a20'); p.r(25,58,11,1,'#3a2a20'); p.o(24,59,13,16); p.r(25,58,11,1,PAL.outline); door(p,25,61,11,14); return c; },
    // 모닥불 모임터: 원뿔 천막 + 모닥불 + 통나무 의자 + 깃발 줄
    forest_community(){ const c=mk(78,62), p=new PX(c); shadow(p,39,59,38,4);
      const tx=26, top=6, th=48; for (let i=0;i<th;i++){ const hw=Math.round(i*0.46); const y=top+i; p.r(tx-hw,y,2*hw+1,1,PAL.wall); p.r(tx+Math.max(0,hw-4),y,Math.min(hw,4)+1,1,PAL.wall2); if ((i>14&&i<18)||(i>30&&i<34)) p.r(tx-hw,y,2*hw+1,1,i<20?PAL.roofPink:PAL.roofBlue); p.r(tx-hw,y,1,1,PAL.outline); p.r(tx+hw,y,1,1,PAL.outline); }
      p.r(tx-22,top+th-1,45,1,PAL.outline); for (const d of [-1,1]){ p.r(tx+d*2,1,1,6,PAL.wood2); p.r(tx+d*3,0,1,2,PAL.wood2); } p.r(tx,2,1,5,PAL.wood2);
      for (let i=0;i<20;i++){ const hw=Math.round(i*0.4); p.r(tx-hw,top+th-20+i,2*hw+1,1,'#3a2a20'); } p.r(tx,top+th-20,1,20,PAL.outline);
      for (let i=0;i<9;i++){ p.r(tx-6-i,top+th-12+i,1,1,PAL.wall); }
      p.r(70,10,2,48,PAL.wood2); p.o(69,9,4,2); for (let x=tx+3;x<70;x++){ const y=12+Math.round(Math.sin((x-tx-3)/(70-tx-3)*Math.PI)*5); p.r(x,y,1,1,PAL.outline); if ((x-tx)%6===0){ const col=[PAL.red,PAL.gold,PAL.roofBlue,PAL.leaf][(x/6|0)%4]; p.r(x,y+1,3,2,col); p.r(x+1,y+3,1,1,col); } }
      p.ellO(57,53,9,3,PAL.stone2); p.r(50,50,14,3,PAL.wood); p.o(50,50,14,3); p.r(55,48,4,6,PAL.wood2); flame(p,57,51);
      for (const [x,y] of [[44,55],[66,57]]){ p.box(x-5,y-3,10,5,PAL.wood); p.r(x-4,y-2,8,1,'rgba(255,255,255,.25)'); p.ellO(x+4,y-1,1,2,PAL.wall2); } return c; },
    // 버섯집: 빨간 점박이 갓 + 크림색 기둥 + 둥근 문
    forest_home(){ const c=mk(60,64), p=new PX(c); shadow(p,30,61,25,4);
      for (let y=30;y<61;y++){ const w=13+(y>52?Math.round((y-52)*0.6):0); p.r(30-w,y,2*w,1,PAL.wall); p.r(30+w-5,y,5,1,PAL.wall2); p.r(30-w,y,1,1,PAL.outline); p.r(30+w-1,y,1,1,PAL.outline); } p.r(13,60,34,1,PAL.outline);
      p.box(41,2,7,10,PAL.stone2); p.r(40,1,9,2,PAL.stone); p.o(40,1,9,2);
      const {c:cap,q}=dome(60,40,30,26,29,23,32,PAL.red); q.r(2,29,56,2,shade(PAL.red,.8)); q.r(1,31,58,1,PAL.outline);
      for (const [x,y,rx,ry] of [[18,12,4,3],[34,8,3,2],[46,18,4,3],[26,22,3,2],[10,24,2,2],[50,28,2,1]]) q.ell(x,y,rx,ry,PAL.white); q.ell(22,8,5,2,'rgba(255,255,255,.35)'); p.g.drawImage(cap,0,0);
      p.r(17,32,26,2,shade(PAL.wall2,.85));
      p.r(25,45,10,16,PAL.wood); p.r(26,43,8,2,PAL.wood); p.r(27,42,6,1,PAL.wood); p.o(25,45,10,16); p.r(26,43,1,2,PAL.outline); p.r(33,43,1,2,PAL.outline); p.r(27,42,6,1,PAL.outline); p.r(30,44,1,16,PAL.wood2); p.r(32,52,1,1,PAL.gold);
      p.ellO(19,40,3,3,PAL.water); p.r(19,38,1,5,PAL.white); p.ellO(41,40,3,3,PAL.water); p.r(41,38,1,5,PAL.white);
      for (const [x,col] of ([[14,PAL.pink],[46,PAL.gold]] as any[])){ p.r(x,58,3,2,PAL.leaf); p.r(x+1,57,1,1,col); } return c; },
    // 도토리 저금통: 커다란 도토리 + 동전 투입구 + 동전 더미
    forest_checkout(){ const c=mk(60,64), p=new PX(c); shadow(p,30,61,26,4);
      for (let y=22;y<60;y++){ const t=(y-22)/38; const hw=Math.max(1,Math.round(23*Math.sqrt(Math.max(0,1-Math.pow(Math.max(0,t-0.25)/0.78,2))))); p.r(30-hw,y,2*hw+1,1,'#d9a25c'); p.r(30+hw-5,y,Math.min(5,hw),1,'#b07a3c'); p.r(30-hw,y,1,1,PAL.outline); p.r(30+hw,y,1,1,PAL.outline); }
      p.r(29,59,3,1,PAL.outline); p.r(13,26,2,20,'rgba(255,255,255,.35)');
      const {c:cap,q}=dome(60,34,30,22,27,15,28,PAL.wood2); q.g.globalCompositeOperation='source-atop'; for(let y=10;y<26;y+=3) for(let x=6;x<56;x+=4) q.r(x+((y/3)%2?2:0),y,2,1,shade(PAL.wood2,.75)); q.ell(22,11,5,2,'rgba(255,255,255,.2)'); q.g.globalCompositeOperation='source-over'; q.r(3,27,55,1,PAL.outline); p.g.drawImage(cap,0,0);
      p.r(28,1,4,7,PAL.wood2); p.o(28,1,4,7); p.r(22,13,16,3,PAL.outline); p.r(23,14,14,1,'#1e1814'); p.ellO(30,10,3,3,PAL.gold); p.r(29,9,1,2,PAL.white);
      p.r(22,34,16,16,PAL.wall); p.o(22,34,16,16); p.sprite(ICON_ROWS.coin,iconMap(),24,36); p.r(20,50,20,3,PAL.wood2); p.o(20,50,20,3);
      for (const [x,n] of [[8,3],[52,2]]) for(let k=0;k<n;k++){ p.ellO(x,58-k*2,4,1,PAL.gold); p.r(x-2,57-k*2,2,1,PAL.white); } return c; },
    // 꿀벌 찻집: 층층이 쌓인 벌집 + 꿀 방울 + 꿀벌
    forest_cafe(){ const c=mk(60,58), p=new PX(c); shadow(p,30,55,26,4);
      const rings=[[8,9],[15,15],[23,20],[31,23],[39,25],[47,25]]; for (const [y,rx] of rings){ p.ellO(30,y,rx,5,PAL.roofYellow); p.ell(30+Math.round(rx*.55),y+1,Math.round(rx*.4),2,shade(PAL.roofYellow,.86)); p.r(30-Math.round(rx*.6),y-3,Math.round(rx*.6),1,'rgba(255,255,255,.4)'); }
      p.r(6,47,49,6,PAL.roofYellow); p.r(49,47,6,6,shade(PAL.roofYellow,.85)); p.o(5,46,51,8); p.r(5,46,1,1,'rgba(0,0,0,0)');
      p.r(4,3,0,0,PAL.outline); p.r(29,0,2,4,PAL.wood2);
      for (const [x,y,h] of [[14,25,4],[44,33,5],[22,41,3]]){ p.r(x,y,2,h,PAL.gold); p.r(x,y+h,2,1,PAL.outline); p.r(x,y,1,1,PAL.white); }
      p.r(25,39,11,15,'#5a3a26'); p.r(26,37,9,2,'#5a3a26'); p.r(27,36,7,1,'#5a3a26'); p.o(25,39,11,15); p.r(26,37,1,2,PAL.outline); p.r(34,37,1,2,PAL.outline); p.r(27,36,7,1,PAL.outline); p.r(29,46,3,1,PAL.gold);
      p.box(23,24,15,11,PAL.wall); p.sprite(ICON_ROWS.mug,iconMap(),24,23);
      for (const [x,y] of [[6,14],[50,20]]){ p.r(x,y,4,3,PAL.gold); p.r(x+1,y,1,3,PAL.outline); p.r(x+3,y,1,3,PAL.outline); p.r(x+1,y-2,2,2,PAL.white); p.r(x-1,y+1,1,1,PAL.outline); }
      p.ellO(49,52,4,1,PAL.wood); p.r(48,53,2,3,PAL.wood2); p.r(47,49,3,2,PAL.white); return c; },
    // 나뭇잎 학교: 커다란 잎사귀 지붕 + 종
    forest_school(){ const c=mk(66,58), p=new PX(c); shadow(p,33,55,31,4);
      p.r(8,30,50,24,PAL.wall); p.r(53,30,5,24,PAL.wall2); p.o(8,30,50,24);
      const x0=1, w=64, cy=22; for (let x=0;x<w;x++){ const hh=Math.round(9*Math.pow(Math.sin(Math.PI*(x+.5)/w),.8)); p.r(x0+x,cy-hh,1,2*hh+1,PAL.roofGreen); p.r(x0+x,cy+1,1,hh,shade(PAL.roofGreen,.85)); p.r(x0+x,cy-hh,1,1,PAL.outline); p.r(x0+x,cy+hh,1,1,PAL.outline); }
      p.r(x0,cy,w,1,shade(PAL.roofGreen,.65)); for (let k=8;k<w-6;k+=8){ for(let i=0;i<4;i++){ p.r(x0+k+i,cy-1-i,1,1,shade(PAL.roofGreen,.75)); p.r(x0+k+i,cy+1+i,1,1,shade(PAL.roofGreen,.65)); } }
      p.r(x0+8,cy-6,20,1,'rgba(255,255,255,.35)'); p.r(64,21,2,1,PAL.wood2); p.r(65,22,1,3,PAL.wood2);
      p.r(29,4,1,10,PAL.wood2); p.r(37,4,1,10,PAL.wood2); p.r(27,2,13,3,PAL.wood); p.o(27,2,13,3); p.r(31,6,5,5,PAL.gold); p.r(30,10,7,1,PAL.gold); p.o(30,6,7,5); p.r(31,6,5,1,PAL.outline); p.r(33,11,1,1,PAL.outline); p.r(32,7,1,2,PAL.white);
      for (const x of [12,22,38,48]) win(p,x,34,7,7); p.box(28,38,10,16,PAL.wood); p.r(33,39,1,14,PAL.wood2); p.r(31,46,1,1,PAL.gold); p.r(35,46,1,1,PAL.gold);
      p.box(11,45,12,7,'#3f5a44'); p.r(13,47,5,1,PAL.white); p.r(13,49,7,1,PAL.white); p.r(14,52,1,2,PAL.wood2); p.r(20,52,1,2,PAL.wood2); return c; },
    // 약초 오두막: 보라 지붕 + 빨간 십자 + 매달린 약초 + 화분
    forest_clinic(){ const c=mk(60,58), p=new PX(c); shadow(p,30,55,29,4);
      p.r(6,24,48,28,PAL.white); p.r(49,24,5,28,PAL.wall2); p.o(6,24,48,28); timber(p,7,25,46,26);
      roof(p,1,10,58,15,PAL.roofLilac,shade(PAL.roofLilac,.85));
      p.box(23,0,14,13,PAL.white); p.r(29,2,2,9,PAL.red); p.r(25,5,10,3,PAL.red);
      for (const x of [9,17,41,49]){ p.r(x,25,1,2,PAL.wood2); p.r(x-1,27,3,4,PAL.leaf); p.r(x-1,28,1,1,LEAF_D); p.r(x,31,1,1,LEAF_D); }
      win(p,12,33,8,8); win(p,40,33,8,8); door(p,25,36,10,16);
      for (const [x,col] of ([[10,PAL.pink],[44,PAL.white]] as any[])){ p.box(x,47,7,6,PAL.roofPink); p.r(x+1,44,5,3,PAL.leaf); p.r(x+2,43,1,1,col); p.r(x+4,44,1,1,col); }
      p.ellO(39,50,2,1,PAL.stone2); return c; },
    // 다람쥐 우편함: 칸칸이 우편함이 뚫린 그루터기 + 빨간 우체통 + 지붕 위 다람쥐
    forest_post(){ const c=mk(56,60), p=new PX(c); shadow(p,30,57,25,4);
      bark(p,16,20,30,37); p.r(13,52,4,5,PAL.wood); p.o(13,52,4,5); p.r(45,52,4,5,PAL.wood); p.o(45,52,4,5);
      roof(p,12,8,38,13,PAL.roofPink,shade(PAL.roofPink,.85));
      for (const [x,y] of [[19,24],[27,24],[35,24],[19,33],[27,33],[35,33]]){ p.r(x,y,7,7,PAL.outline); p.r(x+1,y+1,5,5,'#3a2a20'); if ((x+y)%3) { p.r(x+1,y+3,5,3,PAL.white); p.r(x+1,y+3,5,1,PAL.wall2); p.r(x+3,y+4,1,1,PAL.red); } }
      door(p,25,43,9,14);
      p.r(6,40,2,17,PAL.wood2); p.box(1,28,12,12,PAL.red); p.r(1,28,12,3,shade(PAL.red,.8)); p.o(1,28,12,12); p.r(3,33,8,1,PAL.outline); p.r(2,29,1,10,'rgba(255,255,255,.35)'); p.r(10,34,4,1,PAL.outline); p.r(13,32,1,3,PAL.gold);
      // 지붕 위 다람쥐
      p.r(40,0,3,1,PAL.outline); p.r(39,1,1,5,PAL.outline); p.r(43,1,1,3,PAL.outline); p.r(40,1,3,4,'#b9773f'); p.r(42,2,1,2,'#dda56f');
      p.r(33,3,6,5,'#b9773f'); p.o(32,2,8,7); p.r(33,1,1,1,PAL.outline); p.r(37,1,1,1,PAL.outline); p.r(34,4,1,1,OL); p.r(33,6,2,1,'#f6e7c8'); p.r(39,5,3,3,'#b9773f'); p.o(38,5,5,4); return c; },
    // 개미 공방: 흙 둔덕에 뚫린 굴 + 톱니 간판 + 굴뚝 + 개미
    forest_factory(){ const c=mk(66,58), p=new PX(c); shadow(p,33,55,32,4);
      p.box(51,4,5,16,PAL.metal2); p.r(50,3,7,2,PAL.metal); p.o(50,3,7,2); p.r(52,5,1,14,PAL.metal);
      const {c:m,q}=dome(66,58,32,52,30,38,55,'#c48a52'); for (let i=0;i<70;i++){ const x=4+((i*37)%58), y=18+((i*23)%34); q.r(x,y,2,1,'#a8703e'); } q.r(3,54,59,1,PAL.outline);
      q.g.globalCompositeOperation='source-atop'; q.ell(20,24,8,6,'rgba(255,255,255,.18)'); q.r(48,14,16,41,'rgba(0,0,0,.12)'); q.g.globalCompositeOperation='source-over'; p.g.drawImage(m,0,0);
      for (const [x,y,w,h] of [[24,38,14,16],[10,40,8,10],[44,24,8,9],[18,22,7,7]]){ p.r(x,y+2,w,h-2,'#2e211a'); p.r(x+1,y,w-2,2,'#2e211a'); p.o(x,y+2,w,h-2); p.r(x+1,y+1,w-2,1,PAL.outline); p.r(x,y+2,1,1,PAL.outline); p.r(x+1,y,w-2,1,PAL.outline); }
      p.r(25,40,12,1,PAL.wood2); p.r(26,46,3,8,PAL.wood); p.r(33,46,3,8,PAL.wood); p.r(25,45,12,2,PAL.wood);
      p.box(26,10,14,13,PAL.wall); p.sprite(ICON_ROWS.gear,iconMap(),27,11);
      for (const [x,y] of [[8,54],[16,53],[42,54],[50,53],[58,54],[46,34]]){ p.r(x,y,1,1,OL); p.r(x+1,y,2,1,OL); p.r(x+3,y,1,1,OL); p.r(x+1,y-1,1,1,OL); p.r(x+1,y+1,1,1,OL); p.r(x+2,y+1,1,1,OL); }
      p.r(46,48,12,4,PAL.wood); p.o(46,48,12,4); p.r(47,52,2,3,PAL.wood2); p.r(55,52,2,3,PAL.wood2); p.r(49,46,4,2,PAL.metal); p.r(55,45,1,3,PAL.gold); return c; },
    // 꽃밭: 낮은 울타리 + 해바라기 + 꽃 + 나비
    forest_park(){ const c=mk(64,46), p=new PX(c); p.ellO(32,34,30,10,PAL.grass2,PAL.grass3); p.ell(32,35,27,7,shade(PAL.grass2,.94));
      for (let k=2;k<62;k+=5){ if (k>=27&&k<=35) continue; p.r(k,33,2,9,PAL.wood); p.r(k,32,2,1,PAL.outline); } p.r(2,36,25,1,PAL.wood2); p.r(37,36,25,1,PAL.wood2); p.r(2,39,25,1,PAL.wood2); p.r(37,39,25,1,PAL.wood2);
      for (const [x,top] of [[12,8],[22,14],[46,10]]){ p.r(x,top+4,1,30-top,LEAF_D); p.r(x+1,top+12,3,2,PAL.leaf); p.r(x-3,top+16,3,2,PAL.leaf); for (const [dx,dy] of [[0,-4],[0,4],[-4,0],[4,0],[-3,-3],[3,-3],[-3,3],[3,3]]) p.r(x+dx-1,top+dy-1,3,3,PAL.gold); p.ellO(x,top,3,3,PAL.wood2); p.r(x-1,top-1,1,1,PAL.wood); }
      for (const [x,y,col] of ([[30,24,PAL.pink],[36,22,PAL.white],[54,22,PAL.roofLilac],[6,26,PAL.pink],[40,28,PAL.red],[58,28,PAL.white],[18,28,PAL.roofLilac],[32,29,PAL.gold]] as any[])){ p.r(x,y+1,1,3,LEAF_D); p.r(x-1,y,3,1,col); p.r(x,y-1,1,3,col); p.r(x,y,1,1,col===PAL.gold?PAL.red:PAL.gold); }
      p.r(29,30,6,2,PAL.stone2); p.r(30,34,5,2,PAL.stone2); p.r(30,30,2,1,PAL.stone);
      p.r(33,4,2,1,PAL.roofBlue); p.r(36,4,2,1,PAL.roofBlue); p.r(32,5,3,2,PAL.roofBlue); p.r(36,5,3,2,PAL.roofBlue); p.r(35,4,1,4,OL); return c; },
  });

  // ---- 장식: 굵은 참나무
  DECOR_KIND.tree.forest_tree = size => { const r=size?13:10, W2=2*r+4, H2=2*r+16, cx=Math.floor(W2/2); const c=mk(W2,H2), p=new PX(c), trunk=mk(W2,H2), tp=new PX(trunk);
    const ty=r+4; for (let y=ty;y<H2;y++){ const w=3+(y>H2-5?(y-(H2-5)):0); tp.r(cx-w,y,2*w,1,PAL.wood); tp.r(cx+w-2,y,2,1,PAL.wood2); tp.r(cx-w,y,1,1,PAL.outline); tp.r(cx+w-1,y,1,1,PAL.outline); } tp.r(cx-6,H2-1,12,1,PAL.outline); tp.r(cx-1,ty+3,1,3,PAL.wood2);
    blob(p, [[cx,r+1,r,r-2],[cx-Math.round(r*.55),r+4,Math.round(r*.55),Math.round(r*.5)],[cx+Math.round(r*.55),r+4,Math.round(r*.55),Math.round(r*.5)]]);
    p.r(cx+3,r+5,2,2,PAL.wood2); p.r(cx+3,r+4,2,1,PAL.wood); if (size){ p.r(cx-5,r+7,2,2,PAL.wood2); p.r(cx-5,r+6,2,1,PAL.wood); }
    return { canopy:c, trunk, ax:cx, ay:H2, sway:.7 }; };
  // ---- 장식: 나뭇가지 아치 문
  DECOR_KIND.gate.forest_gate = () => { const c=mk(34,30), p=new PX(c);
    for (const x of [1,28]){ p.r(x,10,5,20,PAL.wood); p.r(x+3,10,2,20,PAL.wood2); p.o(x,10,5,20); p.r(x+1,11,1,18,'rgba(255,255,255,.25)'); }
    for (let x=3;x<31;x++){ const y=10-Math.round(Math.sin((x-3)/28*Math.PI)*7); p.r(x,y,1,3,PAL.wood2); p.r(x,y-1,1,1,PAL.outline); p.r(x,y+3,1,1,PAL.outline); }
    blob(p, [[5,7,5,4],[29,7,5,4],[17,3,6,3]]); for (const [x,y,col] of ([[4,5,PAL.pink],[30,6,PAL.gold],[17,1,PAL.white],[10,9,PAL.red]] as any[])) p.r(x,y,2,2,col);
    p.r(11,10,1,4,PAL.outline); p.r(22,10,1,4,PAL.outline); p.box(9,14,16,7,PAL.wall); p.r(12,16,3,3,PAL.leaf); p.r(16,16,2,3,PAL.wood2); p.r(19,16,3,3,PAL.leaf); return c; };
  // ---- 장식: 수련 연못
  DECOR_KIND.pond.forest_pond = frame => { const c=mk(60,32), p=new PX(c);
    p.ellO(30,16,29,14,PAL.grass3); p.ellO(30,16,26,11,PAL.water); p.ell(30,17,23,8,shade(PAL.water,.92)); p.ell(24,11,10,2,shade(PAL.water,1.08));
    for (const [x,y] of [[6,10],[54,20],[10,24],[48,6],[30,2]]) p.r(x,y,2,2,PAL.stone2);
    for (const [x,y,rx] of [[18,18,5],[40,12,4],[36,22,3]]){ p.ellO(x,y,rx,Math.max(1,rx-2),PAL.leaf); p.r(x+1,y-1,rx,1,PAL.water); p.r(x-rx+1,y-1,2,1,LEAF_L); }
    p.r(17,15,3,2,PAL.pink); p.r(18,14,1,1,PAL.white); p.r(18,16,1,1,PAL.gold); p.r(40,9,2,2,PAL.white); p.r(40,10,1,1,PAL.gold);
    for (const x of [50,53]){ p.r(x,4,1,10,LEAF_D); p.r(x,3,1,4,PAL.wood2); }
    const s=frame?[[26,9,5],[44,18,3]]:[[28,10,4],[42,17,4]]; for (const [x,y,w] of s){ p.r(x,y,w,1,PAL.white); p.r(x+1,y+2,w-1,1,'rgba(255,255,255,.55)'); } return c; };
})();
