# @visitown/sdk

사이트 방문자를 픽셀 마을의 캐릭터로 보여주는 [Visitown](https://visitown.vercel.app/)의 추적 SDK. 의존성 없음, gzip 7KB 안.

```html
<!-- 가장 쉬운 설치: 수집 서버가 주는 파일 그대로 -->
<script src="https://HOST/visitown.js" data-site="site_xxx" async></script>
```

```ts
// 번들러(Next.js·Vite 등)
import { init, track } from '@visitown/sdk';
init({ site: 'site_xxx', api: 'https://HOST', widget: true, errors: true, vitals: true });
track('purchase', { amount: 29000 });
```

옵션은 `visitown.d.ts`의 `VisitownConfig`에 설명이 있어요. 두 설치 방식은 같은 `visitown.js` 한 파일을 써요.

## 동작 (파일 안 주석 대신 여기에)

- **세션·식별**: 세션 ID는 `sessionStorage.vt_sid`(탭마다), 재방문 여부는 `localStorage.vt_seen`. `event_id`는 `세션-페이지로드난수-순번`이라 새로고침해도 겹치지 않아요. 쿠키는 쓰지 않고 경로만 보내요(쿼리·해시 제외). 리퍼러는 `direct|search|social|ad` 분류만, 시간대·언어는 서버가 나라 코드로 바꾼 뒤 버려요.
- **묶음 전송**: 이벤트는 1초 안에 생긴 것끼리 한 요청(최대 20건)으로 보내요. `track()`·인사·오류는 바로 보내요. 하트비트는 15초마다, 탭이 보일 때만.
- **오프라인 큐**: 못 보낸 이벤트(네트워크 오류·5xx·429)는 `localStorage.vt_q`(최대 200건)에 남기고 1초 → 2초 → … 60초 지수 백오프로 다시 보내요. 온라인으로 돌아오면 바로 시도해요. 4xx는 다시 보내도 안 되니 버려요. 페이지를 떠날 때는 남은 것을 저장한 채 `sendBeacon`으로도 보내고, 다음 페이지 로드가 저장분을 첫 묶음에 실어 보내요. 비컨이 이미 전달했으면 서버가 `event_id`로 중복을 걸러요. 큐에 묵었다 늦게 도착한 이벤트는 서버가 끝난 세션을 되살리지 않고 기록만 남겨요.
- **SPA**: `pushState`·`replaceState`·`popstate`를 감싸 경로가 바뀌면 `page_view`를 보내요. 직접 부르려면 `pageview()`.
- **오류 수집**(`errors`): JS 오류·처리 안 된 Promise 거절을 `js_error`로. 페이지 로드마다 5건, 같은 메시지는 한 번, 이메일·토큰·긴 숫자는 가리고 120자.
- **웹 바이탈**(`vitals`): LCP·INP·CLS를 페이지를 떠날 때 `web_vital`로 한 번. 서버는 건물별 p75만 모아요.
- **미니 위젯**(`widget`): 주인이 대시보드에서 위젯을 켠 사이트만 서버가 임베드 키를 줘요. 구석의 버튼을 누르면 지금 이 사이트의 마을이 iframe으로 뜨고, 인사 이모지(정해진 6개, 2초에 한 번)를 보낼 수 있어요. iframe 안에서는 띄우지 않아요. 위젯 글자는 사이트의 `<html lang>`(없으면 브라우저 언어)가 한국어면 한국어, 아니면 영어예요(로드맵 60).
- **동의 대기**(`consent: 'wait'`): `consent(true)`를 부를 때까지 아무것도 보내지 않아요.
