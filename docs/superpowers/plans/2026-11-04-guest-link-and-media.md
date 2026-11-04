# 하객 링크와 사진 저장 (1-C + 1-D) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 활성화한 초대장을 웹 링크로 공유하면 카카오톡에 썸네일이 나오고, 누르면 사진까지 든 초대장이 앱 없이 열린다.

**Architecture:** 초대장·방명록·참석 응답은 Supabase 로 옮기고, 하객은 익명 RPC 로만 접근한다. 파일은 저장할 때 Edge Function 이 준 서명 주소로 R2 에 직접 올린다. 하객 웹은 Expo 웹 빌드를 Vercel 새 프로젝트 `wuzu-guest` 에 올리고, `/i/<slug>` 를 Vercel Function 으로 돌려 미리보기 태그를 넣는다.

**Tech Stack:** Expo SDK 58, expo-router, zustand, jest / Supabase Postgres, Edge Functions(Deno), pg_cron / Cloudflare R2, Vercel Functions / 어드민 Next.js, vitest + PGlite

**Spec:** `docs/superpowers/specs/2026-11-04-guest-link-and-media-design.md`. 상위 설계 `2026-10-27-server-and-admin-design.md`.

## Global Constraints

- 말·주석·문서·커밋은 한국어. 커밋 끝 줄 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 앱 `npx jest`, 어드민 `cd admin && npx vitest run`, 타입 `npx tsc --noEmit`. 앱 린트는 21 errors / 7 warnings 를 넘지 않는다. Prettier 를 파일 전체에 돌리지 않는다.
- 마이그레이션은 새 파일로만 추가하고 기존 파일을 고치지 않는다. 새 표·함수에는 `grant` 를 명시한다(2026-05-30 이후 프로젝트 규칙). `auth_stub.sql` 은 운영에 올리지 않는다.
- SQL 은 사용자가 대시보드에서 실행한다. `Get-Content -Raw -Encoding UTF8 <파일> | Set-Clipboard` 로 넣어 준다. 운영 DB 변경, 비밀값 입력은 사용자가 한다.
- 비밀값(R2 키, service_role)은 앱·저장소·채팅에 넣지 않는다. 앱에는 공개 값만: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GUEST_WEB_URL`, `EXPO_PUBLIC_MEDIA_BASE_URL`.
- 환경 변수가 없으면 지금처럼 mock 으로 돈다. 테스트는 mock 과 PGlite 로 한다.
- 도메인은 이번 범위가 아니다. `vercel.app`·`r2.dev` 로 확인한다. 도메인이 바뀌어도 환경 변수만 고치면 되어야 한다.
- 사진: WebP, 본 이미지 긴 변 1080px·썸네일 긴 변 400px. GIF 5MB, 동영상 15초·20MB. 링크 썸네일: 800×400 JPEG.
- 하객 읽기·쓰기는 회원 표와 조인하지 않는다. 정지 회원의 초대장도 열린다.
- slug 는 첫 활성화 때 발급하고 바뀌지 않는다. 작성 중·활성화 전에는 없다.

## Review Focus

1. **초대장 이름이나 인사말에 `<script>`, 따옴표, 줄바꿈, 이모지** → 미리보기 HTML 이 깨지거나 스크립트가 실행되지 않는다. 테스트: Task 9.
2. **업로드 중 네트워크가 끊겼다가 저장을 다시 누름** → 쓰던 내용이 남고, 올린 파일을 다시 올리지 않고, 기기 주소가 서버에 저장되지 않는다. 테스트: Task 5.
3. **로그인 없이 RPC·표를 직접 호출** → 작성 중·숨김 초대장, 소유자 ID, 참석자 명단, 방명록 비밀번호 해시를 얻지 못하고 값을 못 고친다. 테스트: Task 2·3.
4. **만료 후 다시 활성화, 연장, 활성화 중 수정** → slug 가 그대로여서 전에 보낸 링크가 다시 열린다. 테스트: Task 2.
5. **다른 기기에서 불러온 초대장을 저장, 삭제된 파일을 가리키는 초대장을 열기** → 내 기기 주소가 없어 저장이 막히지 않고, 하객 화면은 깨진 이미지 대신 빈 자리로 동작한다. 테스트: Task 5·8.

---

## 파일 구조

| 위치 | 역할 |
|---|---|
| `supabase/migrations/20261104000001_invitation_owner.sql` | slug·썸네일 칸, 본인 초대장 RPC, 활성화 |
| `supabase/migrations/20261104000002_guest_access.sql` | 하객 읽기·방명록·참석 응답 RPC |
| `supabase/migrations/20261104000003_media_files.sql` | `media_files`, 삭제 대기열, 탈퇴·삭제 연결, 하객 정보 파기 함수 |
| `supabase/manual/schedule_guest_link.sql` | pg_cron 예약 (한 번만 실행) |
| `supabase/functions/_shared/uploadRules.ts` | 종류·크기 검사 순수 함수 |
| `supabase/functions/sign-upload/` `purge-media/` | 서명 주소 발급, R2 삭제 |
| `src/services/supabase/supabaseInvitationService.ts` `supabaseRsvpService.ts` | 서비스 구현 |
| `src/services/media/localMedia.ts` `uploadDraftMedia.ts` `mediaRef.ts` | 파일 찾기·업로드·주소 변환 |
| `src/features/invitation/linkThumb.ts` | 링크 썸네일 고르기·대체 |
| `src/features/invitation/GuestInvitationScreen.tsx` | 하객 화면 공통 |
| `src/app/i/[slug].tsx`, `src/app/privacy.tsx` | 공개 웹 경로 |
| `api/guest-page.ts`, `api/_lib/og.ts`, `vercel.json` (저장소 맨 위) | 하객 웹 Vercel 설정과 미리보기 Function |
| `docs/setup/guest-link.md` | 사용자 설정 안내 |

---

### Task 1: 미리 확인과 R2·Vercel 설정

구현이 달라질 수 있는 두 가지를 먼저 확인한다. 결과는 설계 문서 끝 "확인 결과" 절에 적는다.

**Files:** Create `docs/setup/guest-link.md`, Modify 설계 문서

- [ ] **Step 1:** `docs/setup/guest-link.md` 에 Cloudflare 가입, R2 버킷 `wuzu-media` 생성, Public Development URL 켜기, R2 API 토큰, Vercel 새 프로젝트 `wuzu-guest`(팀 sjport, 이 저장소, Root Directory 는 저장소 맨 위) 생성을 버튼 이름까지 적는다. 사이트별 회차로 나누고, 되돌릴 수 없는 설정을 강조한다.
- [ ] **Step 2:** 아이폰 Expo Go 에서 `SaveFormat.WEBP` 저장을 시험한다. 실패하면 그 플랫폼은 JPEG 로 대체한다는 결정을 적는다.
- [ ] **Step 3:** 설정 안내·설계 문서를 커밋한다. 카카오톡 카드 실제 확인은 Task 9·11 에서 한다.

### Task 2: 본인 초대장 서버

**Files:** Create `supabase/migrations/20261104000001_invitation_owner.sql`, Test `admin/lib/__tests__/invitationOwner.test.ts`

**Interfaces:** Produces — RPC(모두 `auth.uid()` 본인 기준, `authenticated` 만 실행):
`list_my_invitations()`, `get_my_invitation(p_id uuid)`, `save_my_invitation(p_id uuid, p_data jsonb)`(p_id 가 null 이면 새로 만들고 uuid·11자리 번호 발급), `rename_my_invitation(p_id, p_name)`, `remove_my_invitation(p_id)`, `mark_guestbook_seen(p_id, p_at)`, `apply_invitation_order(p_order jsonb)` 반환 `{ok, invitation}|{ok:false, reason}`. 칸 추가: `slug` null 허용, `link_thumb text`.

- [ ] **Step 1: 실패하는 테스트**: `newTestDb()`·`addMember` 로 다음을 검사한다.
  - `남의 초대장은 목록·조회·저장·삭제가 안 된다`
  - `앱이 보낸 number·owner_id·activated_at·expires_at·banned·slug 는 무시한다`
  - `활성화 중이면 save 가 PAID_EDIT_REQUIRED 로 거부된다`
  - `첫 활성화에 slug(10자 이상)가 생기고 기간은 15일이다` (실제 일수는 `src/features/wallet/pricing.ts` 의 `ACTIVATION` 과 같게)
  - `연장·수정·만료 후 재활성화에도 slug 가 그대로다`
  - `작성 중에는 slug 가 null 이다`
  - `banned 초대장은 blocked, 상태가 맞지 않으면 invalid`
  - `anon 은 표·RPC 모두 접근이 막힌다`
- [ ] **Step 2:** `cd admin && npx vitest run lib/__tests__/invitationOwner.test.ts` — FAIL 확인.
- [ ] **Step 3:** 마이그레이션 작성. `applyOrder`(`pricing.ts`), mock `save` 의 규칙을 SQL 로 옮긴다. slug 는 `gen_random_bytes` 로 만든 base62 12자. 표 직접 권한은 `revoke`, RPC 는 `security definer` + `set search_path`.
- [ ] **Step 4:** 테스트 통과 확인 후 커밋.

### Task 3: 하객 서버

**Files:** Create `supabase/migrations/20261104000002_guest_access.sql`, Test `admin/lib/__tests__/guestAccess.test.ts`

**Interfaces:** Produces — `anon, authenticated` 실행: `guest_invitation(p_slug text)` 반환 `{state:'active'|'expired'|'not_found', invitation?}`, `guest_list_guestbook(p_id)`, `guest_add_guestbook(p_id, p_name, p_password, p_content)`, `guest_remove_guestbook(p_id, p_entry, p_password)`, `guest_rsvp_submit(p_id, p_input jsonb, p_response uuid, p_token text)` 반환 `{ok, response, token, created}|{ok:false, reason}`, `guest_rsvp_get(p_id, p_response, p_token)`. `authenticated` 본인 전용: `owner_rsvp_list/add/update/remove`, `owner_remove_guestbook`, `owner_list_guestbook`.

- [ ] **Step 1: 실패하는 테스트**:
  - `활성화 중 초대장만 내용을 준다. 작성 중·없는 주소·숨김·삭제는 not_found, 만료는 expired 이고 내용이 없다`
  - `돌려준 값에 owner_id·guestbook_seen_at·completed 가 없다`
  - `정지·탈퇴 신청 회원의 초대장도 열린다`
  - `방명록 목록에 password_hash·숨긴 글이 없다`
  - `비밀번호가 틀리면 삭제 안 되고 wrong_password`, 해시로 저장된다
  - `활성화 중이 아니면 방명록·응답 쓰기가 거부된다`
  - `참석자 명단은 anon·다른 회원이 못 본다`
  - `응답 ID 만으로는 읽거나 고치지 못하고 토큰이 있어야 한다`
  - `마감 뒤 제출은 closed, 입력 검사 위반은 invalid` (규칙은 `src/features/rsvp/rsvp.ts`, `validateGuestbookEntry` 와 같게)
  - `초대장당 분당 쓰기 30건, 방명록·응답 각 5000건을 넘으면 rate_limited`
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현. 해시는 `extensions.crypt`/`gen_salt('bf')` 또는 이 프로젝트 PGlite 에서 되는 방식으로. 토큰은 해시만 저장한다.
- [ ] **Step 4:** 통과 확인 후 커밋.

### Task 4: 앱 서비스 연결

**Files:** Create `src/services/supabase/supabaseInvitationService.ts`, `supabaseRsvpService.ts`. Modify `src/services/types.ts`, `src/services/index.ts`, `src/services/mock/mockInvitationService.ts`, `mockWalletService.ts`, `mockRsvpService.ts`, `src/features/invitation/model.ts`, `editorStore.ts`, `src/features/rsvp/myRsvp.ts`. Test `src/services/__tests__/supabaseInvitationService.test.ts`, `supabaseRsvpService.test.ts`

**Interfaces:** Produces —
- `Invitation` 에 `slug?: string`, `linkThumb?: string | null`.
- `InvitationService` 에 `applyOrder(order: SpendOrder): Promise<{ ok: true; invitation: Invitation } | { ok: false; reason: 'not_found' | 'blocked' | 'invalid' }>`, `getBySlug(slug: string): Promise<{ state: 'active' | 'expired' | 'not_found'; invitation?: Invitation }>`.
- `RsvpSubmitResult` 성공에 `token?: string`, `RsvpService.get(invitationId, id, token?)`. `myRsvp` 값은 `{ id, token }` (예전 문자열 값은 무시).

- [ ] **Step 1: 실패하는 테스트**: `client.rpc` 를 가짜로 두고 `save 는 새 초대장이면 p_id null 로 보내고 받은 uuid 를 돌려준다`, `PAID_EDIT_REQUIRED 를 그대로 던진다`, `네트워크 오류는 던지고 빈 목록으로 삼키지 않는다`, `mock 지갑 spend 는 잔액이 모자라면 applyOrder 를 부르지 않는다`, `applyOrder 실패면 레터를 차감하지 않는다`.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현. 지갑은 mock 잔액을 쓰되 초대장 변경은 `invitationService.applyOrder` 로 넘긴다. 순서: 잔액 확인 → applyOrder → 차감 → 기록. `editorStore.markSaved` 가 서버 id 로 draft.id 를 바꾸게 하고, 새 초대장 번호·id 를 기기에서 만드는 곳은 mock 전용으로 둔다.
- [ ] **Step 4:** `src/services/index.ts` 에서 환경 변수가 있으면 Supabase 구현을 쓴다.
- [ ] **Step 5:** 전체 jest·tsc 통과 후 커밋.

### Task 5: 파일 올리기

**Files:** Create `src/services/media/localMedia.ts`, `mediaRef.ts`, `uploadDraftMedia.ts`, `supabase/functions/_shared/uploadRules.ts`, `supabase/functions/sign-upload/index.ts`, `supabase/migrations/20261104000003_media_files.sql`. Modify `src/features/invitation/media.ts`, `src/features/canvas/media.ts`, `src/features/canvas/model.ts`, `src/app/create/editor/compose.tsx`, `src/features/wallet/usePurchaseFlow.tsx`. Test `src/services/__tests__/localMedia.test.ts`, `uploadDraftMedia.test.ts`, `uploadRules.test.ts`, `admin/lib/__tests__/mediaFiles.test.ts`

**Interfaces:** Produces —
- `collectLocalMedia(inv: Invitation): LocalMedia[]`: `content`·`design`·`linkThumb` 의 모든 기기 주소(`file:`, `content:`, `data:`, `blob:`, `ph:`)를 종류와 함께.
- `toMediaRef(url)`, `fromMediaRef(ref)`: 서버 값은 `r2://<key>`, 앱 값은 `EXPO_PUBLIC_MEDIA_BASE_URL/<key>`. 서비스 경계에서 변환한다.
- `uploadDraftMedia(inv, deps): Promise<Invitation>`: 바뀐 파일만 올리고 주소를 바꾼 복사본을 돌려준다. 실패하면 던진다.
- 표 `media_files(id, r2_key, invitation_id, kind, bytes, in_use, delete_requested_at, deleted_at)`. 함수 `mark_media_removed`.
- Edge Function `sign-upload`: `{invitationId, kind, contentType, bytes}` → `{key, url, headers}`.

