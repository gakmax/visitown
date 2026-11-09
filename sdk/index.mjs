// 번들러용 진입점. visitown.js(IIFE)를 불러오면 window.visitown.init이 생기고, init(cfg) 뒤에는 track·consent·pageview가 붙는다
import './visitown.js';
const vt = () => (typeof window !== 'undefined' && window.visitown) || {};
export function init(config) { const v = vt(); if (v.init) v.init(config); }
export function track(type, props) { const v = vt(); if (v.track) v.track(type, props); }
export function consent(ok) { const v = vt(); if (v.consent) v.consent(ok); }
export function pageview() { const v = vt(); if (v.pageview) v.pageview(); }
