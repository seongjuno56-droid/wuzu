/**
 * 코드 속 한국어 화면 문구를 모은다 (번역 사전 점검용).
 * - 문자열·템플릿 문자열(정적 부분)·JSX 텍스트 중 한글이 든 것
 * - 템플릿의 ${...} 자리는 {0},{1}… 로 바꾼 패턴 키
 * - import, 주석, 테스트 파일은 제외. 앞에 i18n-ignore 블록 주석을 단 문자열도 제외(언어별 서식 함수의 한국어 쪽 등)
 * 사용: node scripts/extract-ko.js > out.json  (테스트에서는 extractKoreanKeys() 로 불러 쓴다)
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function extractKoreanKeys(ROOT = path.join(__dirname, '..', 'src')) {
const HANGUL = /[가-힣]/;
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f === '__tests__' || f === 'i18n') continue;
      walk(p);
    } else if (/\.(tsx?|ts)$/.test(f)) files.push(p);
  }
})(ROOT);

/** React 가 JSX 텍스트를 다루는 방식: 줄마다 앞뒤 공백 제거, 빈 줄 제외, 공백 하나로 잇기 */
function jsxText(raw) {
  const lines = raw.split(/\r?\n/);
  const out = [];
  lines.forEach((line, i) => {
    let s = line.replace(/\t/g, ' ');
    if (i !== 0) s = s.replace(/^ +/, '');
    if (i !== lines.length - 1) s = s.replace(/ +$/, '');
    if (s) out.push(s);
  });
  return out.join(' ');
}

const keys = new Map(); // key -> [위치]
const add = (k, where) => {
  const key = k.trim();
  if (!HANGUL.test(key)) return;
  if (!keys.has(key)) keys.set(key, []);
  keys.get(key).push(where);
};

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(path.join(__dirname, '..'), file).split(path.sep).join('/');
  (function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    // 같은 줄 앞의 주석은 TS 가 앞 토큰의 trailing 으로 본다 — 둘 다 본다
    const lead = [...(ts.getLeadingCommentRanges(src, node.getFullStart()) || []), ...(ts.getTrailingCommentRanges(src, node.getFullStart()) || [])];
    if (lead.some((c) => src.slice(c.pos, c.end).includes('i18n-ignore'))) return;
    const where = `${rel}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node.text, where);
    else if (ts.isTemplateExpression(node)) {
      let s = node.head.text;
      node.templateSpans.forEach((span, i) => {
        s += `{${i}}` + span.literal.text;
      });
      add(s, where);
      // 자리 안의 식에 든 문자열도 따로 모은다
      node.templateSpans.forEach((span) => visit(span.expression));
      return;
    } else if (ts.isJsxText(node)) add(jsxText(node.text), where);
    ts.forEachChild(node, visit);
  })(sf);
}

const out = {};
for (const [k, w] of [...keys.entries()].sort()) out[k] = w[0];
return out;
}

module.exports = { extractKoreanKeys };
if (require.main === module) process.stdout.write(JSON.stringify(extractKoreanKeys(), null, 1));
