// Visitown SDK 타입. <script> 설치면 window.visitown, 번들러면 import { init, track } from '@visitown/sdk'
/** 커스텀 이벤트 속성: 문자열·숫자·불리언 10개까지(문자열은 100자). amount(숫자)는 매출로, plan(문자열)은 요금제로 쓰인다 */
export type VisitownProps = Record<string, string | number | boolean>;
export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export interface VisitownConfig {
  /** 사이트 id (대시보드 설정 → 설치 탭) */
  site: string;
  /** 수집 서버 주소. <script> 설치면 스크립트 주소에서 알아내지만, 번들러에서는 꼭 적는다 */
  api?: string;
  /** 방문자용 미니 위젯. true면 오른쪽 아래. 대시보드에서 위젯을 켠 사이트만 보인다 */
  widget?: boolean | WidgetPosition;
  /** JS 오류·처리 안 된 Promise 거절을 js_error 이벤트로 보낸다(페이지 로드마다 5건, 메시지는 가린다) */
  errors?: boolean;
  /** LCP·INP·CLS를 web_vital 이벤트로 보낸다(세션을 만들지 않음) */
  vitals?: boolean;
  /** 'wait'면 consent(true)를 부를 때까지 아무것도 보내지 않는다 */
  consent?: 'wait';
}
export interface Visitown {
  /** 시작됐으면 true */
  readonly __loaded?: boolean;
  /** 이 탭의 세션 id (sessionStorage vt_sid) */
  readonly sessionId?: string;
  /** 번들러에서 시작. 이미 시작됐으면 아무것도 하지 않는다 */
  init(config: VisitownConfig): void;
  /** 커스텀 이벤트. 이름은 /^[a-z_]{2,32}$/ 가 아니면 무시된다 */
  track(type: string, props?: VisitownProps): void;
  /** consent: 'wait' 뒤 동의하면 true로 시작. false면 전송을 멈춘다 */
  consent(ok: boolean): void;
  /** SPA에서 주소가 바뀌었는데 pushState가 아니면 직접 부른다(같은 경로면 무시) */
  pageview(): void;
}
declare global { interface Window { visitown?: Visitown } }
export declare function init(config: VisitownConfig): void;
export declare function track(type: string, props?: VisitownProps): void;
export declare function consent(ok: boolean): void;
export declare function pageview(): void;
