'use strict';
// 일별 집계·원본 정리를 한 번 수동으로 돌린다 (서버는 켜질 때와 매시간 자동으로 돈다).
//   node server/rollup.js            집계 2일치 + 보관 일수(EVENT_RETENTION_DAYS, 기본 7) 넘은 원본 삭제
//   node server/rollup.js 30         집계 30일치(처음 켤 때 밀린 날짜 채우기) + 정리
//   node server/rollup.js 30 --no-prune   집계만
const fs = require('node:fs'); const path = require('node:path'); const { Supabase } = require('./supabase');
try { for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
const { RETENTION_DAYS, ROLLUP_TZ, maintain } = require('./maintenance');
const sb = new Supabase({ url: process.env.SUPABASE_URL, serviceKey: process.env.SUPABASE_SERVICE_KEY });
if (!sb.enabled) { console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY 가 없어요 (server/.env)'); process.exit(1); }
const days = +(process.argv.find(a => /^\d+$/.test(a)) || 2); const prune = !process.argv.includes('--no-prune');
maintain(sb, { rollupDays: days, prune }).then(r => { console.log(`집계 ${days}일치: ${r.rolled ?? '건너뜀'}행, 정리(${RETENTION_DAYS}일, ${ROLLUP_TZ}): ${prune ? (r.pruned ?? '건너뜀') + '행 삭제' : '안 함'}`); }).catch(e => { console.error(e.message); process.exit(1); });
