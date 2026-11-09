# Next.js + TS 이전 계획 (2026-11-05)

대시보드(`src/p1.html` + `packages/engine` 번들 + `sfx.js` + `p6.js` → `build.sh` → `index.html`)를 Next.js App Router + TypeScript 모노레포로 옮긴다. **2026-11-05 로드맵 56으로 `apps/web`이 생겼다**(아래 각 절의 '구현' 메모). 목표는 기능 추가가 아니라 **같은 기능을 설명 가능한 구조로** 다시 세우는 것. 이후 순서는 Worker 렌더(로드맵 47) → 캔버스 접근성.

## 1. 저장소 구조

```
apps/web          Next 16 (랜딩·대시보드·임베드·공개 마을·디자인 시스템)
apps/demo-site    지금의 demo-site (추적당하는 가짜 쇼핑몰)
packages/types    이벤트·스냅샷·SSE 프레임 타입. SDK·서버·웹이 같이 쓴다
packages/sdk      지금의 sdk/ (gzip 7KiB 예산 유지)
packages/engine   캔버스 엔진(World·캐릭터·카메라·테마). React를 모른다
server            수집 서버 (그대로, 타입만 packages/types에서)
```

- 도구: npm workspaces. Turborepo는 빌드가 느려지면 넣는다.
- 왜 모노레포: 지금 `sdk/visitown.d.ts`와 서버 검증과 대시보드 파싱이 이벤트 모양을 각자 안다. `packages/types` 하나로 모으면 SDK 공개 API가 바뀔 때 대시보드·서버에서 타입 오류로 잡힌다.
- Vercel은 앱마다 프로젝트를 따로 두고 Root Directory를 `apps/web`·`apps/demo-site`로.
- **구현(2026-11-05, 로드맵 56)**: `apps/web`(Next 16.4)이 생겼다. `demo-site/`는 아직 workspace 밖(Next 14·React 18). `packages/types`·`packages/sdk`는 남음(51).
- `packages/engine`을 React와 분리하는 이유: 2단계에서 엔진을 통째로 Worker로 옮기기 위해. 엔진이 React·DOM을 import하면 옮길 수 없다.

## 2. 엔진과 React의 경계

**데이터의 주인은 바깥 스토어**(`packages/engine`의 `createSiteStore`). SSE는 스토어에만 쓰고, 엔진과 React는 둘 다 구독만 한다.

| 무엇 | 어디에 | 왜 |
| --- | --- | --- |
| 세션·피드·집계·선택된 캐릭터 id·테마 | 스토어 | 엔진과 패널이 같이 본다 |
| 캐릭터 좌표·카메라·애니메이션 프레임 | 엔진 내부만 | 매 프레임 바뀜. 스토어나 React에 두면 초당 60번 리렌더 |
| 모달 열림·입력값 | React `useState` | 그 컴포넌트만 안다 |

- React → 엔진(명령): 엔진 인스턴스를 `useRef`로 들고 `EngineContext`로 내린다. `engine.focus(id)`, `engine.zoomTo(z)`, `engine.snapshot()`(사진). 명령은 스토어에 넣지 않는다. "카메라를 그쪽으로"는 상태가 아니라 한 번 일어나는 일이라서.
- 엔진 → React(알림): 캔버스 클릭은 엔진이 좌표로 판정하고 결과를 **스토어의 `selectedId`에 쓴다.** 피드 항목 클릭도 같은 값을 쓴다. 정보 패널과 따라가기는 `selectedId` 하나만 보므로 두 입력 경로가 갈라지지 않는다.
- 구독: React는 `useSyncExternalStore` + 셀렉터. 헤더는 접속자 수만, 피드는 피드만 받는다. 초당 여러 번 바뀌는 숫자(접속자 수 등)는 스토어에서 250ms로 묶어 내보낸다.
- **구현(2026-11-05, 로드맵 53)**: `selectedId`는 문자열 하나로 세션 id(`sess_…`·`bot_…`) 또는 건물 경로(`/products`)를 담는다. 정보 패널은 `BY_PATH.has(id)`면 건물, `world.chars.get(id)`가 있으면 캐릭터, 둘 다 없으면 "떠났어요". 피드는 엔진 스토어가 아니라 `packages/ui`의 피드 스토어(`createFeedStore`, 조각 배열)에 두고, 셸(`p6.js`)이 문장을 만든다(UI 문구는 엔진 밖). 250ms 묶음은 스토어가 아니라 구독 쪽(`throttled(subscribe)`)에서 한다. 스토어가 모르는 변화(테마·밝기·건물 목록·바이탈)는 `ui.refresh()`로 rev를 올려 다시 그린다.

