/**
 * 로컬 화면 확인(QA). 시드가 든 빈 로컬 DB 로 띄운 어드민을 1280px 폭 브라우저로 돌린다.
 *   npx tsx scripts/qa.ts <기본 주소> <스크린샷 폴더>
 * 예: npx tsx scripts/qa.ts http://localhost:3100 ../.superpowers/sdd/2026-10-27-admin-foundation/qa
 * 단계마다 png 를 남기고, 확인 결과를 같은 폴더의 results.json 에 적는다.
 * 운영자 추가·정지 등 DB 를 바꾸므로 시드 직후 한 번만 돌린다.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const [base = 'http://localhost:3100', outDir = 'qa-out'] = process.argv.slice(2);
const VIEWPORT = { width: 1280, height: 900 };
const SEED = { email: 'admin@wuzu.local', password: 'wuzu-admin-1234' };
const NEW_ADMIN = { name: '새 운영자', email: 'new@wuzu.local', temp: 'temp-pass-1234', next: 'new-pass-12345' };
/** 수식 막기 확인용: 사유가 = 로 시작한다 */
const BAN_MEMO = '=HYPERLINK("http://x") 스팸 신고';

interface Check {
  step: string;
  ok: boolean;
  detail: string;
  shot?: string;
}
const checks: Check[] = [];
let shotNo = 0;

async function shot(page: Page, name: string): Promise<string> {
  shotNo += 1;
  const file = `${String(shotNo).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(outDir, file), fullPage: true });
  return file;
}

function check(step: string, ok: boolean, detail: string, shotFile?: string): void {
  checks.push({ step, ok, detail, shot: shotFile });
  console.log(`${ok ? '통과' : '실패'} | ${step} | ${detail}`);
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${base}/login`);
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function bodyRows(page: Page): Promise<string[]> {
  return page.locator('tbody tr').allInnerTexts();
}

