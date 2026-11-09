// 번역 키 모으기(로드맵 60): 코드의 L('…')·T('…')·tr(locale, '…') 첫 문자열 인자와, 서버가 번역하는 대시보드 마크업(shell/dashboard.html·dlg.html)의 글자·속성.
// tests/i18n.test.js가 이 목록과 packages/i18n/src/en.ts를 맞춰 본다. 직접 실행하면 빠진 키를 JSON으로 출력한다: node tests/i18n-keys.cjs [--missing]
const ts = require('typescript'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const DIRS = ['apps/web/app', 'apps/web/components', 'apps/web/shell', 'apps/web/lib', 'packages/ui/src', 'packages/engine/src'];
const SKIP = new Set(['ds.js']); // 디자인 시스템 페이지는 한국어만(로드맵 60 범위 밖)
const HTML = ['apps/web/shell/dashboard.html', 'apps/web/shell/dlg.html'];
const H = /[가-힣]/;
function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.(tsx?|js)$/.test(e.name) && !SKIP.has(e.name) ? [path.join(d, e.name)] : []); }
function codeKeys() {
  const out = new Map();
  for (const f of DIRS.flatMap(d => walk(path.join(ROOT, d)))) {
    const src = fs.readFileSync(f, 'utf8'); const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, /\.tsx$/.test(f) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    (function v(n) {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const name = n.expression.text, arg = name === 'tr' ? n.arguments[1] : (name === 'L' || name === 'T') ? n.arguments[0] : null;
        if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) && H.test(arg.text)) out.set(arg.text, path.relative(ROOT, f));
      }
      ts.forEachChild(n, v);
    })(sf);
  }
  return out;
}
// lib/locale.ts translateHtml과 같은 규칙
function htmlKeys() {
  const out = new Map();
  for (const f of HTML) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of s.matchAll(/>([^<>]+)</g)) { const k = m[1].trim().replace(/\s+/g, ' '); if (H.test(k)) out.set(k, f); }
    for (const m of s.matchAll(/\b(title|aria-label|aria-description|placeholder|alt|data-tip|data-label|content)="([^"]*)"/g)) if (H.test(m[2])) out.set(m[2], f);
  }
  return out;
}
// 서버가 보내는 고정 문구: 응답의 { error: '…' }와 해금 조건 { text: '…' }. 대시보드가 errText·도감에서 L()로 번역한다(숫자가 섞인 문장은 대상 아님)
const SERVER = ['server/index.js', 'server/unlocks.js'];
function serverKeys() {
  const out = new Map();
  for (const f of SERVER) {
    const sf = ts.createSourceFile(f, fs.readFileSync(path.join(ROOT, f), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    (function v(n) { if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && (n.name.text === 'error' || n.name.text === 'text') && ts.isStringLiteral(n.initializer) && H.test(n.initializer.text)) out.set(n.initializer.text, f); ts.forEachChild(n, v); })(sf);
  }
  return out;
}
function allKeys() { return new Map([...htmlKeys(), ...serverKeys(), ...codeKeys()]); }
module.exports = { allKeys };
if (require.main === module) {
  const keys = allKeys();
  if (process.argv.includes('--missing')) {
    const src = fs.readFileSync(path.join(ROOT, 'packages/i18n/src/en.ts'), 'utf8');
    const have = new Set(); const sf = ts.createSourceFile('en.ts', src, ts.ScriptTarget.Latest, true);
    (function v(n) { if (ts.isPropertyAssignment(n) && (ts.isStringLiteral(n.name) || ts.isNoSubstitutionTemplateLiteral(n.name))) have.add(n.name.text); ts.forEachChild(n, v); })(sf);
    const miss = [...keys].filter(([k]) => !have.has(k));
    process.stdout.write(JSON.stringify(Object.fromEntries(miss.map(([k, f]) => [k, f])), null, 1));
    console.error(`키 ${keys.size}개 중 빠진 것 ${miss.length}개`);
  } else { process.stdout.write(JSON.stringify(Object.fromEntries(keys), null, 1)); console.error(`키 ${keys.size}개`); }
}
