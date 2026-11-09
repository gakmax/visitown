# 개선 제안 로드맵 (2026-10-27)

대시보드 UI 다듬기가 한 차례 끝난 시점에서 정리한 다음 할 일. 상태는 이 문서에서 바꾼다. 작업 규칙은 `CLAUDE.md`, 모션·모서리 규칙은 `docs/motion.md`.

## 오늘까지 끝난 것 (2026-10-30 기준)

- 건물 자리 12개·종류 12개 가변화, 건물/경로 탭 설정 패널, 고급 정규식 토글, 경로 테스터
- 서버에서 가져오는 타임랩스 리플레이(기본 최근 1시간, 배속 4~300x, 재생 중 변경)
- `pxSelect` 픽셀 드롭다운(모든 select 자동 적용, 버튼과 목록 너비 동일, 열림·닫힘 애니메이션)
- UI 모션 전면 적용 + 픽셀 노치 모서리(`docs/motion.md`)
- 포인터 기준 부드러운 휠·핀치 확대, 드래그 이동, 스크롤바 숨김, 확대 시 미니맵, 폰 레이아웃(뷰포트 메타 추가)
- 전체화면(버튼·F 키), 녹화 모드와 병용
- 진입 화면(첫 방문·로그아웃 시 GitHub 로그인/데모 선택, 다른 서버 주소 입력)
- 설치 가이드 탭(HTML·CMS·Next.js·CSP·앱) + 케이스별 AI 프롬프트 복사
- 한글 픽셀 서체 Galmuri11 적용(본문 14·버튼 13·피드 12·안내 11px)
- 연결 상태를 헤더 글자와 LIVE FEED 시스템 줄로 표시
- 하단 바 정리: 버튼 5개 + 메뉴 넷(데모·보기·화면·설정)
- 통계 모달 지금/오늘 탭(접속 중 목록, 기기·유입·나라·건물 분포, 시간대별 입장). 추이 탭은 일별 집계 뒤에
- 도감(테마별 대표 건물 → 캐릭터·건물 상세, 표식 범례, 오늘 찾아온 나라 깃발 모음)

사용자 쪽 할 일: 실제 설치 사이트의 건물 설정을 한 번 다시 저장해야 DB에 종류·자리가 남는다(마이그레이션 전 저장분은 null).

## 제안 목록

우선순위는 "보고 나서 뭔가 알게 되거나 하게 되는가"를 기준으로 매겼다. 추천 순서: 5 → 2 → 7 → 6.

### 반나절 안에 되는 것

| # | 제안 | 내용 | 비고 | 상태 |
| --- | --- | --- | --- | --- |
| 1 | 키보드 단축키·도움말 | R 리플레이, +/- 확대, 0 맞춤 배율, 1·2·3 테마, ? 단축키 표. 더블클릭·더블탭으로 맞춤 배율 복귀 | 한 핸들러로 통합(F·R·+/-·0·1·2·3·P 사진·H 발자국·Esc·?). 입력칸·수정키·임베드·드롭다운이 먹은 키는 무시. 하단 `?` 버튼과 `?` 키로 표(`KEYS` 패널). 스테이지 더블클릭 = 맞춤 배율 | 완료 |
| 2 | 캐릭터 따라가기 | 캐릭터 선택 후 확대하면 카메라가 따라감. 정보 패널에 "따라가기" 토글 | 캐릭터를 누르면 기본으로 따라가기(최소 2.5배 확대, 프레임마다 뷰포트를 캐릭터로 보간). 같은 캐릭터를 다시 누르거나 정보 패널 "따라가기" 버튼을 끄면 선택은 둔 채 멈춤. 드래그·미니맵·다른 것 선택·퇴장(사라질 때)이면 해제. 피드 항목 클릭도 따라가기 | 완료 |
| 3 | 효과음 | 입장·결제 때 짧은 8비트음, 기본 꺼짐, 하단 토글 | 하단 "소리" 토글(`vt_sound`). WebAudio 오실레이터로 입장·구매·회원가입 3종, 봇·리플레이·임베드 무음, 같은 소리 80ms 간격 | 완료 |
| 4 | 마을 사진 찍기 | 현재 화면을 PNG로 저장 | 하단 "사진" 버튼·P 키. 캔버스 3배(1440×810) + 건물 이름표 합성, `visitown-<도메인>-<날짜시각>.png`, 찍을 때 플래시 | 완료 |
| 11 | 도감 | 캐릭터 외형·표식 뜻, 건물 종류, 찾아온 나라를 한 화면에 | 화면 메뉴 "도감"·B 키(`showDex`). **캐릭터** 탭: 현재 테마의 형태×색 격자(외형은 무작위라 뜻 없음을 명시) + 표식 범례(마을과 같은 `drawMarks`로 그림). **건물** 탭: 12종 스프라이트, 이 마을에서 그 종류에 연결된 경로·지금 인원·오늘 조회, 없는 종류는 흐리게. **나라** 탭: 오늘 찾아온 나라를 픽셀 깃발 모음으로(못 만난 나라는 회색). 숫자는 통계 모달의 오늘 집계(`ST.today`)를 같이 쓴다. 외형에 속성을 묶는 안(색 = 유입 경로 등)은 단조로워지고 표식과 겹쳐서 보류, 필요하면 보기 메뉴 토글로 | 완료 |
| 15 | 겉 화면 다크 모드 | 대시보드 겉 레이아웃(상·하단 바, 사이드 패널, 모달, 진입 화면)을 어둡게. 마을 그림은 테마·낮밤 그대로 | 보기 메뉴 "밝기"(자동·밝게·어둡게)·D 키, `vt_shell`(없으면 OS 설정). `p1.html` 머리의 `shellApply`가 마크업 전에 `<html data-shell>`을 정해 번쩍임 없음, `:root[data-shell=dark]` 토큰 한 벌. 테두리·그림자는 `--edge`로 글자색(`--ink`)과 분리, 강조색은 밝은 글자가 읽히게 낮춤. 화면 아이콘은 다크에서 외곽선을 글자색으로 다시 그림(`buildIconUrls`, 캔버스 `A.icons`는 그대로). 진입 로고의 Visi 글자만 `.lg-ink`로 분리(원본 `brand/make_logo.py`엔 아직 미반영). 남은 것: 사이버펑크·우주 테마를 고르면 자동으로 어둡게 따라가는 옵션 | 완료 |

### 하루이틀 걸리지만 가치가 큰 것

| # | 제안 | 내용 | 비고 | 상태 |
| --- | --- | --- | --- | --- |
| 5 | 알림 | (a) 30분 넘게 이벤트 없음 → "추적 스크립트가 빠진 것 같아요" 경고 (b) 접속자 N명 초과·결제 발생 → 브라우저 알림 | (a) 스냅샷의 `lastEventAt` + 이벤트마다 갱신, 5초 주기 검사, 닫으면 다음 이벤트까지 숨김, 사이트 목록에도 "마지막 이벤트 N분 전". 테스트용 `?quiet=밀리초`. (b) 하단 "알림" 토글(기본 꺼짐, `vt_notify`) + 기준 인원, 구매는 봇 제외, 같은 종류 3초 간격, 리플레이 중 무음 | 완료 |
| 6 | 발자국 히트맵 | 최근 1시간 캐릭터 이동 경로를 땅에 옅게 누적 | 서버 기반: SSE `trails`로 최근 2시간 건물 간 이동과 감쇠 가중치(`SiteStore.trails`)를 받아 `World.heat`(2px 격자 Float32)에 길찾기 경로로 찍고, 실시간 입장·이동·퇴장도 경로로 찍음(캐릭터 걸음 아님). 반감기 30분(1초마다 감쇠), 새로고침·탭·기기 상관없이 같음. 켜면(하단 "발자국" 토글, `vt_heat`) 땅 위에 흙빛으로 그림. 리플레이 나오면 재연결로 서버 값 복원. 임베드는 `heat=1` | 완료 |
| 7 | 임베드 모드 | `?embed=1`이면 UI 없이 마을만, 투명 배경 | 서버에 사이트별 읽기 전용 `embed_key`(`GET/POST /api/sites/:id/embed`, `stream?embed=키`만 허용, 회전 가능). 하단 "임베드" 버튼 → iframe 코드·OBS 주소·옵션(테마, 건물 이름, 낮·밤, 배지). `#app.embed`는 녹화 모드 CSS 재사용 + 투명 배경 + 상호작용 없음. `sites.embed_key` 마이그레이션은 `docs/supabase.sql` | 완료 |
| 8 | PWA | 매니페스트 + 아이콘, 폰 홈 화면 설치 | `manifest.webmanifest` + `icons/`(집 아이콘 192·512·180·maskable) + `sw.js`(설치 조건만, 캐시 없음). 임베드·file://에서는 등록 안 함 | 완료 |

### 더 큰 것

| # | 제안 | 내용 | 비고 | 상태 |
| --- | --- | --- | --- | --- |
| 9 | 하루 요약 타임랩스 내보내기 | 어제 하루를 30초 영상(webm)으로 | 리플레이 바에 구간 "어제 하루"(자정~자정) + 길이(30초·60초·2분) + "영상 저장" 버튼. 구간을 처음부터 끝까지 길이에 맞춘 배속으로 돌리며 캔버스 2배(960×540)에 건물 이름표·사이트명·날짜시각·접속자·이벤트 수를 합성해 `MediaRecorder`(webm, vp9→vp8→mp4 순)로 녹화. 만드는 동안 탐색·배속 잠금, 취소 가능, 탭이 보여야 프레임이 돈다. `?export=yesterday`로 열면 연결되자마자 자동 실행(아침 슬랙용 자동화는 Playwright 등으로 열고 다운로드만 받으면 됨) | 완료 |
| 10 | 방문자 출신 표시 | referrer·device·나라를 모자·깃발로 | referrer·device·재방문은 이미 아이콘(검색·말풍선·광고, 폰·태블릿, 모자). 나라는 `server/geo.js`: 프록시 나라 헤더(Cloudflare·Vercel·CloudFront·App Engine) → `GEOIP_URL`(선택, `{ip}` 치환, IP별 24시간 캐시, 사설 IP 제외) → SDK가 보낸 시간대 → 언어 지역 순으로 정해 `properties.country`(두 글자)만 남기고 IP·시간대·언어는 저장 안 함. 캔버스 표식은 예외만: 재방문 모자, 모바일·태블릿, 검색·SNS·광고 유입, 유료 링, 그리고 주 국가(사람 접속자 과반·2명 이상)가 아닌 나라의 6×6 픽셀 깃발(`FLAG_ROWS` 약 60개국). PC·직접 유입·신규·주 국가는 아무것도 안 붙는다. 보기 메뉴 "방문자 표시" 토글(임베드 `marks=0`)로 표식 전체를 끌 수 있고 정보 패널 태그에는 전부 나온다, 정보 패널 태그에 이모지 깃발 + `Intl.DisplayNames` 한국어 이름. 데모 시뮬레이터도 나라를 섞어 준다 | 완료 |
| 14 | 테마 7종 추가 | 한옥 장터·숲속·서부·사이버펑크·과자 마을·농장·우주 정거장. 테마마다 건물 12종·캐릭터 6형태×6색·팔레트·자기 장식(나무·문·연못) | 테마는 `src/themes/<키>.js` 파일 하나(`THEMES.<키>` + `BUILD.<키>_*` + `DECOR_KIND`), `build.sh`가 `p3.js` 뒤에 붙인다. 밤 창문 불빛 끄기·굴뚝 연기는 각 파일이 `NO_LIGHT`·`CHIMNEY`에 등록. 상단 테마 버튼 3개를 드롭다운(`#themeSel`, 항목 그림은 첫 캐릭터)으로 바꾸고 숫자 1~9·T(다음), 고른 테마는 `vt_theme`. 그림은 서브에이전트 7개가 과제 문서 + 검수 하네스(구조 검사, 건물·캐릭터 시트, 낮·밤 마을)로 그렸다. 남은 손질: 몇몇 뒷모습의 눈 자국, 어두운 색(먹색·초코)의 외곽선 대비, 사이버펑크 밤에 주황 창문 불빛, 서부·농장 땅의 공용 덤불 색 | 완료 |

