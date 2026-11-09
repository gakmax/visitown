'use strict';
// SDK(sdk/visitown.js) 크기 예산·타입·npm 패키지 모양. 브라우저 동작(init·수집 요청)은 smoke.test.js
const { test } = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const zlib = require('node:zlib'); const { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..'); const SDK = path.join(ROOT, 'sdk');
const BUDGET = 7 * 1024; // gzip 7KiB. 넘으면 CI가 막는다(로드맵 41)

test(`SDK gzip 크기가 ${BUDGET}B 예산 안이다`, () => {
  const raw = fs.readFileSync(path.join(SDK, 'visitown.js')); const gz = zlib.gzipSync(raw).length;
  console.log(`sdk/visitown.js raw ${raw.length}B · gzip ${gz}B · 예산 ${BUDGET}B (남은 ${BUDGET - gz}B)`);
  assert.ok(gz <= BUDGET, `gzip ${gz}B > ${BUDGET}B`);
});

test('SDK 타입(visitown.d.ts)이 사용 예시를 --strict로 통과한다', () => {
  const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  assert.ok(fs.existsSync(tsc), 'typescript가 없어요. npm ci');
  execFileSync(process.execPath, [tsc, '-p', path.join(__dirname, 'fixtures')], { stdio: 'pipe' });
});

test('npm 패키지(@visitown/sdk)는 서버가 주는 visitown.js와 같은 파일을 담고 필요한 파일만 포함한다', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(SDK, 'package.json'), 'utf8'));
  assert.equal(pkg.name, '@visitown/sdk'); assert.equal(pkg.main, 'visitown.js'); assert.equal(pkg.types, 'visitown.d.ts');
  for (const f of pkg.files) assert.ok(fs.existsSync(path.join(SDK, f)), f + ' 없음');
  const out = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: SDK, stdio: 'pipe' }).toString());
  const names = out[0].files.map(f => f.path).sort(); assert.deepEqual(names, ['README.md', 'index.mjs', 'package.json', 'visitown.d.ts', 'visitown.js']);
  assert.ok(out[0].unpackedSize < 40000);
});

test('서버가 /visitown.js로 주는 내용이 sdk/visitown.js 그대로다', async () => {
  const { startServer } = require('./helpers'); const srv = await startServer();
  try { const body = await (await fetch(srv.base + '/visitown.js')).text(); assert.equal(body, fs.readFileSync(path.join(SDK, 'visitown.js'), 'utf8')); } finally { srv.proc.kill(); }
});
