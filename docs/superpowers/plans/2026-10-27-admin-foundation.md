# 1-A 단계: DB 스키마 + 어드민 뼈대 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서버 DB 스키마(마이그레이션)와 웹 어드민의 뼈대 — 운영자 로그인·사이드바·작업 기록·운영자 관리 — 그리고 회원·초대장 조회/정지/숨김을 만든다. 앱은 아직 건드리지 않는다.

**Architecture:** 스키마는 저장소 루트 `supabase/migrations/*.sql` 에 Supabase 형식으로 둔다. 어드민은 `admin/` 의 별도 Next.js(App Router, TypeScript) 앱이고, 서버 코드만 DB 에 직접 연결한다(`DATABASE_URL` 이 있으면 `pg`, 없으면 로컬 파일 PGlite 에 마이그레이션·시드를 올려서 Supabase 계정 없이도 개발·QA). 바꾸는 작업은 모두 `withAudit` 한 트랜잭션 안에서 작업 기록과 함께 쓴다.

**Tech Stack:** Next.js 16 · React 19 · TypeScript · `pg` · `@electric-sql/pglite`(테스트·로컬 DB) · `bcryptjs` · `jose` · Vitest

**Spec:** `docs/superpowers/specs/2026-10-27-server-and-admin-design.md` (3장 결정 표·구현자 재량, 4장 데이터, 6.2·6.4·6.9장, 8장 1단계)

**1단계 나눔 (이 계획은 1-A):** 1-A 스키마+어드민 뼈대 → 1-B 앱 로그인(이메일·카카오·애플)·회원 서버화 → 1-C 초대장·방명록·참석 응답 서버화 + 하객 웹 링크(난수 주소) → 1-D 파일(R2·WebP). 각각 따로 계획을 쓴다. 1-A 는 앱 없이 혼자 돌아가고 시험된다.

## Global Constraints

- 문구·주석·커밋 메시지는 한국어. 영어는 식별자·명령어·고유명사·커밋 접두어만 (`feat:` 등). 커밋 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 어드민 모양: 왼쪽 220px 사이드바, 선택 메뉴는 브랜드 색 `#183A2E` 배경·흰 글자, 맨 아래 로그아웃, 오른쪽 본문 `padding: 28px 32px`, 표 위주. 위 왼쪽에 'wuzu 어드민'.
- 브라우저로 DB 주소·비밀값을 보내지 않는다: DB·세션 코드는 `import 'server-only'` 파일에만.
- 돈·회원 상태·콘텐츠를 바꾸는 동작은 확인 창을 거치고 `admin_audit_logs` 에 같은 트랜잭션으로 남는다(누가·언제·무엇을·대상·전후 값).
- 운영자 전원 같은 권한, `admins.role` 은 `'admin'` 만.
- 비밀번호는 bcrypt(비용 10), 세션은 jose HS256 서명 쿠키 `wuzu_admin`(httpOnly, sameSite lax, 운영 환경 secure), 12시간.
- 초대장 공개 주소 조각 `slug` 는 10자 이상·유일. 순번·초대장No 를 쓰지 않는다(값 생성은 1-C).
- 앱 쪽 타입과 값 맞추기: 테마 `wedding|dol|corporate|meetup`, 초대장 상태 `draft|final`, 보기 `story|scroll`, 회원 상태 `active|withdrawing|banned`, 가입 경로 `email|kakao|google|apple`, 원장 종류 `activate|extend|edit|charge|signup_bonus|admin_grant|admin_revoke|refund`.
- 모든 목록 20개씩 페이지, 검색·걸러 보기, CSV 내려받기.

## Review Focus