- [ ] **Step 1: 실패하는 테스트**:
  - `collectLocalMedia 는 캔버스 사진·GIF·동영상·BGM·갤러리·링크 썸네일을 모두 찾는다` (테마 4개 샘플로)
  - `이미 r2 주소인 값은 찾지 않는다`, 그래서 `다른 기기에서 불러온 초대장은 올릴 파일이 없다`
  - `한 파일이 실패하면 던지고, 다시 부르면 성공한 파일은 다시 올리지 않는다`
  - `같은 파일이 두 곳에 쓰이면 한 번만 올린다`
  - `uploadRules: 허용 안 된 종류·GIF 5MB 초과·동영상 20MB 초과·사진 2MB 초과는 거부` (BGM 은 `LIMITS.bgmBytes`)
  - `남의 초대장 파일은 media_files 에 기록할 수 없다`
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현. 사진은 `media.ts` 에서 1080px·WebP, 400px 썸네일 두 벌. Task 1 결과에 따라 대체. `CANVAS_LIMITS` 를 `gifBytes: 5MB`, `videoBytes: 20MB` 로 낮춘다. 서명은 `aws4fetch` 로, 비밀값은 Edge Function 환경 변수. 키는 `invitations/<초대장 id>/<난수>.<확장자>`.
- [ ] **Step 4:** `compose.tsx` 저장과 `usePurchaseFlow` 수정 저장 전에 `uploadDraftMedia` 를 부른다. 실패하면 `toast('사진을 올리지 못했어요. 다시 시도해 주세요.')`, 편집 내용은 그대로 둔다. 올리는 동안 진행 표시.
- [ ] **Step 5:** 전체 테스트 통과 후 커밋. `docs/setup/guest-link.md` 에 함수 배포·비밀값 입력 순서를 더한다.