### 커스텀 이벤트 (2026-10-27)

| # | 제안 | 내용 | 비고 | 상태 |
| --- | --- | --- | --- | --- |
| 11 | 이벤트 이름 개방 | 서버가 정해진 4종만 받던 것을 자유 이름으로 | 시스템 4종 외 `^[a-z_]{2,32}$`, 사이트당 50가지(설정에 적은 이름은 예외, 넘친 이름은 설정 화면에 표시). 커스텀 이벤트에 임의 속성 10개(문자열 100자·숫자·불리언) | 완료 |
| 12 | 이벤트 설정 화면 | 이름별 이름표·지도 효과·소리·피드·알림·매출 집계 | 설정 메뉴 "이벤트 설정". `sites.event_config`(jsonb, 마이그레이션 필요) + `GET/PUT /api/sites/:id/eventtypes` + SSE `eventtypes`. 편집 중 미리보기, ▶ 미리 듣기·보기. 통계 오늘 탭에 매출(설정 기준)·EVENTS 막대 | 완료 |
| 13 | 구매 자동 감지 | 코드 없이 결제 완료 URL 패턴으로 이벤트 만들기, 또는 PG 웹훅을 서버 간 수집 | 위 구조 위에 얹는다. 웹훅은 위조 방지용 사이트별 비밀 키 필요 | URL 패턴 완료(2026-11-02): 이벤트 설정 "URL 패턴" 칸(`event_config[].auto` 정규식) → 서버가 세션당 한 번 그 이벤트를 합성(`properties.auto`), 피드 "(자동)". 금액은 없음. PG 웹훅은 사이트별 비밀 키(마이그레이션)가 필요해 뒤로 |

사용자 쪽 할 일: `docs/supabase.sql` 맨 아래 `event_config` 마이그레이션을 Supabase SQL Editor에서 실행.

### 홍보·재방문 (2026-11-02)

목표는 사람을 모으고(퍼지는 장치), 설치한 사람이 남게 하는(쓸모) 것. 이미 있는 것 중 재료로 쓸 것: 임베드·OBS(7), 사진(4)·어제 하루 타임랩스(9), 스크립트 빠짐 경고·브라우저 알림(5), 테마 해금·도감(14·11), 발자국(6), 커스텀 이벤트·매출(11·12), 내 캐릭터 표시(`vt_me`).

**선행 조건(상태: 대기, 사용자가 나중에 진행)**: 수집 서버 상시 배포. 지금은 이 PC + Tailscale Funnel이라 PC가 꺼지면 수집이 끊긴다(2026-10-30 16:21 KST 이후 실제 설치 사이트의 수집 중단 확인). 홍보 전에 Fly.io(`server/fly.toml`) 이전과 부하 확인(실제 설치 사이트 실측 최대 분당 30건 수준이라 커뮤니티 상단 노출 대비 필요)이 먼저다. 노력 S(반나절)·M(하루이틀)·L(그 이상). 추천 순서: (상시 배포) → 16 → 29·31(각 한 시간) → 17 → 25 → 18 → 26·27. 24의 집계 컬럼 확장만 지금 먼저 해 둔다(데이터는 늘린 뒤부터 쌓인다).

2026-11-02 구현: 16·17·18·24(집계)·25·26·27·29·31 완료(각 행 상태 참고). 사용자 설정도 같은 날 끝: ① `docs/supabase.sql` 2026-11-02 블록 실행 ② visitown.vercel.app을 사이트(실제 설치 사이트와 별개, `site_da36fde808`)로 등록하고 임베드 키를 `landing/index.html`의 `VT_LANDING`에 채움 ③ 웹훅 저장·테스트 전송 확인. 실제 데이터로 아직 안 본 것: 이상 감지(26)·아침 요약(25)은 하루 이상 쌓인 뒤 첫 알림이 와야 확인된다. 임베드 배율이 정수에서 꽉 채움으로 바뀌어 OBS 960×540은 정확히 2배가 된다.

2026-11-04: 38 계절 이벤트 완료(서버·DB 변경 없음, 빌드만). 33(여러 사이트 한 지도)은 TV 모드(32)의 사이트 순환이 대신하므로 사이트가 많아질 때 재검토.

2026-11-02 3차 구현: 13(URL 패턴)·23·배경음 연결·계정 삭제 완료. 사용자 할 일: `docs/supabase.sql` 맨 아래 `sites.public` 한 줄을 SQL Editor에서 실행(안 하면 공개 토글 저장 때 안내 오류), 서버 재시작.

2026-11-02 2차 구현: 39 → 19 → 20 → 32·35·36 → 21·34·37·28·30 순서로 완료(각 행 상태 참고, README "주인 NPC…"·"날씨…"·"방문자 인사…" 절). 서버 재시작이 필요하고 DB 마이그레이션은 없다(`sites.unlocks` jsonb 안에 visits·rare·records가 들어간다). 실제 데이터로 아직 안 본 것: 기록 갱신·희귀 방문자는 실제 트래픽이 쌓여야 처음 뜨고, 백필 직후 `visits`는 원본 7일 + `site_daily`(11-02부터) 합이라 실제 누적보다 작다. 웹 바이탈은 설치 사이트의 설치 코드에 `data-vitals="1"`을 더해야 모인다.

2026-11-02 코드 대조 검토: 임베드 스냅샷이 `props.me`를 내려주고, `counts().online`·`store.trails`·이벤트 설정 `notify`·비 환경음·`props.me` 렌더링이 이미 있어서 16·17·25·29·30·31·32·35·38·39는 그대로 된다. 아래 비고의 "검토:"는 그때 고친 설계.

#### 퍼지는 장치

| # | 제안 | 내용 | 비고 | 상태 |
| --- | --- | --- | --- | --- |
| 16 | "나 여기 있어" 랜딩 | Visitown 소개 페이지 자체가 마을이고, 들어온 사람이 자기 캐릭터와 지금 같이 보는 사람들을 본다 | `vt_me` 표시 재사용. 로그인 없는 공개 마을(읽기 전용 임베드 키). 고객 마을을 공개한다면 그쪽 동의 먼저. 검토: 랜딩에 SDK를 깔고 `window.visitown.sessionId`를 임베드 URL 파라미터로 넘겨 그 세션을 '나'로 그린다(임베드 스냅샷에 세션 props가 이미 온다). S | 완료(2026-11-02): `landing/index.html`. 임베드 `me=세션ID`로 자기 캐릭터. `VT_LANDING`에 사이트·키를 채워야 켜진다 |
| 17 | README용 픽셀 배지 | `지금 3명 보는 중` 같은 SVG 배지를 GitHub README·블로그에 붙인다 | 서버가 SVG를 돌려주는 공개 엔드포인트(임베드 키 기준), 짧은 캐시. 검토: 의존성 없이 문자열 SVG, `counts().online` 재사용, 임베드 키 검사를 `stream`에서 `badge` 경로로 넓힘. GitHub camo 캐시 때문에 `Cache-Control` 짧게. S | 완료(2026-11-02): `GET /api/sites/:id/badge?embed=키`(`server/badge.js`), 임베드 패널에 마크다운·HTML 복사 |
| 18 | 방문자용 미니 위젯 | 설치된 사이트 구석의 작은 마을 버튼. 누르면 지금 이 사이트에 있는 사람들과 내 캐릭터가 보인다 | 사이트 방문자 전원에게 노출되는 가장 큰 유입 경로. 고객 사이트 화면에 들어가므로 기본값 꺼짐, SDK 옵션으로 켠다. 검토: 대시보드 한 덩어리(약 490KB)를 고객 사이트에 넣지 않는다. 버튼만 가볍게 두고 누를 때 임베드 URL을 iframe으로 띄운다. 임베드 키가 방문자에게 드러나므로 사이트별 '위젯 공개' 플래그 필요. M | 완료(2026-11-02): SDK `data-widget`, 임베드 패널 토글(`sites.widget`), `GET /api/sites/:id/widget` |
| 19 | 임베드·배지의 브랜드 표시 | 무료 플랜 임베드(7)·배지(17)에 작은 "Visitown" 표시와 가입 링크 | 유료 플랜에서 숨김. 검토: 코드에 플랜 개념이 없으니 지금은 항상 표시, 숨김 플래그는 플랜 생기면. S | 완료(2026-11-02): 임베드 오른쪽 아래 반투명 `#brand` 링크(→ `landing/`), `brand=0`은 미니 위젯·랜딩처럼 바깥 틀에 링크가 있을 때만. 배지 SVG 오른쪽 끝에 작은 "Visitown" |
| 20 | 사진·영상 공유 | 사진(4)·타임랩스(9)에 공유 버튼, 세로·정사각 비율, "어제 412명이 다녀갔어요" 문구 합성 | Web Share API(지원 안 하면 저장). 검토: `page_daily`의 sessions는 경로별이라 합치면 사람 수가 부풀어요. '어제 N명'은 타임랩스가 읽는 원본 이벤트에서 세션 중복 제거로 센다. S | 완료(2026-11-02): 화면 메뉴 "사진 공유"(`showShare`): 가로·정사각·세로, 문구 토글, 미리보기, 공유하기(Web Share, 없으면 저장만). 어제 인원은 `site_daily.sessions`(사이트 단위 중복 제거) → 없으면 어제 원본 이벤트 세션 수, 0이면 "지금 N명". 리플레이 바 "공유"(영상을 만든 뒤 공유 창), 영상 왼쪽 상자에 "N명이 다녀갔어요" |
| 21 | 기록 갱신 카드 | 1,000번째 방문자, 동시 접속 최고 기록, 첫 해외 방문자 때 공유용 이미지를 자동으로 만든다 | 기록 판정은 서버(해금 진행도 `server/unlocks.js`와 같은 방식으로 저장). 검토: 서버엔 캔버스가 없으니 서버는 `milestone` SSE만 보내고 이미지는 사진 기능이 있는 대시보드가 만든다. 누적 방문 카운터가 해금 진행도에 없어 추가(34·36도 같이 쓴다). M | 완료(2026-11-02): `records`(N번째·동시 접속 최고(5명부터, 마지막 알림의 1.3배·+2일 때만)·첫 해외·나라 5/10/20/50/100) → SSE `milestone` + 웹훅 종류 `milestone`. 대시보드: 피드 줄 "카드" 버튼·알림, 다른 패널이 없으면 공유 카드(`showShare` RECORD) 자동. 도감 희귀 탭 "마을 기록" |
| 22 | 링크 미리보기 이미지 | 마을 링크를 공유하면 지금 마을 모습이 OG 썸네일로 뜬다 | 서버 쪽 캔버스 렌더 필요(또는 주기적 스냅샷 저장). 검토: 서버 렌더가 없어 대시보드가 사진을 주기적으로 올리는 방법뿐인데 탭이 열려 있어야 갱신된다. 효과 대비 손이 커서 뒤로. M | 보류 |
| 23 | 공개 마을 구경 | 주인이 고른 사이트만 공개 목록에 올려 다른 사람 마을을 둘러본다 | 기본 비공개, 트래픽 규모가 드러난다는 안내. M | 완료(2026-11-02): `sites.public`(마이그레이션 `docs/supabase.sql` 맨 아래), 임베드 패널 토글(주인만, 확인창), `GET /api/public/sites`, 화면 메뉴 "마을 구경"(`showTour`) + 랜딩 "공개 마을 구경" 절. 구경은 임베드 링크 새 탭 |
| 24 | 월간·연말 결산 | "올해 우리 마을" 요약 카드와 영상 | `page_daily`(무기한 보관) 기반. 검토: 지금 집계엔 조회수·세션·봇뿐이라 나라·기기·유입 경로 컬럼을 `server/rollup.js`·`docs/supabase.sql`에 먼저 늘려야 한다(확장 S, 지금). 결산 화면은 연말. M | 집계 확장 완료(2026-11-02): `site_daily` 표 + `vt_rollup`. 결산 화면은 아직 |