```ts
// packages/engine/store.ts (뼈대)
type Listener = () => void;
export function createSiteStore() {
  let state: SiteState = emptyState();
  const subs = new Set<Listener>();
  return {
    get: () => state,
    subscribe: (fn: Listener) => (subs.add(fn), () => subs.delete(fn)),
    apply(ev: VtEvent) { state = reduce(state, ev); subs.forEach(f => f()); },
    reset() { state = emptyState(); subs.forEach(f => f()); },
    select(id: string | null) { state = { ...state, selectedId: id }; subs.forEach(f => f()); },
  };
}

// apps/web/lib/useSite.ts
export function useSite<T>(sel: (s: SiteState) => T): T {
  const store = useContext(StoreContext);
  return useSyncExternalStore(store.subscribe, () => sel(store.get()), () => sel(emptyState()));
}
```

셀렉터가 매번 새 객체·배열을 만들면 무한 리렌더가 된다. 원시값을 고르거나, 리듀서가 바뀐 부분만 새 참조를 만들게 한다.

## 3. 라우트와 렌더링

| 라우트 | 렌더링 | 이유 |
| --- | --- | --- |
| `/` 랜딩 | 정적 생성 | 내용이 고정. 빠르고 SEO |
| `/town/[slug]` 공개 마을 | 서버 렌더링 + `generateMetadata` | 링크 공유 미리보기(OG)에 마을 이름·오늘 방문 수. 서버에서 그릴 이유가 있는 유일한 곳 |
| `/app` 대시보드 | 서버 껍데기 + `'use client'` 캔버스(`next/dynamic`, `ssr:false`) | 캔버스·SSE는 브라우저 전용. 서버 렌더링해도 얻는 게 없다 |
| `/embed/[key]` | 최소 클라이언트 | 남의 사이트 iframe. 패널 코드 없이 엔진만 |
| `/demo` | 정적 + 클라이언트 | 지금의 `?demo=1` |
| `/design-system` | 정적 생성 | |

`[slug]`·`[key]`는 **경로 파라미터(동적 세그먼트)** 다. 쿼리 파라미터가 아니다.

- **구현(2026-11-05, 로드맵 56)**: 표대로 라우트를 냈지만 렌더링은 전부 동적이다(nonce CSP 때문, §5). `/app`·`/demo`는 서버 껍데기(마크업 `shell/dashboard.html`을 그대로) + 클라이언트가 `shell/dashboard.js`를 동적 import(`next/dynamic ssr:false`와 같은 효과, `components/DashboardBoot.tsx`). `/embed/[key]`는 `shell/embed.ts`(엔진 + 스트림만, react-dom은 Next 라우트라 그대로 실린다: gzip 211KB vs 대시보드 269KB). `/town/[slug]`는 `GET /api/public/sites`에서 찾아 `generateMetadata`(React `cache`로 한 요청에 한 번)로 이름·접속자 수를 OG에 넣고 없으면 404.

## 4. 기존 URL 살리기

`/index.html?embed=…`·`/?embed=…`는 남의 사이트에 박혀 있을 수 있는 공개 계약이라 깨면 안 된다. `next.config.ts`의 `rewrites`로 처리한다.

```ts
async rewrites() {
  return [
    { source: '/index.html', has: [{ type: 'query', key: 'embed', value: '(?<key>.*)' }], destination: '/embed/:key' },
    { source: '/', has: [{ type: 'query', key: 'embed', value: '(?<key>.*)' }], destination: '/embed/:key' },
  ];
},
async redirects() {
  return [{ source: '/index.html', has: [{ type: 'query', key: 'demo' }], destination: '/demo', permanent: false }];
},
```

