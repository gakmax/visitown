#!/usr/bin/env bash
# 수집 서버(8787) + 웹 앱(5173, next dev)을 띄우고, 인자를 주면 추적할 사이트(3000)도 같이 띄운다. Ctrl+C 또는 q로 전부 종료.
#   ./dev.sh            # 서버·대시보드만
#   ./dev.sh demo       # 사이트: demo-site
#   ./dev.sh <폴더>     # 사이트: 그 폴더에서 npm run dev (SITE_CMD="pnpm dev" 처럼 명령을 바꿀 수 있다)
#   ./dev.sh -r [...]   # 포트를 쓰고 있는 기존 프로세스를 묻지 않고 끄고 새로 띄운다(완전 재시작)
# 각 프로세스는 setsid로 자기 프로세스 그룹에서 돈다. 끌 때는 그 그룹만 끄고(포트 주인을 무작정 죽이지 않는다),
# 실제로 꺼졌는지·포트가 비었는지 확인한다. 도중에 하나가 죽어도 스크립트는 안 끝난다. 로그 끝을 보여 주고
# 키 입력을 기다린다: r 죽은 것 다시 띄우기 · s/d/t 서버·웹 앱·사이트 하나만 다시 · b 엔진·UI 패키지 번들(테스트용) 다시 · q 종료
cd "$(dirname "$0")" || exit 1
SITE=none RESTART=''
for a in "$@"; do case "$a" in -r|--restart) RESTART=1 ;; *) SITE=$a ;; esac; done
LOG=/tmp/vt; mkdir -p "$LOG"

if [ -t 1 ] && [ -z "$NO_COLOR" ]; then
  B=$'\e[1m' D=$'\e[2m' R=$'\e[31m' G=$'\e[32m' Y=$'\e[33m' C=$'\e[36m' M=$'\e[35m' X=$'\e[0m' TTY=1
else B='' D='' R='' G='' Y='' C='' M='' X='' TTY=''; fi
ok()   { printf '  %s✓%s %s\n' "$G" "$X" "$*"; }
bad()  { printf '  %s✗%s %s\n' "$R" "$X" "$*"; }
warn() { printf '  %s!%s %s\n' "$Y" "$X" "$*"; }
clr()  { [ -n "$TTY" ] && printf '\r\e[K'; }
now()  { echo "${EPOCHREALTIME/[.,]/}"; }   # 마이크로초
secs() { printf '%d.%d초' $(( $1 / 1000000 )) $(( $1 % 1000000 / 100000 )); }

case "$SITE" in
  demo) SITE_DIR=demo-site; SITE_CMD=(npm run dev) ;;
  none) ;;
  *)    SITE_DIR=$SITE; read -r -a SITE_CMD <<< "${SITE_CMD:-npm run dev}" ;;
esac
[ "$SITE" != none ] && [ ! -d "$SITE_DIR" ] && { bad "사이트 폴더가 없어요: $SITE_DIR"; exit 1; }

declare -A LABEL=([server]="수집 서버" [dashboard]="웹 앱(next dev)" [site]="사이트($SITE)")
declare -A PORT=([server]=8787 [dashboard]=5173 [site]=3000)
declare -A KEY=([s]=server [d]=dashboard [t]=site)
declare -A PID
SVCS=(server dashboard); [ "$SITE" != none ] && SVCS+=(site)

listening() { ss -ltnH "sport = :$1" 2>/dev/null | grep -q .; }
port_pid()  { ss -ltnpH "sport = :$1" 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2; }
alive()     { [ -n "${PID[$1]}" ] && kill -0 "${PID[$1]}" 2>/dev/null; }
group_up()  { [ -n "${PID[$1]}" ] && kill -0 -- "-${PID[$1]}" 2>/dev/null; }
ready() {
  case $1 in
    server)    curl -sf -o /dev/null -m 1 "http://localhost:${PORT[server]}/healthz" ;;
    dashboard) listening "${PORT[dashboard]}" ;;   # Next dev는 첫 요청 때 컴파일하니 포트만 본다
    site)      listening "${PORT[site]}" ;;   # Next는 첫 요청 때 컴파일하니 포트만 본다
  esac
}
hint() { printf '  %sr 다시 띄우기 · s/d/t 서버·웹 앱·사이트 하나만 · b 패키지 번들 다시 · q 종료%s\n' "$D" "$X"; }
died() {
  wait "${PID[$1]}" 2>/dev/null; local code=$?
  PID[$1]=''
  clr; bad "${LABEL[$1]} 프로세스가 꺼졌어요 ${D}(종료 코드 $code)${X}"
  tail -n 15 "$LOG/$1.log" | sed "s/^/      ${D}│${X} /"
  hint
}
# 프로세스 그룹 하나를 TERM → 5초 뒤 KILL로 끄고, 꺼질 때까지 기다린다. 강제로 껐으면 1
kill_group() {
  local pgid=$1 t0; kill -TERM -- "-$pgid" 2>/dev/null || return 0
  t0=$(now)
  while kill -0 -- "-$pgid" 2>/dev/null; do
    if (( $(now) - t0 > 5000000 )); then kill -KILL -- "-$pgid" 2>/dev/null; sleep 0.2; return 1; fi
    sleep 0.1
  done
}