#### 계속 쓰게 하는 기능

| # | 제안 | 내용 | 비고 | 상태 |
| --- | --- | --- | --- | --- |
| 25 | 슬랙·디스코드 웹훅 | 아침 요약, 결제, 스크립트 빠짐 경고(5)를 탭이 닫혀 있어도 받는다 | 지금 알림은 대시보드 탭이 열려 있어야 함. 사이트별 웹훅 URL 저장, 이벤트 설정(12)의 '알림'과 연결. 검토: Node 20 `fetch`로 의존성 없이. `sites`에 웹훅 URL 컬럼 마이그레이션 하나. 보낼 곳은 https + 슬랙·디스코드 호스트만 허용(SSRF 방지). M | 완료(2026-11-02): `server/alerts.js`, 설정 메뉴 '알림 보내기', `sites.webhook` |
| 26 | 평소와 다를 때 알림 | 지난주 같은 요일·시간 대비 급증("어디서 퍼졌어요", 유입 경로 함께)·급감("장애일 수 있어요") | 서버에서 판정, 25로 전달. 검토: 일별 집계로는 '지난주 같은 시간'이 안 나오니 원본 7일치(`eventsBetween`)로 계산. 작은 사이트는 노이즈가 커서 최소 건수 기준 필요. M | 완료(2026-11-02): `Alerts.anomaly` 15분마다, 지난 6일 같은 시간 평균 대비. 웹훅 + SSE `alert` |
| 27 | 오류를 마을에서 보이게 | SDK가 JS 오류를 보내면(옵션) 그 건물에 불, 캐릭터가 넘어짐 | `window.onerror`·`unhandledrejection` 수집, 메시지는 길이 제한·개인정보 마스킹. 검토: 커스텀 이벤트 속성도 서버 `ALLOWED_PROPS`를 타는지 확인(메시지 키 추가 필요할 수 있음). 건물 불은 이벤트 설정의 '지도 효과'로 거의 공짜. S~M | 완료(2026-11-02): SDK `data-errors`, `js_error` 기본 효과 '불'(건물 불·연기, 캐릭터 넘어짐) |
| 28 | 느린 페이지 표시 | 웹 바이탈(LCP·INP)이 나쁜 건물 위에 연기 | SDK에서 `PerformanceObserver`로 수집, 건물별 p75. M | 완료(2026-11-02): SDK `data-vitals="1"` → 떠날 때 `web_vital`(LCP·INP·CLS). 서버는 세션·DB 없이 건물별 60표본 p75, 5개부터 poor/ok/good, 바뀌면 SSE `vitals`(스냅샷·state에도). 느린 건물 지붕 회색 연기, 건물 정보 패널 "웹 바이탈" 줄. 데모는 도서관 예시 |
| 29 | 리플레이 메모 | "배포", "광고 시작" 같은 표시를 리플레이 시간축에 남겨 전후 비교 | 사이트별 메모 테이블 또는 커스텀 이벤트로. 검토: 대시보드가 `/api/events`로 `deploy` 같은 커스텀 이벤트를 보내고 이벤트 설정으로 아이콘만 붙이면 끝. 가장 싸다. S | 완료(2026-11-02): 설정 메뉴 '메모 남기기', `POST /api/sites/:id/notes`, 리플레이 눈금 `#rpTicks` |
| 30 | 퍼널을 길로 | 상품 → 장바구니 → 결제 길의 굵기와 중간 이탈 지점 | 발자국(6)의 서버 `trails` 재사용. 검토: `store.trails`가 건물 간 이동 횟수를 이미 세니 순서만 골라 읽으면 된다. S~M | 완료(2026-11-02): 통계 모달 **퍼널** 탭(건물 4단계 선택, `GET /api/sites/:id/trails`), 단계별 넘어감·떠남·다른 곳 비율 막대. "지도에 표시"(`vt_funnel`)면 금색 띠(굵기 = 비율, 흐르는 점) + 넘어온 % 금색·떠난 % 빨간 숫자, 2분마다 갱신. 데모는 REC로 같은 계산. 가중치라 '최근 흐름'임을 안내 |
| 31 | 캠페인 구분 | UTM별로 캐릭터 표식을 달리해 광고 유입을 실시간으로 본다 | SDK가 `utm_*`를 `session_start` 속성으로, 표식 범례에 추가. 검토: SDK `referrer()` 옆 세 줄 + 서버 `ALLOWED_PROPS`에 키 3개 + 범례. S | 완료(2026-11-02): SDK utm_* 전송, 캐릭터 왼쪽 삼각기, 정보 패널 태그, 통계 CAMPAIGN 막대, 도감 |
| 32 | 사무실 TV 모드 | 여러 사이트 마을을 돌아가며 큰 글씨로 띄운다 | 녹화 모드·임베드 재사용, 순환 간격 파라미터. S | 완료(2026-11-02): 화면 메뉴 "TV 모드"(`showTv`): 간격(30초~5분)·사이트 체크·TV용 링크(`?api=…&tv=초&sites=a,b`, 그 브라우저에서 한 번 로그인). 녹화 모드 위에 `#tvBar`(사이트 이름 30px·접속자 36px·진행 막대·다음 사이트), ← →로 넘김, Esc로 종료. 이벤트가 있는 사이트만 돈다 |
| 33 | 여러 사이트 한 지도 | 사이트마다 마을 하나, 전체를 월드맵으로 | L | 보류(2026-11-04): TV 모드 `?tv=1&sites=`가 사이트 순환으로 대신. 사이트별 SSE·TownStore·World를 한 캔버스에 두는 작업이라 사이트가 많아질 때 재검토 |

#### 재미·수집

| # | 제안 | 내용 | 비고 | 상태 |
| --- | --- | --- | --- | --- |
| 34 | 마을 성장 | 누적 방문 수에 따라 건물이 커지고 장식이 는다 | 진행도는 해금과 같이 `sites.unlocks` 쪽에. 검토: 21에서 추가하는 누적 방문 카운터 공유. M | 완료(2026-11-02): 레벨 1~5(100·1,000·1만·10만, `TOWN_LEVEL_AT`). `placeDecor` `GROWTH`가 빈 격자점에 꽃·덤불·나무를 더 두고 대문 위 별, 헤더 `Lv.N` 태그, 레벨업 피드·플래시. 건물 자체 크기는 자리(slot) 제약이 있어 장식으로만. 데모 Lv.3 |
| 35 | 날씨 | 접속자가 몰리면 맑음, 오류(27)가 많으면 비 | 비 환경음은 `bgm`에 이미 있음. S | 완료(2026-11-02): 서버 `SiteStore.weather()`(최근 10분 사람 `js_error` 3건↑ → 비, 접속자 8명↑ → 쨍쨍, 그 밖에 맑음. `WEATHER_RAIN_ERRORS`·`WEATHER_SUNNY_ONLINE`), 스냅샷 `weather` + 10초마다 바뀌면 SSE `weather`. 대시보드는 빗줄기·물방울·푸른 틴트 / 따뜻한 틴트·빛줄기·반짝임을 2초에 걸쳐 전환, 헤더 "마을 시간 · 비", 피드 시스템 줄. 보기 메뉴 "날씨"(`vt_weather`), 임베드 `weather=0`, 데모 메뉴 "비 내리기". 비 환경음은 bgm 연결 뒤에 |
| 36 | 희귀 방문자 | 1,000번째, 새벽 3시 방문자 같은 특별 외형, 도감에 수집 칸 | 검토: 판정은 서버(누적 카운터 필요)가 하고 세션 props에 표식을 얹는다. S | 완료(2026-11-02): `server/unlocks.js` `RARES`·`judge()`(apply 전에 불러 `session_start` props에 `rare`·`visit_no`). 종류: 첫 손님(1번째)·기념 손님(100·500·777·1,000·5,000·7,777·1만·5만·7만7천·10만…)·개척자(처음 보는 나라)·올빼미(새벽 3시대). 누적 방문 `progress.visits`(백필: 원본 7일 + 그 전 `site_daily.sessions`), 수집 `rare[kind]{n,first,last}`는 `sites.unlocks`에 같이 저장, `view().rares`. 대시보드: 금색 반짝임 + 머리 위 아이콘(하트·별·폭죽·달), 피드 "✦ 1,000번째 방문자", 정보 패널 태그, 알림, 도감 **희귀** 탭(만난 횟수·마지막 날짜). 데모는 가끔 섞음 |
| 37 | 방문자 인사 | 미니 위젯(18)에서 이모지를 누르면 내 캐릭터 머리 위에 말풍선 | 정해진 이모지만(자유 입력 없음). 검토: 방문자가 쓰는 첫 쓰기 경로라 세션당 속도 제한. 18 뒤에. M | 완료(2026-11-02): 위젯 아래 이모지 6개 → `greet` 이벤트(`emoji`). 서버 `GREET_EMOJI` 검사·세션당 분당 12번·DB 저장 안 함. 캐릭터 머리 위 이모지 말풍선 2초(대시보드·임베드), 피드 "인사했어요 👋", `EV_DEFAULTS.greet` |
| 38 | 계절 이벤트 | 할로윈·크리스마스·설날 한정 장식 | S | 완료(2026-11-04): `p3.js` `SEASONS`(할로윈 10/24~31, 크리스마스 12/15~31, 설날 음력 2026~2035 표 ±2일)·`seasonOf()`, 장식은 `placeDecor()`가 빈 자리에 시드 고정으로(`DECOR.season`). 할로윈 호박 등불(밤 눈 빛·박쥐), 크리스마스 눈·나무 전구·눈사람·선물, 설날 복주머니·가로등 등불·연. 보기 메뉴 "계절 장식" 토글(`vt_season`), 데모 메뉴 "계절"·`?season=` 강제(임베드 `season=0`). 2036년부터는 설날 표를 늘려야 한다 |
| 39 | 주인 NPC | 사이트 주인(`vt_me`)이 특별한 모습으로 등장 | 검토: `props.me` 특별 렌더링(`p4.js`)이 이미 있어 외형만 바꾸면 된다. S | 완료(2026-11-02): 테마 형태 그대로 금빛 옷·진홍 안감(`ME_COLOR` → `A.me`), 머리에 왕관(`ICON_ROWS.crown`, 재방문 모자 대신, 방문자 표시를 꺼도 남음), 빨간 고리 + 떠 있는 ME 표. 정보 패널 "주인 토끼", 도감 표식 탭에 칸 추가 |

### 엔지니어링 증명 (2026-11-04)

목표는 기능 수가 아니라 "저장소를 열어 본 사람이 설계와 검증을 믿게" 하는 것. 지금 비어 있는 것: 자동 테스트 0개, CI 없음, 타입 0, 저장소 비공개(`gakmax/visitown`). 1군이 없으면 2·3군은 데모로 읽히므로 순서를 지킨다. 추천 순서: 40 → 41 → 42 → 43 → 44 → 48. 각 항목은 이력서에 적을 측정값을 "수치" 칸에 미리 정했다.

#### 1군 · 기반

