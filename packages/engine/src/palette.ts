import { L } from '@visitown/i18n';
/* =====================================================================
   Visitown — prototype demo (Canvas 2D, 480x270 internal, integer scale)
   1 palette+sprites(테마별) · 2 map · 3 asset builders · 4 store · 5 simulator · 6 world/renderer · 7 UI
   ===================================================================== */
export const W = 480, H = 270;

/* ---------- 1. PALETTE + SPRITES. 테마는 palette/characters/kinds/decor 네 덩어리만 바꾼다 ---------- */
export const BASE_PAL = {
  outline:'#3b2f3a', grass:'#b9e2a3', grass2:'#a6d48d', grass3:'#86bf74',
  dirt:'#e8d2a8', dirt2:'#d2b58a', stone:'#e4ded0', stone2:'#c6bdab',
  water:'#a9d9f1', water2:'#79bde6', wall:'#fff5e3', wall2:'#eddcc0',
  wood:'#c98d5d', wood2:'#9b6543', roofPink:'#f4a9bb', roofBlue:'#9dbde9', roofGreen:'#a3d8ad', roofYellow:'#f7d78f', roofLilac:'#cbb6ea',
  white:'#ffffff', leaf:'#7cc97e', pink:'#f29ba0', red:'#e8707f', gold:'#f2c14e', metal:'#b9bcc8', metal2:'#8d91a0', skin:'#ffd9b3',
};
export const PAL = { ...BASE_PAL };
export const ICON_LEGEND = { o:'outline', w:'white', g:'gold', d:'wood2', r:'red', p:'pink', b:'water2', l:'leaf', k:'wood', c:'wall', s:'stone', y:'roofYellow', v:'roofLilac', t:'grass3', e:'roofGreen', u:'roofBlue', m:'metal', n:'metal2' };

