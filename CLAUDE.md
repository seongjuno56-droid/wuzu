@AGENTS.md

# wuzu(우쥬) 작업 안내 (Claude 용)

결혼식·돌잔치·기업 행사·모임용 모바일 초대장 앱. 회사 어썸피플즈. 앱은 Expo(SDK 57, expo-router, zustand, jest), 어드민은 `admin/`(Next.js, vitest + PGlite). 패키지 `kr.wuzu.app`, scheme `wuzu`.

## 작업 규칙 (사용자가 정한 것)

- **말·글은 한국어만.** 대화, 주석, 문서, 커밋 메시지 모두. 코드 식별자·명령어·서비스 이름·커밋 접두어(feat: 등)·Co-Authored-By 줄만 영어.
- 큰 작업이나 QA 결과는 **HTML 아티팩트 보고서**로 낸다.
- 하위 에이전트는 **모두 opus**. 사용 한도에 걸려도 다른 모델로 바꾸지 말고 기다렸다가 같은 에이전트를 재개한다.
- 긴 작업은 시작할 때 **30분마다 점검 예약**(CronCreate, 정각·30분 피해서, 예: 13,43분)을 건다.
- 개발 서버(`npx expo start --lan --port 8081`)는 사용자 허락을 받고 켠다.
- main 병합·push 는 사용자가 정한다.
- 사용자에게 안내할 때는 **단계마다 정확한 버튼·메뉴 이름**을 적는다. 되돌릴 수 없는 설정은 미리 강조한다. "앞에서 말한 것"처럼 다시 찾게 하지 말고 내용을 다 적는다.
- Supabase 지역은 **서울(ap-northeast-2)로 확정**. 다시 묻지 않는다.
- 사용자는 노트북과 PC 를 오가며 작업한다. 작업을 시작할 때 `git pull` 을 하고, 마칠 때는 이 파일의 진행 상황을 고친 뒤 커밋해서 지금 브랜치를 push 한다(main 병합은 따로 묻는다).

## 보안

- service_role 키·DB 비밀번호·OAuth Client Secret 은 앱·채팅·저장소에 넣지 않는다. 앱에는 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`(publishable)만.
- `.env.local`, `admin/.env.local` 은 git 에 올라가지 않는다. 새 PC 에서는 다시 만들어야 한다.
- `supabase/test/auth_stub.sql` 은 테스트 전용. 운영 DB 에 올리지 않는다.

## 환경 메모

- Windows. python 없음. PowerShell 에서는 `npm` 대신 `npm.cmd`.
- Prettier 를 파일 전체에 돌리지 않는다.
- 지갑·초대장 목록·mockRsvp 테스트가 가끔 실패한다(다시 돌리면 통과).
- 린트 기준값 21 errors / 7 warnings(지금 18 / 2). 늘리지 않는다.
- SQL 을 사용자에게 줄 때는 `Get-Content -Raw -Encoding UTF8 <파일> | Set-Clipboard` 로 클립보드에 넣어 준다.

## 서버

- Supabase 프로젝트 `wuzu`(서울). 운영 DB 에 올린 마이그레이션: `20261027000001_core.sql`, `20261028000001_admin_login_lock.sql`, `20261029000001_member_auth.sql`(2026-10-30).
- GitHub 비공개 저장소 `seongjuno56-droid/wuzu`, 원격 origin.
- Vercel `wuzu-admin`(팀 sjport, Root Directory `admin`) https://wuzu-admin.vercel.app — Production 브랜치를 `main` 으로 바꾸라고 안내함(바꿨는지 미확인).

## 단계와 진행 상황

설계: `docs/superpowers/specs/2026-10-27-server-and-admin-design.md`
1단계: 1-A 스키마·어드민 뼈대(완료, main) → 1-B 앱 로그인(코드 완료) → 1-C 초대장·하객 웹 링크 → 1-D R2 사진 저장. 그다음 2단계 인앱결제·환불, 3단계 콘텐츠·대시보드, 4단계 푸시.

### 1-B 앱 로그인 — 브랜치 `feat/app-login`

- 카카오·구글만(이메일·네이버 뺌, 애플은 iOS 출시 때). 플레이스토어 먼저, 한국 1순위.
- 계획 `docs/superpowers/plans/2026-10-29-app-login.md`, 사용자 설정 안내 `docs/setup/app-login.md`.
- 보고서 https://claude.ai/artifact/RHPL6oj3CkbUMgwVtiWZGf
- 검증: 앱 jest 413, 어드민 vitest 93 통과, tsc 0.
- **브랜치는 실서버 확인을 마친 뒤 main 에 병합**하기로 함.

**사용자 콘솔 설정 진행 (2026-10-30 기준)** — `docs/setup/app-login.md` 순서와 대응:

- [x] 6번 SQL 첫 파일 `20261029000001_member_auth.sql` 실행
- [ ] 6번 SQL 둘째 파일 `20261029000002_deletion_requests.sql` (클립보드로 줬음, 실행 여부 확인할 것)
- [ ] 7번 pg_cron 켜기 → `supabase/manual/schedule_withdraw_finalize.sql` **한 번만** 실행
- [ ] 4번 Email 공급자 끄기 (Allow new users to sign up 은 켜 둠)
- [ ] 5번 Redirect URLs: `wuzu://auth/callback`, `exp://**`
- [ ] 0번 Callback URL 복사
- [ ] 2번 구글 OAuth(Web application) → Supabase Google
- [ ] 3번 카카오: **비즈 앱 전환**(어썸피플즈 사업자등록번호), 이메일 선택 동의, Allow users without an email 켬
- [ ] 1번 `.env.local`
- [ ] 8번 Vercel Firewall POST /delete-account 제한
- [ ] 10번 실서버 확인(가입 트리거, 탈퇴 확정과 auth.users 삭제, cron, /delete-account, 안드로이드 /auth/callback) → HTML 보고서. KOE205 가 나면 카카오 scopes 코드 수정.
- 안내 방식: 사이트별 회차(1회차 Supabase → 2회차 구글 → 3회차 카카오 → 4회차 Vercel), 단계 하나 끝나면 사용자가 "N 됨" 이라고 보냄.

### 미뤄 둔 것

- 1-D 때 `finalize_withdrawals` 가 R2 파일도 지우게 새 마이그레이션으로 고친다("사진 30일 뒤 삭제" 문구가 이미 공개됨).
- 2단계 때 탈퇴 확정 시 ledger 의 invitation_name·memo 익명화.
- 첫 EAS 빌드 때 env 를 설정하고, env 없으면 mock 로그인으로 나가는 것을 막는다.
- deletion_requests 보관 기간, provider check 좁히기, PKCE sb_flow_id, 운영자 비밀번호 초기화 화면.
- 개인 연락처가 앱 이용안내 `CONTACT` 에 들어 있음 → 회사 연락처로 바꾸라고 권함.

## 사용자 결정 모음

- 가입 지급 50레터(2단계). 환불은 남은 레터 100%(7일·미사용 전액). 도메인은 새로 삼(이름 미정). 인앱결제 먼저, PG 는 나중. 운영자 5명 같은 권한.
- 비용: 개발은 무료. 출시 때 Supabase Pro 월 25달러, Vercel Pro 월 20달러.
- 픽처히어(`photobooth-map`)는 별도 프로젝트.