| # | 제안 | 내용 | 수치 | 비고 | 상태 |
| --- | --- | --- | --- | --- | --- |
| 40 | 스토어 불변식 테스트 + CI | `server/store.js`·`unlocks.js`를 `node:test`로 고정. 불변식은 중복 `event_id` 무시, 늦게 온 이벤트로 페이지 역행 없음, 건물별 인원 합 = 접속자 수, 세션 타임아웃 뒤 재입장, 자동 이벤트 세션당 1회. 임의 이벤트 순열은 fast-check(property-based)로. GitHub Actions: `./build.sh` → 테스트 → Playwright 데모 스모크(`?demo=1` 콘솔 오류 0) | 불변식 N개 · 테스트 M건 · CI 통과 | S~M. 지금 Playwright 검증은 세션 scratchpad 스크립트라 저장소에 없다. `tests/`로 옮기고 포트는 5173 말고 다른 것 | 완료(2026-11-04): `tests/` 5파일 42건(41·48 뒤 7파일 56건, 50 뒤 8파일 66건, 44 뒤 9파일 71건, 45 뒤 74건, 49 뒤 76건, 46 뒤 79건, 55 뒤 80건, 52 뒤 86건, 53 뒤 93건, 56 뒤 94건, 54 뒤 97건, 57 뒤 99건), `npm test`. 불변식 12개 = 단위 5(중복 무시·역행 없음·인원 합=접속자·타임아웃 뒤 재입장·자동 이벤트 세션당 1회) + fast-check 속성 7(합·멱등·중복 삽입 불변·lastTs 단조·순서 무관 최종 페이지·자동 1회·만료 뒤 ttl 안). 해금 9건(judge·observe·기록·선물·저장 복원), API 계약 5건(DB 없이 실제 서버: 수집 거절 조건·상태·SSE snapshot→event·TTL), 스모크 3건(`?demo=1`·진입 화면·`/design-system/`, 콘솔 error·pageerror·4xx 0). `.github/workflows/ci.yml`: npm ci → build → unit → api → smoke. 루트 `package.json` devDeps는 fast-check·playwright 1.62.1뿐 |
| 41 | SDK 타입·npm 배포·크기 예산 | `sdk/visitown.d.ts`(`visitown.track`·`identify`·옵션), `@visitown/sdk`로 npm 공개(설치 코드는 `<script>` 그대로 두고 번들러 사용자용), size-limit으로 gzip 7KB 예산을 CI에서 강제 | gzip ≤ 7KB · 타입 공개 | S. 서버가 주는 `/wt.js`와 npm 본이 같은 파일이어야 한다(빌드에서 복사) | 완료(2026-11-04): `sdk/visitown.d.ts`(`VisitownConfig`·`Visitown`·전역 `window.visitown`), `sdk/index.mjs`(ESM `init/track/consent/pageview`), `sdk/package.json`(`@visitown/sdk` 0.1.0, files 5개). `visitown.js`는 `data-site` 없으면 `window.visitown.init(cfg)`를 기다리게 바꿔 서버 `/visitown.js`와 npm 본이 같은 파일. 크기 예산은 size-limit 대신 의존성 없는 `tests/sdk.test.js`가 gzip ≤ 7,168B를 CI에서 강제(지금 7,067B, 남은 101B. 헤더 주석을 줄여 맞춤). 타입은 `tests/fixtures/sdk-usage.ts`를 tsc --strict로 검사(`@ts-expect-error` 2건 포함). npm publish는 아직(로그인 필요, `cd sdk && npm publish --access public`) |
| 42 | 저장소 공개 + 영문 README | 비밀값 이력 점검(`git log -p --all -- '.env*'`가 비어야 함, 임베드 키·사이트 ID는 랜딩 코드에 있으니 읽기 전용임을 명시) 뒤 공개. README 상단에 영문 요약·설치 3줄·아키텍처 그림 1장 | 링크 하나로 검증 가능 | S. 공개 전 `/security-review` 한 번 | 제안 |

#### 2군 · 측정값이 나오는 기능

| # | 제안 | 내용 | 수치 | 비고 | 상태 |
| --- | --- | --- | --- | --- | --- |
| 43 | 부하 테스트 리포트 | k6로 SSE 구독자 1,000 · 초당 이벤트 500을 10분. 서버 RSS·이벤트 → SSE 도착 p50/p95·유실률·CPU를 표로 `docs/load.md`에. 병목(세션 Map 크기, `limited` 버킷, Supabase 쓰기 큐)을 찾아 한 가지는 고친다 | 구독자 N · 초당 M · p95 X ms · RSS Y MB | M. 의존성 없는 서버의 한계를 숫자로 아는 것이 목적. 로컬 PC 기준임을 표기 | 완료(2026-11-04): `docs/load.md`. 도구는 k6 대신 의존성 0인 `tests/load/run.js`(worker_threads 구독자, 지연 p50/p95/p99·유실·RSS·CPU·재접속 복구). 본 측정 구독자 1,000 · 초당 500건 · 10분: p50 11 · p95 19 · p99 39ms · 유실 0 · RSS 132MB · 재접속 2,000회 복구 32,602건 · 스냅샷 재전송 0. 병목: 프레임×구독자만큼의 `res.write`(팬아웃 최악 조건에서 CPU 100%, p99 3s, 유실 3.8%)와 연결마다 스냅샷·발자국 계산. 고침: 같은 틱 프레임을 구독자당 write 한 번으로 합침 + 스냅샷 1초·발자국 60초 캐시(링버퍼로 이어 붙여 상태 동일). 결과 같은 최악 조건 p99 3,054 → 12ms · CPU 86 → 27% · 유실 0, 초당 1,500건도 유실 0·p99 33ms. 한계는 1,000 구독자 × 초당 1,500건 근처(CPU 84%), 그 위는 46 |
| 44 | SSE 재접속 무손실 | 서버가 사이트별 이벤트 링버퍼(최근 N건, id 단조 증가)를 들고 `Last-Event-ID`로 붙으면 빈 구간만 차분 전송, 버퍼 밖이면 지금처럼 스냅샷. 대시보드는 재접속 중 "끊김" 표시 대신 복구 건수 표시 | 재접속 복구 N건 · 스냅샷 재전송 0회 | M. 지금은 재접속마다 스냅샷 전체를 받아 피드가 중복될 수 있다. 40의 불변식에 "재접속 전후 상태 동일"을 추가 | 완료(2026-11-04): `server/sse.js` `Ring`(사이트당 `SSE_BUFFER` 기본 1,000건, id는 `부팅ID.순번`). 사이트로 가는 모든 프레임(event·unlocks·milestone·weather·vitals·pages·eventtypes·alert·메모)이 `broadcast()`를 거쳐 버퍼에 남고 JSON은 한 번만 만든다. 스트림은 `Last-Event-ID`(또는 `?lastEventId=`) 뒤가 전부 버퍼에 있으면 `resume{count}` + 빈 구간 + 날씨만, 아니면(버퍼 밖·서버 재시작·형식 오류) 스냅샷. 스냅샷에도 id. 대시보드는 끊긴 동안 로컬 만료를 멈추고(`store.frozen`) resume이 오면 "실시간 · 놓친 N건 복구" + 피드 줄. `SSE_MAX_AGE_MS`를 주면 서버가 주기적으로 끊어 재접속 경로를 검증한다(스모크 테스트가 씀). 측정값은 `state.totals.sse{snapshots,resumed,recovered}`. 테스트: 불변식 13(fast-check 링버퍼), `tests/sse.test.js` 3건(유실 0·중복 0·상태 동일·스냅샷 재전송 0), 스모크 1건(실제 브라우저 EventSource 재접속) |
| 45 | SDK 오프라인 큐·배치 전송 | 전송 실패분을 저장소에 모아 지수 백오프 재시도, 1초 안의 이벤트는 한 요청으로 묶음. 서버는 묶음을 받아 `event_id`로 중복 제거(40의 불변식이 보장). Playwright 네트워크 차단·복구 시나리오로 유실률 측정 | 이탈 이벤트 유실률 X% → Y% | M. 저장소 키 `vt_q`. 순서는 timestamp로 복원, 서버의 "역행 없음"이 뒷받침 | 완료(2026-11-04): SDK가 1초 안의 이벤트를 한 요청(≤20건)으로 묶고, 실패(네트워크·5xx·429)한 묶음은 `localStorage.vt_q`(≤200건)에 남겨 1→2→…→60초 백오프로 재시도, `online`이면 즉시. 떠날 때는 저장한 채 sendBeacon도 보내고 다음 로드가 저장분을 첫 묶음에 실어 보낸다(비컨은 도착을 보장하지 않아서. 중복은 서버 `event_id`가 거름). 서버 `store.apply`는 ttl보다 늦게 온 이벤트가 끝난 세션을 되살리지 않고 기록만 남긴다(`totals.late`). 측정(Playwright, `/api/events` 차단 → 구매 + 페이지 이탈 → 복구): 이탈 구간 이벤트 유실률 **100% → 0%**(이전 SDK는 2/2 유실, 지금 0/2). 크기: 파일 안 설명 주석을 `sdk/README.md`로 옮겨 gzip 7,058 → 6,960B(여유 208B). 테스트 +3(스모크 큐 2·스토어 늦은 이벤트 1) |
| 46 | 수평 확장 | 서버 2대를 Postgres `LISTEN/NOTIFY`로 묶어 어느 서버에 붙어도 같은 마을. 세션 상태는 서버마다 복제(이벤트를 모두 받아 각자 계산), 집계 쓰기는 한 대만(advisory lock). Fly.io 2 인스턴스로 배포 | 2 인스턴스 · 상태 일치 검증 | L. "수집 서버 상시 배포" 선행 조건과 같이 끝난다. Redis는 쓰지 않는다(의존성 0 유지) | 코드 완료(2026-11-04), 배포 대기: `server/peers.js`가 Supabase Realtime broadcast(phoenix WebSocket, Node 22 내장 `WebSocket`이라 의존성 0. Postgres LISTEN/NOTIFY는 의존성 없이는 PG 프로토콜을 직접 구현해야 해서 대신)로 인스턴스끼리 이벤트(정규화·판정 뒤)·설정 변경(건물·이벤트 설정·임베드 키·웹훅·공개·위젯·메모·해금)을 주고받는다. 각자 모든 이벤트로 같은 상태를 계산, DB 저장은 받은 쪽만, 집계·원본 정리·웹훅·아침 요약은 리더만(`vt_lease` DB 임대 30초, 10초마다 갱신, 함수 없으면 혼자라고 보고 리더). `PEERS=1` 또는 `PEER_WS_URL`. 검증: `tests/peers.test.js` 3건 — 의존성 없는 phoenix 흉내 릴레이로 인스턴스 둘을 묶어 상태 일치·SSE 전달·중복 1회 적용·설정 전파. `vt_lease`는 docker postgres로 확인. **남은 것**: Fly.io에 2대 띄워 실제 Supabase Realtime으로 확인(`fly scale count 2`, 프로젝트 Realtime 켜기) — 배포는 사용자가 |
| 47 | 렌더를 Worker로 | `OffscreenCanvas`로 마을 그리기를 Web Worker로 옮기고 메인 스레드는 DOM(피드·패널)만. 전후 INP·장시간 작업 수·프레임 시간을 Chrome 트레이스로 비교 | INP X → Y ms · 50ms 초과 작업 N → M | M. DOM 이름표(`.label`)·클릭 판정은 좌표만 메시지로 주고받는다. 임베드·사진 공유(`composeShare`)가 캔버스를 직접 읽으니 경로를 바꿔야 한다 | 기준 측정 완료, 전환 보류(2026-11-04): `tests/perf/render.js`(Playwright CDP)로 `?demo=1` 10초 — 60.1fps, 프레임 p50/p95/최대 16.7/16.7/16.8ms, **50ms 초과 작업 0건**, 메인 스레드 점유 10.6%(스크립트 3.4%). 옮길 긴 작업이 없어 지금 Worker 전환은 측정값을 바꾸지 못한다. 전환 자체는 큰 공사(World가 캐릭터 시뮬레이션·클릭 판정·정보 패널·미니맵·사진 공유·내보내기와 캔버스를 공유. `p5.js` 211줄 + `p6.js`의 `world.*` 참조 다수)라, TV 모드나 캐릭터 200명 이상에서 긴 작업이 측정되면 그때 같은 스크립트로 전후를 비교하며 한다 |

#### 3군 · 싸고 눈에 띄는 것

