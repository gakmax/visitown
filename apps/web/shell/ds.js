// 디자인 시스템 페이지(/design-system, 예전 src/ds.html의 스크립트): 사운드·배경음·버튼·드롭다운·확인창·색 토큰을 보여 주고 들어 본다. 헬퍼는 대시보드와 같은 shell/helpers.js·shell/sfx.js
import { SOUNDS, synth, TRACKS, bgm } from './sfx.js';
import { PXS, pxSelect, pxsClose, initPxSelect, pop, say, errText, ask, note, hooks } from './helpers.js';
const $ = id => document.getElementById(id);
let booted = false;
export function boot() { if (booted) return; booted = true; hooks.sfx = name => sfx(name); initPxSelect();
// 효과음: 대시보드 sfx와 같은 이름. 헤더 '효과음'으로 끈다
const SND={ on:true };
function sfx(name){ if (SND.on) try { synth.play(name); } catch {} }
function replay(el){ el.style.animation='none'; void el.offsetWidth; el.style.animation=''; }  // 열림 애니메이션을 처음부터 다시
function h(tag, attrs={}, ...kids){ const el=document.createElement(tag); for (const [k,v] of Object.entries(attrs)) k.startsWith('on') ? el.addEventListener(k.slice(2), v) : el.setAttribute(k, v); el.append(...kids); return el; }

// ---- 라우터: #/이름. 새 컴포넌트 페이지는 ROUTES에 하나 추가하면 목차에 붙는다 ----
const ROUTES={
  sound:  { title:'사운드', render:renderSound },
  bgm:    { title:'배경음', render:renderBgm },
  button: { title:'버튼', render:renderButton, sfx:true },
  select: { title:'드롭다운', render:renderSelect, sfx:true },
  dialog: { title:'확인창', render:renderDialog, sfx:true },
  color:  { title:'색', render:renderColor },
};
const SOON=[];   // 아직 안 만든 페이지(목차에 흐리게)
let cleanup=null;
function route(){
  const key=(location.hash.match(/^#\/(\w+)/)||[])[1], name=ROUTES[key] ? key : Object.keys(ROUTES)[0], r=ROUTES[name];
  cleanup?.(); cleanup=null;
  $('nav').replaceChildren(...Object.entries(ROUTES).map(([k,v])=>h('a', k===name ? { href:'#/'+k, 'aria-current':'page' } : { href:'#/'+k }, v.title)),
    ...SOON.map(t=>h('span', { class:'soon' }, t+' · 준비 중')));
  const view=$('view'); view.replaceChildren(); view.dataset.sfx=r.sfx ? '1' : ''; replay(view); PXS.open && pxsClose();
  document.title=`${r.title} · Visitown 디자인 시스템`;
  cleanup=r.render(view)||null;
}
addEventListener('hashchange', route);

// 오실로스코프: 지금 나는 소리의 파형(synth 애널라이저. 효과음·배경음이 같은 사슬을 지난다). 사운드·배경음 페이지가 같이 쓰고, 돌려주는 함수로 멈춘다
function mountScope(view){
  const scope=h('canvas', { id:'scope', width:'240', height:'32', 'aria-hidden':'true' }); view.append(scope);
  const g=scope.getContext('2d'); let raf=0, buf=null;
  function draw(){ raf=requestAnimationFrame(draw); const cs=getComputedStyle(document.documentElement), H=scope.height;
    const W=Math.max(1, scope.clientWidth/2|0); if (scope.width!==W) scope.width=W;   // 화면 1칸 = 캔버스 2px(픽셀 느낌), 가로로 늘어나지 않게
    g.fillStyle=cs.getPropertyValue('--panel-2'); g.fillRect(0,0,W,H);
    const a=synth.analyser(); g.fillStyle=cs.getPropertyValue('--ink-2');
    if (!a){ g.fillRect(0,H/2,W,1); return; }
    buf??=new Uint8Array(a.fftSize); a.getByteTimeDomainData(buf);
    for (let x=0;x<W;x++) g.fillRect(x, Math.min(H-1, buf[Math.floor(x/W*buf.length)]/256*H|0), 1, 1); }
  draw();
  return ()=>cancelAnimationFrame(raf);
}

// ---- 사운드 ----
const KEYS='1234567890qwert';
const TIER={ ui:'UI', visit:'방문자', accent:'강조' };   // SOUNDS의 tier(크기 등급) 표시 이름
const edits={};   // 이름 → 편집기에서 고친 정의(이 탭에서만)
function renderSound(view){
  const names=Object.keys(SOUNDS), def=n=>edits[n]||SOUNDS[n];
  const cards={};
  function play(n){ const ok=synth.play(n, def(n)); if (ok) pop(cards[n],'ring'); return ok; }
  view.append(
    h('h2', {}, '사운드'),
    h('p', { class:'lead' }, '파일 없이 Web Audio로 합성하는 8비트 효과음이에요. 정의는 src/sfx.js의 SOUNDS에 있어요. "사용 중"은 지금 대시보드가 내는 소리, 나머지는 후보예요. 처음 한 번은 아무 버튼이나 눌러야 소리가 나요(브라우저 정책).'),
  );
  const volOut=h('span', { class:'msg' }, Math.round(synth.volume*100)+'%');
  const vol=h('input', { type:'range', min:'0', max:'1', step:'0.05', value:String(synth.volume), 'aria-label':'전체 크기', oninput:()=>{ synth.volume=+vol.value; volOut.textContent=Math.round(vol.value*100)+'%'; } });
  const burstMsg=h('span', { class:'msg' });
  view.append(h('div', { class:'card bar' },
    h('label', {}, '전체 크기', vol, volOut),
    h('button', { class:'btn', type:'button', onclick:()=>{ let n=0; for (let i=0;i<12;i++) setTimeout(()=>{ n+=play('enter') ? 1 : 0; if (i===11) say(burstMsg, `입장 12번 중 ${n}번 울렸어요 (gap ${def('enter').gap??.05}초)`); }, i*50); } }, '몰림 테스트'),
    h('button', { class:'btn', type:'button', onclick:()=>names.forEach((n,i)=>setTimeout(()=>play(n), i*450)) }, '전부 듣기'),
    burstMsg));
  const stopScope=mountScope(view);

  const grid=h('div', { class:'grid' });
  names.forEach((n,i)=>{ const d=SOUNDS[n];
    cards[n]=h('div', { class:'card snd' },
      h('div', { class:'hd' }, h('b', {}, d.label), KEYS[i] ? h('kbd', {}, KEYS[i].toUpperCase()) : ''),
      h('code', {}, `${d.inUse?'사용 중 · ':''}${n} · ${Math.round(synth.length(d)*1000)}ms${d.tier?' · '+TIER[d.tier]:''}`),
      h('p', {}, d.desc),
      h('div', { class:'act' },
        h('button', { class:'btn primary', type:'button', onclick:()=>play(n) }, '▶ 듣기'),
        h('button', { class:'btn', type:'button', onclick:()=>edit(n) }, '고치기')));
    grid.append(cards[n]); });
  view.append(grid);

  // 편집기: 목소리 배열을 JSON으로 고쳐 바로 들어 본다. 마음에 들면 복사해서 src/sfx.js에 붙인다
  const ed=h('div', { class:'card', id:'editor', hidden:'' });
  view.append(ed, h('p', { class:'hint' }, '숫자·글자 키로도 들을 수 있어요. 고친 소리는 이 탭에서만 유지돼요.'));
  function edit(n){
    const ta=h('textarea', { spellcheck:'false', 'aria-label':'목소리 정의' }), msg=h('span', { class:'msg' });
    const fmt=d=>'[\n'+d.voices.map(o=>'  '+JSON.stringify(o)).join(',\n')+'\n]';
    ta.value=fmt(def(n));
    const read=()=>{ try { const v=JSON.parse(ta.value); if (!Array.isArray(v)||!v.length) throw 0; for (const o of v) if (!(o.d>0)||(o.w!=='noise'&&o.f==null)) throw 0; return { ...SOUNDS[n], voices:v }; }
      catch { say(msg, '형식이 맞지 않아요. 목소리마다 w와 d(노이즈가 아니면 f도)가 필요해요', true); return null; } };
    ed.replaceChildren(
      h('div', { class:'row' }, h('b', {}, `${SOUNDS[n].label} 고치기`), h('code', {}, n)),
      ta,
      h('div', { class:'row' },
        h('button', { class:'btn primary', type:'button', onclick:()=>{ const d=read(); if (!d) return; edits[n]=d; cards[n].classList.add('edited'); if (synth.play(n, d)) pop(cards[n],'ring'); say(msg, `적용했어요 · ${Math.round(synth.length(d)*1000)}ms`); } }, '▶ 적용하고 듣기'),
        h('button', { class:'btn', type:'button', onclick:()=>{ delete edits[n]; cards[n].classList.remove('edited'); ta.value=fmt(SOUNDS[n]); say(msg, '원래대로 돌렸어요'); } }, '원래대로'),
        h('button', { class:'btn', type:'button', onclick:async()=>{ const d=read(); if (!d) return; const line=`  ${n}: { label:'${d.label}', desc:'${d.desc}', ${d.inUse?'inUse:true, ':''}${d.tier?`tier:'${d.tier}', `:''}${d.gap!=null?`gap:${d.gap}, `:''}voices:${JSON.stringify(d.voices).replace(/"(\w+)":/g,'$1:').replace(/"/g,"'")} },`;
          try { await navigator.clipboard.writeText(line); say(msg, 'sfx.js에 붙일 한 줄을 복사했어요'); } catch { say(msg, '복사하지 못했어요', true); } } }, 'sfx.js 줄 복사'),
        msg));
    ed.hidden=false; replay(ed);
    ed.scrollIntoView({ block:'nearest', behavior:'smooth' }); ta.focus({ preventScroll:true });
  }

  const onKey=e=>{ if (e.target.closest('textarea,input')||e.ctrlKey||e.metaKey||e.altKey) return; const i=KEYS.indexOf(e.key.toLowerCase()); if (i>=0&&names[i]){ e.preventDefault(); play(names[i]); } };
  addEventListener('keydown', onKey);
  return ()=>{ stopScope(); removeEventListener('keydown', onKey); };
}

// ---- 배경음: src/sfx.js의 TRACKS를 bgm.start(이름)로 튼다. 동시에 하나만, 페이지를 떠나면 멈춘다. 대시보드에는 아직 안 붙였다(들어 보고 고른 뒤) ----
const KIND={ music:'BGM', ambient:'환경음' }, PAIR={ day:'night', night:'day', 'amb-day':'amb-night', 'amb-night':'amb-day' };   // 낮/밤 전환 짝(비는 그대로)
function renderBgm(view){
  const names=Object.keys(TRACKS), cards={}, btns={}, tags={};
  view.append(h('h2', {}, '배경음'),
    h('p', { class:'lead' }, '몇 시간 켜 둬도 안 질리게 만든 루프예요. BGM은 8마디 코드 진행 위의 느린 아르페지오(pulse12)·삼각파 베이스·아주 작은 하이햇이고, 마디마다 시드 난수로 조금씩 달라져 64마디가 한 바퀴예요. 환경음은 노이즈·필터·LFO예요. 정의는 src/sfx.js의 TRACKS, 재생은 bgm.start(이름). 동시에 하나만 울리고 바뀔 때 0.7초 페이드예요. 효과음보다 10dB 넘게 작게 맞춰 뒀어요.'));
  const volOut=h('span', { class:'msg' }, Math.round(bgm.volume*100)+'%');
  const vol=h('input', { type:'range', min:'0', max:'1', step:'0.05', value:String(bgm.volume), 'aria-label':'배경음 크기', oninput:()=>{ bgm.volume=+vol.value; volOut.textContent=Math.round(vol.value*100)+'%'; } });
  const status=h('span', { class:'msg' }, '멈춰 있어요');
  // 낮/밤: 멈춰 있으면 그 쪽 BGM을, BGM·환경음이 돌고 있으면 짝(day↔night, amb-day↔amb-night)으로 바꾼다. 비처럼 짝이 없거나 이미 그 쪽이면 그대로
  const modeBtn=mode=>h('button', { class:'btn', type:'button', 'aria-pressed':'false', 'data-mode':mode, onclick:()=>{ const cur=bgm.current, target=!cur ? mode : (PAIR[cur] && cur!==mode && cur!=='amb-'+mode ? PAIR[cur] : null); if (target) play(target); } }, mode==='day' ? '낮' : '밤');
  const modes=h('div', { class:'group' }, modeBtn('day'), modeBtn('night'));
  view.append(h('div', { class:'card bar' },
    h('label', {}, '배경음 크기', vol, volOut), modes,
    h('button', { class:'btn', type:'button', onclick:()=>{ bgm.stop(); refresh(); } }, '■ 모두 정지'), status));
  const stopScope=mountScope(view);
  function play(n){ if (bgm.current===n){ bgm.stop(); } else if (bgm.start(n)) pop(cards[n], 'ring'); else say(status, '소리를 켜지 못했어요(브라우저가 Web Audio를 막았어요)', true); refresh(); }
  function refresh(){ const cur=bgm.current;
    for (const n of names){ const on=cur===n; btns[n].textContent=on ? '■ 정지' : '▶ 재생'; btns[n].setAttribute('aria-pressed', String(on)); tags[n].hidden=!on; }
    for (const b of modes.children) b.setAttribute('aria-pressed', String(!!cur && (cur===b.dataset.mode || cur==='amb-'+b.dataset.mode))); }
  const grid=h('div', { class:'grid' });
  for (const n of names){ const d=TRACKS[n];
    tags[n]=h('span', { class:'tag', hidden:'' }, '재생 중');
    btns[n]=h('button', { class:'btn primary', type:'button', 'aria-pressed':'false', onclick:()=>play(n) }, '▶ 재생');
    cards[n]=h('div', { class:'card snd' },
      h('div', { class:'hd' }, h('b', {}, d.label), tags[n]),
      h('code', {}, d.kind==='music' ? `${KIND[d.kind]} · ${n} · ${d.bpm} BPM · ${d.prog.length}마디 ${d.prog.join('–')}` : `${KIND[d.kind]} · ${n}`),
      h('p', {}, d.desc),
      h('div', { class:'act' }, btns[n]));
    grid.append(cards[n]); }
  view.append(grid, h('p', { class:'hint' }, '예약은 Web Audio 시계로 0.1초 앞을 미리 잡아 두는 방식이라 탭이 뒤에 있어도 박자가 밀리지 않아요. 페이지를 떠나면 멈춰요.'));
  // 상태 문구: 재생 중인 트랙과 마디·박(매 프레임 글자만 바꾼다)
  let raf=0, shown; function tickUI(){ raf=requestAnimationFrame(tickUI); const cur=bgm.current, d=cur && TRACKS[cur], p=bgm.position; if (cur!==shown){ shown=cur; refresh(); }   // 코드로 bgm.start를 불러도 버튼·태그가 따라온다
    const t=!cur ? '멈춰 있어요' : p ? `${d.label} · ${d.bpm} BPM · ${p.bar+1}마디 ${p.beat+1}박` : `${d.label} · 재생 중`; if (status.textContent!==t) status.textContent=t; }
  tickUI();
  return ()=>{ bgm.stop(); stopScope(); cancelAnimationFrame(raf); };
}

// ---- 컴포넌트 페이지 공통: 예시 HTML 한 덩어리를 그대로 그리고 그 코드를 아래에 보여 준다 ----
function codeBox(code){
  return h('div', { class:'code' }, h('pre', {}, h('code', {}, code)),
    h('button', { class:'btn', type:'button', onclick:async e=>{ try { await navigator.clipboard.writeText(code); e.target.textContent='복사됨'; } catch { e.target.textContent='막힘'; } setTimeout(()=>{ e.target.textContent='복사'; }, 1200); } }, '복사')); }
// spec(제목, 설명, { html: 예시이자 코드, code: 보여 줄 코드(따로 있으면), demo: 직접 만든 노드, notes: 규칙 목록, wire: 예시에 동작 붙이기 })
function spec(title, desc, { html, code, demo, notes, wire }={}){
  const box=h('div', { class:'demo' }); if (html) box.innerHTML=html; if (demo) box.append(...[].concat(demo));
  wire?.(box);
  return h('section', { class:'card spec' }, h('h3', {}, title), desc ? h('p', {}, desc) : '', box,
    notes ? h('ul', {}, ...notes.map(n=>h('li', {}, n))) : '', (code??html) ? codeBox((code??html).trim()) : ''); }
// 예시 안 aria-pressed 버튼: .group 안이면 하나만 눌림, 따로 있으면 켜고 끄기
function wirePressed(box){ box.querySelectorAll('.btn[aria-pressed]').forEach(b=>b.addEventListener('click', ()=>{ const g=b.closest('.group');
  if (g) g.querySelectorAll('.btn').forEach(x=>x.setAttribute('aria-pressed', String(x===b))); else b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed')!=='true')); })); }
function page(view, title, lead, ...specs){ view.append(h('h2', {}, title), h('p', { class:'lead' }, lead), h('div', { class:'specs' }, ...specs)); }

// ---- 버튼 ----
function renderButton(view){
  page(view, '버튼', '대시보드의 .btn이에요. 마우스를 올리면 1px 떠오르고, 누르면 2px 내려가요. 포커스는 안쪽 하늘색 테두리, 누르면 "버튼 누름" 소리가 나요. 모서리는 border-radius 대신 픽셀 노치예요.',
    spec('종류', '색은 뜻으로 골라요. 한 화면(패널)에 주요 버튼은 하나만 둬요.', {
      html:`<button class="btn" type="button">기본</button>
<button class="btn primary" type="button">저장하기</button>
<button class="btn pink" type="button">지우기</button>
<button class="btn gold" type="button">강조</button>
<button class="btn" type="button" disabled>꺼짐</button>`,
      notes:['기본: 대부분의 동작', 'primary(초록): 패널의 주된 동작(저장·확인·만들기)', 'pink(분홍): 지우기처럼 되돌릴 수 없는 동작. ask(…, { danger:true })의 확인 버튼과 같은 색', 'gold(금색): 해금·추천처럼 눈에 띄어야 하는 것', 'disabled: 반투명, 떠오르지 않고 소리도 안 나요'] }),
    spec('눌린 상태', '켜고 끄는 버튼은 aria-pressed로 상태를 줘요. 눌린 쪽은 금색으로 내려간 채 있어요.', {
      html:`<button class="btn" type="button" aria-pressed="true">켜짐</button>
<button class="btn" type="button" aria-pressed="false">꺼짐</button>`, wire:wirePressed }),
    spec('버튼 묶음', '여럿 중 하나를 고를 때(배율·탭). 그림자 없이 테두리를 붙여 한 줄로 만들어요. .group.theme은 낮은 크기.', {
      html:`<div class="group">
  <button class="btn" type="button" aria-pressed="true">1x</button>
  <button class="btn" type="button" aria-pressed="false">2x</button>
  <button class="btn" type="button" aria-pressed="false">3x</button>
</div>
<div class="group theme">
  <button class="btn" type="button" aria-pressed="false">지금</button>
  <button class="btn" type="button" aria-pressed="true">오늘</button>
</div>`, wire:wirePressed }),
    spec('링크 버튼', '다른 페이지로 가는 것은 <a class="btn">. 밑줄 없이 버튼처럼 보여요.', {
      html:`<a class="btn" href="#/select">드롭다운 보기 →</a>` }),
    spec('체크박스', '네이티브 checkbox를 그대로 쓰면 픽셀 체크박스가 돼요. 글자와 묶을 때는 label.toggle. 켜면 안쪽 칸이 popIn, 켜기·끄기 소리가 나요.', {
      html:`<label class="toggle"><input type="checkbox" checked>건물 이름</label>
<label class="toggle"><input type="checkbox">발자국</label>
<label class="toggle"><input type="checkbox" checked>낮·밤</label>` }),
    spec('태그·키', '.tag는 1px 테두리의 작은 표시(정보 패널), kbd는 단축키 안내예요.', {
      html:`<span class="tag">신규</span>
<span class="tag bot">봇</span>
<span class="tag pro">PRO</span>
<span class="tag me">나</span>
<kbd>D</kbd>
<kbd>Esc</kbd>` }));
}

// ---- 드롭다운 ----
const COUNTRIES=['대한민국','일본','미국','중국','대만','베트남','태국','인도네시아','필리핀','싱가포르','영국','독일','프랑스','캐나다','호주','브라질'];
function showValue(box){ const out=h('span', { class:'msg' }, '바꾸면 여기에 change가 찍혀요'); box.append(out);
  box.querySelectorAll('select').forEach(s=>s.addEventListener('change', ()=>say(out, `change → value "${s.value}" · selectedIndex ${s.selectedIndex}`))); }
function renderSelect(view){
  page(view, '드롭다운', '화면의 <select>는 그냥 네이티브로 쓰면 pxSelect(p6.js)가 픽셀 드롭다운으로 감싸요. 값과 change 이벤트는 숨겨진 select가 그대로 들고 있어서 기존 코드는 손댈 게 없어요.',
    spec('기본', '버튼 너비는 가장 긴 항목에 맞춰 고정돼요(항목을 바꿔도 흔들리지 않게). 아래 공간이 모자라면 위로 열려요.', {
      html:`<select aria-label="배율">
  <option value="1">1배</option>
  <option value="2" selected>2배</option>
  <option value="4">4배 (크게)</option>
</select>`, wire:showValue,
      notes:['키보드: 버튼에서 ↑↓는 열지 않고 바로 바꾸기, Enter·Space로 열기, 목록에서 Esc·Tab으로 닫기', '항목을 옮기면 "항목 이동", 버튼을 누르면 "버튼 누름" 소리', 'title·aria-label은 픽셀 버튼으로 옮겨 붙어요'] }),
    spec('그림 있는 항목', 'option에 data-img를 주면 버튼과 목록에 그림이 붙어요(건물 종류 고르기).', {
      html:`<select aria-label="아이콘">
  <option data-img="../icons/favicon-32.png">작은 아이콘</option>
  <option data-img="../icons/icon-180.png">큰 아이콘</option>
</select>` }),
    spec('고를 수 없는 항목', 'disabled는 흐리게 보이고 건너뛰어요. data-locked="1"은 잠긴 테마처럼 회색이지만 고를 수는 있어요(고른 뒤 안내를 띄우는 용도).', {
      html:`<select aria-label="테마">
  <option>봄 마을</option>
  <option data-locked="1">겨울 마을 (잠김)</option>
  <option disabled>준비 중</option>
  <option>밤 마을</option>
</select>`, wire:showValue }),
    spec('꺼진 드롭다운', 'select에 disabled를 주면 버튼도 꺼져요.', {
      html:`<select aria-label="꺼짐" disabled><option>바꿀 수 없어요</option></select>` }),
    spec('긴 목록', '목록은 최대 280px까지 늘고 그 뒤로는 스크롤돼요. 열 때 고른 항목이 보이게 스크롤해요.', {
      html:`<select aria-label="나라">\n${COUNTRIES.map(c=>`  <option>${c}</option>`).join('\n')}\n</select>` }),
    spec('항목을 코드로 바꿀 때', '새로 생긴 select는 MutationObserver가 알아서 감싸지만, 이미 감싼 select의 option을 바꾸면 pxs-refresh를 보내야 버튼 글자가 다시 그려져요. 테스트에서는 select_option 대신 selectedIndex + change를 써요.', {
      demo:(()=>{ const s=h('select', { 'aria-label':'항목 늘리기' }, h('option', {}, '항목 1')); let n=1;
        return [s, h('button', { class:'btn', type:'button', onclick:()=>{ s.append(h('option', {}, `항목 ${++n}`)); s.selectedIndex=n-1; s.dispatchEvent(new Event('pxs-refresh')); } }, '항목 더하고 고르기')]; })(),
      code:`sel.append(new Option('새 항목'));
sel.dispatchEvent(new Event('pxs-refresh'));   // 버튼 다시 그리기

// Playwright
await page.evaluate(() => { const s = document.querySelector('#themeSel');
  s.selectedIndex = 2; s.dispatchEvent(new Event('change', { bubbles: true })); });` }),
    spec('해금 강조', '테마가 새로 열리면 그 드롭다운 버튼이 금색으로 세 번 깜빡여요(unlockGlow).', {
      demo:(()=>{ const s=h('select', { 'aria-label':'테마' }, h('option', {}, '봄 마을'), h('option', {}, '겨울 마을'));
        return [s, h('button', { class:'btn gold', type:'button', onclick:()=>{ pop(s.parentNode.querySelector('.pxs-btn'), 'unlocked'); sfx('unlock'); } }, '해금 보기')]; })(),
      code:`pop(sel.parentNode.querySelector('.pxs-btn'), 'unlocked'); sfx('unlock');` }));
}

// ---- 확인창 ----
function renderDialog(view){
  const result=()=>h('span', { class:'msg' }, '결과가 여기에 나와요');
  const askDemo=(label, cls, run)=>{ const out=result(); return [h('button', { class:'btn '+cls, type:'button', onclick:async()=>say(out, await run()) }, label), out]; };
  const errs=[['401', Object.assign(new Error('unauthorized'), { status:401 })], ['403', Object.assign(new Error('forbidden'), { status:403 })], ['404', Object.assign(new Error('not found'), { status:404 })],
    ['429', Object.assign(new Error('rate limited'), { status:429 })], ['500', Object.assign(new Error('internal'), { status:500 })], ['네트워크 끊김', new TypeError('Failed to fetch')],
    ['서버가 준 한국어', new Error('경로는 /로 시작해야 해요')], ['그 밖의 영어', new Error('bad path')]];
  page(view, '확인창', '브라우저 기본 alert·confirm·prompt 대신 쓰는 픽셀 확인창(#dlg)이에요. 모달 패널 위에 배경 fadeIn + 상자 popIn으로 뜨고, 열고 닫을 때 패널 소리가 나요.',
    spec('지우기 확인', '되돌릴 수 없는 동작. danger면 확인 버튼이 분홍이고 처음 포커스는 취소에 가요. 확인하면 "지우기" 소리.', {
      demo:askDemo('건물 지우기', 'pink', async()=>await ask('"가게" 건물을 지울까요?\n그 페이지 방문 기록은 남아 있어요.', { ok:'지우기', danger:true }) ? 'true: 지웠어요' : 'false: 그대로 뒀어요'),
      code:`if (!await ask('"가게" 건물을 지울까요?', { ok:'지우기', danger:true })) return;` }),
    spec('일반 확인', '확인 버튼이 초록이고 처음 포커스도 확인에 있어요. 버튼 글자는 동작 이름으로 바꿔요.', {
      demo:askDemo('나가기 확인', 'primary', async()=>await ask('저장하지 않은 변경이 있어요. 나갈까요?', { ok:'나가기', cancel:'계속 고치기' }) ? 'true' : 'false'),
      code:`const ok = await ask('저장하지 않은 변경이 있어요. 나갈까요?', { ok:'나가기', cancel:'계속 고치기' });` }),
    spec('알림', 'note는 확인 버튼 하나뿐인 ask예요. 끝날 때까지 기다리고 싶으면 await.', {
      demo:askDemo('알림 띄우기', '', async()=>{ await note('사진을 저장했어요.\n내려받기 폴더를 확인해 주세요.'); return '닫혔어요'; }),
      code:`await note('사진을 저장했어요.');`,
      notes:['Esc나 바깥(어두운 배경)을 누르면 취소(false)', 'Tab은 창 안의 버튼 사이에서만 돌아요', '닫히면 열기 전 포커스로 돌아가요', '열려 있는 중에 다시 ask하면 앞의 것은 false로 끝나요', '문구의 \\n은 줄바꿈이에요'] }),
    spec('패널 안 상태 문구', '저장·요청 결과는 확인창이 아니라 그 패널의 상태 문구로 알려요. 성공은 say(el, 문구), 실패는 say(el, errText(e, …), true)로 빨갛게. "저장했어요"로 시작하면 저장 소리, 실패면 실패 소리가 나요.', {
      demo:(()=>{ const out=h('span', { class:'msg' }); return [
        h('button', { class:'btn primary', type:'button', onclick:()=>say(out, '저장했어요') }, '성공'),
        h('button', { class:'btn', type:'button', onclick:()=>say(out, errText(Object.assign(new Error('internal'), { status:500 }), '저장하지 못했어요'), true) }, '실패(500)'), out]; })(),
      code:`try { await api('/pages', { method:'PUT', body }); say(msg, '저장했어요'); }
catch (e) { say(msg, errText(e, '저장하지 못했어요'), true); }` }),
    h('section', { class:'card spec' }, h('h3', {}, 'errText가 바꾸는 문구'), h('p', {}, '서버·네트워크 오류를 해요체로 바꿔요. 아래는 errText(e, \'저장하지 못했어요\')를 지금 실행한 결과예요.'),
      h('table', { class:'map' }, h('tr', {}, h('th', {}, '오류'), h('th', {}, '화면 문구')),
        ...errs.map(([k,e])=>h('tr', {}, h('td', {}, h('code', {}, k)), h('td', {}, errText(e, '저장하지 못했어요')))))));
}

// ---- 색 ----
// :root·:root[data-shell=dark] 규칙에서 직접 읽는다(p1.html이 바뀌면 빌드만 다시 하면 된다). 설명만 여기에
const TOKENS=[
  ['바탕', { bg:'페이지 바탕(체크무늬 한 칸)', 'bg-2':'체크무늬 다른 칸, 코드 상자', panel:'패널·카드 바탕', 'panel-2':'버튼·입력칸·패널 안쪽', stage:'마을 캔버스 둘레', scrim:'모달 뒤 어두운 막' }],
  ['글자·선', { ink:'본문 글자', 'ink-2':'보조 글자(설명·시각)', edge:'테두리·픽셀 그림자. 다크에서도 어둡게 남아요', line:'구분선·점선' }],
  ['강조', { accent:'주요 버튼·켜진 체크박스·연결 점', 'accent-2':'위험 버튼(pink)·지우기 호버', gold:'눌린 버튼·드롭다운 고른 항목·해금', sky:'포커스 테두리', rose:'슬라이더·사이트 코드 꼬리표', hl:'새 줄·강조가 가라앉는 노랑' }],
  ['상태', { danger:'빨간 점·테두리(끊김 점, 경고 줄 테두리). 글자로는 안 써요', 'danger-ink':'실패 문구·빨간 글자·내 표시 태그 바탕(대비 4.5:1)', 'warn-bg':'경고 상자 바탕', 'warn-ink':'경고 글자', 'tag-bot':'봇 태그' }],
];
function readTokens(){ const out={ light:{}, dark:{} };
  for (const sh of document.styleSheets){ let rules; try { rules=sh.cssRules; } catch { continue; }
    for (const r of rules){ const t=r.selectorText==':root' ? 'light' : /^:root\[data-shell="?dark"?\]$/.test(r.selectorText||'') ? 'dark' : null; if (!t) continue;
      for (const p of r.style) if (p.startsWith('--')) out[t][p.slice(2)]=r.style.getPropertyValue(p).trim(); } }
  return out; }
function rgb(c){ const m=/^#([0-9a-f]{6})$/i.exec(c); return m ? [0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)) : null; }
function contrast(a, b){ const L=c=>{ const [r,g,bl]=rgb(c).map(v=>{ v/=255; return v<=.03928 ? v/12.92 : ((v+.055)/1.055)**2.4; }); return .2126*r+.7152*g+.0722*bl; };
  const [x,y]=[L(a),L(b)].sort((p,q)=>q-p); return (x+.05)/(y+.05); }
const TEXT_TOK=new Set(['ink','ink-2','danger-ink','rose','warn-ink']);   // 글자로 쓰는 색: 바탕(panel) 위에서 잰다. 나머지는 바탕으로 쓰고 그 위 ink로 잰다
const NO_CR=new Set(['edge','danger']);   // 글자와 만나지 않는 색(테두리·그림자)은 대비를 재지 않는다
function renderColor(view){
  const T=readTokens(), msg=h('span', { class:'msg' });
  view.append(h('h2', {}, '색'), h('p', { class:'lead' }, '겉 화면 색은 p1.html :root의 토큰만 써요. 다크는 :root[data-shell=dark]에서 같은 이름을 덮어써요. 새 색이 필요하면 두 블록에 다 넣고 ?demo=1을 밝게·어둡게 둘 다 확인해요. 마을 안 색은 테마(src/themes)가 따로 가져요. 칸을 누르면 var(--이름)을 복사해요.'),
    h('div', { class:'card bar' }, h('span', { class:'msg' }, '숫자는 글자 대비(WCAG). 4.5 아래는 빨갛게 — 본문 글자로는 쓰지 말고 큰 글자·장식에만.'), msg));
  for (const [group, toks] of TOKENS){
    view.append(h('h3', { style:'margin:20px 0 8px;font-size:15px' }, group));
    const grid=h('div', { class:'swatches' });
    for (const [name, desc] of Object.entries(toks)){
      const sw=theme=>{ const v=T[theme][name], ink=T[theme].ink, panel=T[theme].panel, txt=TEXT_TOK.has(name);
        const bg=txt ? (name==='warn-ink' ? T[theme]['warn-bg'] : panel) : v, fg=txt ? v : ink;
        const cr=!NO_CR.has(name)&&rgb(bg)&&rgb(fg) ? contrast(bg, fg) : null;
        return h('button', { class:'sw', type:'button', title:`var(--${name}) 복사`, onclick:async()=>{ try { await navigator.clipboard.writeText(`var(--${name})`); say(msg, `var(--${name}) 복사했어요`); } catch { say(msg, '복사하지 못했어요', true); } } },
          h('span', { class:'chip', style:`background:${bg};color:${fg};border-color:${T[theme].edge}` }, txt||cr ? '가Aa' : ''),
          h('span', {}, `${theme==='light'?'밝게':'어둡게'} ${v||'—'}`),
          cr ? h('span', { class:'cr'+(cr<4.5?' low':'') }, `${cr.toFixed(1)}${txt?'':' (ink)'}`) : h('span', { class:'cr' }, NO_CR.has(name) ? '테두리용' : '투명')); };
      grid.append(h('div', { class:'card tok' }, h('div', { class:'hd' }, h('b', {}, '--'+name)), h('p', {}, desc), h('div', { class:'pair' }, sw('light'), sw('dark'))));
    }
    view.append(grid);
  }
  const fonts=h('div', { class:'card spec', style:'margin-top:20px' }, h('h3', {}, '서체'),
    h('p', { style:'font-family:var(--font-pixel);font-size:14px;margin:0' }, '--font-pixel · Galmuri11 · 방문자가 마을에 들어왔어요 0123'),
    h('p', { style:'font-family:var(--font-tiny);font-size:10px;margin:0' }, '--font-tiny · PRESS START 2P · 0123'),
    h('p', { style:'margin:0;font-size:12px;color:var(--ink-2)' }, '숫자·로고처럼 짧은 영문은 --font-tiny, 나머지는 --font-pixel이에요.'));
  view.append(fonts);
}

// 예시 영역의 버튼·체크박스 소리(대시보드 p6.js와 같은 규칙). 사운드 페이지는 자기 소리만 내도록 뺀다
document.addEventListener('click', e=>{ const b=e.target.closest?.('.btn,.pxs-btn'); if (b && !b.disabled && b.closest('[data-sfx="1"],#dlg')) sfx('click'); }, true);
document.addEventListener('change', e=>{ const t=e.target; if (t.type==='checkbox' && t.closest('[data-sfx="1"]')) sfx(t.checked?'on':'off'); }, true);
$('sfxChk').addEventListener('change', ()=>{ SND.on=$('sfxChk').checked; if (SND.on) sfx('on'); else synth.play('off'); });

// 밝기 토글: 대시보드와 같은 vt_shell 설정을 바꾼다
function toggleShell(){ const dark=document.documentElement.dataset.shell==='dark'; try { localStorage.setItem('vt_shell', JSON.stringify(dark?'light':'dark')); } catch {} shellApply(); }
$('shellBtn').addEventListener('click', toggleShell);
addEventListener('keydown', e=>{ if (e.key.toLowerCase()==='d' && !e.target.closest('textarea,input') && !e.ctrlKey && !e.metaKey && !e.altKey) toggleShell(); });
route();
}