async function currentPageNo(page: Page): Promise<string | null> {
  const cur = page.locator('nav[aria-label="페이지"] [aria-current="page"]');
  return (await cur.count()) ? cur.innerText() : null;
}

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: VIEWPORT, acceptDownloads: true, locale: 'ko-KR' });
  const a = await ctxA.newPage();
  a.on('dialog', (d) => void d.accept());

  // 1. 로그인
  await a.goto(`${base}/login`);
  const loginShot = await shot(a, 'login');
  await login(a, SEED.email, SEED.password);
  check('시드 운영자 로그인', !a.url().includes('/login'), `로그인 뒤 ${new URL(a.url()).pathname}`, loginShot);

  // 2. 회원 검색 50% — % 가 와일드카드로 쓰이면 30명이 모두 나온다
  await a.goto(`${base}/members`);
  await a.getByRole('searchbox').fill('50%');
  await a.getByRole('button', { name: '검색' }).click();
  await a.waitForURL(/q=50%25/);
  const found = await bodyRows(a);
  check(
    '회원 검색 "50%"',
    found.length === 1 && found[0].includes('50%_a\\'),
    `${found.length}줄: ${found.map((r) => r.split('\t')[0]).join(', ')}`,
    await shot(a, 'members-search'),
  );

  // 3. 정지 → 해제
  await a.locator('tbody tr').first().getByRole('link').first().click();
  await a.waitForURL(/\/members\/[0-9a-f-]{36}/);
  const memberUrl = a.url();
  await a.getByLabel('사유').fill(BAN_MEMO);
  await a.getByRole('button', { name: '정지', exact: true }).click();
  await a.getByRole('button', { name: '정지 해제' }).waitFor();
  check('회원 정지', true, '확인 창 수락 → "정지 해제" 버튼으로 바뀜', await shot(a, 'member-banned'));
  await a.getByLabel('사유').fill('확인 결과 오해');
  await a.getByRole('button', { name: '정지 해제' }).click();
  await a.getByRole('button', { name: '정지', exact: true }).waitFor();
  check('회원 정지 해제', true, '"정지" 버튼으로 돌아옴', await shot(a, 'member-unbanned'));

  // 4. 초대장 걸러 보기·숨김
  await a.goto(`${base}/invitations`);
  await a.getByLabel('테마').selectOption('wedding');
  await a.getByLabel('상태').selectOption('active');
  await a.getByRole('button', { name: '검색' }).click();
  await a.waitForURL(/theme=wedding/);
  const filtered = await bodyRows(a);
  check(
    '초대장 걸러 보기(결혼식·활성)',
    filtered.length > 0 && filtered.every((r) => r.includes('결혼식') && r.includes('활성')),
    `${filtered.length}줄, 모두 결혼식·활성`,
    await shot(a, 'invitations-filtered'),
  );
  const target = a.locator('tbody tr').filter({ hasNot: a.getByText('숨김 해제') }).first();
  const targetName = (await target.locator('td').nth(1).innerText()).trim();
  await target.getByLabel('사유').fill('신고 접수');
  await target.getByRole('button', { name: '숨기기' }).click();
  const hiddenRow = a.locator('tbody tr').filter({ hasText: targetName });
  await hiddenRow.getByRole('button', { name: '숨김 해제' }).waitFor();
  check('초대장 숨김', true, `'${targetName}' 숨김 표시·"숨김 해제" 버튼`, await shot(a, 'invitation-hidden'));

  // 5. 만든 사람으로 걸러 본 뒤 검색해도 owner 유지
  const ownerHref = await a.locator('tbody tr').first().locator('a[href^="/members/"]').getAttribute('href');
  const ownerId = ownerHref!.split('/').pop()!;
  await a.goto(`${base}/invitations?owner=${ownerId}`);
  const ownerRows = await bodyRows(a);
  await a.getByRole('searchbox').fill('초대장');
  await a.getByRole('button', { name: '검색' }).click();
  await a.waitForURL(/q=/);
  const afterSearch = new URL(a.url());
  const ownerKept =
    afterSearch.searchParams.get('owner') === ownerId &&
    (await a.getByText('만든 사람:').count()) === 1 &&
    (await bodyRows(a)).length === ownerRows.length;
  check(
    '만든 사람 걸러 보기 + 검색 → owner 유지',
    ownerKept,
    `주소 ${afterSearch.search}, ${ownerRows.length}줄 그대로`,
    await shot(a, 'invitations-owner-search'),
  );

  // 6. 이상한 page 값
  await a.goto(`${base}/invitations`);
  const page1 = await bodyRows(a);
  await a.goto(`${base}/invitations?page=abc`);
  const abcNo = await currentPageNo(a);
  const abcRows = await bodyRows(a);
  check(
    '?page=abc → 1페이지',
    abcNo === '1' && abcRows[0] === page1[0],
    `현재 페이지 ${abcNo}, 첫 줄 같음 ${abcRows[0] === page1[0]}`,
    await shot(a, 'page-abc'),
  );
  await a.goto(`${base}/invitations?page=2`);
  const page2 = await bodyRows(a);
  await a.goto(`${base}/invitations?page=999`);
  const bigNo = await currentPageNo(a);
  const bigRows = await bodyRows(a);
  check(
    '?page=999 → 마지막(2) 페이지',
    bigNo === '2' && bigRows.length === page2.length && bigRows[0] === page2[0],
    `현재 페이지 ${bigNo}, ${bigRows.length}줄`,
    await shot(a, 'page-999'),
  );

  // 7. 운영자 추가
  await a.goto(`${base}/admins`);
  await a.getByLabel('이름').fill(NEW_ADMIN.name);
  await a.getByLabel('이메일').fill(NEW_ADMIN.email);
  await a.getByLabel(/임시 비밀번호/).fill(NEW_ADMIN.temp);
  await a.getByRole('button', { name: '운영자 추가' }).click();
  await a.getByRole('status').waitFor();
  check(
    '운영자 추가',
    (await a.getByRole('status').innerText()).includes(NEW_ADMIN.temp),
    '임시 비밀번호 안내가 한 번 보임',
    await shot(a, 'admin-created'),
  );

  // 8. 새 운영자로 로그인 → 비밀번호 변경 화면
  const ctxB = await browser.newContext({ viewport: VIEWPORT, locale: 'ko-KR' });
  const b = await ctxB.newPage();
  await login(b, NEW_ADMIN.email, NEW_ADMIN.temp);
  check('새 운영자 첫 로그인 → 비밀번호 변경', new URL(b.url()).pathname === '/password', b.url(), await shot(b, 'new-admin-password'));
  await b.getByLabel('현재 비밀번호').fill(NEW_ADMIN.temp);
  await b.getByLabel('새 비밀번호', { exact: true }).fill(NEW_ADMIN.next);
  await b.getByLabel('새 비밀번호 확인').fill(NEW_ADMIN.next);
  await b.getByRole('button', { name: '비밀번호 바꾸기' }).click();
  await b.waitForURL((u) => u.pathname !== '/password');
  await b.goto(`${base}/members`);
  check('비밀번호 바꾼 뒤 회원 화면', new URL(b.url()).pathname === '/members', b.url(), await shot(b, 'new-admin-members'));

  // 9. 첫 운영자가 새 운영자 비활성화 → 새 운영자 창 새로고침 시 로그인 화면
  await a.goto(`${base}/admins`);
  const newRow = a.locator('tbody tr').filter({ hasText: NEW_ADMIN.email });
  await newRow.getByRole('button', { name: '비활성화' }).click();
  await newRow.getByRole('button', { name: '다시 켜기' }).waitFor();
  check('새 운영자 비활성화', true, '"다시 켜기" 버튼으로 바뀜', await shot(a, 'admin-deactivated'));
  await b.reload();
  await b.waitForLoadState('networkidle');
  check('비활성 운영자 새로고침 → 로그인', new URL(b.url()).pathname === '/login', b.url(), await shot(b, 'new-admin-kicked'));

  // 10. 작업 기록
  await a.goto(`${base}/audit`);
  const auditText = await a.locator('tbody').innerText();
  const expected = ['회원 정지', '회원 정지 해제', '초대장 숨김', '운영자 추가', '비밀번호 변경', '운영자 비활성화'];
  const missing = expected.filter((t) => !auditText.includes(t));
  const korean = auditText.includes('정상 → 정지') && auditText.includes('보임 → 숨김');
  check(
    '작업 기록에 모두 남음',
    missing.length === 0 && korean,
    missing.length ? `빠짐: ${missing.join(', ')}` : `6종 모두, 한국어 전후 값 ${korean ? '확인' : '없음'}`,
    await shot(a, 'audit'),
  );

  // 11. CSV 내려받기: BOM·한글·수식 막기
  for (const [label, url] of [
    ['회원', `/members`],
    ['작업 기록', `/audit`],
  ] as const) {
    await a.goto(`${base}${url}`);
    const [download] = await Promise.all([a.waitForEvent('download'), a.getByRole('link', { name: 'CSV' }).click()]);
    const file = path.join(outDir, download.suggestedFilename());
    await download.saveAs(file);
    const text = await readFile(file, 'utf8');
    const bom = text.charCodeAt(0) === 0xfeff;
    const hangul = /[가-힣]/.test(text);
    let detail = `${download.suggestedFilename()}: BOM ${bom}, 한글 ${hangul}`;
    let ok = bom && hangul;
    if (label === '작업 기록') {
      const guarded = text.includes(`"'=HYPERLINK(""http://x"") 스팸 신고"`);
      const raw = /(^|,)=HYPERLINK/m.test(text);
      ok = ok && guarded && !raw;
      detail += `, 수식 사유 앞에 ' 붙음 ${guarded}`;
    }
    check(`${label} CSV`, ok, detail);
  }

  await writeFile(path.join(outDir, 'results.json'), JSON.stringify({ base, memberUrl, checks }, null, 2));
  await browser.close();
  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} 통과`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