| # | 제안 | 내용 | 수치 | 비고 | 상태 |
| --- | --- | --- | --- | --- | --- |
| 48 | MCP 서버 | 읽기 전용 MCP(`server/mcp.js`): `online`, `today`, `top_pages`, `records`, `funnel` 도구. 토큰은 기존 사이트 토큰. Claude·Cursor에서 "지금 접속자 몇 명?"에 답한다 | 도구 N개 | S. 쓰기 도구는 넣지 않는다(설정 변경은 대시보드에서) | 완료(2026-11-04): `server/mcp.js` 의존성 0(JSON-RPC stdio 직접 구현, 프로토콜 2025-06-18/03-26/2024-11-05). 도구 5개 `online`·`today`·`top_pages(hours|days,limit)`·`records`·`funnel`, 결과는 text(JSON)+structuredContent. 기존 API(`state`·`pages`·`events`·`daily`·`unlocks`·`trails`)만 부르므로 서버 변경 없음. 루트 `.mcp.json`(로컬 기본값), `tests/mcp.test.js` 8건(실제 서버에 이벤트 넣고 stdio로 왕복) |
| 49 | 리텐션 분석 | `site_daily`·세션 기록으로 D1·D7 재방문 코호트를 통계 모달에 차트로. 재방문 판정은 SDK `returning`과 같은 기준 | 코호트 N주 | S. 원본 보존 기간(7일)보다 긴 구간은 `site_daily`에 재방문 수 컬럼을 더해야 한다 | 완료(2026-11-04): 방문자 ID가 없으므로 SDK가 첫 방문 날짜(`localStorage.vt_first`, 예전 재방문자는 안 보냄)를 `session_start`의 `first`로 보내고(서버 `YYYY-MM-DD` 검사), `vt_rollup`이 `site_daily.cohorts`(그날 세션을 첫 방문 날짜별로 센 jsonb)를 채운다(마이그레이션 `alter table site_daily add column cohorts`, docker postgres로 검증). 통계 모달 **리텐션** 탭: 첫 방문 주(월요일 시작)별 신규 세션·D1·D7 비율 막대, 최근 8주, 평균 타일. 세션 단위 근사치임을 화면에 명시. 데모는 가짜 코호트. 테스트 +2(스토어 first 검사, 스모크 리텐션 탭) |
| 50 | 보안 점검표 | CSP(대시보드·랜딩), SDK SRI 해시 안내, 임베드 키 만료·재발급, IP 기반 요청 제한, 웹훅 서명. 점검표 N건 중 M건 반영을 `docs/security.md`에 | 점검 N건 · 반영 M건 | S~M. 이전 사이트 점검표(31개 중 24개)와 같은 형식. 42 공개 전에 한 번 | 완료(2026-11-04): `docs/security.md` 점검 28건 · 새로 반영 10건 · 이미 충족 13건 · 보류 5건. HIGH 3: 건물 이름·방문자 경로·속성 XSS(대시보드 `esc()` + 서버 `device`·`referrer` 열거형), Vercel 보안 헤더(`vercel.json`: CSP·HSTS·nosniff·Referrer·임베드 아닌 대시보드만 X-Frame-Options). MEDIUM: IP당 속도 제한(이벤트 1,200/분·인증 실패 60/분 → 1분 차단), SSE 사이트당 200, 정규식 ReDoS 휴리스틱, 커스텀 속성 이메일·전화 마스킹. LOW: 랜딩 CSP, 배지 SVG CSP·nosniff, SRI 안내(`npm run sdk:sri`). 보류: `'unsafe-inline'` 제거(인라인 핸들러 97개), 임베드 키 만료(의도적), 웹훅 서명(해당 없음). 테스트 +10건(`tests/limits.test.js` 5, 스모크 3: XSS·랜딩 CSP·헤더 규칙, 스토어 2) **2026-11-09 재점검**(`/security-review`): S-30~S-35 추가, 35건 · 반영 17 · 충족 13 · 보류 5. HIGH 2: 대시보드·랜딩 `?api=` 허용 목록(토큰 유출·CSP 우회). MEDIUM 3: Supabase 표 권한 회수(직접 INSERT·컬럼 조회), 임베드 SSE 프레임 허용 목록(`server/embed.js`). 보류 1: PEERS 버스 인증(켜기 전). 테스트 +4(sse 2·limits 1·스모크 1). **운영 Supabase에 `docs/supabase.sql` 끝 블록 실행 필요** |

빼기로 한 것: WebGL 전환, 세션 리플레이, 33 월드맵. 비용 대비 설명할 거리가 안 는다.

#### 작업 단위 (2026-11-04 묶음)

의존 관계로 묶은 실행 단위. 실행 순서는 A → (C-1 또는 E-1 하나) → B → D → C-2·E-2 → F. 로드맵 추천 순서와 다른 점: 50을 42 앞으로(비고가 요구), 44를 43 앞으로(재접속 복구가 43의 측정 항목이 됨).

| 단위 | 항목 | 묶은 이유 | 상태 |
| --- | --- | --- | --- |
| A · 테스트 기반 | 40 | B·C·D가 이 CI 위에 올라간다. 단독으로 먼저 | 완료(2026-11-04) |
| B · 공개 준비 | 50 → 42 | 50은 42 공개 전 필수. 42의 "링크 하나로 검증"은 A의 CI 배지가 있어야 의미가 생긴다 | B-1(50) 완료(2026-11-04), B-2(42)는 **v1.0이라고 느낄 때**(2026-11-04 결정: D·C-2 뒤, 기한 없음). 라이선스는 먼저 정함(루트 `LICENSE` MIT, SDK와 같음). 공개 직전 `docs/security.md` S-11(비밀값 이력) 재확인·S-28(운영 `ALLOWED_DASHBOARD_ORIGIN`)·법적 문서 빈칸·수집 서버 위치 결정 |
| C · SDK | 41 → 45 | 45로 SDK가 커지기 전에 41의 크기 예산을 건다. 45의 중복 제거는 서버가 이미 배열·`event_id` 처리를 하므로 SDK 쪽 작업이 대부분 | C-1(41)·C-2(45) 완료(2026-11-04). 예산은 주석을 README로 옮겨 맞춤(여유 208B) |
| D · 서버 복원력·성능 | 44 → 43 | 지금 SSE에 `id:` 줄이 없고 재접속마다 스냅샷 전체. 44의 링버퍼 크기가 43에서 찾을 병목(RSS) 후보 | 완료(2026-11-04). 링버퍼는 RSS 병목이 아니었고(최대 145MB) 병목은 팬아웃 write 수였다 |
| E · 데이터 활용 | 48, 49 | 서로 독립, 각각 S. 49는 `site_daily` 컬럼 추가(`docs/supabase.sql`) 동반 | E-1(48)·E-2(49) 완료(2026-11-04) |
| F · 큰 단독 작업 | 47, 46 | 각각 별도 세션. 46은 D(링버퍼 복제) 뒤, 47은 A의 스모크 테스트 뒤가 안전 | 46 코드 완료(배포 대기), 47은 기준 측정만(아래 47 상태) |

### 프론트 이력서용: Next.js + TS 이전 (2026-11-05)

목표는 Next·React 프론트 이력서에 쓸 수 있게, 있는 기능을 **설명할 수 있는 구조로** 다시 세우는 것. 설계와 코드 뼈대는 `docs/migration.md`에 있다. 방식: 51~54는 사용자가 직접 짜고 Claude가 리뷰한다. 55처럼 낯선 API는 Claude가 짜도 되지만, 사용자가 설명 질문을 통과해야 한다. **이력서에는 상태가 완료인 것만 올린다.** 순서는 55 → 59 → 52 → 51(최소) → 54 → 53(피드·정보·헤더만) → 56 → 47(Worker) → 57(접근성) → 42(공개). 55·59는 Next와 무관하게 지금 코드에서 끝나므로 먼저 '완료'를 확보한다(2026-11-05 평가). 58은 뺐다.

이미 있어서 이전 때 옮기기만 하면 되는 것: SSE 재접속 무손실(버퍼를 넘으면 스냅샷, `lastEventId` 쿼리도 받음, `server/index.js` stream 경로), 리프레시 토큰 갱신(`p6.js` `AUTH`), 리플레이·임베드·TV·데모(지금은 쿼리 파라미터 방식), `tests/perf/render.js`, `vercel.json` CSP(`'unsafe-inline'` 포함).

