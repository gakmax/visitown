// 언어 전환: ?lang=en 또는 버튼. 선택은 localStorage vt_legal_lang 에 둔다(개인 설정)
(function () {
  var q = new URLSearchParams(location.search).get('lang'), saved = null;
  try { saved = localStorage.getItem('vt_legal_lang'); } catch (e) {}
  var pick = q || saved || ((navigator.language || '').toLowerCase().indexOf('ko') === 0 ? 'ko' : 'en');
  function apply(l) {
    if (l !== 'ko' && l !== 'en') l = 'en';
    document.documentElement.lang = l;
    document.querySelectorAll('section[data-lang]').forEach(function (s) { s.hidden = s.getAttribute('data-lang') !== l; });
    document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === l)); });
    document.title = document.querySelector('section[data-lang="' + l + '"] h1').textContent + ' · Visitown';
    try { localStorage.setItem('vt_legal_lang', l); } catch (e) {}
  }
  document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-lang')); }); });
  apply(pick);
})();