1. 비활성화된 운영자가 쿠키를 들고 계속 들어옴 → 다음 요청부터 로그인 화면으로(쿠키 서명만 믿지 않고 매 요청 DB 의 `active` 확인). → Task 4 테스트.
2. 검색어에 `%`·`_`·`'`·`\` → 글자 그대로 찾고 SQL 오류·주입 없음. → Task 6 테스트.
3. 마지막 남은 활성 운영자가 자기(또는 마지막 운영자)를 비활성화 → 막는다(아무도 못 들어오는 상태 방지). → Task 8 테스트.
4. 이미 정지된 회원 정지·이미 숨긴 초대장 숨김(더블 클릭) → 바뀐 게 없으면 작업 기록을 남기지 않고 오류도 없다. → Task 6·7 테스트.
5. `?page=abc`, `?page=-3`, 마지막 페이지 넘김 → 1페이지 또는 마지막 페이지로 맞추고 빈 화면·오류 없음. → Task 6 테스트(`parseListQuery`).

---

### Task 1: 어드민 프로젝트·DB 연결·마이그레이션 실행기

**Files:**
- Create: `admin/package.json`, `admin/tsconfig.json`, `admin/next.config.ts`, `admin/vitest.config.ts`, `admin/.gitignore`(`.next`, `.pglite`, `.env*`), `admin/.env.example`
- Create: `admin/lib/db.ts`, `admin/lib/migrate.ts`, `admin/test/db.ts`
- Create: `supabase/test/auth_stub.sql` — 테스트·로컬 PGlite 전용 `auth` 스키마 흉내. migrations 폴더에 두지 않는다(Supabase 에는 `auth` 가 이미 있다)
- Test: `admin/lib/__tests__/migrate.test.ts`
- Modify: 루트 `.gitignore` 에 `admin/.pglite`, `admin/.env.local`

**Interfaces:**
- Produces:
  - `interface Db { query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>; tx<R>(fn: (db: Db) => Promise<R>): Promise<R> }`
  - `getDb(): Promise<Db>` — `DATABASE_URL` 있으면 `pg.Pool`(ssl `rejectUnauthorized:false`), 없으면 `admin/.pglite` 파일 PGlite + `migrate()` + 비어 있으면 `seed()`(Task 9) 한 번
  - `migrate(db: Db, opts?: { withAuthStub?: boolean }): Promise<void>` — `supabase/migrations/*.sql` 을 이름순으로, `schema_migrations(name)` 표에 적힌 건 건너뜀. `withAuthStub` 이면 먼저 `supabase/test/auth_stub.sql`
  - 테스트용 `newTestDb(): Promise<Db>` — 메모리 PGlite + `migrate(db, { withAuthStub: true })`

- [ ] **Step 1:** `admin/` 에 Next 16·React 19·TypeScript 앱을 만든다(App Router, `app/` 폴더, Tailwind 없음). 의존성: `next react react-dom pg bcryptjs jose server-only`, 개발: `typescript @types/node @types/react @types/pg vitest @electric-sql/pglite tsx`. 스크립트: `dev`, `build`, `test: vitest run`, `create-admin: tsx scripts/create-admin.ts`.
- [ ] **Step 2:** `auth_stub.sql` — Supabase 와 같은 이름으로 흉내: `create schema auth; create table auth.users(id uuid primary key default gen_random_uuid(), email text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create role anon; create role authenticated;`(역할이 이미 있으면 건너뛰게 `do $$ … $$`). PGlite 에서 `gen_random_uuid()` 가 안 되면 `pgcrypto` 확장을 켠다.
- [ ] **Step 3: 실패하는 테스트** — `migrate.test.ts`:
  - `'빈 DB 에 마이그레이션을 올리고 두 번 돌려도 그대로'` — `newTestDb()` 후 `migrate()` 한 번 더 → 오류 없음, `select count(*) from schema_migrations` 가 마이그레이션 파일 수와 같다.
  - `'트랜잭션 안에서 던지면 되돌린다'` — `db.tx` 안에서 임시 표에 넣고 throw → 행 0.
- [ ] **Step 4:** `cd admin && npm test` → 실패(모듈 없음) 확인.
- [ ] **Step 5:** `db.ts`·`migrate.ts`·`test/db.ts` 구현. `pg` 쪽 `tx` 는 클라이언트 하나를 빌려 `begin/commit/rollback`; PGlite 쪽은 `pglite.transaction`.
- [ ] **Step 6:** `npm test` 통과 확인(이 시점 마이그레이션 파일이 없으면 Task 2 의 빈 파일 하나를 먼저 둔다).
- [ ] **Step 7:** 커밋 `feat: 어드민 프로젝트 뼈대 — DB 연결(pg·PGlite)과 마이그레이션 실행기`

### Task 2: 핵심 스키마 마이그레이션

**Files:**
- Create: `supabase/migrations/20261027000001_core.sql`
- Test: `admin/lib/__tests__/schema.test.ts`

**Interfaces:**
- Produces (표·칸 이름 — 이후 모든 작업이 이 이름을 쓴다):
  - `profiles(id uuid pk references auth.users(id), login_id text unique, email text, name text not null, birth date, gender text check in ('male','female','none'), phone text, provider text not null check in ('email','kakao','google','apple'), marketing_agreed bool not null default false, status text not null default 'active' check in ('active','withdrawing','banned'), withdraw_requested_at timestamptz, profile_updated_at timestamptz, marketing_updated_at timestamptz, created_at timestamptz not null default now())`
  - `invitations(id uuid pk default gen_random_uuid(), owner_id uuid not null references profiles(id), number text not null unique check (number ~ '^[0-9]{11}$'), slug text not null unique check (char_length(slug) >= 10), theme_id text not null check in ('wedding','dol','corporate','meetup'), template_id text not null, palette_id text, name text not null, status text not null default 'draft' check in ('draft','final'), view_mode text not null default 'story' check in ('story','scroll'), activated_at timestamptz, expires_at timestamptz, banned bool not null default false, files_purged_at timestamptz, guestbook_seen_at timestamptz, enabled jsonb not null default '{}', page_order jsonb not null default '[]', content jsonb not null, design jsonb not null default '{}', completed jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now())` — 앱의 `order` 는 예약어라 `page_order`
  - `guestbook_entries(id uuid pk, invitation_id uuid not null references invitations(id) on delete cascade, name text not null, password_hash text not null, content text not null, hidden bool not null default false, created_at timestamptz not null default now())`
  - `rsvp_responses(id uuid pk, invitation_id … on delete cascade, name text not null, attending bool not null, org text not null default '', phone text not null default '', companions int not null default 0 check (companions between 0 and 9), source text not null check in ('guest','manual'), created_at, updated_at)`
  - `ledger_entries(id uuid pk, number text not null unique, user_id uuid not null references profiles(id), invitation_id uuid references invitations(id) on delete set null, invitation_name text, kind text not null check in ('activate','extend','edit','charge','signup_bonus','admin_grant','admin_revoke','refund'), title text not null, lines jsonb not null default '[]', total int not null, price_won int, memo text, created_at timestamptz not null default now())`
  - 뷰 `letter_balances(user_id, balance)` = `sum(total)` per user (없으면 0 은 조회 쪽에서 `coalesce`)
  - `admins(id uuid pk, email text not null unique, name text not null, password_hash text not null, role text not null default 'admin' check (role = 'admin'), active bool not null default true, must_change_password bool not null default true, created_at, last_login_at timestamptz)`
  - `admin_audit_logs(id bigint generated always as identity pk, admin_id uuid not null references admins(id), action text not null, target_type text not null, target_id text, before jsonb, after jsonb, memo text, created_at timestamptz not null default now())` + 인덱스 `(created_at desc)`, `(target_type, target_id)`
  - 모든 public 표에 `enable row level security`(정책은 1-B·1-C 에서; 지금은 anon·authenticated 아무것도 못 함). 인덱스: `invitations(owner_id)`, `invitations(expires_at)`, `ledger_entries(user_id, created_at desc)`, `profiles(created_at desc)`.

- [ ] **Step 1: 실패하는 테스트** — `schema.test.ts`:
  - `'모든 표에 RLS 가 켜져 있다'` — `select relname from pg_class where relnamespace='public'::regnamespace and relkind='r' and not relrowsecurity` 결과에서 `schema_migrations` 빼면 빈 배열.
  - `'초대장 slug 는 10자 미만이면 거절, 같은 slug 두 번이면 거절'`.
  - `'초대장No 는 숫자 11자리만'` — `'1234'` 거절.
  - `'원장 종류는 정한 8가지만'` — `'bonus'` 거절, `'signup_bonus'` 통과.
  - `'잔액 뷰는 원장 합'` — +50(signup_bonus), −50(activate), +100(charge) → `letter_balances.balance = 100`.
  - `'운영자 역할은 admin 만'` — `role='owner'` 거절.
- [ ] **Step 2:** `npm test` → 실패 확인.
- [ ] **Step 3:** `core.sql` 작성(위 Produces 그대로).
- [ ] **Step 4:** `npm test` 통과.
- [ ] **Step 5:** 커밋 `feat: 서버 핵심 스키마 — 회원·초대장·방명록·참석 응답·레터 원장·운영자·작업 기록`

### Task 3: 작업 기록 (`withAudit`)

**Files:**
- Create: `admin/lib/audit.ts`
- Test: `admin/lib/__tests__/audit.test.ts`

**Interfaces:**
- Consumes: Task 1 `Db`
- Produces:
  - `type AuditAction = 'member.ban' | 'member.unban' | 'invitation.hide' | 'invitation.unhide' | 'admin.create' | 'admin.deactivate' | 'admin.reactivate' | 'admin.password_change'`
  - `withAudit<R>(db: Db, entry: { adminId: string; action: AuditAction; targetType: 'member' | 'invitation' | 'admin'; targetId: string; memo?: string }, change: (tx: Db) => Promise<{ before: unknown; after: unknown; changed: boolean; result: R }>): Promise<R>` — `changed` 가 false 면 기록하지 않는다
  - `listAuditLogs(db: Db, q: { adminId?: string; action?: string; targetType?: string; from?: string; to?: string; page: number }): Promise<{ rows: AuditRow[]; total: number }>` (`AuditRow` 에 운영자 이름 포함, 최신순)

- [ ] **Step 1: 실패하는 테스트**
  - `'바뀐 것과 기록이 함께 남는다'` — before/after 가 저장됨.
  - `'change 가 던지면 바뀐 것도 기록도 없다'`.
  - `'changed:false 면 기록하지 않는다'`.
  - `'listAuditLogs 걸러 보기·최신순·20개씩'` — 25건 → 1페이지 20, 2페이지 5, `total` 25.
- [ ] **Step 2:** 실패 확인 → **Step 3:** 구현 → **Step 4:** 통과 확인.
- [ ] **Step 5:** 커밋 `feat: 어드민 작업 기록 — 바뀐 내용과 같은 트랜잭션에 남기기`

### Task 4: 운영자 로그인·세션·첫 운영자 스크립트

**Files:**
- Create: `admin/lib/session.ts`, `admin/lib/admins.ts`, `admin/proxy.ts`, `admin/scripts/create-admin.ts`
- Test: `admin/lib/__tests__/admins.test.ts`, `admin/lib/__tests__/session.test.ts`

**Interfaces:**
- Consumes: Task 1 `Db`, Task 3 `withAudit`
- Produces:
  - `session.ts`: `SESSION_COOKIE = 'wuzu_admin'`, `SESSION_TTL_SECONDS = 43200`, `signSession(adminId: string): Promise<string>`, `verifySession(token: string): Promise<{ adminId: string } | null>` (비밀값 `ADMIN_SESSION_SECRET`, 32자 미만이면 시작 때 오류)
  - `admins.ts`:
    - `login(db, email, password): Promise<{ ok: true; adminId: string; mustChangePassword: boolean } | { ok: false }>` — 이메일 대소문자 무시, 비활성은 `{ ok:false }`, 성공 시 `last_login_at` 갱신. 없는 이메일이어도 bcrypt 비교 한 번(시간 차로 계정 유무 노출 방지)
    - `currentAdmin(db, token: string | undefined): Promise<AdminRow | null>` — 서명 확인 **그리고** DB 의 `active` 확인
    - `requireAdmin(): Promise<AdminRow>` — 서버 컴포넌트·서버 액션용, 쿠키 읽어 `currentAdmin`, 없으면 `redirect('/login')`; `must_change_password` 면 `/password` 외 화면에서 `redirect('/password')`
    - `changePassword(db, adminId, current, next): Promise<'ok' | 'wrong_current' | 'too_short'>` — 10자 이상, 성공 시 `must_change_password=false`, 작업 기록 `admin.password_change`(before/after 에 비밀번호 넣지 않음)
  - `proxy.ts`: `/login` 외 모든 경로에서 쿠키 서명만 빠르게 확인해 없으면 `/login` 으로 (DB 확인은 `requireAdmin`)
  - `scripts/create-admin.ts <email> <name> <password>` — 처음 운영자(`must_change_password=false`)를 만든다. 작업 기록 없음(운영자가 아직 없으므로)

- [ ] **Step 1: 실패하는 테스트**
  - `'맞는 비밀번호면 로그인, 틀리면 실패, 대문자 이메일도 같은 계정'`.
  - `'비활성 운영자는 로그인 실패'`.
  - `'비활성화되면 들고 있던 세션도 currentAdmin 이 null'` (Review Focus 1).
  - `'서명이 바뀐 토큰·만료된 토큰은 null'`.
  - `'비밀번호 변경: 현재 비밀번호 틀리면 wrong_current, 9자면 too_short, 성공하면 must_change_password false 와 작업 기록 한 줄'`.
- [ ] **Step 2:** 실패 확인 → **Step 3:** 구현 → **Step 4:** 통과 확인.
- [ ] **Step 5:** 커밋 `feat: 운영자 로그인·세션·첫 운영자 만들기 스크립트`

### Task 5: 화면 틀 — 로그인·비밀번호 변경·사이드바

**Files:**
- Create: `admin/app/layout.tsx`, `admin/app/globals.css`(색 토큰: `--brand:#183A2E`, `--divider`, `--text-primary`, `--text-secondary`, `--radius-sm`), `admin/app/login/page.tsx`, `admin/app/login/actions.ts`, `admin/app/password/page.tsx`, `admin/app/(main)/layout.tsx`, `admin/app/(main)/page.tsx`(→ `/members` 로 이동), `admin/components/AdminNav.tsx`, `admin/components/ui.tsx`(표·페이지 버튼·검색줄·확인 버튼), `admin/public/brand/mark.svg`(앱 `assets` 의 로고에서)
- Test: 없음(화면). 확인은 Task 9 QA.

**Interfaces:**
- Consumes: Task 4 `login`, `requireAdmin`, `changePassword`, `signSession`, `SESSION_COOKIE`
- Produces: `AdminNav` 메뉴 `[{ href:'/members', label:'회원' }, { href:'/invitations', label:'초대장' }, { href:'/admins', label:'운영자' }, { href:'/audit', label:'작업 기록' }]` — 이후 단계에서 이 배열에 더한다(대시보드는 3단계에서 맨 위). `ui.tsx`: `DataTable`, `Pager({ page, total, pageSize })`, `SearchBar`, `ConfirmButton({ message, action })`(확인 창 후 서버 액션 실행)

- [ ] **Step 1:** 로그인 화면(이메일·비밀번호, 실패 문구 '이메일 또는 비밀번호가 올바르지 않습니다.'), 서버 액션으로 쿠키 설정 후 `must_change_password` 면 `/password`, 아니면 `/members`.
- [ ] **Step 2:** 비밀번호 변경 화면(현재·새·새 확인, 10자 이상 안내).
- [ ] **Step 3:** `(main)/layout.tsx` 에서 `requireAdmin()`, 픽처히어 어드민과 같은 사이드바(Global Constraints 값), 아래쪽에 운영자 이름과 [로그아웃].
- [ ] **Step 4:** `cd admin && npx tsc --noEmit && npm run build` 성공.
- [ ] **Step 5:** 커밋 `feat: 어드민 화면 틀 — 로그인·첫 비밀번호 변경·사이드바`

### Task 6: 회원 — 목록·상세·정지/해제·CSV

**Files:**
- Create: `admin/lib/listQuery.ts`, `admin/lib/members.ts`, `admin/lib/csv.ts`, `admin/app/(main)/members/page.tsx`, `admin/app/(main)/members/[id]/page.tsx`, `admin/app/(main)/members/actions.ts`, `admin/app/(main)/members/export/route.ts`
- Test: `admin/lib/__tests__/listQuery.test.ts`, `admin/lib/__tests__/members.test.ts`, `admin/lib/__tests__/csv.test.ts`

**Interfaces:**
- Consumes: Task 1 `Db`, Task 3 `withAudit`, Task 4 `requireAdmin`, Task 5 `ui.tsx`
- Produces:
  - `listQuery.ts`: `PAGE_SIZE = 20`, `parseListQuery(sp: Record<string, string | string[] | undefined>): { q: string; page: number; filters: Record<string, string> }` (page 는 1 이상 정수, 아니면 1), `clampPage(page, total): number`, `likePattern(q: string): string` (`\`·`%`·`_` 를 `\` 로 감싸고 앞뒤 `%`, 쿼리는 `ilike $1 escape '\'`)
  - `members.ts`:
    - `listMembers(db, { q, status?, provider?, page }): Promise<{ rows: MemberRow[]; total: number }>` — `MemberRow = { id, loginId, email, name, provider, status, createdAt, balance: number, invitationCount: number }`, 검색은 이름·이메일·아이디, 최신 가입순
    - `getMember(db, id): Promise<MemberDetail | null>` — 정보 + 초대장 목록 + 잔액 + 최근 원장 20줄
    - `setMemberBanned(db, adminId, memberId, banned: boolean, memo: string): Promise<'ok' | 'not_found' | 'withdrawing'>` — 탈퇴 진행 중 회원은 바꾸지 않는다, 같은 상태면 기록 없음
  - `csv.ts`: `toCsv(header: string[], rows: (string | number | null)[][]): string` — 앞에 BOM(엑셀 한글), `"`·`,`·줄바꿈 들어간 칸은 따옴표, `=`·`+`·`-`·`@` 로 시작하는 칸은 앞에 `'` (엑셀 수식 주입 방지)

- [ ] **Step 1: 실패하는 테스트**
  - listQuery: `'page=abc·-3·빈값 → 1'`, `'clampPage(9, 41) → 3'`, `'likePattern("50%_a\\") 는 글자 그대로 찾는다'` — 회원 이름 `50%_a\` 와 `500a` 중 첫 회원만 걸림(Review Focus 2·5).
  - members: `'검색·상태 걸러 보기·잔액·초대장 수'`, `'정지 후 다시 정지하면 기록은 한 줄'`(Review Focus 4), `'탈퇴 진행 중 회원은 withdrawing'`, `'정지·해제 작업 기록에 before/after status'`.
  - csv: `'BOM·따옴표·수식 막기'` — `toCsv(['이름'], [['=1+1'], ['a,b']])` 가 `"﻿이름\n'=1+1\n\"a,b\""`.
- [ ] **Step 2:** 실패 확인 → **Step 3:** 구현(화면 포함: 목록 검색줄·상태/경로 선택·표·페이지, 상세의 [정지]/[정지 해제]는 사유 입력 + 확인 창, [CSV] 는 지금 걸러 본 조건 그대로 최대 5,000줄) → **Step 4:** 테스트 통과, `npx tsc --noEmit`.
- [ ] **Step 5:** 커밋 `feat: 어드민 회원 — 목록·상세·정지/해제·CSV`

### Task 7: 초대장 — 목록·숨김/해제·CSV

**Files:**
- Create: `admin/lib/invitations.ts`, `admin/app/(main)/invitations/page.tsx`, `admin/app/(main)/invitations/actions.ts`, `admin/app/(main)/invitations/export/route.ts`
- Test: `admin/lib/__tests__/invitations.test.ts`

**Interfaces:**
- Consumes: Task 6 `parseListQuery`, `likePattern`, `toCsv`, `ui.tsx`; Task 3 `withAudit`
- Produces:
  - `type InvitationState = 'draft' | 'active' | 'expired'` — `activated_at` 없음 → draft, `expires_at > now` → active, 아니면 expired
  - `invitationState(row, now: Date): InvitationState`
  - `listInvitations(db, { q, theme?, state?, banned?, page, now }): Promise<{ rows: InvitationRow[]; total: number }>` — `InvitationRow = { id, number, name, themeId, ownerId, ownerName, state, activatedAt, expiresAt, banned, createdAt }`, 검색은 초대장 이름·초대장No·만든 사람 이름, 최신순
  - `setInvitationBanned(db, adminId, id, banned, memo): Promise<'ok' | 'not_found'>`

- [ ] **Step 1: 실패하는 테스트**
  - `'상태 계산: 활성화 전·기간 안·만료'` (경계: `expires_at == now` 는 expired).
  - `'테마·상태·숨김 걸러 보기, 초대장No 검색'`.
  - `'숨긴 초대장 다시 숨기면 기록 없음, 해제는 기록'`.
- [ ] **Step 2:** 실패 확인 → **Step 3:** 구현(화면: 표에 테마 이름 한국어 '결혼식·돌잔치·기업 행사·모임', 상태 '작성 중·활성·만료', 숨김 표시, 행마다 [숨기기]/[숨김 해제] 사유+확인; 회원 상세에서 초대장 줄을 누르면 이 목록을 그 회원으로 걸러 연다) → **Step 4:** 통과, 타입 확인.
- [ ] **Step 5:** 커밋 `feat: 어드민 초대장 — 목록·숨김/해제·CSV`

### Task 8: 운영자 관리·작업 기록 화면

**Files:**
- Modify: `admin/lib/admins.ts`
- Create: `admin/app/(main)/admins/page.tsx`, `admin/app/(main)/admins/actions.ts`, `admin/app/(main)/audit/page.tsx`
- Test: `admin/lib/__tests__/adminsManage.test.ts`

**Interfaces:**
- Consumes: Task 3 `withAudit`, `listAuditLogs`; Task 4
- Produces:
  - `listAdmins(db): Promise<AdminRow[]>`
  - `createAdmin(db, byAdminId, { email, name, tempPassword }): Promise<'ok' | 'duplicate' | 'too_short'>` — `must_change_password=true`, 기록 `admin.create`
  - `setAdminActive(db, byAdminId, targetId, active: boolean): Promise<'ok' | 'last_admin' | 'not_found'>` — 비활성화 후 활성 운영자가 0명이 되면 `last_admin`

- [ ] **Step 1: 실패하는 테스트**
  - `'같은 이메일(대소문자 달라도) 두 번이면 duplicate'`.
  - `'임시 비밀번호 9자면 too_short'`.
  - `'마지막 활성 운영자는 비활성화 못 함 — 자기 자신이어도'` (Review Focus 3).
  - `'비활성화·재활성화 작업 기록'`.
- [ ] **Step 2:** 실패 확인 → **Step 3:** 구현(운영자 화면: 목록·추가 폼(임시 비밀번호는 만든 뒤 한 번만 보여 줌)·[비활성화]/[다시 켜기]; 작업 기록 화면: 운영자·종류·기간 걸러 보기, 행에 before→after 요약) → **Step 4:** 통과.
- [ ] **Step 5:** 커밋 `feat: 어드민 운영자 관리·작업 기록 화면`

### Task 9: 로컬 시드·화면 확인(QA)·배포 안내

**Files:**
- Create: `admin/lib/seed.ts`, `admin/README.md`
- Modify: `admin/lib/db.ts` (빈 로컬 PGlite 일 때 `seed()`)

**Interfaces:**
- Consumes: 모든 앞 작업
- Produces: `seed(db): Promise<void>` — 로컬 전용(`DATABASE_URL` 있으면 절대 실행 안 함): 운영자 `admin@wuzu.local` / `wuzu-admin-1234`(must_change_password=false), 회원 30명(경로·상태 섞어서, 1명 이름 `50%_a\`), 초대장 40개(테마 4종·상태 3종·2개 숨김), 원장(가입 50·충전·사용)

- [ ] **Step 1:** 시드 구현, `npm run dev` 로 띄워 Playwright 로 412px 이 아니라 **1280px** 폭에서 확인: 로그인 → 회원 검색(`50%`)·정지·해제 → 초대장 걸러 보기·숨김 → 운영자 추가 → 새 운영자로 로그인하면 비밀번호 변경 화면 → 첫 운영자로 새 운영자 비활성화 → 새 운영자 창 새로고침 시 로그인 화면 → 작업 기록에 모두 남음 → CSV 내려받아 한글·수식 막기 확인.
- [ ] **Step 2:** `README.md` — 실제 연결 순서(사용자가 할 일): Supabase 프로젝트 생성 → `supabase/migrations` 적용(`npx supabase db push` 또는 SQL 편집기) → Vercel 에 `admin/` 을 새 프로젝트로(Root Directory `admin`) → 환경변수 `DATABASE_URL`(Supabase 연결 문자열, 세션 풀러), `ADMIN_SESSION_SECRET`(32자 이상) → `npm run create-admin` 으로 첫 운영자.
- [ ] **Step 3:** `cd admin && npm test && npx tsc --noEmit && npm run build` 모두 통과. 앱 쪽 `npx jest` 도 그대로 통과(앱을 건드리지 않았는지).
- [ ] **Step 4:** 결과를 HTML 보고서(아티팩트)로: 통과·고침·화면 사진·판단 내역·남은 일.
- [ ] **Step 5:** 커밋 `feat: 어드민 로컬 시드·배포 안내`
