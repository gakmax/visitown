/* Visitown tracking SDK. 설치: <script src="https://HOST/visitown.js" data-site="site_xxx" async></script>
   옵션·번들러용 init(cfg)·동작 설명은 sdk/README.md, 타입은 sdk/visitown.d.ts. 커스텀 이벤트: window.visitown.track('purchase', { amount: 29000 }) */
(function () {
  'use strict';
  var script = document.currentScript || (function () { var s = document.getElementsByTagName('script'); for (var i = s.length - 1; i >= 0; i--) if (/visitown\.js/.test(s[i].src)) return s[i]; })();
  function attr(n) { return script && script.getAttribute('data-' + n); }
  function boot(cfg) {
  var siteId = cfg && cfg.site; if (!siteId || (window.visitown && window.visitown.__loaded)) return;
  var base = (cfg.api || (script && script.src.replace(/\/(visitown|wt)\.js.*$/, '')) || '').replace(/\/$/, '');
  var endpoint = base + '/api/events';
  var consentWait = cfg.consent === 'wait';
  var HB = 15000, BATCH = 1000, QKEY = 'vt_q', QMAX = 200, seq = 0, loadId = Math.random().toString(36).slice(2, 7), queue = [], timer = null, sending = false, backoff = 0, retryT = null, enabled = !consentWait, started = false, lastPath = null;

  function rnd() { try { var a = new Uint8Array(8); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); } catch (e) { return Math.random().toString(16).slice(2, 18); } }
  function store(kind, k, v) { try { var s = window[kind]; if (v === undefined) return s.getItem(k); if (v === null) s.removeItem(k); else s.setItem(k, v); } catch (e) { return null; } }
  var sessionId = store('sessionStorage', 'vt_sid'); if (!sessionId) { sessionId = 'sess_' + rnd(); store('sessionStorage', 'vt_sid', sessionId); }
  var returning = store('localStorage', 'vt_seen') === '1'; store('localStorage', 'vt_seen', '1');
  var first = store('localStorage', 'vt_first'); if (!first && !returning) { first = new Date().toISOString().slice(0, 10); store('localStorage', 'vt_first', first); } // 첫 방문 날짜(리텐션 코호트). 이 값보다 먼저 온 재방문자는 보내지 않는다
  try { if (/[?&]vt_me=1(&|$)/.test(location.search)) { store('localStorage', 'vt_me', '1'); if (history.replaceState) history.replaceState(null, '', location.pathname + location.search.replace(/[?&]vt_me=1(&|$)/, function (m, t) { return t === '&' ? m[0] : ''; }).replace(/^&/, '?') + location.hash); } } catch (e) {}
  var me = store('localStorage', 'vt_me');
  function device() { var ua = navigator.userAgent; if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet'; if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile'; return 'desktop'; }
  function referrer() { var r = document.referrer; if (!r) return 'direct'; try { var h = new URL(r).hostname; if (h === location.hostname) return 'direct'; if (/google|bing|naver|daum|duckduckgo|yahoo|baidu|yandex/.test(h)) return 'search'; if (/facebook|instagram|twitter|x\.com|t\.co|linkedin|threads|tiktok|youtube|reddit|pinterest|kakao|discord|slack/.test(h)) return 'social'; } catch (e) {} return 'direct'; }
  function pathOnly() { return location.pathname || '/'; }
  function event(type, path, props) { return { event_id: sessionId + '-' + loadId + '-' + (++seq), site_id: siteId, session_id: sessionId, event_type: type, page_path: path || pathOnly(), timestamp: new Date().toISOString(), properties: props || {} }; }

  // 오프라인 큐(sdk/README.md): 못 보낸 이벤트는 localStorage(vt_q)에 남겨 지수 백오프로 다시 보내고, 다음 페이지 로드가 이어받는다. 서버가 event_id로 중복을 거른다
  function persist() { store('localStorage', QKEY, queue.length ? JSON.stringify(queue.slice(-QMAX)) : null); }
  function restore() { try { var q = JSON.parse(store('localStorage', QKEY) || '[]'); for (var i = 0; i < q.length; i++) if (q[i] && q[i].site_id === siteId && q[i].event_id) queue.push(q[i]); } catch (e) {} }
  function retry() { backoff = Math.min(60000, backoff ? backoff * 2 : 1000); clearTimeout(retryT); retryT = setTimeout(flush, backoff + Math.random() * 500); }
  function flush() {
    if (sending || !queue.length || !enabled) return;
    var batch = queue.slice(0, 20); sending = true;
    var done = function (ok) { sending = false; if (ok) { queue = queue.filter(function (e) { return batch.indexOf(e) < 0; }); backoff = 0; persist(); if (queue.length) flush(); } else { persist(); retry(); } };
    try { fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ site_id: siteId, events: batch }), keepalive: true, credentials: 'omit' })
      .then(function (r) { done(r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429)); }, function () { done(false); }); } // 4xx(429 제외)는 다시 보내도 안 되니 버린다
    catch (e) { done(false); }
  }
  // 떠날 때: 남은 것을 저장해 둔 채 sendBeacon으로도 보낸다. 비컨은 "받아 줬다"만 알려 줄 뿐 도착을 보장하지 않으므로 저장은 다음 페이지 로드가 다시 보내고, 서버가 중복을 거른다
  function leave() { persist(); if (!enabled || navigator.onLine === false || !navigator.sendBeacon) return; for (var i = 0; i < queue.length; i += 20) { try { navigator.sendBeacon(endpoint, new Blob([JSON.stringify({ site_id: siteId, events: queue.slice(i, i + 20) })], { type: 'text/plain' })); } catch (e) {} } }
  function send(ev, now) { queue.push(ev); persist(); if (now) { flush(); return; } if (!timer) timer = setTimeout(function () { timer = null; flush(); }, BATCH); }

  function pageView() { var p = pathOnly(); if (p === lastPath) return; lastPath = p; send(event('page_view', p)); }
  function start() {
    if (started || !enabled) return; started = true; restore();
    var props = { device: device(), referrer: referrer(), returning: returning }; if (me) props.me = true; if (first) props.first = first;
    // 캠페인: 처음 들어온 주소의 utm_source·medium·campaign을 이 탭에 두고 세션 내내 같이 보낸다. 유료 매체면 유입을 '광고'로
    try { var utm = null; try { utm = JSON.parse(store('sessionStorage', 'vt_utm') || 'null'); } catch (e) {}
      if (!utm) { var sp = new URLSearchParams(location.search); utm = {}; ['source', 'medium', 'campaign'].forEach(function (k) { var v = sp.get('utm_' + k); if (v) utm[k] = String(v).slice(0, 40).toLowerCase(); }); if (Object.keys(utm).length) store('sessionStorage', 'vt_utm', JSON.stringify(utm)); }
      ['source', 'medium', 'campaign'].forEach(function (k) { if (utm[k]) props['utm_' + k] = utm[k]; });
      if (utm.medium && /^(cpc|ppc|paid|paidsocial|paid_social|ads?|display|banner|retargeting|affiliate)$/.test(utm.medium)) props.referrer = 'ad'; } catch (e) {}
    try { props.tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {} if (navigator.language) props.lang = navigator.language; // 서버가 나라 코드로 바꾸고 버린다
    send(event('session_start', pathOnly(), props)); pageView();
    setInterval(function () { if (document.visibilityState === 'visible') send(event('heartbeat')); }, HB);
    var wrap = function (name) { var orig = history[name]; history[name] = function () { var r = orig.apply(this, arguments); setTimeout(pageView, 0); return r; }; }; // SPA 라우팅
    wrap('pushState'); wrap('replaceState'); window.addEventListener('popstate', function () { setTimeout(pageView, 0); });
    window.addEventListener('pagehide', function () { send(event('page_leave'), false); leave(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') send(event('heartbeat'), true); });
    window.addEventListener('online', function () { backoff = 0; flush(); });
  }
  // 오류 수집(data-errors="1"): 페이지 로드마다 5건, 같은 메시지는 한 번. 이메일·토큰·긴 숫자는 가리고 120자
  if (cfg.errors) { var errN = 0, errSeen = {};
    var mask = function (s) { return String(s || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>').replace(/\b[0-9a-f]{16,}\b/gi, '<token>').replace(/\b\d{7,}\b/g, '<num>').slice(0, 120); };
    var report = function (msg, src, line) { if (errN >= 5) return; var key = mask(msg); if (!key || errSeen[key]) return; errSeen[key] = 1; errN++; var p = { message: key }; if (src) p.source = String(src).replace(/\?.*$/, '').slice(-80); if (line) p.line = +line || 0; send(event('js_error', pathOnly(), p), true); };
    window.addEventListener('error', function (e) { if (e && e.message) report(e.message, e.filename, e.lineno); }, true);
    window.addEventListener('unhandledrejection', function (e) { var r = e && e.reason; report(r && (r.message || String(r)) || 'unhandled rejection'); }); }
  // 웹 바이탈(data-vitals="1"): LCP·INP·CLS를 떠날 때 web_vital로. 페이지 로드마다 한 번
  if (cfg.vitals && window.PerformanceObserver) { try {
    var lcp = 0, inp = 0, cls = 0, sentV = false, vPath = pathOnly();
    var obs = function (type, fn, extra) { try { var o = new PerformanceObserver(function (l) { l.getEntries().forEach(fn); }); o.observe(Object.assign({ type: type, buffered: true }, extra || {})); } catch (e) {} };
    obs('largest-contentful-paint', function (e) { lcp = e.startTime; });
    obs('event', function (e) { if (e.duration > inp) inp = e.duration; }, { durationThreshold: 40 });
    obs('layout-shift', function (e) { if (!e.hadRecentInput) cls += e.value; });
    var sendVitals = function () { if (sentV || !enabled) return; sentV = true; var list = [];
      if (lcp > 0) list.push(['LCP', Math.round(lcp)]); if (inp > 0) list.push(['INP', Math.round(inp)]); list.push(['CLS', Math.round(cls * 1000) / 1000]);
      list.forEach(function (v) { queue.push(event('web_vital', vPath, { name: v[0], value: v[1] })); }); leave(); };
    window.addEventListener('pagehide', sendVitals); document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') sendVitals(); });
  } catch (e) {} }
  // 미니 위젯(data-widget="1"|bottom-right|bottom-left|top-right|top-left): 주인이 위젯을 켠 사이트만 서버가 임베드 키를 준다. iframe 안에서는 띄우지 않는다
  var widgetPos = cfg.widget === true ? '1' : cfg.widget;
  if (widgetPos && widgetPos !== '0' && widgetPos !== 'false' && window === window.top) {
    fetch(base + '/api/sites/' + encodeURIComponent(siteId) + '/widget', { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (w) { if (w && w.embed) widget(w); }).catch(function () {});
  }
  function widget(w) {
    var right = !/left/.test(widgetPos), bottom = !/top/.test(widgetPos), E = '#3b2f3a', P = '#fff8ea';
    var rows = ['.....oo.....', '....oppo....', '...oppppo...', '..oppppppo..', '.oppppppppo.', 'oooooooooooo', '.occcccccco.', '.ocbbcckkco.', '.ocbbcckkco.', '.occccckkco.', '.oooooooooo.'], col = { o: E, p: '#f4a9bb', c: P, b: '#a9d9f1', k: '#c98d5d' }, svg = '';
    rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] !== '.') svg += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + col[r[x]] + '"/>'; });
    var css = '.vtw-btn{position:fixed;z-index:2147483000;' + (bottom ? 'bottom:16px;' : 'top:16px;') + (right ? 'right:16px;' : 'left:16px;') + 'width:46px;height:46px;padding:0;border:2px solid ' + E + ';background:' + P + ';box-shadow:3px 3px 0 ' + E + ';cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .08s}.vtw-btn:hover{transform:translateY(-1px)}.vtw-btn svg{width:30px;height:30px;display:block;shape-rendering:crispEdges}' +
      '.vtw-n{position:absolute;top:-9px;' + (right ? 'left:-9px;' : 'right:-9px;') + 'min-width:20px;height:20px;padding:0 5px;border:2px solid ' + E + ';background:#f2c14e;color:' + E + ';font:bold 11px/16px system-ui,sans-serif;text-align:center;box-sizing:border-box}.vtw-n[hidden]{display:none}' +
      '.vtw-box{position:fixed;z-index:2147483000;' + (bottom ? 'bottom:72px;' : 'top:72px;') + (right ? 'right:16px;' : 'left:16px;') + 'width:min(520px,calc(100vw - 32px));background:' + P + ';border:2px solid ' + E + ';box-shadow:4px 4px 0 ' + E + ';display:none;flex-direction:column;color:' + E + '}.vtw-box.on{display:flex}' +
      '.vtw-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 6px 6px 10px;border-bottom:2px solid ' + E + ';font:12px/1.4 system-ui,sans-serif}.vtw-head b{font-weight:700}.vtw-x{border:0;background:none;font:18px/1 system-ui,sans-serif;cursor:pointer;color:' + E + ';padding:0 6px}' +
      '.vtw-box iframe{display:block;width:100%;aspect-ratio:16/9;border:0;background:#cfe0c4}.vtw-foot{font:10px/1.4 system-ui,sans-serif;color:#7d6d76;padding:4px 10px 6px;text-align:right}.vtw-foot a{color:inherit}' +
      '.vtw-greet{display:flex;gap:4px;padding:6px 8px 0;align-items:center;font:11px/1.2 system-ui,sans-serif;color:#7d6d76}.vtw-greet button{border:2px solid ' + E + ';background:#fff;font-size:16px;line-height:1;padding:3px 6px;cursor:pointer;box-shadow:2px 2px 0 ' + E + '}.vtw-greet button:active{transform:translate(1px,1px);box-shadow:1px 1px 0 ' + E + '}.vtw-greet button[disabled]{opacity:.5;cursor:default}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var X = /^ko/i.test(document.documentElement.lang || navigator.language) ? ['지금 이 사이트에 있는 사람들', '지금 이 사이트에', '닫기', '인사하기', '으로 보는 중 · 왕관 쓴 ME가 나예요', '명이 있어요', '아직 나뿐이에요'] : ['People here now', 'On this site:', 'Close', 'Say hi', ' · ME = you', ' people', 'just you'];
    var btn = document.createElement('button'); btn.className = 'vtw-btn'; btn.type = 'button'; btn.title = X[0]; btn.setAttribute('aria-label', X[0]); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg viewBox="0 0 12 11" aria-hidden="true">' + svg + '</svg><span class="vtw-n" hidden>0</span>';
    var box = document.createElement('div'); box.className = 'vtw-box'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', X[0]);
    var GREET = ['👋', '❤️', '😂', '👍', '🎉', '😮'], lastGreet = 0; // 인사: 정해진 이모지만, 2초에 한 번
    box.innerHTML = '<div class="vtw-head"><span><b>' + X[1] + '</b> <span data-n>…</span></span><button class="vtw-x" type="button" aria-label="' + X[2] + '">×</button></div><div class="vtw-greet"><span>' + X[3] + '</span>' + GREET.map(function (g) { return '<button type="button" data-greet="' + g + '" aria-label="' + X[3] + ' ' + g + '">' + g + '</button>'; }).join('') + '</div><div class="vtw-foot"><a href="' + w.dashboard.replace(/[^/]*$/, '') + '" target="_blank" rel="noopener">Visitown</a>' + X[4] + '</div>';
    box.querySelector('.vtw-greet').addEventListener('click', function (e) { var b = e.target.closest('[data-greet]'); if (!b) return; var now = Date.now(); if (now - lastGreet < 2000) return; lastGreet = now; send(event('greet', pathOnly(), { emoji: b.getAttribute('data-greet') }), true);
      var all = box.querySelectorAll('[data-greet]'); all.forEach(function (x) { x.disabled = true; }); setTimeout(function () { all.forEach(function (x) { x.disabled = false; }); }, 2000); });
    document.body.appendChild(btn); document.body.appendChild(box);
    var nEl = btn.querySelector('.vtw-n'), hEl = box.querySelector('[data-n]'), frame = null, open = false;
    var count = function () { fetch(base + '/api/sites/' + encodeURIComponent(siteId) + '/badge?embed=' + encodeURIComponent(w.embed) + '&format=json', { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (j) { var n = +j.online || 0; nEl.textContent = n; nEl.hidden = n < 1; hEl.textContent = n ? n + X[5] : X[6]; }).catch(function () {}); };
    var toggle = function (on) { open = on; box.classList.toggle('on', on); btn.setAttribute('aria-expanded', String(on));
      if (on && !frame) { frame = document.createElement('iframe'); frame.title = X[0]; frame.src = w.dashboard + '?api=' + encodeURIComponent(base) + '&site=' + encodeURIComponent(siteId) + '&embed=' + encodeURIComponent(w.embed) + '&me=' + encodeURIComponent(sessionId) + '&brand=0'; box.insertBefore(frame, box.querySelector('.vtw-greet')); }
      if (on) count(); };
    btn.addEventListener('click', function () { toggle(!open); }); box.querySelector('.vtw-x').addEventListener('click', function () { toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) toggle(false); });
    count(); if (typeof w.online === 'number') { nEl.textContent = w.online; nEl.hidden = w.online < 1; }
  }
  window.visitown = { __loaded: true, init: function () {}, sessionId: sessionId,
    track: function (type, props) { if (typeof type !== 'string' || !/^[a-z_]{2,32}$/.test(type)) return; send(event(type, pathOnly(), props && typeof props === 'object' ? props : {}), true); },
    consent: function (ok) { enabled = !!ok; if (ok) start(); },
    pageview: pageView };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
  // <script data-site>면 바로 시작, 아니면(번들러) init(cfg)를 기다린다
  if (attr('site')) boot({ site: attr('site'), api: attr('api'), widget: attr('widget'), errors: attr('errors') === '1', vitals: attr('vitals') === '1', consent: attr('consent') });
  else if (!window.visitown || !window.visitown.__loaded) window.visitown = { init: boot };
})();
