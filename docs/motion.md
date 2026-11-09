# 모션·모서리 규칙

대시보드 UI의 움직임은 전부 `apps/web/shell/shell.css`의 `/* ---- 모션 ---- */` 블록에 모여 있고, JS 쪽은 `apps/web/shell/helpers.js`의 네 헬퍼(`showEl`, `hideEl`, `pop`, `say`)만 쓴다. 캔버스 안의 효과(말풍선·플래시·파티클)는 `p5.js`가 따로 그리므로 이 문서의 대상이 아니다.

## 원칙

- **짧고 한 방향.** 픽셀 UI라 튕기거나 늘어지는 이징은 쓰지 않는다. `ease-out`으로 들어오고 `ease-in`으로 나간다.
- **시간은 토큰 셋 중 하나.** `--t-fast .08s`(누름·호버), `--t-ui .15s`(열림·닫힘·페이드·탭), `--t-slow .25s`(강조·새 항목·플래시). 이 밖의 값은 리플레이 바(.2s/.18s)뿐이다.
- **transform·opacity·background만 움직인다.** width·height·top을 애니메이션하지 않는다(레이아웃 다시 계산 없음, 피드처럼 자주 생기는 요소도 가볍다).
- **동작 줄이기 존중.** `prefers-reduced-motion: reduce`면 전역 규칙이 모든 animation·transition을 0.01ms로 줄인다. 새 효과를 넣어도 따로 처리할 필요 없다. 캔버스는 CSS가 못 미치므로 엔진 `World.reduceMotion`(셸·임베드가 `matchMedia`로 넣는다)이 파티클·빗줄기·눈·까딱이는 선택 화살표·퍼널의 흐르는 점을 끄고, 확대(`zoomTo`)는 보간 없이 바로 간다. 캐릭터 걸음은 내용이라 남긴다. 캔버스에 새 꾸밈 움직임을 넣으면 `reduceMotion` 가드를 같이 넣는다(로드맵 57).
- **흐린 글자는 opacity가 아니라 색.** 덜 중요한 글자는 `opacity`로 흐리게 하지 않고 `--ink-2`로 쓴다(opacity는 바탕과 섞여 대비 4.5:1 아래로 떨어진다, axe color-contrast). 이미지·막대만 흐리게 해도 된다.
- **표시·숨김은 `hidden` 속성 그대로.** 열림 애니메이션은 CSS만으로 되고(display none → 보임 전환 때 animation이 다시 시작), 닫힘 애니메이션이 필요하면 `hidden=true` 대신 `hideEl(el)`을 쓴다.

## 어떤 상황에 어떤 효과

| 상황 | 효과 | 쓰는 것 |
| --- | --- | --- |
| 버튼·드롭다운 버튼 | 호버 1px 떠오름(그림자 +1), 누르면 2px 내려감, 선택 상태(`aria-pressed`)는 내려간 채 고정 | `.btn`, `.pxs-btn` 전환 `--t-fast` |
| 체크박스 | 체크 시 안쪽 사각형이 `popIn`, 누르면 1px 내려감 | `input[type=checkbox]` |
| 하단 메뉴(데모·보기·화면·설정) | 드롭다운 목록과 같은 `pxsInUp`/`pxsOut`, 화살표 회전 | `.menu-list`, `showEl`/`hideEl` |
| 드롭다운 목록 | 버튼 바로 아래서 `scaleY(.92)`로 펴짐(위로 열리면 반대), 닫힐 때 짧게 접힘, 화살표 180° 회전 | `.pxs-list`, `.pxs-list.up`, `.pxs-list.out` |
| 모달 패널(건물 설정·사이트 목록·설치 안내) | 배경 `fadeIn` + 상자 `popIn`(4px 위로 + 0.96→1). 닫을 때 역방향 | `#sitePanel`, `showEl`/`hideEl` |
| 확인창(지우기 확인·실패 알림). 기본 `alert`·`confirm` 대신 | 모달 패널과 같은 배경 `fadeIn` + 상자 `popIn`, 모달 패널 위에 뜬다. 위험한 동작은 확인 버튼이 분홍 | `ask(text,{ok,danger})`·`note(text)` → `#dlg` |
| 떠 있는 작은 패널(연결 설정, 무이벤트 경고 배너) | `popIn`/`popOut` | `#connPanel`, `#warnBar`, `showEl`/`hideEl` |
| 화면 아래서 나오는 바(리플레이) | 12px 아래서 `riseIn`, 나갈 때 `sinkOut` | `#replayBar` |
| 탭 내용 전환 | 내용 `fadeIn`만. 슬라이드는 쓰지 않는다 | `#bsTabB`, `#bsTabP` |
| 패널 안 접는 영역 펼치기·접기 | 펼칠 때 `fadeIn` + 가장 가까운 위치로 부드럽게 스크롤, 접을 때 `hideEl`(`fadeOut`) | `#etGuide`(이벤트 설정 "코드 넣는 법") |
| 목록에 새 줄(라이브 피드) | 위에서 6px 내려오며 노란 배경이 가라앉음(`feedIn`) | `#feed li` |
| 숫자가 바뀜(접속자·봇·이벤트) | 1.35배 커졌다 돌아오는 `bump`. 마을 시간처럼 계속 바뀌는 값에는 쓰지 않는다 | `pop(el,'bump')` |
| 테마가 새로 열림(해금) | 테마 드롭다운 버튼 배경이 금색으로 세 번 깜빡(`unlockGlow`) + 피드 줄. 도감 테마 탭에서 잠긴 테마를 골라 들어오면 그 칸이 `rowHit` 두 번 | `pop(btn,'unlocked')`, `.dx-t.hit` |
| 안내·상태 문구 교체("저장했어요", 경로 테스트 결과) | 문구 `fadeIn` | `say(el, text)` |
| 내용 통째 교체(정보 패널, 빈 화면 안내, 경고 상자) | 새 노드가 `fadeIn` | `#infoBody>*`(React 정보 패널은 선택이 바뀔 때만 `key`로 새 노드, 1초 갱신은 제자리), `#empty>div`, `#bsWarn` |
| 큰 장면 전환(테마 바꾸기, 사진 찍기) | 흰 플래시가 0.85→0으로 빠지며 교체를 덮음 | `pop($('town'),'flash')` |
| 위험한 동작 버튼(삭제) | 호버 시 배경이 분홍(`--accent-2`)으로 | `.del:hover` |
| 리플레이 메모 눈금 | 슬라이더 위 금색 네모가 `popIn`으로 나타나고 호버 시 분홍. 누르면 그 시각으로 탐색 | `#rpTicks b`(`drawNoteTicks`) |