| # | 제안 | 내용 | 비고 | 상태 |
| --- | --- | --- | --- | --- |
| 51 | 모노레포 + 공유 타입 | npm workspaces로 `apps/web`·`apps/demo-site`·`packages/types`·`packages/sdk`·`packages/engine`·`server`. 이벤트·스냅샷·SSE 프레임 타입을 `packages/types` 하나로 | 기존 `npm test` 그대로 통과가 완료 조건. Vercel 프로젝트를 앱마다. **평가(11-05)**: 그 자체로는 이력서 한 줄이 안 되니 52가 패키지를 필요로 할 때 최소로만. demo-site(Next 14·React 18)와 새 앱(Next 16)이 한 workspace에 공존하면 꼬이므로 demo-site를 같은 버전으로 올리거나 workspace 밖에 둔다. 서버는 런타임 의존 없이 JSDoc `@type import()`로만 타입을 가져와 Fly 빌드 컨텍스트를 안 바꾼다 | 일부(2026-11-05): 52가 필요로 한 만큼만. 루트 `package.json` workspaces `packages/*` + `packages/engine`(`@visitown/engine`, private). 공유 타입은 `packages/engine/src/types.ts`에 씨앗(VtEvent·Session·StoreChange·PageMapping·EventConfig). `packages/types`로 빼고 SDK `d.ts`·서버 JSDoc과 잇는 것은 남음 |
| 52 | 엔진 분리(TS) | `p2~p5.js`를 React·DOM을 모르는 `packages/engine`으로. 바깥 스토어(`createSiteStore`)가 데이터의 주인, 엔진과 React는 구독만. 좌표·카메라는 엔진 내부, `selectedId`는 스토어, 카메라 이동 같은 명령은 엔진 메서드 | 47(Worker)의 전제. `/demo`를 서버 없이 먼저 띄워 검증. **평가(11-05)**: 생각보다 쌈. p2·p3·p4·테마 7개는 DOM 참조 0, p5만 캔버스 핸들 2개(`cv`·히트맵)를 생성자 인자로 빼면 된다. 진짜 일은 한 스코프에 이어 붙인 전역을 import/export로 바꾸는 것. 54의 '리플레이 중 라이브 유지'를 위해 `world.bind(store)` 교체 메서드를 여기서 넣는다. 클라이언트 스토어(p4)는 지금 테스트가 없으니 옮기며 붙인다 | 완료(2026-11-05, 사용자 'ㄱㄱ'로 Claude가 작성 → 아래 설명 질문 통과가 조건, 2026-11-09 1차 미통과 → 다시 보기): `packages/engine/src/{types,palette,map,store,world}.ts` + `themes/*.ts`, `index.ts`. 생성은 TS AST로 최상위 선언에 `export`·다른 파일 이름에 `import`를 붙이는 스크립트로 하고(파일 간 `let` 재할당 0이라 ESM 가능), 손으로 고친 것: `World(store, canvas)`(모듈 변수 `cv`·`ctx`는 생성자에서 채움), 히트맵 캔버스·스프라이트 캔버스는 `mk`→`makeCanvas`(`setCanvasFactory`, 47에서 OffscreenCanvas), `buildIconUrls`는 `setShellInfo(dark, ink)`로 받은 값만 읽음, `TownStore({ isMe })`(UI 전역 `ME_SID`를 안 읽음), `selectedId`/`select()`/`subscribe()` 추가, 모듈 최상위 `buildAssets('cozy')` 제거(UI가 부름). 타입: 스토어·시뮬레이터·타입 파일은 제대로, 지도·월드·테마는 `any`로 느슨하게(tsc 0 오류, `strict: false`). 빌드: `build.sh`가 esbuild로 IIFE(전역 `ENGINE`) + CJS를 만들고 `p6.js` 머리에서 쓰는 이름 50개를 구조 분해, 엔진이 바꾸는 `THEME_KEY`·`TOWN_LEVEL`·`SEASON`은 `ENGINE.X`(live getter)·`set…Value`. `src/p2~p5.js`·`src/themes/*.js` 삭제. 테스트 +6(`tests/engine.test.js`: tsc 통과, DOM 없이 로드, 중복·이동·퇴장·봇·역행·만료·frozen·패턴 매핑·isMe·select·시뮬레이터). 스모크 12건·전체 86건 통과, 실시간 모드 Playwright 확인. 남은 것: `world.selected`→`store.selectedId` 이전(53), `world.bind(store)`(54), 지도·월드 `any` 줄이기 |
| 53 | 패널 React 전환 | `useSyncExternalStore` + 셀렉터로 구독. 피드 → 정보 패널 → 통계 → 설정 순서로 하나씩. `pxSelect`·`ask`·`note`·`sfx`는 컴포넌트·훅으로 | 자주 바뀌는 숫자는 250ms로 묶음. 패널마다 스모크 콘솔 오류 0. **평가(11-05)**: 가장 큰 위험. p6가 197KB, `$()` 470회, `innerHTML` 44회, 기능 섹션 35개라 전부 옮기면 주 단위. **완료 조건은 피드·정보 패널·헤더 숫자 3개**, 나머지는 선택. `pxSelect`가 시작 시 `querySelectorAll`로 감싸는 방식이라 `<PxSelect>` 컴포넌트가 선행 | 완료(2026-11-05, 축소 범위: 피드·정보 패널·헤더 숫자, 사용자 'ㄱㄱ'로 Claude가 작성 → 설명 질문 통과가 조건, 2026-11-09 1차 미통과 → 다시 보기): `packages/ui`(`@visitown/ui`, React 19.3, strict TS) `Feed`·`InfoPanel`·`HeaderStats`를 `build.sh`가 esbuild IIFE(전역 `UI`, React 포함 minify 230KB)로 묶어 `index.html`에 넣고, `p6.js`가 `UI.mount({ engine, store, world, targets, actions })`로 `#feed`·`#infoBody`·`#statsBox`에 붙인다(Next 앱은 56에서). 구독은 `useSyncExternalStore`: 선택은 스토어 알림 그대로, 세션·숫자는 250ms로 묶은 알림(`throttled`), 스토어가 모르는 변화(테마·밝기·건물·바이탈)는 `ui.refresh()`(rev), 시계·날씨·따라가기는 `ui.set()`. 피드 줄은 HTML 문자열 대신 조각 배열(글자·`{b}`·`{muted,title}`·`{rare}`·`{btn,onClick}`)이라 `esc()`·`data-*` 위임이 없어졌다(놓친 구간·기록 카드 버튼은 클로저). 선택은 `world.selected` 대신 `store.selectedId` 하나(세션 id 또는 건물 경로): 캔버스 클릭·피드 클릭·주인 입장이 `store.select`, 정보 패널·피드 강조·따라가기·월드의 선택 표시가 그 값을 읽는다. UI 패키지는 엔진을 `dist/types` d.ts로만 본다(값을 import하면 번들에 엔진이 한 벌 더 → 테스트가 막음). 테스트 +7(`tests/ui.test.js`: strict tsc, 번들에 엔진·require 없음, 피드·정보·헤더를 react-dom/server로 렌더해 HTML 페이로드가 글자로만 남는지, 피드 상한·참조 안정, throttled). 스모크 보안 테스트는 `renderInfo` 직접 호출 대신 `store.select`. 남은 것: `<PxSelect>`·`ask`·`note`·`sfx` 컴포넌트·훅과 통계·설정 패널(선택), `index.html` +228KB(React, gzip 약 70KB) |
| 54 | `useSiteStream` 훅 | cleanup으로 StrictMode 이중 연결 처리, `cancelled`로 사이트 전환 뒤 늦게 온 이벤트 버림, 에러가 나면 직접 다시 열기(지수 백오프 + `lastEventId` 쿼리) | 리플레이 중 라이브 이벤트를 버리지 않고 쌓아 두기(지금은 버림)도 여기서. **평가(11-05)**: 면접용 핵심. 주의 둘: effect 의존성에 `auth` 객체를 두면 렌더마다 재연결되니 함수 참조를 고정하거나 `siteId`만 둔다. 티켓 요청이 401이면 백오프가 아니라 토큰 갱신으로. 재접속 뼈대(티켓·백오프·`lastEventId`)는 55에서 `p6.js` `live.open/retry`에 먼저 들어갔으니 옮기기만 하면 된다 | 완료(2026-11-05, 사용자 'ㄱㄱ'로 Claude가 작성 → 설명 질문 통과가 조건, 2026-11-09 1차 미통과 → 다시 보기): `packages/ui/src/stream.ts`. 핵심은 React 없는 `createSiteStream(opts)`(티켓/임베드 키 → EventSource, 프레임마다 `lastEventId` 기억, onerror면 직접 닫고 1→2→…→30초 백오프 뒤 새 티켓 + `lastEventId`로 다시 열기, snapshot·resume이 오면 백오프 0, 티켓 401이면 백오프 대신 `auth` 상태로 멈춤, `close()` 뒤 늦게 온 티켓·프레임·onerror는 cancelled로 버림)이고, `useSiteStream(opts|null)`은 그것을 effect에 감싼 것: 의존성은 `api`·`siteId`·임베드 키뿐이고 핸들러·티켓 함수는 ref로 최신 것을 부른다(렌더마다 재연결 안 함). cleanup이 `close()`라 StrictMode 이중 effect는 연결 하나만 남기고, 사이트 전환은 cleanup + cancelled. 대시보드 셸은 `UI.mount()`가 보이지 않는 루트에 띄운 `<StreamHost>`에 `ui.stream.connect({ api, siteId, auth:{ticket}, onFrame, onStatus })`로 설정만 넣고 `live.frame(type, d)`에서 프레임을 처리한다(예전 `live.open/retry`의 EventSource·gen·backoff 코드 삭제). 티켓 함수는 401이면 토큰 갱신(`refreshIfNeeded(true)`) 한 번 뒤 재시도, 그래도 401이면 훅의 `auth` → 로그인 화면. 임베드(`components/EmbedTown.tsx`)도 같은 훅(`@visitown/ui/stream`)으로 연결하고 `shell/embed.ts`는 `createEmbedTown`으로 프레임만 그린다(엔진 청크보다 먼저 온 프레임은 큐). **리플레이 중 라이브 유지**: 리플레이는 따로 만든 `TownStore`(now=리플레이 시각)에 돌리고 `bindView(s)`가 `world.bind(s)`(엔진에 새로 넣음)·`ui.bindStore(s)`(Provider 값 교체, 패널이 새 스토어 구독)·피드 감시자를 바꾼다. 라이브 스토어는 그동안 훅이 계속 채우고(`store.expire()`도 계속), 끝내면 `bindView(라이브)` + `syncFromStore()`로 바로 현재 상태(예전엔 스냅샷을 다시 받았다 → 스모크가 `sse.snapshots===1` 확인). 리플레이 중 온 기록 갱신·알림·복구 건수 피드 줄과 발자국은 미뤘다가 돌아올 때 흘린다(`live.later/flushLater`). 테스트 +3(`tests/ui.test.js`: 가짜 EventSource로 백오프 10→20→40·lastEventId·resume 뒤 초기화, 티켓 매번 새로·401은 auth로 멈춤·다른 실패는 백오프, close 뒤 늦은 티켓·프레임·onerror 무시·StrictMode 흉내 연결 하나), 스모크 재접속 테스트에 리플레이 중 들어온 방문자가 끝낸 뒤 바로 보이고 재연결 없음 추가. 총 97건 |
| 55 | 일회용 스트림 티켓 | `POST /api/sites/:id/stream-ticket`(Authorization 헤더) → 30초짜리 티켓만 SSE URL에. 장기 토큰이 로그·기록·Referer에 남지 않게 | 서버 신규 엔드포인트. `tests/api.test.js`·`sse.test.js`, `docs/security.md` 갱신 | 완료(2026-11-05): `POST /api/sites/:id/stream-ticket`(Bearer, 멤버만) → `{ ticket, expiresIn:30 }`. 티켓은 base64url(JSON{site,user,role,exp,nonce}) + HMAC-SHA256(`STREAM_TICKET_SECRET` → `JWT_SECRET` → 프로세스 난수)이라 인스턴스 간 공유 상태가 없고, 쓴 nonce는 만료까지 기억해 일회용. 스트림은 `?ticket=` 또는 `?embed=`만 받고 `?token=`은 401(헤더 Bearer는 그대로). 대시보드 `live.open`은 티켓을 받아 열고, 끊기면 브라우저 자동 재접속 대신 새 티켓 + `lastEventId` 쿼리로 직접 다시 연다(1→2→…→30초 백오프, 사이트 전환 시 `gen`으로 늦은 티켓 버림). `docs/security.md` S-29. 테스트 +1(api: 401/403/405·재사용·위조·만료·로그 미노출), sse·limits·peers·load 스크립트는 티켓으로 전환 |
| 56 | 라우트·렌더링·CSP | `/` 정적, `/town/[slug]` 서버 렌더링 + `generateMetadata`(OG), `/app` 서버 껍데기 + 클라이언트 캔버스, `/embed/[key]` 최소 번들, `/demo`·`/design-system` 정적. 기존 `/index.html?embed=` 주소는 `rewrites`로 유지. 동적 페이지는 `proxy.ts` nonce + `'strict-dynamic'`, 정적 페이지는 인라인 스크립트를 파일로 빼거나 해시로 허용해서 `script-src 'unsafe-inline'` 제거 | 끝나면 `build.sh`·`index.html` 제거, CLAUDE.md 작업 규칙 갱신. **평가(11-05)**: 라우트·rewrite·OG는 그대로. CSP는 반만 된다: App Router는 정적 페이지에도 `self.__next_f.push` 인라인 스크립트를 넣고 nonce는 동적 렌더링에서만 붙으며 해시는 빌드마다 바뀌어 Next가 안 준다. 선택지는 전부 nonce 동적 렌더링(트래픽이 작아 비용 없음) 또는 랜딩·디자인 시스템을 `public/` 순수 HTML + 해시 CSP. `build.sh`는 디자인 시스템 페이지도 만들므로 그 재구성이 포함된다 | 완료(2026-11-05, 사용자 'ㄱㄱ'로 Claude가 작성 → 설명 질문 통과가 조건, 2026-11-09 1차 미통과 → 다시 보기): `apps/web`(Next 16.4 App Router, TS, npm workspace). 라우트 `/`(랜딩 `app/page.tsx`+`LandingClient.tsx`)·`/app`·`/demo`(대시보드: `components/DashboardShell.tsx`가 마크업 `shell/dashboard.html`을 서버에서 넣고 클라이언트 `DashboardBoot`가 `shell/dashboard.js`=예전 `p6.js`를 `boot({demo})`로 한 번 부름)·`/embed/[key]`(`shell/embed.ts`: 엔진 + 공개 키 스트림만, 대시보드 셸·React 패널 없음)·`/town/[slug]`(서버 렌더링 + `generateMetadata` OG: 마을 이름·지금 접속자 수, 없으면 404)·`/design-system`. 옛 주소: `index.html?demo=1`→`/demo`, `index.html?api=…`→`/app?…`(쿼리 유지), `/landing/`→`/`는 redirect, `index.html?embed=`·`/?embed=`는 rewrite(주소 그대로). CSP(S-03·S-24): `proxy.ts`가 요청마다 nonce → `script-src 'self' 'nonce-…' 'strict-dynamic'`, `'unsafe-inline'` 제거, 평가대로 '전부 nonce 동적 렌더링'(`layout.tsx`가 `headers()`를 읽어 모든 라우트가 동적). 임베드·공개 마을만 frame 허용, `public/legal`은 `script-src 'self'`. 분리: `src/p1.html`→`shell/dashboard.html`+`dashboard.css`+`shell.css`(build.sh가 sed로 뽑던 디자인 시스템 CSS를 파일로, 순서는 dashboard→shell, 예전 화면과 computed style 비교로 확인), `p6.js`→`dashboard.js`(boot 래핑, 임베드 분기 49곳 제거, `helpers.js`로 pxSelect·ask·note·모션 헬퍼 분리), `sfx.js`→ESM, `ds.html`→`ds.html`+`ds.js`+`ds.css`, `landing/index.html`→React. 엔진·UI는 TS 소스를 Next가 직접 묶고(패키지 `exports.import`), dist는 테스트용(`npm run build:packages`). 잠복 버그 2건 수정(52·53 잔재: 이벤트 설정 패널의 `EV_CFG` 미정의, 통계 모달 '지금' 탭의 `propTags` 미정의 → 열면 ReferenceError). 테스트 94건(스모크 13: `next start`로 열어 콘솔 오류·CSP 위반 0, 헤더·redirect·rewrite, 임베드·공개 마을 추가), CI `npm run build`. 측정(`/demo`, Playwright CDP 10초): 60.1fps·p95 16.7ms·긴 작업 0·메인 스레드 12%(이전 10.6%). 첫 JS+CSS gzip: `/demo` 269KB(이전 index.html 258KB: Next 런타임+react-dom 108KB가 더해지고 대시보드 셸은 한 청크 53KB), `/embed` 211KB(엔진 73KB + Next·react-dom 108KB: 패널이 없는 만큼 58KB 작지만 react-dom은 Next 라우트라 안 빠진다), `/design-system` 152KB. **남은 것**: `src/`·`landing/`·`build.sh`·`index.html`·`design-system/`·`vercel.json`·`.vercelignore` 삭제(커밋 안 된 52~59 변경이 그 파일들에 있어 Claude가 지우지 않았다. 커밋 뒤 `git rm -r src landing build.sh index.html design-system vercel.json .vercelignore`), Vercel 프로젝트 Root Directory `apps/web` + 환경변수 `NEXT_PUBLIC_VT_API`·`NEXT_PUBLIC_VT_SITE`·`NEXT_PUBLIC_VT_EMBED`, Supabase OAuth redirect URL에 `/app`, 수집 서버 `DASHBOARD_URL` 기본값(`https://visitown.vercel.app`) 배포, 임베드를 react-dom 없이 더 줄이려면 `public/` 순수 HTML(선택) |
| 57 | 캔버스 접근성 | 스크린리더용 aria-live 피드 요약, 키보드로 캐릭터·건물 순회(선택 = `selectedId`), `prefers-reduced-motion` | 53 뒤. axe 점검 결과를 수치로. **평가(11-05)**: `p1.html`에 aria 속성이 이미 58개라 점수는 거의 공짜. 캔버스 순회는 `World.hit()`+`selectedId`. aria-live는 초당 여러 번 갱신되는 피드에 바로 붙이면 스크린리더가 넘치니 30초 요약으로 묶는다. S | 완료(2026-11-09, 사용자 'ㄱㄱ'로 Claude가 작성 → 설명 질문 통과가 조건, 2026-11-09 1차 미통과 → 다시 보기): **axe-core 4.11 위반 0**(기준: `/demo` 4규칙 12노드 + 통계 모달 critical 1·도감 nested-interactive 9, `/app` 3, `/` 6, `/design-system` 0 → 전부 0. 스모크가 `/demo` 밝게·어둡게·통계·도감, `/app`, `/`, `/design-system`, `/embed`, `/town`을 `page.evaluate(axe)`로 재서 0을 지킨다). 고친 것: (1) 색 토큰 — 밝은 `--ink-2` `#7d6d76`→`#6b5b64`(패널 안 4.1→5.4:1), 다크 `--gold` `#8a6a22`→`#755818`(글자 4.07→5.37), 새 토큰 `--danger-ink`(빨간 글자용, 밝음 `#b32d40`·다크 `#e87684`; `--danger`는 점·테두리만), 금색 태그 글자는 `--ink`, `opacity`로 흐리게 하던 글자(피드 sys 줄·통계 '?' 줄·도감 없는 건물·경로 off)는 `--ink-2` 색으로(이미지만 흐리게); (2) 구조 — `#main`은 `<main>`, 헤더에 숨긴 `<h1>`, 진입 화면은 `<section aria-label>`, 랜딩·공개 마을도 `<main>`(랜딩 특징 h3→h2), 패널 제목 h3→h2·블록 h4→h3(heading-order), 탭 버튼 묶음의 잘못된 `role=tablist` 제거(aria-pressed 버튼이 맞다), 도감 카드의 `role=button tabindex` 제거(안에 버튼이 있어 nested-interactive) → 표지가 버튼, 임베드 뿌리는 `role=region`, 임베드 브랜드 배지는 opacity 대신 불투명 글자. (3) **키보드 순회**: `#stage`가 `role=application`(+`aria-describedby` 설명)이라 포커스가 오면 화살표가 스크린리더 대신 셸로 간다. ← → 방문자(`world.chars` 순서), ↑ ↓ 건물(`BUILDINGS` 순서), Enter 따라가기 토글, Esc 선택 해제. 선택은 클릭과 같은 `view.select` 한 길이라 정보 패널(`aria-live`)이 읽어 준다. KEYS 표에 추가. (4) **aria-live 피드 요약**: `packages/ui/src/Summary.tsx`의 `<FeedSummary>`가 피드 스토어 구독으로 줄을 종류별(입장·떠남·이동·이벤트·끊김·봇·알림)로 세어 30초마다 한 문장("지난 30초: 입장 2명, … 지금 접속자 N명.")을 숨긴 `#feedLive`(`role=status`, polite, atomic)에 넣는다. 조용한 구간은 말하지 않고 `ui.announce()`로 바로 읽힐 수 있다. (5) **동작 줄이기**: CSS는 전역 규칙 그대로, 캔버스는 엔진 `World.reduceMotion`(셸·임베드가 `matchMedia`로 넣고 변경을 따름) — 파티클·빗줄기·눈·까딱이는 선택 화살표·퍼널의 흐르는 점을 끄고 확대는 보간 없이 바로. 캐릭터 걸음은 내용이라 남긴다. 테스트 +2(`tests/ui.test.js` 요약 세기·문장·SSR 빈 출력, `tests/smoke.test.js` 접근성: axe 0·키보드 순회·요약·`reducedMotion:'reduce'` 컨텍스트에서 파티클 0), 임베드·공개 마을 테스트에 axe 추가. 총 99건. axe의 한계 하나: 임베드 건물 이름표(`.labels`)는 `pointer-events:none`+투명 body라 axe가 바탕을 흰색으로 보고 1:1로 계산해 검사에서 제외했다(실제는 캔버스 위 78% 어두운 바탕). 남은 것: 스크린리더 실기기(NVDA·VoiceOver) 확인은 못 했다 |
| 58 | 탭 간 연결 공유 | Web Locks로 대표 탭 하나만 SSE를 열고 `BroadcastChannel`로 나눠 줌. 대표 탭이 닫히면 다른 탭이 이어받음. HTTP/1.1 같은 출처 6연결 제한 대응 | 선택. 서버 HTTP/2 여부를 먼저 확인. **평가(11-05)**: Fly 프록시가 브라우저엔 HTTP/2로 응답해 운영에선 6연결 제한이 없다. 로컬 개발에서만 생기는 문제에 리더 선출·상태 동기화 버그를 사는 셈 | 제외 |
| 59 | 놓친 구간 안내 | 스냅샷으로 복구됐을 때 피드에 "N분 동안 M명이 다녀갔어요 [리플레이로 보기]", 서버 기록 리플레이로 연결 | 54 뒤. S. **평가(11-05)**: 54를 기다릴 필요 없음. 서버 snapshot/resume 구분, `events?from&to`, `startReplay`가 다 있어 지금 `p6.js`에서 끝난다 | 완료(2026-11-05): `live.downAt`에 끊긴 시각을 두고(onerror·티켓 실패), 다시 붙었을 때 `resume`이면 지우고 `snapshot`이면 `live.missedGap(끊긴 시각, 지금)`. 서버 기록 `events?from&to`(24시간으로 잘라)에서 봇·메모를 뺀 세션 수를 세어 피드에 "연결이 끊긴 N분 동안 M명이 다녀갔어요 [리플레이로 보기]"(0명이면 버튼 없이), 버튼은 `startReplay({from,to})`로 그 구간 서버 기록 리플레이(라벨 "놓친 구간 HH:MM~HH:MM"). 1분 미만·임베드는 조용히 넘긴다. 검증: Playwright로 `SSE_BUFFER=2` 서버에 오프라인 65초 동안 세션 3개를 넣고 복구 → 피드 줄·버튼 → 리플레이 이벤트 수 확인 |