export const ICON_ROWS = {
  cart:    ['............','.oo.........','..oooooooooo','..ocrcgcbcco','..occcccccco','...occccccco','...occccccco','....oooooo..','....o....o..','...ooo..ooo.','...o.o..o.o.','...ooo..ooo.'],
  book:    ['............','..oooooooo..','..ouuuuuuuo.','..ouuuuuuuo.','..ouuwwuuuo.','..ouuwwuuuo.','..ouuuuuuuo.','..ouuuuuuuo.','..ouuuuuuuo.','..ooooooooo.','...occccco..','...ooooooo..'],
  heart:   ['............','..oo....oo..','.oppoo.oppo.','oppwppoppppo','oppppppppppo','oppppppppppo','.opppppppppo','..opppppppo.','...opppppo..','....opppo...','.....ooo....','............'],
  house:   ['.....oo.....','....oppo....','...oppppo...','..oppppppo..','.oppppppppo.','oooooooooooo','.occcccccco.','.ocbbcckkco.','.ocbbcckkco.','.occccckkco.','.oooooooooo.','............'],
  coin:    ['............','....oooo....','...oggggo...','..ogwgggdo..','..ogwgggdo..','..ogggggdo..','..ogggdddo..','...oddddo...','....oooo....','............','............','............'],
  fountain:['............','.....oo.....','....obbo....','...oobboo...','..osssssso..','...oobboo...','.oossbbssoo.','obbbbbbbbbbo','obbbbbbbbbbo','.osssssssso.','..oooooooo..','............'],
  search:  ['..oooo......','.obbbbo.....','obwbbbbo....','obbbbbbo....','obbbbbbo....','.obbbbo.....','..ooookk....','......okko..','.......okko.','........oko.','.........o..','............'],
  star:    ['.....oo.....','.....og.....','....oggo....','.ooooggoooo.','.oggggggggo.','..oggwgggo..','...ogggo....','...ogggo....','..oggoogo...','..ogo..ogo..','..o.....o...','............'],
  spark:   ['............','............','.....w......','.....w......','...wwwww....','.....w......','.....w......','............','............','............','............','............'],
  bolt:    ['......oo....','.....ogo....','....oggo....','...oggo.....','..oggggoo...','.ooooggggo..','....oggo....','...oggo.....','...ogo......','...oo.......','............','............'],
  person:  ['...oooooo...','..oppppppo..','..opeppepo..','..oppppppo..','...oooooo...','..oooooooo..','.obbbbbbbbo.','.obbbbbbbbo.','.obbbbbbbbo.','.oooooooooo.','............','............'],
  firework:['............','..g..w..g...','...g.w.g....','....ggg.....','.wwggrggww..','....ggg.....','...g.w.g....','..g..w..g...','............','............','............','............'],
  leave:   ['............','.oooooo.....','.occcco.....','.occcco..o..','.occcco..oo.','.occccooooo.','.occccooooo.','.occcco..oo.','.occcco..o..','.occcco.....','.oooooo.....','............'],
  enter:   ['............','.....oooooo.','.....occcco.','..o..occcco.','..oo.occcco.','oooooccccco.','oooooccccco.','..oo.occcco.','..o..occcco.','.....occcco.','.....oooooo.','............'],
  walk:    ['............','....oooo....','...occcco...','...occcco...','....oooo....','..o.oooo.o..','..oooooooo..','....oooo....','...oo..oo...','...o....o...','..oo....oo..','............'],
  timeout: ['............','...oooooo...','..oggggggo..','.oggggwgggo.','.oggggwgggo.','.oggggwwwgo.','.oggggggggo.','..oggggggo..','...oooooo...','............','............','............'],
  robot:   ['.....oo.....','....oooo....','..oooooooo..','..ommmmmmo..','..omnnnnmo..','..omwnnwmo..','..ommmmmmo..','..oooooooo..','.oo.mmmm.oo.','...ommmmo...','...oo..oo...','............'],
  sword:   ['........oo..','.......omo..','......omwo..','.....omwo...','....omwo....','...omwo.....','.gooowo.....','.ogggo......','.oggoo......','.okoo.......','.oo.........','............'],
  chest:   ['............','..oooooooo..','.okkkkkkkko.','.oddddddddo.','.okkkggkkko.','.oooogoooo..','.okkkkkkkko.','.okkkkkkkko.','.oddddddddo.','..oooooooo..','............','............'],
  mug:     ['............','..oooooo....','..owwwwooo..','..oyyyyoyo..','..oyyyyoyo..','..oyyyyoyo..','..oyyyyooo..','..oyyyyo....','..oddddo....','..oooooo....','............','............'],
  monitor: ['............','.oooooooooo.','.obbbbbbbbo.','.obwbbbbbbo.','.obbbbbbbbo.','.obbbbbbbbo.','.oooooooooo.','.....oo.....','.....oo.....','...oooooo...','............','............'],
  coffee:  ['............','....o.o.....','....o.o.....','...o.o......','..oooooooo..','..oddddddooo','..oddddddo.o','..oddddddo.o','..oddddddooo','...oooooo...','............','............'],
  tower:   ['.....oo.....','....ouuo....','...ouuuuo...','..ouuuuuuo..','..oooooooo..','..osssssso..','..oswssbso..','..osssssso..','..ossbbsso..','..ossbbsso..','..oooooooo..','............'],
  desk:    ['............','............','....oooo....','....obbo....','....oooo....','.oooooooooo.','.okkkkkkkko.','.oooooooooo.','..o......o..','..o......o..','............','............'],
  phone:   ['....oooo....','....owwo....','....owwo....','....oooo....','............','............','............','............','............','............','............','............'],
  hat:     ['............','....oooo....','...okkkko...','..okkkkkko..','.oooooooooo.','............','............','............','............','............','............','............'],
  crown:   ['............','.o...o...o..','.og.ogo.go..','.ogggrgggo..','.ogggggggo..','.ooooooooo..','............','............','............','............','............','............'],
  bubble:  ['............','..oooooo....','.owwwwwwo...','.owwwwwwo...','..oooooo....','....oo......','............','............','............','............','............','............'],
  me:      ['............','.....oo.....','....oggo....','...oggggo...','..ogggwggo..','.oggggwgggo.','..ooogwooo..','....ogwo....','....oggo....','....oooo....','............','............'],
  bell:    ['............','.....oo.....','....oggo....','....oggo....','...oggggo...','...ogwgggo..','..oggggggo..','..oggggggo..','.oooooooooo.','.....oo.....','....oddo....','............'],
  cross:   ['............','.oooooooooo.','.owwwrrwwwo.','.owwwrrwwwo.','.orrrrrrrro.','.orrrrrrrro.','.owwwrrwwwo.','.owwwrrwwwo.','.oooooooooo.','............','............','............'],
  mail:    ['............','............','.oooooooooo.','.oyyyyyyyyo.','.ooyyyyyyoo.','.oyooyyooyo.','.oyyyooyyyo.','.oyyyyyyyyo.','.oooooooooo.','............','............','............'],
  gear:    ['.....oo.....','..o.ommo.o..','.omoommoomo.','..ommmmmmo..','.ommmoommmo.','ommmo..ommmo','ommmo..ommmo','.ommmoommmo.','..ommmmmmo..','.omoommoomo.','..o.ommo.o..','.....oo.....'],
  flower:  ['............','...oo.oo....','..oppopppo..','..opggggpo..','...ogwggo...','..opggggpo..','..oppopppo..','...oo.oo....','.....ol.....','..lloll.....','....ol......','............'],
  play:    ['............','...oo.......','...olo......','...ollo.....','...olllo....','...ollllo...','...ollllo...','...olllo....','...ollo.....','...olo......','...oo.......','............'],
  pause:   ['............','.oooo..oooo.','.orro..orro.','.orro..orro.','.orro..orro.','.orro..orro.','.orro..orro.','.orro..orro.','.orro..orro.','.orro..orro.','.oooo..oooo.','............'],
  joystick:['............','...ooo......','..orrro.....','..orwro.....','...ooo......','....oo......','.....oo.....','.oooooooooo.','.ommmmrmgmo.','.ommmmmmmmo.','.oooooooooo.','............'],
  trash:   ['....oooo....','.oooooooooo.','.ommmmmmmmo.','.oooooooooo.','..ommmmmmo..','..omnmnmno..','..omnmnmno..','..omnmnmno..','..omnmnmno..','..omnmnmno..','..ommmmmmo..','...oooooo...'],
  camera:  ['............','...oooo.....','.oooooooooo.','.ommmmmmrmo.','.ommoooommo.','.omobbwbomo.','.omobbbbomo.','.omobbbbomo.','.ommoooommo.','.ommmmmmmmo.','.oooooooooo.','............'],
  chart:   ['............','.........ooo','.........ogo','.....ooo.ogo','.....obo.ogo','.....obo.ogo','.ooo.obo.ogo','.oro.obo.ogo','.oro.obo.ogo','.oro.obo.ogo','oooooooooooo','............'],
  eye:     ['............','............','....oooo....','..oowwwwoo..','.owwwoowwwo.','owwwobbowwwo','owwwobbowwwo','.owwwoowwwo.','..oowwwwoo..','....oooo....','............','............'],
  tag:     ['............','.oooooooooo.','.oyyyyyyyyo.','.oyoooooyyo.','.oyyyyyyyyo.','.oyooooyyyo.','.oyyyyyyyyo.','.oooooooooo.','....okko....','....okko....','....okko....','...oooooo...'],
  moon:    ['............','...oooo.....','..oggo......','.oggo.......','.oggo.......','.oggo.......','.oggo.......','.ogggo......','..ogggoooo..','...ogggggo..','....ooooo...','............'],
  foot:    ['............','.ooo........','odddo.......','odddo.......','.ooo........','.odo...ooo..','.ooo..odddo.','......odddo.','.......ooo..','.......odo..','.......ooo..','............'],
  note:    ['............','....ooooooo.','....ogggggo.','....ooooooo.','....o.....o.','....o.....o.','....o.....o.','.oooo..oooo.','ogggo.ogggo.','ogggo.ogggo.','.ooo...ooo..','............'],
  expand:  ['............','.oooo..oooo.','.oooo..oooo.','.oo......oo.','.oo......oo.','............','............','.oo......oo.','.oo......oo.','.oooo..oooo.','.oooo..oooo.','............'],
  rec:     ['............','....oooo....','..oorrrroo..','.orrwrrrrro.','.orwrrrrrro.','orrrrrrrrrro','orrrrrrrrrro','.orrrrrrrro.','.orrrrrrrro.','..oorrrroo..','....oooo....','............'],
  code:    ['............','.oooooooooo.','.onnnnnnnno.','.oooooooooo.','.owwwwwwwwo.','.owlwwwwwwo.','.owwlwwwwwo.','.owlwwllwwo.','.owwwwwwwwo.','.oooooooooo.','............','............'],
  window:  ['............','.oooooooooo.','.onnnnnnnno.','.oooooooooo.','.obbbbbbbbo.','.obbbbbwwbo.','.obbbbbbbbo.','.obblbbbbbo.','.ollllbbllo.','.ollllllllo.','.oooooooooo.','............'],
  plug:    ['....o..o....','....o..o....','..oooooooo..','..ommmmmmo..','..ommmmmmo..','..ommmmmmo..','...ommmmo...','....oooo....','.....oo.....','.....oo.....','......oo....','.......oo...'],
  key:     ['............','.oooooooooo.','.ommmmmmmmo.','.omwwwwwwmo.','.omwooowwmo.','.omwwwowwmo.','.omwwoowwmo.','.omwwwwwwmo.','.omwwowwwmo.','.ommmmmmmmo.','.oooooooooo.','............'],
  fire:    ['............','.....o......','....oro.....','....oro.....','...orgro....','...orgro....','..orggrro...','..orgwgro...','.orggwggro..','.orgwwwgro..','..oooooooo..','............'],
  film:    ['............','oooooooooooo','owowowowowoo','oooooooooooo','obbbbbobbbbo','obwbbbobwbbo','obbbbbobbbbo','obbbbbobbbbo','oooooooooooo','owowowowowoo','oooooooooooo','............'],
  gift:    ['............','...oo..oo...','..orroorro..','.oooooooooo.','.oeeorroeeo.','.oooooooooo.','.oeeorroeeo.','.oeeorroeeo.','.oeeorroeeo.','.oeeorroeeo.','.oooooooooo.','............'],
};
// 계절 이벤트(로드맵 38) 장식 스프라이트. 범례는 SEASON_PAL(테마와 무관, 외곽선만 PAL.outline). p3 makeSeason()이 굽는다
export const SEASON_PAL = { O:'#f0923a', D:'#d2702a', g:'#5a9a4a', k:'#3b2f3a', y:'#ffe27a', w:'#ffffff', R:'#e04848', G:'#4f9f5a', B:'#6aa9e8', Y:'#f2c14e', n:'#ff9a3c' };
export const SEASON_ROWS = {
  pumpkin:   ['.....og.....','....ogo.....','..oooooooo..','.oOOOOOOOOo.','oOOkOOOOkOOo','oODOOOOOODOo','oOOkkOOkkOOo','oOOOkkkkOOOo','.oDOOOOOODo.','..oooooooo..'],
  pumpkin_s: ['....og...','..ooooo..','.oOOOOOo.','oOkOOOkOo','oOOOOOOOo','oOOkkkOOo','.oDOOODo.','..ooooo..'],
  bat0:      ['o.....o','ooo.ooo','.ooooo.','..o.o..'],
  bat1:      ['.......','..ooo..','ooooooo','o.o.o.o'],
  snowman:   ['...oooo...','...okko...','...okko...','..oooooo..','..owwwwo..','.owkwwkwo.','.owwwnwwo.','..owwwwo..','.oRRRRRRo.','owwwwwwwwo','owwwkwwwwo','owwwwwwwwo','owwwkwwwwo','.oooooooo.'],
  gift:      ['..oo.oo.','.oRoooRo','oooooooo','oGGRRGGo','oRRRRRRo','oGGRRGGo','oGGRRGGo','oooooooo'],
  pouch:     ['...oYo...','..oYYYo..','...oYo...','.ooooooo.','oRRRRRRRo','oRRYYYRRo','oRYRRRYRo','oRRYYYRRo','oRRRRRRRo','.oRRRRRo.','..ooooo..'],
  lantern:   ['..oo..','.oYYo.','oRRRRo','oRYYRo','oRRRRo','oRRRRo','.oooo.','..YY..','.Y..Y.'],
  kite:      ['...o...','..oRo..','.oRBRo.','oRBwBRo','.oRBRo.','..oRo..','...o...','...o...','..o....'],
};
export const DIGIT_ROWS = {
  '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'3':['111','001','111','001','111'],'4':['101','101','111','001','001'],
  '5':['111','100','111','001','111'],'6':['111','100','111','101','111'],'7':['111','001','001','001','001'],'8':['111','101','111','101','111'],'9':['111','101','111','001','111'],
  A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['011','100','100','100','011'],D:['110','101','101','101','110'],E:['111','100','110','100','111'],G:['011','100','101','101','011'],
  I:['111','010','010','010','111'],L:['100','100','100','100','111'],N:['101','111','111','101','101'],O:['111','101','101','101','111'],P:['110','101','110','100','100'],R:['110','101','110','101','101'],
  M:['101','111','101','101','101'],T:['111','010','010','010','010'],V:['101','101','101','101','010'],'.':['000','000','000','000','010'],
};