- 임베드는 redirect가 아니라 rewrite: iframe 안에서 왕복이 한 번 줄고 주소가 그대로 유지된다.
- `?api=&site=&token=`·`?tv=1&sites=`는 `/app`의 쿼리로 그대로 둔다(개발·TV용).
- `vercel.json`의 `X-Frame-Options`·`frame-ancestors` 규칙을 새 경로(`/app`은 SAMEORIGIN, `/embed/*`는 허용)로 옮긴다.
- **구현(2026-11-05)**: `apps/web/next.config.ts` 위 코드 그대로(+`/index.html`→`/app`, `/landing`→`/` redirect, 쿼리 유지). 프레임 규칙은 `proxy.ts`가 경로로 정한다(`/embed`·`/town`·`?embed=` 제외). 랜딩의 테스트 쿼리는 `?key=`(`?embed=`는 rewrite에 잡힌다).

## 5. CSP: `'unsafe-inline'` 없애기

- 지금 `script-src 'unsafe-inline'`이 필요한 이유: `build.sh`가 모든 JS를 `index.html` 안에 인라인으로 넣기 때문. 이게 있으면 주입된 `<script>`·`onclick=`도 실행돼서 CSP의 XSS 방어가 사실상 꺼진다. 외부 출처 허용은 이것과 별개로 호스트 목록이 맡는다.
- 동적 페이지(`/app`, `/town/[slug]`): `proxy.ts`에서 요청마다 nonce를 만들어 `script-src 'self' 'nonce-…' 'strict-dynamic'`. Next가 자기 스크립트에 nonce를 붙인다.
- 정적 페이지(`/`, `/design-system`, `/demo`): nonce를 쓰면 요청마다 HTML이 달라져 정적 캐시가 깨진다. 인라인 스크립트(`shellApply` 등)를 파일로 빼거나 해시(`'sha256-…'`)로 허용한다.
- `style-src 'unsafe-inline'`은 위험도가 낮아 당분간 둔다.
- `docs/security.md` 점검표에 항목 추가.
- **구현(2026-11-05)**: 정적 페이지를 포기하고 전부 nonce 동적 렌더링(`layout.tsx`가 `headers()`를 읽어 모든 라우트가 동적). 이유: App Router는 정적 페이지에도 `self.__next_f.push` 인라인 스크립트를 넣고 해시를 주지 않아 `'unsafe-inline'` 없이는 정적이 안 된다. 트래픽이 작아 비용 없음. 인라인 스크립트는 밝기(`lib/shell-head.ts`) 하나이고 nonce를 받는다. 랜딩의 SDK는 nonce 스크립트가 `createElement('script')`로 만들어 `'strict-dynamic'`으로 허용(호스트를 CSP에 안 적는다). `public/legal/*.html`은 nonce 없이 `script-src 'self'`. `style-src 'unsafe-inline'`은 둔다. `docs/security.md` S-03·S-07·S-24 갱신.

## 6. SSE 훅 `useSiteStream(siteId)`

```ts
export function useSiteStream(siteId: string) {
  const store = useContext(StoreContext);
  const auth = useAuth();                        // 토큰 갱신을 아는 쪽
  useEffect(() => {
    let cancelled = false, es: EventSource | null = null, lastId = '';
    let retry = 1000, timer: ReturnType<typeof setTimeout>;
    store.reset();

    const open = async () => {
      const ticket = await auth.streamTicket(siteId);   // Authorization 헤더로 받는 일회용 티켓
      if (cancelled) return;
      const q = new URLSearchParams({ ticket, ...(lastId && { lastEventId: lastId }) });
      es = new EventSource(`${API}/api/sites/${encodeURIComponent(siteId)}/stream?${q}`);
      const on = (type: string, fn: (d: any) => void) =>
        es!.addEventListener(type, (e: MessageEvent) => {
          if (cancelled) return;                 // 사이트를 바꾼 뒤 늦게 온 이벤트 버림
          if (e.lastEventId) lastId = e.lastEventId;
          retry = 1000; fn(JSON.parse(e.data));
        });
      on('snapshot', d => store.loadSnapshot(d));
      on('resume',   d => store.resume(d));
      on('event',    d => store.apply(d));
      on('eventtypes', d => store.setEventTypes(d));
      es.onerror = () => {                       // 브라우저 자동 재연결은 같은 URL(만료된 티켓)이라 직접 다시 연다
        es?.close(); if (cancelled) return;
        timer = setTimeout(open, retry); retry = Math.min(retry * 2, 30000);
      };
    };
    open();
    return () => { cancelled = true; clearTimeout(timer); es?.close(); };
  }, [siteId, store, auth]);
}
```

