// sdk/visitown.d.ts가 실제 쓰임새를 통과하는지 tsc --strict로 본다 (tests/sdk.test.js)
import { init, track, consent, pageview, type VisitownConfig } from '@visitown/sdk';
const cfg: VisitownConfig = { site: 'site_demo', api: 'https://example.com', widget: 'bottom-left', errors: true, vitals: true, consent: 'wait' };
init(cfg); consent(true); pageview();
track('purchase', { amount: 29000, plan: 'pro', gift: false });
window.visitown?.track('signup');
const sid: string | undefined = window.visitown?.sessionId;
// @ts-expect-error 속성값은 문자열·숫자·불리언만
track('bad', { nested: { a: 1 } });
// @ts-expect-error consent는 'wait'만
init({ site: 'x', consent: 'now' });
export { sid };