// ---- 방문자 나라 깃발 6×6 (캐릭터 오른쪽 깃대에 단다). r 빨강 w 흰 b 파랑 n 남색 g 초록 y 노랑 k 검정 o 주황 l 하늘. 표에 없는 나라는 깃발 없이 정보 패널에만 이름이 나온다
export const FLAG_PAL = { r:'#d8323c', w:'#f6f1e6', b:'#2f55b8', n:'#1e2d6e', g:'#2e9b4a', y:'#f2c531', k:'#2a2a2a', o:'#f28a2e', l:'#79b7e8' };
export const FLAG_ROWS = {
  KR:['kwwwwk','wwrrww','wrrrrw','wbbbbw','wwbbww','kwwwwk'], JP:['wwwwww','wwrrww','wrrrrw','wrrrrw','wwrrww','wwwwww'], CN:['ryrrrr','yyyrrr','ryrrrr','rrrrrr','rrrrrr','rrrrrr'], TW:['bbbrrr','bwbrrr','bbbrrr','rrrrrr','rrrrrr','rrrrrr'], HK:['rrrrrr','rrwwrr','rwwwwr','rrwwrr','rrrrrr','rrrrrr'], KP:['bbbbbb','rrrrrr','rrwwrr','rrwwrr','rrrrrr','bbbbbb'],
  US:['bbbrrr','bbbwww','bbbrrr','wwwwww','rrrrrr','wwwwww'], CA:['rrwwrr','rrwwrr','rwrrwr','rwrrwr','rrwwrr','rrwwrr'], MX:['ggwwrr','ggwwrr','ggkkrr','ggkkrr','ggwwrr','ggwwrr'], BR:['gggggg','ggyygg','gybbyg','gybbyg','ggyygg','gggggg'], AR:['llllll','llllll','wwyyww','wwyyww','llllll','llllll'], CL:['bbwwww','bwbwww','bbwwww','rrrrrr','rrrrrr','rrrrrr'], CO:['yyyyyy','yyyyyy','yyyyyy','bbbbbb','bbbbbb','rrrrrr'], PE:['rrwwrr','rrwwrr','rrwwrr','rrwwrr','rrwwrr','rrwwrr'],
  GB:['bwrrwb','wwrrww','rrrrrr','rrrrrr','wwrrww','bwrrwb'], IE:['ggwwoo','ggwwoo','ggwwoo','ggwwoo','ggwwoo','ggwwoo'], FR:['bbwwrr','bbwwrr','bbwwrr','bbwwrr','bbwwrr','bbwwrr'], DE:['kkkkkk','kkkkkk','rrrrrr','rrrrrr','yyyyyy','yyyyyy'], IT:['ggwwrr','ggwwrr','ggwwrr','ggwwrr','ggwwrr','ggwwrr'], ES:['rrrrrr','yyyyyy','yyyyyy','yyyyyy','yyyyyy','rrrrrr'], PT:['ggrrrr','ggrrrr','gyyrrr','gyyrrr','ggrrrr','ggrrrr'], NL:['rrrrrr','rrrrrr','wwwwww','wwwwww','bbbbbb','bbbbbb'], BE:['kkyyrr','kkyyrr','kkyyrr','kkyyrr','kkyyrr','kkyyrr'],
  CH:['rrrrrr','rrwwrr','rwwwwr','rwwwwr','rrwwrr','rrrrrr'], AT:['rrrrrr','rrrrrr','wwwwww','wwwwww','rrrrrr','rrrrrr'], SE:['bbybbb','bbybbb','yyyyyy','bbybbb','bbybbb','bbybbb'], NO:['rrbrrr','rrbrrr','bbbbbb','rrbrrr','rrbrrr','rrbrrr'], DK:['rrwrrr','rrwrrr','wwwwww','rrwrrr','rrwrrr','rrwrrr'], FI:['wwbwww','wwbwww','bbbbbb','wwbwww','wwbwww','wwbwww'], PL:['wwwwww','wwwwww','wwwwww','rrrrrr','rrrrrr','rrrrrr'], CZ:['bwwwww','bbwwww','bbbwww','bbbrrr','bbrrrr','brrrrr'], HU:['rrrrrr','rrrrrr','wwwwww','wwwwww','gggggg','gggggg'], RO:['bbyyrr','bbyyrr','bbyyrr','bbyyrr','bbyyrr','bbyyrr'],
  GR:['bwbbbb','wwwbbb','bwbwww','bbbbbb','wwwwww','bbbbbb'], UA:['llllll','llllll','llllll','yyyyyy','yyyyyy','yyyyyy'], RU:['wwwwww','wwwwww','bbbbbb','bbbbbb','rrrrrr','rrrrrr'], TR:['rrrrrr','rwwrrr','rwrrwr','rwrrwr','rwwrrr','rrrrrr'], IL:['bbbbbb','wwwwww','wwbbww','wwbbww','wwwwww','bbbbbb'], SA:['gggggg','gggggg','gwwwwg','gggggg','gwwwwg','gggggg'], AE:['rrgggg','rrgggg','rrwwww','rrwwww','rrkkkk','rrkkkk'], EG:['rrrrrr','rrrrrr','wwwwww','wwyyww','kkkkkk','kkkkkk'], NG:['ggwwgg','ggwwgg','ggwwgg','ggwwgg','ggwwgg','ggwwgg'],
  IN:['oooooo','oooooo','wwbbww','wwbbww','gggggg','gggggg'], BD:['gggggg','ggrrgg','grrrrg','grrrrg','ggrrgg','gggggg'], PK:['wggggg','wgggwg','wggwwg','wggwwg','wgggwg','wggggg'], VN:['rrrrrr','rryyrr','ryyyyr','rryyrr','rrrrrr','rrrrrr'], TH:['rrrrrr','wwwwww','bbbbbb','bbbbbb','wwwwww','rrrrrr'], ID:['rrrrrr','rrrrrr','rrrrrr','wwwwww','wwwwww','wwwwww'], SG:['rrrrrr','rwwrrr','rwrwrr','wwwwww','wwwwww','wwwwww'], MY:['nnrrrr','nnwwww','nnrrrr','wwwwww','rrrrrr','wwwwww'], PH:['wbbbbb','wwbbbb','wwwbbb','wwwrrr','wwrrrr','wrrrrr'], MN:['rrbbrr','rrbbrr','rrbbrr','rrbbrr','rrbbrr','rrbbrr'],
  AU:['nnnnnn','nrnnwn','nnnnnn','nnnwnn','nwnnnn','nnnnwn'], NZ:['nnnnnn','nrnnrn','nnnnnn','nnnrnn','nrnnnn','nnnnrn'], ZA:['grrrrr','ggrrrr','gggwww','gggwww','ggbbbb','gbbbbb'],
};