### Task 6: 링크 썸네일

**Files:** Create `src/features/invitation/linkThumb.ts`, `src/features/invitation/editor/LinkThumbField.tsx`. Modify `src/features/invitation/editor/SectionSheet` 또는 정보 입력의 기본 정보 폼들, `src/i18n/en/*`. Test `src/features/invitation/__tests__/linkThumb.test.tsx`

**Interfaces:** Produces — `pickLinkThumb(): Promise<string | null>`(가운데 기준 2:1 자르기, 800×400 JPEG), `linkThumbFallback(inv): string | null`(대표 사진 → 인사말 → 갤러리 첫 장), `prepareLinkThumb(inv): Promise<Invitation>`(저장 때 대체 이미지를 800×400 JPEG 로 만들어 `linkThumb` 에 넣되, 직접 올린 값은 건드리지 않는다).

- [ ] **Step 1: 실패하는 테스트**: `linkThumbFallback 은 테마별로 정한 순서를 따른다`, `사진이 없으면 null`, `직접 올린 썸네일이 있으면 대체하지 않는다`, `입력 칸 아래에 "권장 800×400px (가로:세로 2:1), JPG·PNG" 문구가 보인다`, `지우기를 누르면 null`.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현. 필드는 선택 항목이며 빨간 점 검사에 넣지 않는다. 고른 뒤 미리보기를 2:1 로 보여 준다. 썸네일을 바꾸면 Task 5 키가 새로 생겨 카카오톡 캐시가 풀린다.
- [ ] **Step 4:** 번역 포함 전체 테스트 후 커밋.

