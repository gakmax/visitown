import { BUILD, CHIMNEY, DECOR_KIND, NO_LIGHT, PX, mk, roof, scallop, shade, shadow } from '../map';
import { FIXED_COMMON, ICON_ROWS, PAL, THEMES, human } from '../palette';
// 사이버펑크
(()=>{
  // ---- 캐릭터
  const CY_SHAPES = [
    human('후드 해커',
      ['.....oo.....','....oBBo....','...oBhBBo...','..oBhBBBBo..','.oBhppppBBo.','.oBrrrrrrBo.','.oBBppppBBo.','..oBBBBBBo..'],
      ['......oo....','.....oBBo...','....oBhBBo..','...oBhBBBBo.','..opppBBBBBo','..orrpBBBBBo','..opppBBBBo.','...oBBBBBBo.'],
      { down:['.oBBBBBBBBo.','.oBBBBBBBBo.','.oBBBBBBBBo.','.oBBbbbbBBo.','.onBBBBBBno.','..obbbbbbo..','...ff..gg...'],
        side:['..oBBBBBBBo.','.oBBBBBBBBo.','.oBBBBBBBBo.','.oBbbbbBBBo.','.onBBBBBBBo.','..obbbbbbo..','...ff..gg...'] }),
    human('사이보그',
      ['.....oo.....','....oLLo....','....oLLo....','..oooLLooo..','.oSSSSSkkko.','.oSeSSSkrko.','.oSSSSSkkko.','..oSSSSSko..'],
      ['.....ooo....','....oLLLo...','....oLLLLo..','..oooLLLLoo.','.oSSSSSSkko.','.oeSSSSSkko.','.oSSSSSSkko.','..oSSSSSSo..'],
      { down:['.oBBBhhBBkko','.oBBBBBBBkko','.oBBBBBBBkko','.oBBBBBBBkko','.onBBBBBBrko','..obbbbbbo..','...ff..gg...'],
        side:['..oBBBBBBo..','.oBBhBBBBBo.','.okkBBBBBBo.','.okkBBBBBBo.','.orkBBBBBBo.','..obbbbbbo..','...ff..gg...'] }),
    { name:'네온 고양이',
      down:['.oo......oo.','.oBo....oBo.','.oBBo..oBBo.','.oBBBooBBBo.','oBBhBBBBBBBo','oBBwBBBBwBBo','oBBwBBBBwBBo','oBBBBppBBBBo','.oBBBBBBBBo.','.orrrrrrrro.','..obBBBBbo..','..oobbbboo..','...ff..gg...'],
      side:['.oo..oo.....','.oBooBo.....','.oBBBBBo.oo.','oBhBBBBBooBo','owBBBBBBooBo','owBBBBBBooBo','opBBBBBBooBo','.orrrrrrooBo','.oBBBBBBBBBo','.oBBBBBBBBbo','..obbbbbbbo.','..ooooooo...','...ff..gg...'] },
    { name:'배달 드론',
      down:['okkko..okkko','..o......o..','.oooooooooo.','.okBBBBBBko.','..oBhBBBBo..','..oBrrrrBo..','..oBBBBBBo..','..obbbbbbo..','...okkkko...','..oLLLLLLo..','..oLLkkLLo..','..oLLLLLLo..','..oooooooo..','...ff..gg...'],
      side:['okkko..okkko','..o......o..','.oooooooooo.','.okBBBBBBko.','..oBhBBBBo..','..orrBBBBo..','..oBBBBBBo..','..obbbbbbo..','...okkkko...','..oLLLLLLo..','..oLLkkLLo..','..oLLLLLLo..','..oooooooo..','...ff..gg...'] },
    { name:'경비 로봇',
      down:['.....oo.....','....oLLo....','...oooooo...','..oBBhhBBo..','.oBhBBBBBBo.','.orrrrrrrro.','.oBBBBBBBBo.','oooooooooooo','okkBBBBBBkko','okoBBwwBBoko','okoBBBBBBoko','okoBbbbbBoko','ono.oBBo.ono','...oBBBBo...','..obboobbo..','...ff..gg...'],
      side:['.....oo.....','....oLLo....','...oooooo...','..oBBhhBBo..','.oBhBBBBBBo.','.orrrrBBBBo.','.oBBBBBBBBo.','..oooooooo..','..oBBkkkBo..','..oBBkkkBo..','..oBBkkkBo..','..oBbkkkbo..','...oBnnBo...','...oBBBBo...','..obboobbo..','...ff..gg...'] },
    human('홀로그램',
      ['....hhhh....','...h....h...','.oo.oooo.oo.','oBBohhhhoBBo','oBBhhhhhhBBo','.oohSSSShoo.','..oSeSSeSo..','..oSSSSSSo..'],
      ['....hhhh....','...h....h...','....oooo.oo.','...ohhhhoBBo','..ohhhhhhBBo','.oSSShhhhoo.','.oSeSSSSho..','..oSSSSSo...'],
      { down:['..oBBhhBBo..','.ohhhhhhhho.','.oBBBBBBBBo.','..ohhhhhhhho','.onBBBBBBno.','..obbbbbbo..','...ff..gg...'],
        side:['..oBBhBBBo..','.ohhhhhhhho.','.oBBBBBBBBo.','..ohhhhhhhho','.onBBBBBBBo.','..obbbbbbo..','...ff..gg...'] }),
  ];
  const OUT = '#16121f';

  THEMES.cyber = {
    name:'사이버펑크', order:6,
    palette:{ outline:OUT, grass:'#4d4a66', grass2:'#47445f', grass3:'#3a3851', dirt:'#5f5c7c', dirt2:'#6f6c8f', stone:'#6c6a8c', stone2:'#57557a',
      water:'#5cf2ff', water2:'#1fa9d6', wall:'#b4b0d2', wall2:'#8e89b2', wood:'#8a5f7a', wood2:'#5a3d58',
      roofPink:'#ff4fa8', roofBlue:'#4a6cf0', roofGreen:'#3ef0a0', roofYellow:'#ffd23f', roofLilac:'#a56bff',
      white:'#f6f2ff', leaf:'#3fe08a', pink:'#ff7ac8', red:'#ff3d6e', gold:'#ffc23a', metal:'#a4a9c4', metal2:'#6b7090', skin:'#f0c8b0' },
    characters:{ shapes:CY_SHAPES, colors:[
      { name:'네온 핑크', B:'#ff5fae', b:'#c8378a', h:'#ffa6d6' },{ name:'시안', B:'#4fe3f0', b:'#2aa6c0', h:'#b0f7ff' },{ name:'보라', B:'#9a6bff', b:'#6a44c8', h:'#c9b0ff' },
      { name:'라임', B:'#a6f04a', b:'#6fb82e', h:'#d6ff9e' },{ name:'오렌지', B:'#ff9a3c', b:'#d0682a', h:'#ffc98a' },{ name:'크롬', B:'#b4b8cc', b:'#7e8298', h:'#e6e8f2' }],
      fixed:{ ...FIXED_COMMON, o:OUT, e:OUT, f:OUT, g:OUT, w:'#f6f2ff', p:'#3d2f45', S:'#f0c8b0', n:'#f0c8b0', H:'#e8e4ff', k:'#8a90ac', r:'#ff3b5c', L:'#ffb43a' },
      up:{ S:'H', e:'H', p:'B', w:'B', n:'B', r:'k' } },
    kinds:{ plaza:['홀로그램 광장','cyber_plaza','star'], shop:['네온 마켓','cyber_shop','cart'], library:['데이터 센터','cyber_library','search'], community:['클럽','cyber_community','heart'],
      home:['캡슐 호텔','cyber_home','house'], checkout:['코인 ATM','cyber_checkout','coin'], cafe:['라멘 노점','cyber_cafe','mug'], school:['해커 스쿨','cyber_school','monitor'],
      clinic:['사이보그 클리닉','cyber_clinic','cross'], post:['드론 택배','cyber_post','mail'], factory:['로봇 공장','cyber_factory','robot'], park:['옥상 정원','cyber_park','flower'] },
    decor:{ tree:'cyber_tree', gate:'cyber_gate', pond:'cyber_pond', ground:'tile' },
  };

  // ---- 헬퍼
  const DARK = '#1c1930';
  const face = (p,x,y,w,h,col) => { p.r(x,y,w,h,col); p.r(x+w-5,y,5,h,shade(col,.78)); p.o(x,y,w,h); };
  const glow = (p,x,y,w,h,col,a=.3) => { p.g.globalAlpha=a; p.r(x-1,y-1,w+2,h+2,col); p.g.globalAlpha=1; p.r(x,y,w,h,col); };
  const neonRect = (p,x,y,w,h,col) => { glow(p,x,y,w,1,col); glow(p,x,y+h-1,w,1,col); glow(p,x,y,1,h,col); glow(p,x+w-1,y,1,h,col); };
  const ring = (p,cx,cy,rx,ry,col,a=1) => { const t=mk(p.c.width,p.c.height), q=new PX(t); q.ell(cx,cy,rx,ry,col); q.g.globalCompositeOperation='destination-out'; q.ell(cx,cy,rx-1,ry-1,'#000'); p.g.globalAlpha=a; p.g.drawImage(t,0,0); p.g.globalAlpha=1; };
  const neonIcon = (p,name,x,y,col) => { const m={o:col}; p.g.globalAlpha=.3; for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) p.sprite(ICON_ROWS[name],m,x+dx,y+dy); p.g.globalAlpha=1; p.sprite(ICON_ROWS[name],m,x,y); };
  const lit = (p,x,y,w,h,col) => { p.box(x,y,w,h,col); p.r(x+1,y+1,1,1,'rgba(255,255,255,.75)'); };
  const parapet = (p,x,y,w,col) => { p.box(x,y,w,4,col); p.r(x+1,y+1,w-2,1,'rgba(255,255,255,.25)'); };

  Object.assign(BUILD, {
    cyber_plaza(){ const c=mk(66,48), p=new PX(c); shadow(p,33,44,33,4);
      p.ellO(33,40,31,7,'#3a3754'); for (let x=8;x<60;x+=6) p.r(x,44,2,1,PAL.water);
      p.ellO(33,37,27,6,'#4d4a70'); ring(p,33,37,25,4,PAL.water); p.ell(33,37,23,3,'#2a2740');
      for (const x of [3,58]){ p.box(x,25,5,13,PAL.metal2); p.r(x+1,26,1,11,PAL.metal); glow(p,x+1,23,3,3,PAL.roofPink); }
      p.box(26,29,15,8,PAL.metal2); p.r(27,30,13,1,PAL.metal); p.box(29,26,9,4,PAL.metal); glow(p,31,25,5,1,PAL.water);
      p.g.globalAlpha=.2; for (let i=0;i<17;i++){ const w=5+Math.floor(i*0.8)*2; p.r(33-Math.floor(w/2),24-i,w,1,PAL.water); } p.g.globalAlpha=1;
      p.g.globalAlpha=.3; p.ell(33,12,9,9,PAL.water); p.g.globalAlpha=1; ring(p,33,12,9,9,PAL.water); ring(p,33,12,9,3,PAL.water,.8); ring(p,33,12,4,9,PAL.water,.8);
      ring(p,33,13,15,3,PAL.roofPink,.9); p.r(28,6,2,2,PAL.white); p.r(37,16,1,1,PAL.white); return c; },

    cyber_shop(){ const c=mk(68,62), p=new PX(c); shadow(p,34,58,34,4);
      face(p,6,20,56,38,'#3d3858'); parapet(p,4,17,60,'#57527a');
      p.box(12,2,44,15,DARK); neonRect(p,13,3,42,13,PAL.roofPink); neonIcon(p,'cart',15,4,PAL.water);
      glow(p,30,6,20,2,PAL.roofPink); glow(p,30,10,13,2,PAL.gold); glow(p,45,10,5,2,PAL.water);
      scallop(p,6,24,56,PAL.roofPink,'#2a2640');
      p.box(10,34,32,21,DARK); p.r(11,35,30,19,'#6e3a72'); p.r(11,42,30,1,'#2a2640'); p.r(11,49,30,1,'#2a2640');
      ([[13,38,PAL.gold],[18,38,PAL.water],[23,38,PAL.leaf],[29,38,PAL.red],[35,38,PAL.gold],[14,45,PAL.roofLilac],[20,45,PAL.red],[27,45,PAL.water],[33,45,PAL.leaf]] as any[]).forEach(([x,y,col])=>{ p.r(x,y,4,4,col); p.r(x,y,1,1,'rgba(255,255,255,.6)'); });
      p.r(11,35,2,19,'rgba(255,255,255,.18)');
      p.box(45,34,13,21,PAL.metal2); for (let y=36;y<48;y+=2) p.r(46,y,11,1,PAL.metal); p.r(46,48,11,6,'#ffb0dc'); p.r(46,48,11,1,OUT);
      p.box(0,24,7,28,DARK); for (const [y,col] of [[27,PAL.water],[34,PAL.gold],[41,PAL.water],[47,PAL.roofPink]]) glow(p,2,y,3,4,col); return c; },

    cyber_library(){ const c=mk(60,76), p=new PX(c); shadow(p,30,72,30,4);
      p.r(15,7,2,7,PAL.metal2); p.ellO(15,6,7,3,PAL.metal); p.r(10,5,9,1,PAL.white); p.r(18,2,1,4,PAL.metal2);
      p.r(44,1,1,13,PAL.metal2); p.r(42,5,5,1,PAL.metal2); glow(p,43,0,3,2,PAL.red);
      face(p,8,16,44,56,'#2c3654'); parapet(p,6,13,48,'#3e4a70');
      p.box(10,18,40,14,'#151a2c'); neonIcon(p,'search',12,19,PAL.water); glow(p,27,21,18,2,PAL.water); glow(p,27,26,12,2,PAL.roofBlue); glow(p,41,26,4,2,PAL.roofPink);
      for (const x of [11,24,37]){ p.box(x,35,12,24,'#151a2c'); for (let y=37;y<57;y+=3){ p.r(x+1,y,10,2,'#33405f'); p.r(x+2,y,1,1,(x+y)%4?PAL.leaf:PAL.water); p.r(x+8,y,1,1,(x*y)%5?PAL.water:PAL.red); } }
      glow(p,9,33,1,38,PAL.water,.25);
      p.box(22,61,16,11,'#151a2c'); p.r(23,62,14,10,PAL.water2); p.r(30,62,1,10,'#151a2c'); p.r(24,63,1,8,'rgba(255,255,255,.5)'); glow(p,20,59,20,1,PAL.water); return c; },

    cyber_community(){ const c=mk(76,64), p=new PX(c); shadow(p,38,60,38,4);
      p.g.globalAlpha=.32; for (let i=0;i<24;i++){ p.r(11-Math.floor(i*.5),24-i,5,1,PAL.water); p.r(61+Math.floor(i*.5),24-i,5,1,PAL.roofPink); } p.g.globalAlpha=1;
      face(p,6,26,64,34,'#4a2a5e'); p.box(4,22,68,5,'#6a3a86'); glow(p,5,23,66,1,PAL.roofPink);
      const heart=(col,g)=>{ p.ell(31,9,5+g,5+g,col); p.ell(41,9,5+g,5+g,col); for (let i=0;i<=10+g;i++){ const hw=10+g-i; p.r(36-hw,11+i,2*hw+1,1,col); } };
      p.g.globalAlpha=.3; heart(PAL.roofPink,2); p.g.globalAlpha=1; heart(OUT,1); heart(PAL.roofPink,0); p.r(29,6,3,2,'#ffd0ea'); p.r(28,8,1,2,'#ffd0ea'); p.r(35,20,3,2,PAL.metal2);
      p.box(26,38,24,5,'#2a1838'); for (let x=27;x<49;x+=2) p.r(x,40,1,1,PAL.gold);
      p.box(30,43,16,17,'#1c1424'); p.r(31,44,14,16,'#9a3ec4'); p.r(38,44,1,16,'#1c1424'); p.r(32,45,1,14,'rgba(255,255,255,.25)');
      for (const x of [23,51]){ p.box(x,52,3,8,PAL.gold); } p.r(26,54,4,1,PAL.red); p.r(46,54,5,1,PAL.red);
      for (const x of [15,61]){ p.ellO(x,36,5,5,DARK); p.ell(x,36,3,3,x<30?PAL.water:PAL.roofPink); p.r(x-2,34,1,1,PAL.white); }
      for (let x=9;x<24;x+=4){ p.r(x,49,2,1,PAL.water); p.r(x+2,48,2,1,PAL.water); } return c; },

    cyber_home(){ const c=mk(58,62), p=new PX(c); shadow(p,29,58,29,4);
      p.box(7,3,11,7,PAL.metal); p.ellO(12,6,2,2,PAL.metal2); p.box(20,1,22,9,DARK); neonRect(p,21,2,20,7,PAL.gold); glow(p,24,4,6,3,PAL.water); glow(p,32,4,6,3,PAL.water);
      face(p,4,12,50,46,'#5a6178'); parapet(p,2,9,54,'#737c96');
      const lights=['#ffd47a',PAL.water,'#2a2740','#ffd47a','#ffd47a',PAL.roofPink,'#2a2740','#ffd47a',PAL.water];
      let i=0; for (const y of [15,26,37]) for (const x of [8,21,34]){ p.box(x,y,12,10,'#d9dbe6'); p.r(x+1,y+8,10,1,'#b4b8cc'); p.ellO(x+6,y+4,3,3,lights[i++]); p.r(x+5,y+2,1,1,'rgba(255,255,255,.7)'); }
      for (let y=17;y<48;y+=3) p.r(48,y,4,1,PAL.metal); p.r(47,15,1,33,PAL.metal2); p.r(52,15,1,33,PAL.metal2);
      p.box(22,48,14,10,DARK); p.r(23,49,12,9,'#ffd47a'); p.r(23,49,12,3,PAL.red); p.r(26,49,1,3,DARK); p.r(29,49,1,3,DARK); p.r(32,49,1,3,DARK); return c; },

    cyber_checkout(){ const c=mk(52,62), p=new PX(c); shadow(p,26,58,26,4);
      p.g.globalAlpha=.3; p.ell(26,10,11,11,PAL.gold); p.g.globalAlpha=1; p.ellO(26,10,9,9,PAL.gold); ring(p,26,10,6,6,shade(PAL.gold,.75)); p.r(21,5,2,2,PAL.white);
      for (const [x,y,w] of [[24,6,5],[23,7,1],[23,8,1],[23,9,1],[23,10,1],[23,11,1],[23,12,1],[24,13,5]]) p.r(x,y,w,1,'#a86a12'); p.r(26,5,1,10,'#a86a12');
      p.r(25,20,2,3,PAL.metal2);
      p.box(4,24,44,34,'#2e3550'); p.box(2,21,48,5,'#46507a'); glow(p,3,23,46,1,PAL.gold);
      for (const x of [8,28]){ p.box(x,28,16,30,PAL.metal); p.r(x+12,29,3,28,PAL.metal2); p.box(x+2,30,11,9,'#151a2c'); p.r(x+3,31,9,7,PAL.water2); p.r(x+4,32,6,1,PAL.white); p.r(x+4,34,4,1,PAL.white);
        for (let k=0;k<3;k++) for (let j=0;j<3;j++) p.r(x+3+k*3,41+j*2,2,1,OUT); p.r(x+3,49,9,1,OUT); glow(p,x+3,52,9,2,PAL.gold); }
      return c; },

    cyber_cafe(){ const c=mk(58,52), p=new PX(c); shadow(p,29,48,29,4);
      p.sprite(['...........oo...','..........oo....','oooooooooooooooo','oyyyyyyyyyyyyyyo','owwwwwwwwwwwwwwo','.orrrrrrrrrrrro.','..owwwwwwwwwwo..','...oooooooooo...'],{o:OUT,y:PAL.gold,w:PAL.white,r:PAL.red},21,0);
      roof(p,2,8,54,10,PAL.red,shade(PAL.red,.8));
      p.r(5,18,2,28,PAL.wood2); p.r(51,18,2,28,PAL.wood2);
      p.r(7,18,44,14,'#ffd47a'); p.box(24,25,9,5,PAL.metal2); p.r(25,24,7,1,PAL.metal);
      for (let i=0;i<4;i++){ const x=8+i*11; p.box(x,18,10,10,PAL.red); p.r(x+4,20,2,5,PAL.white); p.r(x+1,19,1,8,'rgba(255,255,255,.25)'); }
      p.box(3,32,52,14,PAL.wood); p.r(3,32,52,2,'#d9c3a0'); p.o(3,32,52,2); for (let x=9;x<52;x+=7) p.r(x,35,1,10,PAL.wood2);
      for (const x of [2,55]){ p.g.globalAlpha=.3; p.ell(x,23,5,6,PAL.red); p.g.globalAlpha=1; p.ellO(x,23,3,4,PAL.red); p.r(x-2,21,5,1,PAL.gold); p.r(x-2,25,5,1,PAL.gold); p.r(x,18,1,2,OUT); }
      for (const x of [13,26,39]){ p.box(x,44,7,3,PAL.red); p.r(x+3,47,1,3,OUT); p.r(x+1,49,5,1,OUT); } return c; },

    cyber_school(){ const c=mk(62,58), p=new PX(c); shadow(p,31,54,31,4);
      p.box(16,1,30,12,'#11161a'); neonRect(p,17,2,28,10,PAL.leaf);
      for (const [x,y] of [[24,4],[23,5],[22,6],[23,7],[24,8]]) glow(p,x,y,1,1,PAL.leaf,.2); for (let i=0;i<5;i++) glow(p,32-i,4+i,1,1,PAL.gold,.2); for (const [x,y] of [[37,4],[38,5],[39,6],[38,7],[37,8]]) glow(p,x,y,1,1,PAL.leaf,.2);
      face(p,4,16,54,38,'#2a3a3c'); parapet(p,2,13,58,'#3d5456');
      p.box(9,19,42,20,'#11161a'); p.r(11,21,38,16,'#0e2a1e');
      for (const [y,w,col] of ([[23,22,PAL.leaf],[26,14,PAL.leaf],[26,8,PAL.water],[29,26,PAL.leaf],[32,10,PAL.roofPink]] as any[])) p.r(y===26&&col===PAL.water?30:13,y,w,1,col);
      p.r(13,34,1,1,PAL.leaf); p.r(14,35,1,1,PAL.leaf); p.r(13,36,1,1,PAL.leaf); p.r(16,36,4,1,PAL.gold); p.r(12,22,1,13,'rgba(255,255,255,.12)');
      for (const x of [9,40]){ lit(p,x,43,10,7,'#7cffb0'); p.r(x+1,46,8,1,'#2a3a3c'); }
      p.box(25,41,12,13,'#11161a'); p.r(26,42,10,12,'#3fe08a'); p.r(31,42,1,12,'#11161a'); return c; },

    cyber_clinic(){ const c=mk(58,58), p=new PX(c); shadow(p,29,54,29,4);
      const cross=(col,g)=>{ p.r(25-g,1-g,8+2*g,15+2*g,col); p.r(21-g,5-g,16+2*g,7+2*g,col); };
      p.g.globalAlpha=.3; cross(PAL.red,2); p.g.globalAlpha=1; cross(OUT,1); cross(PAL.red,0); p.r(26,2,1,4,'#ffb0c0'); p.r(22,6,4,1,'#ffb0c0');
      face(p,4,19,50,35,'#d8dcea'); parapet(p,2,16,54,'#b4b8cc'); p.r(5,25,44,2,'#2ec4a8'); p.r(49,25,4,2,'#239a84');
      p.box(7,30,11,12,DARK); p.r(9,32,6,2,PAL.metal); p.r(13,34,2,5,PAL.metal); p.r(12,39,4,1,PAL.metal2); p.r(9,32,1,1,PAL.water);
      p.box(39,30,10,12,DARK); for (const [x,y] of [[40,36],[41,36],[42,36],[43,33],[43,34],[43,35],[44,38],[44,37],[45,36],[46,36],[47,36]]) p.r(x,y,1,1,PAL.roofGreen);
      p.box(20,38,18,16,'#2a3a50'); p.r(21,39,16,15,PAL.water2); p.r(29,39,1,15,'#2a3a50'); p.r(22,40,1,12,'rgba(255,255,255,.5)'); p.r(31,40,1,12,'rgba(255,255,255,.35)'); glow(p,20,36,18,1,PAL.water); return c; },

    cyber_post(){ const c=mk(62,58), p=new PX(c); shadow(p,31,54,31,4);
      p.r(18,3,26,1,PAL.metal2); for (const x of [14,41]){ p.g.globalAlpha=.6; p.r(x,2,8,1,PAL.white); p.g.globalAlpha=1; p.r(x+3,3,2,2,PAL.metal2); }
      p.box(25,4,12,6,PAL.metal); p.r(26,5,10,1,PAL.white); glow(p,26,8,2,1,PAL.red); glow(p,34,8,2,1,PAL.water);
      p.r(28,10,1,3,OUT); p.r(33,10,1,3,OUT); p.box(26,12,10,7,'#c98a4a'); p.r(30,12,2,7,'#e8c48a'); p.r(27,13,1,1,'rgba(255,255,255,.5)');
      p.ellO(31,22,14,3,'#2a2740'); ring(p,31,22,12,2,PAL.roofYellow);
      face(p,4,24,54,30,'#45405e'); for (let x=5;x<57;x+=4){ p.r(x,25,2,3,PAL.roofYellow); } p.r(5,24,52,1,OUT); p.r(5,28,52,1,OUT);
      p.box(8,32,18,12,PAL.roofYellow); p.sprite(ICON_ROWS.mail,{o:OUT,y:PAL.white},11,31);
      p.box(31,32,22,22,PAL.metal2); for (let y=34;y<47;y+=2) p.r(32,y,20,1,PAL.metal); p.r(32,47,20,7,'#ffd47a'); p.r(32,47,20,1,OUT);
      for (const [x,y,w,h] of [[34,49,7,5],[42,50,6,4],[9,46,8,8],[17,48,7,6],[11,42,6,4]]){ p.box(x,y,w,h,'#c98a4a'); p.r(x+Math.floor(w/2),y+1,1,h-2,'#e8c48a'); } return c; },

    cyber_factory(){ const c=mk(66,60), p=new PX(c); shadow(p,33,56,33,4);
      p.box(48,0,8,24,PAL.metal2); p.r(49,1,2,22,PAL.metal); for (let y=4;y<22;y+=6) p.r(49,y,6,2,PAL.roofYellow); glow(p,48,0,8,1,PAL.red);
      face(p,4,24,58,32,'#4f4a5a');
      for (let t=0;t<3;t++){ const x0=4+t*19; for (let j=0;j<19;j++){ const h=Math.floor(j*10/19)+1; p.r(x0+j,24-h,1,h,'#c0643a'); p.r(x0+j,24-h,1,1,OUT); } p.r(x0+18,14,1,10,OUT); p.r(x0+17,16,1,7,PAL.water2); }
      p.r(4,23,58,1,OUT);
      p.box(26,38,24,18,'#2a2740'); p.r(27,51,22,2,PAL.metal); p.r(27,53,22,1,PAL.metal2);
      for (const x of [29,39]){ p.box(x,45,7,6,PAL.metal); p.r(x+1,47,1,1,PAL.red); p.r(x+4,47,1,1,PAL.red); p.r(x+3,43,1,2,OUT); }
      p.box(29,27,18,9,DARK); neonIcon(p,'gear',32,26,PAL.roofYellow);
      p.box(5,48,12,8,PAL.roofYellow); p.r(6,49,10,1,'#fff0a0'); p.box(9,36,4,13,'#ff8a2a'); p.box(9,32,13,4,'#ff8a2a'); p.box(20,32,3,8,PAL.metal2); p.r(19,40,2,2,OUT); p.r(22,40,2,2,OUT); p.ellO(11,36,2,2,PAL.metal);
      for (const x of [52,56]) lit(p,x,40,3,6,'#ffb050'); return c; },

    cyber_park(){ const c=mk(64,54), p=new PX(c); shadow(p,32,50,32,4);
      for (let x=3;x<62;x+=6) p.r(x,14,2,14,PAL.metal2); p.r(2,16,60,1,PAL.metal); p.r(2,21,60,1,PAL.metal); p.r(2,15,60,1,OUT);
      for (let x=4;x<62;x+=3){ const y=11+Math.round(Math.sin(x*.5)*1)+(x%12<6?1:0); p.r(x,y,1,1,[PAL.roofPink,PAL.water,PAL.gold][x%9/3|0]); }
      p.box(2,27,60,9,'#2f7a5a'); for (let x=4;x<60;x+=3) p.r(x+(x%2),29+(x%3),1,1,'#4fbf7f'); p.r(3,28,58,1,'#5fcf8f');
      p.r(30,14,3,15,PAL.wood2); p.g.globalAlpha=.3; p.ell(31,9,13,9,PAL.roofPink); p.g.globalAlpha=1; p.ellO(31,9,11,8,PAL.roofPink); p.ell(29,7,5,3,'#ffa6d6'); for (const [x,y] of [[26,11],[36,6],[34,12],[23,7]]) p.r(x,y,1,1,PAL.white);
      for (const x of [5,45]){ p.box(x,21,14,8,'#5a5878'); p.ellO(x+4,19,4,3,PAL.leaf); p.ellO(x+10,19,4,3,PAL.leaf); p.r(x+3,17,2,1,'#a6ffcb'); p.r(x+9,18,1,1,PAL.roofPink); }
      p.r(36,25,8,2,PAL.wood); p.r(37,27,1,2,OUT); p.r(42,27,1,2,OUT);
      face(p,2,36,60,14,'#4a4766'); for (const x of [6,16,26,36,46]) lit(p,x,40,7,6,(x/10|0)%2?'#ffd47a':PAL.water); return c; },
  });

  // 밤 불빛: 광장 홀로그램은 창문이 없다. 라멘·공장은 김·연기
  NO_LIGHT.add('cyber_plaza'); CHIMNEY.cyber_cafe=29; CHIMNEY.cyber_factory=52;

  // ---- 장식
  DECOR_KIND.tree.cyber_tree = size => {
    const r=size?10:8, c=mk(2*r+3,2*r+12), p=new PX(c), cx=r+1, trunk=mk(c.width,c.height), tp=new PX(trunk);
    if (!size){ tp.box(cx-1,15,3,c.height-15,PAL.metal2); tp.r(cx-3,c.height-1,7,1,OUT);
      p.box(cx-4,0,9,17,DARK); neonRect(p,cx-3,1,7,15,PAL.roofPink); for (const [y,col] of ([[3,PAL.water],[7,PAL.gold],[11,PAL.water]] as any[])) p.r(cx-1,y,3,3,col);
      return { canopy:c, trunk, ax:cx, ay:c.height, sway:.2 }; }
    tp.box(cx-2,2*r-2,5,12,PAL.metal2); tp.r(cx-1,2*r-1,1,10,PAL.metal); glow(tp,cx-1,2*r+6,3,1,PAL.roofPink);
    const tiers: any[]=[[0,r-3,'#23889e'],[r-6,r-1,'#2aa6bc'],[2*r-10,r+1,'#35c0d4']];
    p.g.globalAlpha=.22; for (const [top,h] of tiers) p.tri(cx,top-1,h+2,PAL.water); p.g.globalAlpha=1;
    for (const [top,h,col] of tiers){ p.tri(cx,top,h,OUT); p.tri(cx,top+1,h-1,col); p.r(cx-h+2,top+h-1,2*h-3,1,shade(col,.75)); }
    for (const [x,y,col] of ([[-1,4,PAL.roofPink],[2,r,PAL.gold],[-3,r+3,PAL.white],[4,2*r-4,PAL.roofPink],[-5,2*r-3,PAL.gold],[0,2*r-6,PAL.water]] as any[])) p.r(cx+x,y,1,1,col);
    p.r(cx-1,1,1,3,'rgba(255,255,255,.6)');
    return { canopy:c, trunk, ax:cx, ay:c.height, sway:.5 }; };

  DECOR_KIND.gate.cyber_gate = () => { const c=mk(34,30), p=new PX(c);
    for (const x of [1,28]){ p.box(x,7,5,23,'#3a3754'); p.r(x+1,8,1,21,'rgba(255,255,255,.2)'); glow(p,x+2,10,1,18,PAL.roofPink); }
    p.box(0,1,34,7,DARK); neonRect(p,1,2,32,5,PAL.water); for (const x of [6,12,18,24]) p.r(x,4,4,1,x%12?PAL.gold:PAL.white); return c; };

  DECOR_KIND.pond.cyber_pond = frame => { const c=mk(60,32), p=new PX(c);
    p.ellO(30,17,29,13,PAL.stone2); p.ellO(30,16,26,10,'#1c1930'); ring(p,30,16,25,9,PAL.water,.9);
    p.g.globalAlpha=.25; p.ell(30,16,22,7,PAL.water2); p.g.globalAlpha=1;
    const fish=(x,y,col,dir)=>{ p.r(x,y,4,2,col); p.r(x+(dir>0?-2:4),y,2,1,col); p.r(x+(dir>0?-2:5),y+1,1,1,col); p.r(x+(dir>0?3:0),y,1,1,PAL.white); };
    if (frame){ fish(16,13,PAL.water,1); fish(38,18,PAL.roofPink,-1); } else { fish(19,14,PAL.water,1); fish(35,17,PAL.roofPink,-1); }
    p.g.globalAlpha=.35; p.r(28,2,4,14,PAL.water); p.g.globalAlpha=1; p.r(29,frame?4:7,2,1,PAL.white); p.r(30,frame?9:3,1,1,PAL.white); p.box(27,14,6,4,PAL.metal2); return c; };
})();