// ---- 건물 종류(kind)는 테마와 무관한 의미 id. 테마는 종류마다 이름·생김새(빌더)·간판을 정하므로 테마를 바꿔도 사이트 설정은 그대로다
export const KINDS = ['plaza','shop','library','community','home','checkout','cafe','school','clinic','post','factory','park'];
export const KIND_LABEL = { plaza:L("광장"), shop:L("상점"), library:L("도서관"), community:L("커뮤니티"), home:L("집"), checkout:L("계산대"), cafe:L("카페"), school:L("학교"), clinic:L("병원"), post:L("우체국"), factory:L("공방"), park:L("공원") };
// ---- 캐릭터. 공통 범례: . 투명 o 외곽선 B 몸색 b 그림자 h 하이라이트 e 눈 w 흰 p 볼 S 피부/주둥이 r 장식 k 금속·액세서리 L 잎 H 머리카락 n 손 f/g 발
export const COZY_SHAPES = [
  { name:L("블롭"), down:['....oooo....','..ooBBBBoo..','.oBhhBBBBBo.','.oBhBBBBBBo.','oBBBBBBBBBBo','oBBeBBBBeBBo','oBBeBBBBeBBo','oBpBBBBBBpBo','oBBBBBBBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'],
    side:['....oooo....','..ooBBBBoo..','.oBhhBBBBBo.','.oBhBBBBBBo.','oBBBBBBBBBBo','oBeBBBBBBBBo','oBeBBBBBBBBo','opBBBBBBBBBo','oBBBBBBBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'] },
  { name:L("고양이"), down:['.oo......oo.','.oBo....oBo.','.oBpo..opBo.','.oBBBooBBBo.','oBBBBBBBBBBo','oBBeBBBBeBBo','oBBeBBBBeBBo','oBpBBrrBBpBo','oBBBBBBBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'],
    side:['.oo......oo.','.oBo....oBo.','.oBpo..opBo.','.oBBBooBBBo.','oBBBBBBBBBBo','oBeBBBBBBBBo','oBeBBBBBBBBo','orBBBBBBBBBo','oBBBBBBBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'] },
  { name:L("곰"), down:['.ooo....ooo.','oBpBo..oBpBo','oBBBooooBBBo','.oBBBBBBBBo.','oBBBBBBBBBBo','oBBeBBBBeBBo','oBBeBSSBeBBo','oBpBSrrSBpBo','oBBBBSSBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'],
    side:['.ooo....ooo.','oBpBo..oBpBo','oBBBooooBBBo','.oBBBBBBBBo.','oBBBBBBBBBBo','oBeBBBBBBBBo','oBeSSBBBBBBo','orSSBBBBBBBo','oBSSBBBBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'] },
  { name:L("토끼"), down:['..oo....oo..','.oBpo..opBo.','.oBpo..opBo.','.oBpo..opBo.','.oBBo..oBBo.','.oBBBooBBBo.','oBBBBBBBBBBo','oBBeBBBBeBBo','oBBeBBBBeBBo','oBpBBrrBBpBo','oBBBBBBBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'],
    side:['....oo..oo..','...oBpo.opBo','...oBpo.opBo','...oBpo.opBo','...oBBo.oBBo','.oooBBoooBBo','oBBBBBBBBBBo','oBeBBBBBBBBo','oBeBBBBBBBBo','orBBBBBBBBBo','oBBBBBBBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'] },
  { name:L("로봇"), down:['....oooo....','....orro....','....oooo....','.....oo.....','.oooooooooo.','oBhBBBBBBBBo','oBBBBBBBBBBo','oBbbbbbbbbBo','oBbwwbbbwwBo','oBbbbbbbbbBo','oBBBBBBBBBBo','oBBBBooBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'],
    side:['....oooo....','....orro....','....oooo....','.....oo.....','.oooooooooo.','oBhBBBBBBBBo','oBBBBBBBBBBo','oBbbbbbbbbBo','oBwwbbbbbbBo','oBbbbbbbbbBo','oBBBBBBBBBBo','oBooBBBBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'] },
  { name:L("새싹"), down:['......ooo...','.....oLLLo..','....oLLLLo..','....oLLoo...','.....oo.....','..ooBBBBoo..','.oBhBBBBBBo.','oBBBBBBBBBBo','oBBeBBBBeBBo','oBBeBBBBeBBo','oBpBBBBBBpBo','oBBBBBBBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'],
    side:['......ooo...','.....oLLLo..','....oLLLLo..','....oLLoo...','.....oo.....','..ooBBBBoo..','.oBhBBBBBBo.','oBBBBBBBBBBo','oBeBBBBBBBBo','oBeBBBBBBBBo','opBBBBBBBBBo','oBBBBBBBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'] },
];
// 사람형 공통 몸통(머리 8줄은 형태별로 다르게 붙인다)
export const HUMAN_BODY = { down:['..oBBooBBo..','.oBBBwwBBBo.','.oBBBwwBBBo.','.oBBBBBBBBo.','.onoBBBBono.','..obbbbbbo..','...ff..gg...'],
                     side:['..oBBBBBBo..','.oBBwBBBBBo.','.oBBwBBBBBo.','.oBBBBBBBBo.','.onBBBBBBBo.','..obbbbbbo..','...ff..gg...'] };