## 쓰지 않는 것

- 무한 반복 애니메이션은 연결 상태 점(`.dot` blink) 하나뿐이다. 주의를 계속 끄는 효과는 추가하지 않는다.
- 스크롤 연동, 패럴랙스, 0.3초 넘는 전환, 흔들림(shake), 바운스 이징.
- 레이아웃 속성 애니메이션(height 접기 등). 접고 펼치기가 필요하면 `hidden` 토글 + `fadeIn`으로 한다. 유일한 예외는 모달 안 탭 전환(통계 지금↔오늘, 도감 캐릭터↔건물↔나라)이다: 내용이 바뀌는 순간 상자가 확 줄었다 커지는 게 더 거슬려서, 전환 때만 높이를 고정했다가 새 자연 높이로 `--t-slow` 동안 옮긴다(`morphSwap`). 줄어드는 경우 `scrollHeight`는 고정 높이를 돌려주므로 `height:auto`로 잠깐 재고 다시 고정한 뒤 전환한다.

## 새 요소에 넣을 때

1. 위 표에서 가장 가까운 상황을 고르고 같은 키프레임·토큰을 쓴다. 새 키프레임은 표에 새 상황이 생길 때만 추가한다.
2. 열림만 필요하면 CSS `animation` 한 줄. 닫힘도 필요하면 `.out` 규칙을 짝으로 두고 JS에서 `hideEl`.
3. 한 번 재생하는 강조 효과는 `pop(el, 클래스)`로 재생한다(클래스를 지웠다 다시 붙여 재시작).
4. 확인은 Playwright에서 `getComputedStyle(el).animationName`과 `hidden` 값으로 한다(`scratchpad/wt/motion_test.py` 참고).

## 모서리: 픽셀 노치

둥근 모서리(`border-radius`)는 쓰지 않는다. 곡선은 안티앨리어싱이 생겨 도트 스프라이트와 따로 논다. 대신 테두리 2px 요소의 네 모서리 픽셀을 2px씩 깎는다(스타듀밸리·언더테일식). 규칙은 `apps/web/shell/shell.css`의 `/* ---- 모서리 ---- */` 블록 하나다.

- **원리.** `clip-path: polygon(...)`으로 요소와 그림자를 한 덩어리로 깎는다. 그림자 오프셋은 CSS 변수 `--sx`/`--sy`(기본 0)로 알려 준다. 다각형 좌표가 `calc(100% + var(--sx))`처럼 상자 밖까지 뻗어 있어 `box-shadow`가 잘리지 않는다.
- **새 요소에 넣을 때.** 그 블록의 선택자 목록에 추가하고, 그림자가 있으면 `--sx`/`--sy`를 `box-shadow` 오프셋과 같은 값으로 둔다(`0 3px 0` → `--sy:3px`, `3px 3px 0` → `--sx:3px;--sy:3px`). 호버·누름에서 그림자가 바뀌면 그 상태에도 같이 바꾼다(`.btn`이 예시). `clip-path`는 transition 목록에 넣어야 그림자 변화와 같이 움직인다.
- **포커스 링.** 바깥 outline은 잘리므로 `outline-offset`을 음수로 두어 안쪽에 그린다(버튼 3px/-5px, 체크박스·입력칸 2px/-4px).
- **예외.** 캔버스 위 건물 이름표(`.label`)는 배율에 따라 커지는 반투명 라벨이라 1px 라운드를 유지한다. 1px 테두리 `.tag`는 깎을 픽셀이 없어 그대로 둔다.