if [ "$SITE" = none ]; then printf '\n  %sVisitown dev%s\n\n' "$B" "$X"
else printf '\n  %sVisitown dev%s %s· 사이트 %s%s\n\n' "$B" "$X" "$D" "$SITE" "$X"; fi

# 1. 포트 확인: 이미 쓰는 프로세스가 있으면 누군지 보여 주고, 끄고 갈지 묻는다(-r이면 묻지 않고 끈다)
busy=() unknown=''
for s in "${SVCS[@]}"; do
  p=${PORT[$s]}; listening "$p" || continue
  pid=$(port_pid "$p")
  if [ -n "$pid" ]; then busy+=("$s"); warn "${LABEL[$s]} 포트 $p — 이미 쓰는 중이에요: ${D}$(ps -o args= -p "$pid" | cut -c1-60) (pid $pid)${X}"
  else unknown=1; bad "${LABEL[$s]} 포트 $p — 이미 쓰는 중이에요 ${D}(다른 사용자나 Windows 쪽 프로세스)${X}"; fi
done
[ -n "$unknown" ] && { printf '\n  위 프로세스는 여기서 끌 수 없어요. 직접 끄고 다시 실행해 주세요.\n\n'; exit 1; }
if [ ${#busy[@]} -gt 0 ]; then
  if [ -z "$RESTART" ]; then
    if [ -t 0 ]; then
      printf '\n  위 프로세스를 끄고 새로 띄울까요? %s[Y/n]%s ' "$D" "$X"; read -r -n 1 ans; echo
      [[ -z "$ans" || "$ans" =~ ^[yY]$ ]] || { printf '\n  그대로 둘게요. 끄고 띄우려면 %s./dev.sh -r%s\n\n' "$B" "$X"; exit 1; }
    else printf '\n  끄고 띄우려면 %s./dev.sh -r%s 로 실행해 주세요.\n\n' "$B" "$X"; exit 1; fi
  fi
  for s in "${busy[@]}"; do
    pid=$(port_pid "${PORT[$s]}"); [ -n "$pid" ] || continue
    pgid=$(ps -o pgid= -p "$pid" | tr -d ' ')
    if kill_group "$pgid"; then ok "기존 ${LABEL[$s]} 껐어요"; else warn "기존 ${LABEL[$s]}가 5초 안에 안 꺼져서 강제로 껐어요"; fi
    t0=$(now); while listening "${PORT[$s]}"; do (( $(now) - t0 > 3000000 )) && break; sleep 0.1; done
    listening "${PORT[$s]}" && { bad "${LABEL[$s]} 포트 ${PORT[$s]} — 아직 열려 있어요 → ss -ltnp 'sport = :${PORT[$s]}'"; exit 1; }
  done
  echo
fi

# 2. 엔진·UI 패키지 번들(dist, 테스트용. 웹 앱은 소스를 직접 묶으니 안 기다려도 된다)
build() {
  local out
  if out=$(npm run build:packages 2>&1); then ok "packages/engine·ui 번들을 다시 만들었어요"; return 0
  else bad "패키지 빌드가 실패했어요"; echo "$out" | sed "s/^/      ${D}│${X} /"; return 1; fi
}
[ -d packages/engine/dist/types ] || build || exit 1

# 3. 띄우기. 서브셸이 setsid로 exec되므로 $!가 곧 새 프로세스 그룹 번호다
start() {
  local s=$1 dir=$2; shift 2
  ( cd "$dir" && exec setsid "$@" ) > "$LOG/$s.log" 2>&1 < /dev/null &
  PID[$s]=$!
}
launch() {
  case $1 in
    server)    start server    . node server/index.js ;;
    dashboard) start dashboard apps/web ../../node_modules/.bin/next dev -p "${PORT[dashboard]}" -H 127.0.0.1 ;;
    site)      start site "$SITE_DIR" "${SITE_CMD[@]}" ;;
  esac
}
# 준비될 때까지 기다리기 (사이트는 넉넉히 90초). 실패해도 스크립트는 끝내지 않는다
SPIN=(⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏)
wait_ready() {
  local s=$1 t0 i=0 el; t0=$(now)
  while :; do
    el=$(( $(now) - t0 ))
    if ! alive "$s"; then died "$s"; return 1; fi
    if ready "$s"; then clr; ok "${LABEL[$s]} ${D}:${PORT[$s]} · $(secs "$el")${X}"; return 0; fi
    if (( el > 90000000 )); then clr; bad "${LABEL[$s]}가 90초 안에 준비되지 않았어요 ${D}(로그 $LOG/$s.log)${X}"; return 1; fi
    [ -n "$TTY" ] && printf '\r  %s%s%s %s 준비 중… %s' "$C" "${SPIN[i++ % 10]}" "$X" "${LABEL[$s]}" "$(secs "$el")"
    sleep 0.1
  done
}
# 하나를 (살아 있으면 끄고) 다시 띄운다
restart() {
  local s=$1
  if group_up "$s"; then
    kill_group "${PID[$s]}" || warn "${LABEL[$s]}가 5초 안에 안 꺼져서 강제로 껐어요"
    wait "${PID[$s]}" 2>/dev/null; PID[$s]=''
  fi
  if listening "${PORT[$s]}"; then
    bad "${LABEL[$s]} 포트 ${PORT[$s]} — 다른 프로세스가 쓰고 있어요: ${D}$(ps -o args= -p "$(port_pid "${PORT[$s]}")" 2>/dev/null | cut -c1-60)${X}"; return 1
  fi
  launch "$s"; wait_ready "$s"
}
cleanup() {
  trap '' INT TERM HUP
  [ -t 0 ] && stty echo 2>/dev/null
  local s t0 left=() spent
  for s in site dashboard server; do group_up "$s" && left+=("$s"); done
  pkill -P $$ -x tail 2>/dev/null   # 로그 흘려 보내기부터 멈춘다
  [ ${#left[@]} -eq 0 ] && return
  printf '\n  %s끄는 중…%s\n' "$B" "$X"
  for s in "${left[@]}"; do kill -TERM -- "-${PID[$s]}" 2>/dev/null; done
  t0=$(now)
  while [ ${#left[@]} -gt 0 ]; do
    spent=$(( $(now) - t0 )); local still=()
    for s in "${left[@]}"; do
      if ! group_up "$s"; then ok "${LABEL[$s]} 꺼졌어요 ${D}$(secs "$spent")${X}"
      elif (( spent > 5000000 )); then kill -KILL -- "-${PID[$s]}" 2>/dev/null; warn "${LABEL[$s]}가 5초 안에 안 꺼져서 강제로 껐어요"
      else still+=("$s"); fi
    done
    left=("${still[@]}"); [ ${#left[@]} -gt 0 ] && sleep 0.1
  done
  sleep 0.2
  for s in "${SVCS[@]}"; do
    listening "${PORT[$s]}" && bad "${LABEL[$s]} 포트 ${PORT[$s]} — 아직 열려 있어요 → ss -ltnp 'sport = :${PORT[$s]}'"
  done
  echo
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP

for s in "${SVCS[@]}"; do launch "$s"; done
for s in "${SVCS[@]}"; do wait_ready "$s"; done

cat <<URLS

  ${B}대시보드${X}    http://localhost:${PORT[dashboard]}/app?api=http://localhost:${PORT[server]}&site=&token=
  ${B}시뮬레이터${X}  http://localhost:${PORT[dashboard]}/demo
  ${B}랜딩${X}        http://localhost:${PORT[dashboard]}/?api=http://localhost:${PORT[server]}&site=site_demo&key=임베드키
URLS
[ "$SITE" != none ] && echo "  ${B}사이트${X}      http://localhost:${PORT[site]}/?vt_me=1"
printf '  %s로그        %s/{%s}.log%s\n\n' "$D" "$LOG" "$(IFS=,; echo "${SVCS[*]}")" "$X"
hint; echo

# 5. 서버·사이트 로그를 앞머리를 붙여 흘려 보내고, 1초마다 살아 있는지 보면서 키 입력을 받는다
stream() { tail -n +1 -F --pid=$$ "$LOG/$1.log" 2>/dev/null | sed -u "s/^/${2}${3}${X} ${D}│${X} /" & }
stream server "$C" '서버  '
[ "$SITE" != none ] && stream site "$M" '사이트'
[ -t 0 ] && stty -echo 2>/dev/null   # 누른 키가 로그 사이에 찍히지 않게. cleanup에서 되돌린다
while :; do
  for s in "${SVCS[@]}"; do [ -n "${PID[$s]}" ] && ! alive "$s" && died "$s"; done
  if [ -t 0 ]; then read -r -s -t 1 -n 1 key || key=''; else sleep 1; key=''; fi
  case "$key" in
    q) exit 0 ;;
    r) for s in "${SVCS[@]}"; do alive "$s" || restart "$s"; done ;;
    s|d|t) s=${KEY[$key]}; [[ " ${SVCS[*]} " == *" $s "* ]] && restart "$s" ;;
    b) build ;;
    '') ;;
    *) hint ;;
  esac
done