### Task 7: 공유와 완료 안내

**Files:** Modify `src/features/my-invites/share.ts`, `src/features/wallet/PurchaseScreen.tsx`, `src/app/(tabs)/my-invites.tsx`, `src/i18n/en/*`. Test `src/features/my-invites/__tests__/share.test.ts`, 활성화 화면 테스트

**Interfaces:** Produces — `guestUrl(inv: Invitation): string | null`: slug 가 있으면 `${EXPO_PUBLIC_GUEST_WEB_URL}/i/${slug}`, 없으면 null.

- [ ] **Step 1: 실패하는 테스트**: `slug 가 없으면 공유 버튼이 없다`, `공유 문구는 이름과 웹 주소다`, `주소 끝 슬래시를 정리한다`, `첫 활성화 뒤 "초대장이 완성되었습니다." 안내와 공유하기가 보인다`, `연장 뒤에는 이 안내가 나오지 않는다`, `mock 모드(웹 주소 환경 변수 없음)에서는 지금처럼 앱 주소를 쓴다`.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** 통과 후 커밋.

### Task 8: 하객 화면

**Files:** Create `src/features/invitation/GuestInvitationScreen.tsx`, `src/app/i/[slug].tsx`, `src/app/privacy.tsx`. Modify `src/app/invite/[id].tsx`, `src/features/rsvp/RsvpFormModal.tsx`, `src/features/invitation/GuestbookModals.tsx`, `src/app/_layout.tsx`, `src/data/terms.ts`, `src/i18n/en/*`. Test `src/features/invitation/__tests__/guestScreen.test.tsx`