| 상황 | 처리 |
| --- | --- |
| 개발 모드에서 연결이 두 번 | StrictMode가 effect를 마운트→정리→재마운트해 cleanup 누락을 드러낸다. cleanup이 `es.close()`하므로 첫 연결은 바로 닫힌다. `useRef`로 막지 않는다(실제 화면 전환 때의 누수를 숨긴다) |
| 사이트 A → B 전환 | `siteId`가 의존성이라 cleanup이 A를 닫고, `cancelled`가 늦게 온 A 콜백·티켓 응답을 버린다. 새 effect가 `store.reset()` |
| 토큰 만료 | `EventSource`는 헤더를 못 붙이고 자동 재연결은 처음 URL 그대로다. 그래서 `onerror`에서 닫고 새 티켓으로 직접 다시 연다. 새 `EventSource`는 `Last-Event-ID`를 안 보내므로 `lastEventId`를 쿼리로 넘긴다(서버가 이미 받음, `server/index.js` stream 경로) |
| 토큰을 URL에 | 서버·프록시 로그, 브라우저 기록, Referer에 남는다. 장기 토큰 대신 30초짜리 일회용 티켓만 URL에 둔다. 서버에 `POST /api/sites/:id/stream-ticket` 추가 필요 |
| 탭 7개 | HTTP/1.1은 같은 출처에 연결 6개, 탭 전체 합산. ① 서버를 HTTP/2로(연결 하나에 다중화) ② Web Locks로 대표 탭을 뽑아 그 탭만 SSE를 열고 `BroadcastChannel`로 나눠 준다. 대표 탭이 닫히면 잠금이 풀려 다른 탭이 이어받는다 |
| 30분 끊김 | 링버퍼보다 길면 서버가 `resume` 대신 스냅샷을 준다(이미 구현). 정확성은 스냅샷이 맡고, 놓친 맥락은 피드에 "30분 동안 N명이 다녀갔어요 [리플레이로 보기]"로 서버 기록 리플레이를 연다 |
| 리플레이 중 | 스트림은 계속 받아 스토어에 쌓되, 엔진이 리플레이 스토어를 보는 동안 라이브 스토어는 그리지 않는다(지금처럼 버리지 않음 → 리플레이를 끝내면 바로 현재) |

- **구현(2026-11-05, 로드맵 54)**: `packages/ui/src/stream.ts`. 위 뼈대에서 두 가지가 다르다. ① 훅 안의 연결 로직은 React 없는 `createSiteStream`으로 빼서 `node:test`가 가짜 EventSource로 검사한다(백오프·lastEventId·cancelled·401). 훅은 `useEffect(() => createSiteStream(...).close, [api, siteId, embedKey])` + 핸들러 ref. ② 스토어 컨텍스트 대신 `onFrame(type, data)` 콜백: 스냅샷 적용(건물·해금·날씨·세션)은 셸이 알아야 해서 훅은 프레임만 넘긴다. 대시보드 셸은 `UI.mount()`의 보이지 않는 `<StreamHost>`에 `ui.stream.connect(opts)`로 설정을 넣고, 임베드 컴포넌트는 훅을 직접 쓴다. '리플레이 중'은 표대로: 리플레이 스토어를 따로 만들어 `world.bind`·`ui.bindStore`로 바꿔 보고, 라이브 스토어는 계속 쌓여 끝내면 `syncFromStore()`만(재연결 없음). 401은 셸의 티켓 함수가 토큰 갱신 한 번 → 그래도 401이면 훅이 `auth` 상태 → 로그인 화면.

## 7. 진행 순서