측정(이력서 숫자)은 `docs/migration.md` 8절 표에 적는다: 이전 전 / Next 이전 후 / Worker 후의 fps·프레임 p95·긴 작업·메인 스레드 점유·첫 JS 크기.

### 영어 지원·레딧 공개 (2026-11-09)

목표는 레딧(r/SideProject·r/webdev Showoff Saturday 등)에 링크 하나로 올릴 수 있게 하는 것. 순서: 42 공개 → 60 → 61 → 게시.

| # | 제안 | 내용 | 비고 | 상태 |
| --- | --- | --- | --- | --- |
| 60 | 영어 지원(i18n) | 랜딩·`/town`·임베드 브랜드, 대시보드 전체(`/demo`=`/app` 셸: 헤더·하단 바·메뉴·피드·정보·통계·도감·설정·사이트 추가·설치 안내), 엔진 테마·건물·캐릭터 이름, SDK 미니 위젯, 약관·개인정보처리방침 영어판. 주소는 그대로(`/en` 접두어 없음 — 임베드 주소가 공개 계약), 브라우저 언어로 자동(ko면 ko, 나머지 en) + 토글 `vt_lang`. 사전 하나를 셸(바닐라 `t(key, vars)`)·React 패널·Next 페이지가 같이 쓰고, 엔진은 DOM을 모르게 `setLocale`로 표시 이름만 받는다. 조사(이/가·을/를)를 붙이던 문장은 언어별 문장 템플릿으로. 서버 오류는 원래 영어라 en이면 `errText` 번역을 건너뜀 | 화면 문자열 약 1,300개(셸 930·엔진 260·서버 50·패널·랜딩·SDK 100). 뒤로 미룸: 웹훅 알림·아침 요약(사이트별 언어 설정 필요), `/design-system`. 검증: 스모크를 en으로도 돌려 콘솔 오류·CSP·axe 0, 화면에 한글이 남지 않았는지 자동 검사. M~L(2~3일) | 완료(2026-11-09, 사용자 'ㄱㄱ'로 Claude가 작성): `packages/i18n`(`L`/`tr`/`pickLocale`/`josaAfter`/`intlLocale`, 사전 `src/en.ts` 1,033키). 한글 문자열은 TS AST 코드모드로 `L()`/`T()`로 감쌌다(셸 458·엔진 323·효과음 46·패널·페이지). 서버는 `lib/locale.ts`(`requestLocale`·`serverT`·`translateHtml`·`legalHref`), `<html lang>`·`generateMetadata`. 토글은 보기 메뉴 "언어"·랜딩 하단(쿠키 `vt_lang` + 새로고침). 서버 오류·해금 문구는 대시보드가 사전으로 번역(`errText`), README 배지 `?lang=en`, SDK 위젯은 사이트 `<html lang>`(gzip 7,165B, 예산 안). 약관·개인정보처리방침은 원래 한·영 두 언어라 `?lang=`만. 번역은 서브에이전트 4개가 가이드(자리표시·HTML·복수형 `{n:a|b}`·조사 자리)로. 테스트 +4(`tests/i18n.test.js` 3: 키 누락·자리표시·태그·한글 잔여·언어 고르기, 스모크 1: en으로 `/`·`/app`·`/demo` 통계·도감·피드 요약에 한글 0·axe 0·토글). 남은 것: 웹훅 알림·아침 요약·이상 감지 문장(서버, 숫자가 섞여 사전으로 안 됨), `/design-system`, 약관 영어 부분이 한국어판과 다른 곳 몇 군데(§5·§10·§14, 개인정보 §1·§4.3·§6·§7·§8.1 — 한국어판이 우선) |
| 61 | 레딧 트래픽 대비 | 2026-11-09: Fly `[env]`에 `MAX_SSE_PER_SITE=1000`·`SITE_EVENTS_PER_MIN=20000`(방문자 1명 ≈ 분당 4~5건), 메모리 상시 512MB(`server/fly.toml`). 랜딩 마을이 처음 연결에 두 번 실패하면(503 상한·서버 다운) `/embed`가 같은 출처 부모에 `postMessage({vt:"embed-down"})`를 보내고 랜딩이 데모 마을(`/demo`)로 바꾼다(스모크 테스트). 남은 것: Supabase 무료 한도(DB 500MB·요청 수)는 게시 뒤 대시보드에서 확인 | 홍보 포인트: SDK가 쿠키를 안 쓰고(sessionStorage), IP를 저장하지 않고 나라 코드만 남긴다. S | 완료 |