export const human = (name, headDown, headSide, body=HUMAN_BODY) => ({ name, down:[...headDown, ...body.down], side:[...headSide, ...body.side], human:true });
export const RPG_BODY_ARMOR = { down:['..okkookko..','.okkkwwkkko.','.okkkwwkkko.','.okkkkkkkko.','.onokkkkono.','..obbbbbbo..','...ff..gg...'], side:['..okkkkkko..','.okkwkkkkko.','.okkwkkkkko.','.okkkkkkkko.','.onkkkkkkko.','..obbbbbbo..','...ff..gg...'] };
export const RPG_SHAPES = [
  human(L("기사"), ['....oooo....','...okkkkko..','..okkkkkkko.','..okkkkkkko.','..oSeSSeSSo.','..okkkkkkko.','..okkkkkkko.','...oooooo...'],
               ['....oooo....','...okkkkko..','..okkkkkkko.','..okkkkkkko.','..oSeSSkkko.','..okkkkkkko.','..okkkkkkko.','...oooooo...'], RPG_BODY_ARMOR),
  human(L("마법사"), ['.....oo.....','....oBBo....','....oBBo....','...oBgBBo...','..oBBBBBBo..','.oooooooooo.','..oSeSSeSSo.','..owwwwwwo..'],
                 ['.....oo.....','....oBBo....','....oBBo....','...oBgBBo...','..oBBBBBBo..','.oooooooooo.','..oSeSSHHHo.','..owwwHHHo..']),
  human(L("궁수"), ['...oooooo...','..oBBBBBBo..','.oBBBBBBBBo.','.oBBSSSSBBo.','.oBSeSSeSBo.','.oBSSSSSSBo.','.oBpSSSSpBo.','..oSSSSSSo..'],
               ['...oooooo...','..oBBBBBBo..','.oBBBBBBBBo.','.oBSSSBBBBo.','.oBSeSSBBBo.','.oBSSSSBBBo.','.oBpSSSBBBo.','..oSSSSSSo..']),
  human(L("도적"), ['...oooooo...','..oHHHHHHo..','.oHHHHHHHHo.','.oHSSSSSSHo.','.oSkkkkkkSo.','.oSkeSSekSo.','.oSSSSSSSSo.','..oSSSSSSo..'],
               ['...oooooo...','..oHHHHHHo..','.oHHHHHHHHo.','.oSSSHHHHHo.','.okkkkHHHHo.','.okekkHHHHo.','.oSSSSHHHHo.','..oSSSSSSo..']),
  human(L("사제"), ['...oooooo...','..owwwwwwo..','.owwwwwwwwo.','.owwSSSSwwo.','.owSeSSeSwo.','.owSSSSSSwo.','.owSSSSSSwo.','..oSSSSSSo..'],
               ['...oooooo...','..owwwwwwo..','.owwwwwwwwo.','.owSSSwwwwo.','.owSeSSwwwo.','.owSSSSwwwo.','.owSSSSwwwo.','..oSSSSSSo..']),
  COZY_SHAPES[0],
];
export const OFFICE_SHAPES = [
  human(L("정장"), ['...oooooo...','..oHHHHHHo..','.oHHHHHHHHo.','.oHSSSSSSHo.','.oSeSSSSeSo.','.oSSSSSSSSo.','.opSSSSSSpo.','..oSSSSSSo..'],
               ['...oooooo...','..oHHHHHHo..','.oHHHHHHHHo.','.oSSSHHHHHo.','.oSeSSHHHHo.','.oSSSSHHHHo.','.opSSSHHHHo.','..oSSSSSSo..'],
               { down:['..oBBooBBo..','.oBBBrrBBBo.','.oBBBrrBBBo.','.oBBBBrBBBo.','.onoBBBBono.','..obbbbbbo..','...ff..gg...'], side:HUMAN_BODY.side }),
  human(L("긴머리"), ['...oooooo...','..oHHHHHHo..','.oHHHHHHHHo.','.oHHSSSSHHo.','.oHSeSSeSHo.','.oHSSSSSSHo.','.oHpSSSSpHo.','.oHoSSSSoHo.'],
                 ['...oooooo...','..oHHHHHHo..','.oHHHHHHHHo.','.oSSSHHHHHo.','.oSeSSHHHHo.','.oSSSSHHHHo.','.opSSSHHHHo.','.oHoSSoHHHo.']),
  human(L("안경"), ['...oooooo...','..oHHHHHHo..','.oHHHHHHHHo.','.oHSSSSSSHo.','.oSkkSSkkSo.','.oSSSSSSSSo.','.opSSSSSSpo.','..oSSSSSSo..'],
               ['...oooooo...','..oHHHHHHo..','.oHHHHHHHHo.','.oSSSHHHHHo.','.okkSSHHHHo.','.oSSSSHHHHo.','.opSSSHHHHo.','..oSSSSSSo..']),
  human(L("후드"), ['...oooooo...','..oBBBBBBo..','.oBBBBBBBBo.','.oBBSSSSBBo.','.oBSeSSeSBo.','.oBSSSSSSBo.','.oBpSSSSpBo.','..oSSSSSSo..'],
               ['...oooooo...','..oBBBBBBo..','.oBBBBBBBBo.','.oBSSSBBBBo.','.oBSeSSBBBo.','.oBSSSSBBBo.','.oBpSSSBBBo.','..oSSSSSSo..']),
  human(L("팀장"), ['...oooooo...','..oSSSSSSo..','.oHSSSSSSHo.','.oHSSSSSSHo.','.oSeSSSSeSo.','.oSSSSSSSSo.','.oSHHHHHHSo.','..oHHHHHHo..'],
               ['...oooooo...','..oSSSSSSo..','.oSSSSSSSHo.','.oSSSSSSSHo.','.oSeSSSSSHo.','.oSSSSSSSHo.','.oHHHSSSSHo.','..oHHHSSSo..'],
               { down:['..oBBooBBo..','.oBBBrrBBBo.','.oBBBrrBBBo.','.oBBBBrBBBo.','.onoBBBBono.','..obbbbbbo..','...ff..gg...'], side:HUMAN_BODY.side }),
  human(L("상담원"), ['...oooooo...','..okkkkkko..','.oHHHHHHHHo.','.okSSSSSSko.','.okeSSSSeko.','.oSSSSSSSSo.','.opSSSSSSpo.','..oSSSSSSo..'],
                 ['...oooooo...','..okkkkkko..','.oHHHHHHHHo.','.okSSHHHHko.','.okeSSHHHko.','.oSSSSHHHHo.','.opSSSHHHHo.','..oSSSSSSo..']),
];
export const BOT_SHAPE = { name:L("봇"), down:['....oooo....','....orro....','....oooo....','.....oo.....','.oooooooooo.','oBhBBBBBBBBo','oBBBBBBBBBBo','oBbbbbbbbbBo','oBbwwbbbwwBo','oBbbbbbbbbBo','oBBBBBBBBBBo','oBBBBooBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'],
  side:['....oooo....','....orro....','....oooo....','.....oo.....','.oooooooooo.','oBhBBBBBBBBo','oBBBBBBBBBBo','oBbbbbbbbbBo','oBwwbbbbbbBo','oBbbbbbbbbBo','oBBBBBBBBBBo','oBooBBBBBBBo','.oBBBBBBBBo.','.obbBBBBbbo.','..oobbbboo..','...ff..gg...'] };