**Interfaces:** Consumes — `getBySlug`, Task 4 의 RSVP 토큰.

- [ ] **Step 1: 실패하는 테스트**: `active 면 초대장, not_found 면 "초대장을 찾을 수 없어요", expired 면 "기간이 끝난 초대장이에요"`, `불러오다 네트워크 오류면 다시 시도 버튼`, `방명록·참석 응답 폼 아래에 수집 항목·목적·보유 기간 안내와 처리방침 링크`, `다시 열면 내 응답을 토큰으로 불러온다`, `사진 불러오기가 실패해도 화면이 멈추지 않는다`.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** `invite/[id].tsx` 의 본문을 공통 화면으로 옮긴다. `/i/<slug>`·`/privacy` 는 로그인·세션 복구·온보딩·앱 탭으로 이어지지 않는다. 하객 기기에서 부르던 mock 알림(`notificationService`)은 Supabase 모드에서 부르지 않는다. 푸시는 4단계이고, 만든 사람은 지금 있는 새 글 표시로 본다. 안내 문구: "입력하신 이름·소속·연락처·내용은 초대장을 만든 분께 전달하기 위해 수집하며, 초대장 기간이 끝나고 30일 뒤 삭제돼요."
- [ ] **Step 4:** `TERMS_PRIVACY` 에 하객 입력 정보, 파기 기간, Cloudflare 저장·국외 이전·처리 위탁 항목을 추가한다. 고친 문구를 보고서에 싣는다.
- [ ] **Step 5:** 통과 후 커밋.

