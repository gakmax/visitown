'use strict';
// 영어 지원(로드맵 60): 코드·마크업의 번역 키가 사전(packages/i18n/src/en.ts)에 다 있고, 자리표시·HTML 태그가 그대로 옮겨졌는지, 영어 값에 한글이 남지 않았는지.
// 사전은 TS라 esbuild로 묶어 불러온다(빌드 산출물 없이 테스트만으로 돈다)
const { test } = require('node:test'); const assert = require('node:assert/strict');
const path = require('node:path'); const { allKeys } = require('./i18n-keys.cjs');
const esbuild = require('esbuild');
const ROOT = path.join(__dirname, '..');
const mod = (() => { const r = esbuild.buildSync({ entryPoints: [path.join(ROOT, 'packages/i18n/src/index.ts')], bundle: true, format: 'cjs', platform: 'node', write: false }); const m = { exports: {} }; new Function('module', 'exports', 'require', r.outputFiles[0].text)(m, m.exports, require); return m.exports; })();
const { tr, pickLocale } = mod; const en = (() => { const r = esbuild.buildSync({ entryPoints: [path.join(ROOT, 'packages/i18n/src/en.ts')], bundle: true, format: 'cjs', write: false }); const m = { exports: {} }; new Function('module', 'exports', r.outputFiles[0].text)(m, m.exports); return m.exports.EN; })();
const H = /[가-힣]/; const KEEP_HANGUL = new Set(['한국어']);
const holes = s => [...s.matchAll(/(?<!\{)\{(\w+)(?::[^|{}]*\|[^{}]*)?\}(?!\})/g)].map(m => m[1]);
const tags = s => [...s.matchAll(/<\/?[a-z][^>]*>/gi)].map(m => m[0].replace(/\s(title|aria-label|alt|placeholder)="[^"]*"/g, '')).sort();

test('코드·마크업의 번역 키가 영어 사전에 모두 있다', () => {
  const miss = [...allKeys().keys()].filter(k => !(k in en));
  assert.deepEqual(miss, [], `빠진 키 ${miss.length}개 (node tests/i18n-keys.cjs --missing)`);
});

test('영어 값: 자리표시·HTML 태그를 그대로 옮기고 한글이 남지 않는다', () => {
  const bad = [];
  for (const [k, v] of Object.entries(en)) {
    if (typeof v !== 'string') { bad.push(`값이 문자열이 아님: ${k}`); continue; }
    const particle = /^\{0\} /.test(k); // 피드 문장의 {0}은 한국어 조사 자리(영어는 비움)
    for (const h of new Set(holes(k))) if (!(particle && h === '0') && !holes(v).includes(h)) bad.push(`자리표시 {${h}} 빠짐: ${k} → ${v}`);
    for (const h of new Set(holes(v))) if (!holes(k).includes(h)) bad.push(`없는 자리표시 {${h}}: ${k} → ${v}`);
    if (tags(k).join('|') !== tags(v).join('|')) bad.push(`HTML 태그가 다름: ${k} → ${v}`);
    if (H.test(v) && !KEEP_HANGUL.has(k)) bad.push(`한글이 남음: ${k} → ${v}`);
  }
  assert.deepEqual(bad, []);
});

test('언어 고르기·치환: 쿠키 우선, Accept-Language q값, 수에 맞춘 단어', () => {
  assert.equal(pickLocale(null, 'ko-KR,ko;q=0.9,en;q=0.8'), 'ko');
  assert.equal(pickLocale(null, 'en-US,en;q=0.9,ko;q=0.8'), 'en');
  assert.equal(pickLocale(null, 'fr-FR'), 'en');
  assert.equal(pickLocale(null, ''), 'ko');
  assert.equal(pickLocale('ko', 'en-US'), 'ko');
  assert.equal(pickLocale('xx', 'en-US'), 'en');
  assert.equal(tr('ko', '{0}명', { 0: 3 }), '3명');
  assert.equal(tr('en', '사전에 없는 문구 {0}', { 0: 1 }), '사전에 없는 문구 1');
  const k = Object.keys(en).find(x => /\{0:[^}]*\|/.test(en[x]));
  if (k) { const one = tr('en', k, { 0: 1, 1: 'x', 2: 'y' }), many = tr('en', k, { 0: 2, 1: 'x', 2: 'y' }); assert.notEqual(one.replace('1', ''), many.replace('2', '')); }
});
