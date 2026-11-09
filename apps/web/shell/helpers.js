// 디자인 시스템 헬퍼(예전 src/p6.js에서 build.sh가 /design-system으로 뽑던 부분): esc, 픽셀 드롭다운(pxSelect), 모션 헬퍼(showEl/hideEl/pop/say), errText, 확인창(ask/note).
// 효과음은 쓰는 쪽이 hooks.sfx에 넣는다(대시보드 sfx는 켜짐·리플레이를 거르고, 디자인 시스템은 헤더 토글). 규칙은 CLAUDE.md·docs/motion.md
const $ = id => document.getElementById(id);
export const hooks = { sfx(){} };
export function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// ---- 픽셀 드롭다운. 네이티브 <select>를 숨기고 버튼+목록으로 그린다. 값·change 이벤트는 그대로 네이티브 select가 들고 있어 기존 코드는 손댈 게 없다.
//      option의 data-img는 그림으로 보여 준다(건물 종류). 새로 생기는 select는 MutationObserver가 알아서 바꾼다. 키보드: ↑↓ 바로 바꾸기, Enter/Space 열기, Esc 닫기
export const PXS = { open:null, list:null, btn:null };
export function pxSelect(sel){ if (sel.dataset.pxs) return; sel.dataset.pxs='1'; const wrap=document.createElement('span'); wrap.className='pxs'; const btn=document.createElement('button'); btn.type='button'; btn.className='pxs-btn'; btn.setAttribute('aria-haspopup','listbox'); btn.setAttribute('aria-expanded','false');
  if (sel.title) btn.title=sel.title; if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label')); if (sel.id) btn.dataset.for=sel.id;
  sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel); wrap.appendChild(btn); sel.hidden=true;
  const render=()=>{ const o=sel.options[sel.selectedIndex]; const vals=[...sel.options].map((x,i)=>`<span${i===sel.selectedIndex?' class="cur"':''}>${esc(x.text)}</span>`).join(''); btn.innerHTML=`${o?.dataset.img?`<img src="${o.dataset.img}" alt="">`:''}<span class="pxs-val">${vals}</span><span class="pxs-arr" aria-hidden="true"></span>`; btn.disabled=sel.disabled; };
  render(); sel.addEventListener('change', render); sel.addEventListener('pxs-refresh', render);
  btn.addEventListener('click', ()=>PXS.open===sel?pxsClose():pxsOpen(sel,btn));
  btn.addEventListener('keydown', e=>{ if (e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); pxsStep(sel, e.key==='ArrowDown'?1:-1); } else if (e.key==='Enter'||e.key===' '){ e.preventDefault(); pxsOpen(sel,btn); } }); }
export function pxsStep(sel,d){ let i=sel.selectedIndex; for (let k=0;k<sel.options.length;k++){ i=(i+d+sel.options.length)%sel.options.length; if (!sel.options[i].disabled) break; } if (i!==sel.selectedIndex&&!sel.options[i].disabled){ hooks.sfx('tick'); sel.selectedIndex=i; sel.dispatchEvent(new Event('change',{bubbles:true})); } }
export function pxsOpen(sel,btn){ pxsClose(); const list=document.createElement('ul'); list.className='pxs-list'; list.setAttribute('role','listbox'); list.tabIndex=-1;
  list.innerHTML=[...sel.options].map((o,i)=>`<li role="option" data-i="${i}" aria-selected="${i===sel.selectedIndex}"${o.disabled?' aria-disabled="true"':''}${o.dataset.locked?' class="locked"':''}>${o.dataset.img?`<img src="${o.dataset.img}" alt="">`:''}<span>${esc(o.text)}</span></li>`).join('');
  document.body.appendChild(list); const r=btn.getBoundingClientRect(); list.style.width=r.width+'px'; const h=list.offsetHeight, below=innerHeight-r.bottom-8, up=!(h<=below||below>=r.top); list.classList.toggle('up', up); list.style.left=Math.max(4,Math.min(r.left, innerWidth-list.offsetWidth-8))+'px'; list.style.top=(up? Math.max(4,r.top-h-2) : r.bottom+2)+'px';
  PXS.open=sel; PXS.list=list; PXS.btn=btn; PXS.at=performance.now(); btn.setAttribute('aria-expanded','true'); let hi=sel.selectedIndex; const items=[...list.children];
  const mark=()=>items.forEach((li,i)=>li.classList.toggle('hi',i===hi)); mark(); items[hi]?.scrollIntoView({block:'nearest'});
  const pick=i=>{ if (sel.options[i].disabled) return; hooks.sfx('tick'); if (i!==sel.selectedIndex){ sel.selectedIndex=i; sel.dispatchEvent(new Event('change',{bubbles:true})); } pxsClose(); btn.focus(); };
  list.addEventListener('click', e=>{ const li=e.target.closest('li'); if (li) pick(+li.dataset.i); });
  list.addEventListener('mousemove', e=>{ const li=e.target.closest('li'); if (li&&hi!==+li.dataset.i){ hi=+li.dataset.i; mark(); } });
  list.addEventListener('keydown', e=>{ if (e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); const d=e.key==='ArrowDown'?1:-1; for (let k=0;k<items.length;k++){ hi=(hi+d+items.length)%items.length; if (!sel.options[hi].disabled) break; } hooks.sfx('tick'); mark(); items[hi].scrollIntoView({block:'nearest'}); } else if (e.key==='Enter'||e.key===' '){ e.preventDefault(); pick(hi); } else if (e.key==='Escape'||e.key==='Tab'){ e.preventDefault(); pxsClose(); btn.focus(); } });
  list.focus(); }