### Task 9: 공개 웹과 미리보기

**Files:** Create `api/guest-page.ts`, `api/_lib/og.ts`, `vercel.json`, `scripts/build-guest-web.mjs`, `assets/link-default.jpg`(800×400). Modify `package.json`, `app.json`. Test `src/services/__tests__/og.test.ts`

**Interfaces:** Produces — `renderOg(html: string, meta: { title: string; description: string; image: string; url: string }): string`.

- [ ] **Step 1: 실패하는 테스트**: `제목의 <script>·따옴표·&·줄바꿈을 이스케이프한다`, `기존 head 뒤에 og:title·og:description·og:image·og:url·twitter:card 를 넣는다`, `이미지가 없으면 기본 이미지`, `없는 초대장·활성화 전·숨김은 초대장 정보를 넣지 않는 기본 태그`, `만료도 내용을 넣지 않는다`, `Supabase 호출이 실패해도 기본 태그로 정적 화면을 돌려준다`.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현. `vercel.json` 의 rewrite 로 `/i/:slug` 를 `/api/guest-page?slug=:slug` 에 보낸다. Function 은 `guest_invitation` RPC 만 부르고 빌드된 `index.html`(`includeFiles` 로 포함)에 태그를 넣는다. `linkThumb`(`r2://`)는 공개 주소로 바꾼다. 응답에 짧은 캐시를 둔다.
- [ ] **Step 4:** `vercel.json` 에 `buildCommand` 와 `outputDirectory` 를 **둘 다** 넣는다. 하나라도 빠지면 저장소 파일이 공개될 수 있다. 공개 경로 제한: `/i/*`, `/privacy`, 정적 자산만. 다른 주소는 안내 페이지로 보낸다.
- [ ] **Step 5:** `npm run build:guest-web` 으로 빌드하고, 하객 화면이 실제로 받는 JS·글꼴·이미지를 측정한다. LTE 제한 설정에서 표지까지 3초가 안 되면 번들 줄이기(샘플 사진 제외, 필요한 글꼴만, 경로 분리)를 하고 다시 측정한다. 수치를 설계 문서 "확인 결과" 절에 적는다.
- [ ] **Step 6:** `docs/setup/guest-link.md` 에 Vercel 배포와 환경 변수를 더하고. 배포 뒤 카카오톡 카드에서 JPEG 800×400 이 잘리지 않는지 사용자와 확인하고, 커밋한다.