export const BOT_COLOR = { name:L("봇"), B:'#c3c6d1', b:'#8d91a0', h:'#eceef3' };
// 주인 NPC(props.me): 테마와 상관없이 금빛 옷에 진홍 안감, 머리에 왕관(ICON_ROWS.crown). 형태는 테마의 것을 그대로 쓴다(p3.js buildAssets → A.me)
export const ME_COLOR = { name:L("주인"), B:'#f0c04a', b:'#c0392b', h:'#fff0b8' };

export const FIXED_COMMON = { o:'#3b2f3a', e:'#3b2f3a', w:'#ffffff', p:'#f29ba0', S:'#ffd9b3', n:'#ffd9b3', f:'#3b2f3a', g:'#3b2f3a' };
export const THEMES: Record<string, any> = {
  cozy: { name:L("아늑"), palette:{},
    characters:{ shapes:COZY_SHAPES, colors:[
      { name:L("핑크"), B:'#f7a8bd', b:'#df7d99', h:'#ffd3df' },{ name:L("하늘"), B:'#93c0f0', b:'#6a98cc', h:'#c6def8' },{ name:L("민트"), B:'#9fdcb8', b:'#6fb98f', h:'#d0f0dd' },
      { name:L("노랑"), B:'#f6d574', b:'#d8ad48', h:'#fbe8a8' },{ name:L("라일락"), B:'#c9b0ee', b:'#a287cc', h:'#e4d6f8' },{ name:L("살구"), B:'#f9b98a', b:'#d88e5c', h:'#fdd9bb' }],
      fixed:{ ...FIXED_COMMON, S:'#fff1d9', r:'#e8707f', k:'#e8707f', L:'#78c77a' }, up:{ S:'B', e:'B', p:'B', r:'B', w:'b', n:'B' } },
    kinds:{ plaza:[L("메인 광장"),'fountain','fountain'], shop:[L("상점"),'shop','cart'], library:[L("도서관"),'library','book'], community:[L("커뮤니티 센터"),'community','heart'], home:[L("작은 집"),'house','house'], checkout:[L("계산대"),'stall','coin'],
      cafe:[L("카페"),'cafe','mug'], school:[L("학교"),'school','bell'], clinic:[L("병원"),'clinic','cross'], post:[L("우체국"),'post','mail'], factory:[L("공방"),'workshop','gear'], park:[L("공원"),'park','flower'] },
    decor:{ tree:'round', pond:'pond', gate:'wood', ground:'grass' } },
  rpg: { name:'RPG', palette:{ grass:'#8fc47c', grass2:'#7bb068', grass3:'#5f9a52', dirt:'#c9a87a', dirt2:'#a8875c', stone:'#cfcac0', stone2:'#a39d92', wall:'#efe3c8', wall2:'#d9c9a6', wood:'#a86f45', wood2:'#7a4b2c', roofBlue:'#6f7fc4', roofPink:'#c76a5c', roofGreen:'#7aa86a', roofYellow:'#d9b45a', water:'#7fb7df', water2:'#4f8fc0' },
    characters:{ shapes:RPG_SHAPES, colors:[
      { name:L("진홍"), B:'#c9556a', b:'#933a4c', h:'#e58a9a' },{ name:L("감청"), B:'#4f73b8', b:'#36508a', h:'#86a6e0' },{ name:L("숲"), B:'#5f9e63', b:'#3f6f45', h:'#95c898' },
      { name:L("황금"), B:'#d9a846', b:'#a67a2c', h:'#f0cf86' },{ name:L("보라"), B:'#8a63b8', b:'#5f4186', h:'#b79ad8' },{ name:L("흑단"), B:'#5a4a5c', b:'#3b2f3a', h:'#8a7a8c' }],
      fixed:{ ...FIXED_COMMON, H:'#5a3a2a', k:'#b9bcc8', r:'#e8707f', L:'#78c77a' }, up:{ S:'H', e:'H', p:'H', w:'B', n:'B' } },
    kinds:{ plaza:[L("마을 우물"),'well','fountain'], shop:[L("무기 상점"),'armory','sword'], library:[L("마법사의 탑"),'tower','tower'], community:[L("여관 겸 길드"),'inn','mug'], home:[L("오두막"),'cabin','house'], checkout:[L("보물 환전소"),'treasury','chest'],
      cafe:[L("선술집"),'tavern','mug'], school:[L("수련장"),'academy','bell'], clinic:[L("치유사의 집"),'healer','cross'], post:[L("전령 비둘기장"),'dovecote','mail'], factory:[L("대장간"),'smithy','gear'], park:[L("약초 정원"),'garden','flower'] },
    decor:{ tree:'pine', pond:'pond', gate:'stone', ground:'grass' } },
  office: { name:L("오피스"), palette:{ grass:'#dfe3ea', grass2:'#d3d8e1', grass3:'#c2c8d3', dirt:'#9aa3b5', dirt2:'#7f889b', stone:'#eef0f4', stone2:'#c9cfdb', wall:'#f7f8fb', wall2:'#dfe3ec', wood:'#c9a27a', wood2:'#8f6e4d', roofBlue:'#5b6b8f', roofPink:'#e9a1a1', roofGreen:'#86c3a5', roofYellow:'#f0c85b', water:'#bcd8f3', water2:'#7fb0e0', leaf:'#73b77a' },
    characters:{ shapes:OFFICE_SHAPES, colors:[
      { name:L("네이비"), B:'#3f4f7a', b:'#2b3656', h:'#6a7ba8' },{ name:L("차콜"), B:'#5a5a66', b:'#3b3b45', h:'#8a8a98' },{ name:L("그레이"), B:'#9aa2b4', b:'#6f7789', h:'#c4cad8' },
      { name:L("베이지"), B:'#d8c4a6', b:'#ab9777', h:'#efe2cc' },{ name:L("버건디"), B:'#8e3f54', b:'#632838', h:'#b86a7e' },{ name:L("올리브"), B:'#6f8a5a', b:'#4d623c', h:'#9ab285' }],
      fixed:{ ...FIXED_COMMON, H:'#4a3328', k:'#3b2f3a', r:'#d85a6a', L:'#78c77a' }, up:{ S:'H', e:'H', p:'H', w:'B', r:'B', n:'B' } },
    kinds:{ plaza:[L("로비"),'lobby','fountain'], shop:[L("쇼룸"),'showroom','cart'], library:[L("자료실"),'archive','book'], community:[L("회의실"),'meeting','heart'], home:[L("내 자리"),'desk','desk'], checkout:[L("결제 창구"),'cashier','coin'],
      cafe:[L("카페테리아"),'cafeteria','coffee'], school:[L("교육실"),'training','bell'], clinic:[L("의무실"),'medical','cross'], post:[L("우편실"),'mailroom','mail'], factory:[L("서버실"),'serverroom','gear'], park:[L("휴게 라운지"),'lounge','flower'] },
    decor:{ tree:'pot', pond:'lounge', gate:'glass', ground:'tile' } },
};