export function pxsClose(){ if (!PXS.open) return; const l=PXS.list; l.classList.add('out'); l.addEventListener('animationend', ()=>l.remove(), {once:true}); setTimeout(()=>l.remove(), 150); PXS.btn.setAttribute('aria-expanded','false'); PXS.open=null; PXS.list=null; PXS.btn=null; }
export const PANEL_SND='#sitePanel,#dlg,#connPanel'; // 열고 닫을 때 소리 나는 패널(snd로 다른 소리를 줄 수 있다)
export function showEl(el, snd='open'){ if ((el.hidden || el.classList.contains('out')) && el.matches(PANEL_SND)) hooks.sfx(snd); el._hideT=(el._hideT||0)+1; el.classList.remove('out'); el.hidden=false; }
export function hideEl(el, snd='close'){ if (el.hidden || el.classList.contains('out')) return; if (el.matches(PANEL_SND)) hooks.sfx(snd); el.classList.add('out'); const t=++el._hideT; setTimeout(()=>{ if (el._hideT===t){ el.hidden=true; el.classList.remove('out'); } }, 180); }
export function pop(el, cls){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
export function say(el, text, err){ if (err) hooks.sfx('error'); else if (/^저장했어요/.test(text)) hooks.sfx('save'); el.textContent=text; el.classList.toggle('err', !!err); if (text) pop(el,'fade'); } // err면 빨간 글씨(패널 안 실패 문구)
// 서버·네트워크 오류를 해요체 문구로. 서버가 한국어로 준 문구는 그대로, 영어 코드(unauthorized 등)는 상태 코드로 바꾼다
export function errText(e, what='요청을 처리하지 못했어요'){ const m=e?.message||'', s=e?.status; if (/[가-힣]/.test(m)) return m;
  return s===401?'로그인이 만료됐어요. 다시 로그인해 주세요.':s===403?'권한이 없어요.':s===404?`${what}. 대상이 없어졌어요. 새로고침해 주세요.`:s===429?'요청이 너무 많아요. 잠시 뒤 다시 해 주세요.':s>=500?`${what}. 서버에 문제가 생겼어요. 잠시 뒤 다시 해 주세요.`:e instanceof TypeError?'서버에 연결하지 못했어요. 네트워크를 확인해 주세요.':`${what}${m?` (${m})`:''}.`; }
// 기본 alert·confirm 대신 쓰는 픽셀 확인창(#dlg). 확인이면 true. danger면 확인 버튼이 분홍이고 처음 포커스는 취소에. note는 확인 버튼 하나
export function ask(text, { ok='확인', cancel='취소', danger=false }={}){ const d=$('dlg'), y=$('dlgOk'), n=$('dlgNo'), back=document.activeElement; d._done?.(false);
  $('dlgMsg').textContent=text; y.textContent=ok; y.className='btn '+(danger?'pink':'primary'); n.textContent=cancel; n.hidden=!cancel; showEl(d); (cancel&&danger?n:y).focus();
  return new Promise(res=>{ const done=d._done=v=>{ d._done=d.onkeydown=d.onclick=y.onclick=n.onclick=null; hideEl(d, v&&danger?'remove':'close'); back?.focus?.(); res(v); };
    y.onclick=()=>done(true); n.onclick=()=>done(false); d.onclick=e=>{ if (e.target===d) done(false); };
    d.onkeydown=e=>{ if (e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); done(false); } else if (e.key==='Tab'){ e.preventDefault(); (document.activeElement===y&&cancel?n:y).focus(); } }; }); } // Tab은 창 안에서만 돈다
export function note(text){ return ask(text, { cancel:'' }); }
// 픽셀 드롭다운 켜기: 문서의 <select>를 전부 감싸고, 새로 생기는 것은 MutationObserver가 감싼다. 바깥 클릭·크기 변경·스크롤이면 닫는다. 대시보드·디자인 시스템 페이지가 마크업이 있는 뒤에 한 번 부른다
export function initPxSelect(){
  document.addEventListener('mousedown', e=>{ if (PXS.open && !e.target.closest('.pxs-list') && !e.target.closest('.pxs-btn')) pxsClose(); });
  addEventListener('resize', pxsClose); document.addEventListener('scroll', e=>{ if (PXS.open && performance.now()-PXS.at>200 && !(e.target.closest && e.target.closest('.pxs-list'))) pxsClose(); }, true); // 여는 순간의 scrollIntoView 잔여 이벤트는 무시
  new MutationObserver(()=>document.querySelectorAll('select:not([data-pxs])').forEach(pxSelect)).observe(document.body,{ childList:true, subtree:true });
  document.querySelectorAll('select:not([data-pxs])').forEach(pxSelect);
}