### Task 10: 삭제와 어드민 제어, 파기 예약

**Files:** Create `supabase/functions/purge-media/index.ts`, `supabase/manual/schedule_guest_link.sql`, 새 마이그레이션 `20261104000004_invitation_purge.sql`. Modify `admin/lib/invitations.ts`, `admin/app/(main)/invitations/actions.ts`, `page.tsx`. Test `admin/lib/__tests__/invitationPurge.test.ts`, `admin/lib/__tests__/invitations.test.ts`

**Interfaces:** Produces — `purge_guest_data()`(만료 30일 지난 방명록·응답 삭제), `finalize_withdrawals` 재정의(파일을 삭제 대기열에 넣음), 어드민 `deleteInvitation(db, adminId, id)`.

- [ ] **Step 1: 실패하는 테스트**:
  - `만든 사람 삭제: 초대장·방명록·응답이 사라지고 파일이 삭제 대기열에 들어간다`
  - `어드민 삭제: 같은 결과이고 작업 기록에 남는다. 없는 id 는 오류`
  - `어드민 숨김 뒤 하객은 not_found, 해제하면 다시 열리고 파일은 그대로다`
  - `탈퇴 확정: 그 회원 초대장 파일이 대기열에 들어간다`
  - `purge_guest_data: 만료 30일 지난 것만 지우고, 29일째와 연장한 초대장은 남긴다`
  - `어드민 목록에서 번호·이름·회원 아이디로 찾는다` (기존 동작이면 회귀 테스트로)
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현. 삭제 버튼은 어드민 초대장 목록에, 이름을 다시 입력하는 확인 창을 둔다. `purge-media` 는 대기열을 읽어 R2 에서 지우고 `deleted_at` 을 채운다. 실패한 파일은 남겨 다음 실행에 다시 지운다. 호출 인증은 비밀값 헤더.
- [ ] **Step 4:** `schedule_guest_link.sql` 은 `purge_guest_data` 와 `purge-media` 호출을 매일 예약한다. 다시 실행해도 예약이 겹치지 않게 만든다.
- [ ] **Step 5:** 앱·어드민 전체 테스트 후 커밋.

### Task 11: 실서버 확인과 보고

**Files:** Modify `docs/setup/guest-link.md`, `CLAUDE.md`, 설계 문서

- [ ] **Step 1:** 사용자가 마이그레이션 4개를 순서대로 실행하고 Edge Function 과 Vercel `wuzu-guest` 를 배포한다. SQL 은 클립보드로 준다.
- [ ] **Step 2:** 설계 문서 10장의 8개 항목을 실제로 확인한다. 배포 주소에서 `/package.json`·`/CLAUDE.md` 같은 저장소 파일이 열리지 않는지, 아이폰에서 올린 사진의 실제 파일 형식이 WebP 인지(아니면 대체 결정 기록), `purge-media` 가 R2 파일을 실제로 지우는지도 본다. 익명 호출은 publishable 키로 직접 시도해 결과를 남긴다.
- [ ] **Step 3:** 찾은 문제를 고치고 다시 확인한다. 안드로이드를 못 보면 못 봤다고 적는다.
- [ ] **Step 4:** HTML 보고서를 낸다(개인정보 처리방침 수정 문구, 측정값, 못 본 것 포함). `CLAUDE.md` 진행 상황을 고치고 커밋·push 한다. main 병합은 사용자에게 묻는다.
