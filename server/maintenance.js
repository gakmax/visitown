'use strict';
// 일별 집계(page_daily) + 원본 events 정리. 서버가 켜지고 2분 뒤 한 번, 그 뒤 매시간. 수동은 node server/rollup.js
// 원본은 EVENT_RETENTION_DAYS(기본 7)만 둔다: 리플레이·'어제 하루' 영상은 하루 안쪽만 쓰고, 추이는 page_daily로 본다
const RETENTION_DAYS = Math.max(1, +(process.env.EVENT_RETENTION_DAYS || 7));
const ROLLUP_TZ = process.env.ROLLUP_TZ || 'Asia/Seoul';
async function maintain(sb, { rollupDays = 2, prune = true, log = console } = {}) {
  if (!sb.enabled) return {};
  const out = {};
  out.rolled = await sb.rollup(rollupDays, ROLLUP_TZ);
  if (prune && out.rolled !== null) out.pruned = await sb.prune(RETENTION_DAYS); // 집계 함수가 없으면(마이그레이션 전) 삭제도 하지 않는다
  return out;
}
function schedule(sb, log = console, isLeader = () => true) { // isLeader: 인스턴스 여러 대면 리더만 돈다(로드맵 46)
  if (!sb.enabled) return;
  const run = async () => { if (!isLeader()) return; try { const r = await maintain(sb, { log }); if (r.rolled !== null && r.rolled !== undefined) log.log(new Date().toISOString(), `일별 집계 ${r.rolled}행, ${RETENTION_DAYS}일 지난 이벤트 ${r.pruned}행 정리`); } catch (e) { log.warn('집계/정리 실패:', e.message); } };
  setTimeout(run, 120000).unref(); setInterval(run, 3600000).unref();
}
module.exports = { RETENTION_DAYS, ROLLUP_TZ, maintain, schedule };
