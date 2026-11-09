// 밝기(vt_shell: 'light'|'dark', 없으면 OS를 따름). 첫 화면이 번쩍이지 않게 마크업보다 먼저 data-shell을 정해야 해서 <head>의 인라인 스크립트로 넣는다(layout.tsx, nonce).
// 전역 함수 shellApply·shellPref는 대시보드(shell/dashboard.js)·디자인 시스템(shell/ds.js)이 밝기를 바꿀 때 부른다
export const SHELL_APPLY = `
const SHELL_MQ = matchMedia('(prefers-color-scheme: dark)');
function shellPref(){ try { return JSON.parse(localStorage.getItem('vt_shell') || 'null'); } catch { return null; } }
function shellApply(){ const p=shellPref(), d=p ? p==='dark' : SHELL_MQ.matches; document.documentElement.dataset.shell=d?'dark':'light';
  const m=document.querySelector('meta[name=theme-color]'); if (m) m.content=d?'#1c1720':'#f1e6d2'; document.dispatchEvent(new Event('vt-shell')); }
shellApply(); SHELL_MQ.addEventListener('change', shellApply);
`;