1. 모노레포 뼈대, `packages/types`(서버 이벤트 모양에서 뽑기), 기존 테스트 그대로 통과 — **일부 완료(2026-11-05)**: npm workspaces(`packages/*`)와 `packages/engine`만. 타입은 당분간 `packages/engine/src/types.ts`(SDK·서버와 합치는 건 51)
2. `packages/engine`: `p2~p5.js`를 TS 모듈로. DOM 접근은 전부 밖으로 뺀다 — **완료(2026-11-05)**: 로드맵 52 참고. 스토어·타입·시뮬레이터는 타입을 붙였고 지도·월드·테마는 느슨한 타입(`any`)으로 옮겼다(`strict: false`). 리플레이 중 라이브 유지(`world.bind(store)`)와 `world.selected`→`store.selectedId` 이전은 54·53에서 — **둘 다 완료(2026-11-05)**
3. `/demo`부터 띄운다(서버 없이 엔진·스토어만 검증) — **완료(2026-11-05, 로드맵 56)**
4. 패널을 하나씩 React로: 피드 → 정보 패널 → 통계 모달 → 설정 → 나머지. `pxSelect`·`ask`·`note`·`sfx`는 컴포넌트·훅으로 — **일부 완료(2026-11-05)**: 피드·정보 패널·헤더 숫자를 `packages/ui`(React 19, strict TS)로. Next 앱 전에 지금의 `index.html` 안에 섬(island)으로 붙였다(`build.sh`가 IIFE 전역 `UI`로 묶고 `p6.js`가 `UI.mount`). 로드맵 53 참고. 통계·설정·`<PxSelect>`·`ask`·`note`·`sfx`는 남음
5. `/app` + `useSiteStream`, 인증, 임베드·TV — **완료(2026-11-05, 로드맵 56·54)**: `/app`은 셸(`dashboard.js`)을 그대로 옮겼고 인증·TV도 그 안. 임베드는 `/embed/[key]`(`shell/embed.ts`). 스트림은 `useSiteStream`(§6)이 대시보드·임베드 둘 다에서 쥔다
6. `/town/[slug]` OG, CSP nonce, rewrites, `vercel.json` 정리 — **완료(2026-11-05)**
7. 스모크 테스트를 새 라우트로, `build.sh`·`index.html` 제거, CLAUDE.md 작업 규칙 갱신 — **일부 완료(2026-11-05)**: 스모크·CI·CLAUDE.md·README 갱신. `src/`·`landing/`·`build.sh`·`index.html`·`design-system/`·`vercel.json` 삭제는 커밋 뒤 사용자가(커밋 안 된 변경이 그 파일들에 있어 Claude가 지우지 않았다)

각 단계 끝에 `npm test`와 `?demo=1` 콘솔 오류 0. 2단계(Worker) 시작 전에 `node tests/perf/render.js` 수치를 여기에 적어 둔다.

### 접근성(로드맵 57, 2026-11-09)

axe-core 4.11, `page.evaluate(axe)`(CDP라 nonce CSP에 안 걸린다). 기준 → 결과: `/demo` 4규칙 12노드(색 대비 9·main 없음·h1 없음·region) → 0, 통계 모달 +critical 1(`aria-required-children`, 가짜 tablist)·+대비 10 → 0, 도감 +nested-interactive 9 → 0, `/app` 3 → 0, `/` 6 → 0, `/design-system` 0, `/embed`·`/town` 대비·region → 0(이름표 `.labels`는 axe가 바탕을 못 봐 제외). 키보드 순회는 `#stage` `role=application` + 셸 keydown(선택 = `view.select`), 피드 요약은 `packages/ui/src/Summary.tsx`, 동작 줄이기는 `World.reduceMotion`.

## 8. 측정 기록

| 시점 | fps | 프레임 p95 | 긴 작업 | 메인 스레드 점유 | 첫 JS(gzip) |
| --- | --- | --- | --- | --- | --- |
| 이전 전 (`index.html`, 2026-11-04) | 60.1 | 16.7ms | 0 | 10.6% | 258KB(index.html 전체가 인라인) |
| Next 이전 후 (2026-11-05, `/demo`) | 60.1 | 16.7ms | 0 | 12% | 269KB(JS+CSS: 엔진 73·react-dom 64·Next 44·셸 53·효과음 8·기타). `/embed` 211KB |
| Worker 렌더 후 | | | | | |