## 기존에 남아 있던 것

- ~~Vercel 배포~~ 완료(2026-10-27): 대시보드는 https://visitown.vercel.app (GitHub main 푸시마다 자동, `.vercelignore`로 정적 파일만). 수집 서버는 아직 이 PC + Tailscale Funnel. Fly.io 이전은 PC 꺼짐이 문제될 때
- ~~일별 집계(`page_daily`)와 정리 작업~~ 완료(2026-10-27): `docs/supabase.sql`의 `vt_rollup`/`vt_prune` 함수를 서버가 켜지고 2분 뒤·매시간 부른다(`server/maintenance.js`, 수동 `node server/rollup.js [일수]`). 원본은 `EVENT_RETENTION_DAYS`(기본 7일)만 두고 집계는 무기한, 하루 경계는 `ROLLUP_TZ`(기본 Asia/Seoul). `GET /api/sites/:id/daily?days=30`이 추이 탭 재료. **SQL Editor에서 함수 생성을 한 번 실행해야 돈다**(그 전까지는 건너뛰고 경고만)
- 네이티브 앱(WebView 아닌) 추적 SDK는 필요해질 때

## 테마 해금 (2026-10-28 완료)

포근 마을만 기본으로 열고 나머지 9개는 사이트에 실제로 일어난 일로 연다. 작은 사이트도 몇 주 안에 대부분 열리게 '처음 일어난 일'·누적만 쓰고 연속 조건은 없다. 사람 방문만 센다(봇·주인 본인 `vt_me` 제외). 시각·날짜는 `ROLLUP_TZ`(기본 Asia/Seoul).

| 테마 | 조건 |
| --- | --- |
| 오피스 | 평일 9~18시에 방문자 3명(누적) |
| 한옥 장터 | 한국 방문자 1명 |
| 과자 마을 | 한 방문자가 서로 다른 페이지 3곳 |
| 숲속 | 다시 찾아온 방문자 1명(새 세션의 첫 `session_start`만. SDK는 페이지를 불러올 때마다 `returning`을 다시 계산한다) |
| RPG | 한 방문자가 5분 이상 머묾 |
| 사이버펑크 | 자정~새벽 5시에 방문자 1명 |
| 서부 | 나라 2곳 |
| 농장 | 방문자가 있었던 날 7일(누적) |
| 우주 정거장 | 나라 3곳 |

- 서버 `server/unlocks.js`: 이벤트를 받을 때마다 진행도(나라·날짜·횟수)를 올리고, 새로 열리면 SSE `unlocks`(`opened` 포함). 스냅샷에 `unlocks`. 상태는 `sites.unlocks`(jsonb, 마이그레이션 필요)에 10초마다 바뀐 것만 저장. 원본 이벤트는 7일 뒤 지워지므로 진행도도 같이 둔다. 처음 상태가 없는 사이트는 남은 `events`와 `page_daily`(60일)로 채운다.
- 탈출구: 사이트를 만든 지 14일마다 선물 하나. 잠긴 테마 중 골라 연다(`POST /api/sites/:id/unlocks { theme }`, 주인·editor). 해외 손님이 안 오는 사이트도 결국 다 열린다.
- 대시보드: 테마 드롭다운에 잠긴 테마를 흐리게 + 진행도(`서부 · 1/2`). 잠긴 테마를 고르거나 숫자 키로 부르면 바꾸지 않고 도감 **테마** 탭을 열어 그 칸을 강조하고, T는 열린 테마만 돈다. 도감 테마 탭: 테마별 조건·진행 막대·열린 날짜, 선물 개수와 다음 선물 날짜, 선물로 열기(주인·editor, 확인창). 새로 열리면 피드 줄 + 데스크톱 알림 + 드롭다운 버튼 금색 깜빡임. 원하는 테마(`vt_theme`, 임베드 `theme=`)가 잠겨 있으면 포근 마을로 보여 주다가 열리면 바꾼다. 임베드 설정의 테마 목록도 잠긴 건 고를 수 없음. 데모와 해금 정보를 안 주는 예전 서버는 전부 열림 도감은 **테마**(대표 건물 표지 목록 → 누르면 그 테마의 캐릭터·건물 상세) · **표식** · **나라** 세 탭으로 정리했다(예전 캐릭터·건물 탭은 테마 상세로 합침)
- 업적 배지(테마 없이 도감 전시)는 따로 고민 중

## 개인정보처리방침·이용약관 (2026-10-28 초안 완료)

`legal/privacy.html`·`legal/terms.html`(한국어·영어 전환, 공통 `legal.css`/`legal.js`). 방문자 데이터는 고객이 컨트롤러·Visitown이 프로세서, 계정 데이터는 Visitown이 컨트롤러로 역할을 나누고, 수집 항목·보관(원본 7일)·수탁자·국외 이전·지역별 권리(GDPR·UK·CCPA/CPRA·개인정보보호법·LGPD)·아동을 적었다. 약관 6절이 GDPR 28조식 데이터 처리 조항(DPA)이라 별도 서명 없이도 고객과의 처리 계약이 된다. 진입 화면 하단에 링크, 설치 가이드에 "방문자 고지" 탭(고객 사이트 방침에 붙여 넣을 한·영 문구 + 동의 연동 안내 + AI 프롬프트)을 넣었다.

- 남은 일: 노란 빈칸(운영자명·연락처·보호책임자·Supabase 리전·수집 서버 호스팅·GeoIP 사용 여부·EU 대리인) 채우기, 법률 검토. ~~계정 삭제 기능~~ 완료(2026-11-02): 설정 메뉴 "계정 삭제" → `DELETE /api/account`(소유 사이트 연쇄 삭제 → 멤버 자격 → Auth 사용자), 방침 4.3절 반영. 커스텀 이벤트 속성의 이메일·전화번호 패턴을 서버에서 마스킹하면 약관 4절 약속을 코드로도 받칠 수 있다.

## 멤버 초대 (2026-10-27 완료)

같은 사이트를 여러 사람이 보는 기능. 주인이 보기용·편집용 초대 링크(7일)를 만들고, 받은 사람이 GitHub 로그인 뒤 참여한다. 서버 `site_members`/`site_invites`(마이그레이션 `docs/supabase.sql` 맨 아래), 역할별 API 403, 대시보드 멤버 패널·초대 확인 화면·역할 배지. 자세한 건 README "멤버 초대". 다음 후보: 멤버 수를 팀 플랜 과금 축으로, 초대 링크 대신 GitHub 아이디로 직접 초대.

## 디자인 시스템 페이지 (2026-10-28 시작)

`/design-system`(`apps/web/shell/ds.html`·`ds.js`·`ds.css`). 대시보드의 색 토큰·모션·버튼·체크박스·태그·드롭다운·확인창 CSS는 `build.sh`가 `p1.html`에서, `pxSelect`·`ask`/`note`·`showEl`/`hideEl`/`pop`/`say`·`errText`는 `p6.js`에서 그대로 뽑아 끼우고(복사본 없음), 화면은 `#/이름` 해시 라우터로 나눈다(`ROUTES`에 추가하면 목차에 붙음).

| 페이지 | 내용 | 상태 |
| --- | --- | --- |
| 사운드 | 효과음 엔진 `src/sfx.js`(`SOUNDS`/`synth`, 펄스·삼각·노이즈, 미끄러짐, gap)를 대시보드와 같이 쓴다. 듣기·키보드·몰림 테스트·오실로스코프·JSON 편집기 | 완료 |
| 효과음 전면 적용 | 예전 `beep` 대신 `synth`. 입장·봇·퇴장, 버튼·드롭다운·체크박스, 패널·확인창 열고 닫기, 저장·실패, 지우기 확인, 사진·영상 저장, 테마 해금. 여전히 하단 '소리'를 켜야 들리고, 방문자 소리는 리플레이 중 무음. `enter2`(펄스 입장)는 후보로만 | 완료 |
| 버튼 | 종류(기본·primary·pink·gold·disabled)와 쓰임, aria-pressed, `.group`, 링크 버튼, 체크박스(`label.toggle`), 태그·kbd. 예시 HTML이 곧 복사용 코드 | 완료 |
| 드롭다운 | 네이티브 select → `pxSelect` 예시(기본·`data-img`·disabled·`data-locked`·꺼짐·긴 목록), `pxs-refresh`, 테스트용 selectedIndex+change, 해금 강조 | 완료 |
| 확인창 | `ask`(danger·일반)·`note`를 실제로 띄워 결과 확인, 패널 상태 문구 `say`, `errText` 변환표(그 자리에서 실행) | 완료 |
| 색 | `:root`·다크 블록을 스타일시트에서 직접 읽어 밝게·어둡게 나란히, 쓰임 설명, 글자 대비(4.5 미만 빨강), 누르면 `var(--이름)` 복사, 서체 | 완료 |
| 효과음 다듬기 | 18개를 한 세트로: 음은 전부 C 장5음계(enter E5→A5, coin C6→E6, open/close D4↔A5 등), 등급(`tier`) ui/visit/accent별 RMS -38/-33/-28dBFS(±2dB, 등급 간 5dB)로 `synth.render`(OfflineAudioContext)로 재서 맞춤, 길이 ui≤60ms·visit≤250ms, 자주 나는 소리는 `lp` 필터로 2kHz 위 배음 줄임, 렌더 블록 경계에서 나던 '딱' 소리(게인 기본값 1) 수정. 측정 스크립트는 세션 scratchpad에만 | 완료(최종 청취는 사용자) |
| 배경음 | `bgm`(`src/sfx.js`, 정의 `TRACKS`): 대시보드 연결 완료(2026-11-02, 보기 메뉴 "배경음" 끔·BGM·환경음 + 크기, 낮·밤·비 자동, `vt_bgm`). 낮·밤 BGM(8마디 IV–V–iii–vi / I–iii–IV–iv, 84/72 BPM, pulse12 아르페지오+삼각파 베이스+하이햇, 시드 난수로 64마디 주기)과 환경음 3개(낮 바람+새, 밤 귀뚜라미+바람, 비+물방울). 25ms 타이머로 0.1초 lookahead 예약, 0.7초 페이드, RMS는 UI 효과음보다 10dB 넘게 아래. `#/bgm` 페이지(재생/정지·크기·낮/밤·오실로스코프·마디 표시). 대시보드 연결은 사용자가 들어 보고 고른 뒤 | 완료(대시보드 연결은 할 일) |
