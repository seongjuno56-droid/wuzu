# wuzu 프론트엔드 1단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스플래시 → 인증(로그인/가입/찾기) → 홈 → 초대장 테마/템플릿 선택·미리보기까지 동작하는 Expo 앱.

**Architecture:** expo-router 파일 기반 라우팅. 화면은 `src/services`의 `AuthService` 인터페이스만 사용하고 현재는 AsyncStorage 기반 mock 구현을 주입. 전역 세션/설정은 Zustand + persist.

**Tech Stack:** Expo SDK 57, expo-router, TypeScript, Zustand 5, @react-native-async-storage/async-storage, jest-expo.

**Spec:** `docs/superpowers/specs/2026-10-15-wuzu-frontend-phase1-design.md`

## Global Constraints
- 서버 호출 없음. 모든 데이터는 mock.
- 비밀번호 규칙: 8~20자, 소문자+숫자+특수문자(`~!@#$^&*`) 각 1자 이상, 그 외 문자 불가.
- 인증번호 mock `123456`, 유효 5분, 발송 최대 3회.
- 시드 계정 비밀번호 `wuzu1234!`: `test@wuzu.kr`(정상), `leaving@wuzu.kr`(탈퇴 신청), `banned@wuzu.kr`(제재).
- 포인트 컬러 그린, 폰트 Pretendard. 웹(`expo start --web`)에서 모바일 폭(최대 480px)으로 동작.

## Review Focus
1. 이메일 대소문자/앞뒤 공백 — `Test@Wuzu.kr ` 로도 로그인·중복확인 일치해야 함 → Task 2 테스트.
2. 인증번호 4번째 발송 시도 — 거부되고 남은 횟수 안내 → Task 2 테스트.
3. 만료(5분 경과)된 인증번호 입력 — 실패 처리 → Task 2 테스트.
4. 비밀번호 허용 외 문자(공백, 한글) 포함 — 형식 오류 → Task 1 테스트.
5. 앱 재시작 후 세션 유지, 푸시 동의 모달 재노출 안 됨 → Task 3 (persist) 수동 확인.

---

### Task 0: 프로젝트 스캐폴드
**Files:** `package.json`, `app.json`, `tsconfig.json`, `app/_layout.tsx`, `jest` 설정
- [ ] `create-expo-app` (blank-typescript)로 생성 후 expo-router, async-storage, zustand, react-native-web, react-dom, @expo/metro-runtime, jest-expo 설치.
- [ ] `app.json`에 `scheme: "wuzu"`, `web.bundler: "metro"`, `main: "expo-router/entry"`.
- [ ] `npx expo start --web` 로 빈 화면 확인, 커밋.

### Task 1: 검증 유틸
**Files:** Create `src/lib/validators.ts`, Test `src/lib/__tests__/validators.test.ts`
**Produces:** `isValidEmail(s): boolean`, `isValidPassword(s): boolean`, `isValidName(s): boolean`, `isValidPhone(s): boolean`, `normalizeEmail(s): string`, `maskEmail(s): string` (`abcd1234@naver.com` → `abcd12**@naver.com`)

```ts
import { isValidEmail, isValidPassword, isValidName, isValidPhone, normalizeEmail, maskEmail } from '../validators';
test('email', () => {
  expect(isValidEmail('a@b.kr')).toBe(true);
  expect(isValidEmail('a@b')).toBe(false);
});
test('password', () => {
  expect(isValidPassword('wuzu1234!')).toBe(true);
  expect(isValidPassword('wuzu1234')).toBe(false);      // 특수문자 없음
  expect(isValidPassword('Wuzu1234!')).toBe(false);     // 대문자 불가
  expect(isValidPassword('wu zu1234!')).toBe(false);    // 공백
  expect(isValidPassword('우주wuzu1234!')).toBe(false);  // 한글
  expect(isValidPassword('w1!')).toBe(false);           // 길이
});
test('name/phone', () => {
  expect(isValidName('홍길동a1')).toBe(true);
  expect(isValidName('홍 길동')).toBe(false);
  expect(isValidPhone('01012345678')).toBe(true);
  expect(isValidPhone('010-1234')).toBe(false);
});
test('normalize/mask', () => {
  expect(normalizeEmail(' Test@Wuzu.KR ')).toBe('test@wuzu.kr');
  expect(maskEmail('abcd1234@naver.com')).toBe('abcd12**@naver.com');
});
```
- [ ] 테스트 작성 → 실패 확인 → 구현 → 통과 → 커밋.

### Task 2: AuthService 인터페이스 + mock 구현
**Files:** Create `src/services/types.ts`, `src/services/mock/mockAuthService.ts`, `src/services/mock/seed.ts`, `src/services/index.ts`, Test `src/services/__tests__/mockAuthService.test.ts`
**Produces:**
```ts
type Gender = 'male' | 'female' | 'none';
type AccountStatus = 'active' | 'withdrawing' | 'banned';
interface User { id: string; email: string | null; name: string; birth?: string; gender?: Gender; phone?: string; provider: 'email' | 'kakao' | 'google' | 'apple'; marketingAgreed: boolean; createdAt: string; status: AccountStatus; withdrawRequestedAt?: string; }
type LoginResult =
  | { ok: true; user: User }
  | { ok: false; reason: 'invalid' | 'banned' }
  | { ok: false; reason: 'withdrawing'; requestedAt: string; cancelDeadline: string; userId: string };
interface SignupInput { email?: string; password?: string; name: string; birth?: string; gender?: Gender; phone?: string; marketingAgreed: boolean; provider: User['provider']; }
interface AuthService {
  login(email: string, password: string): Promise<LoginResult>;
  socialLogin(provider: 'kakao'): Promise<{ user: User | null; profile: { name: string } }>; // user null = 신규
  isEmailTaken(email: string): Promise<boolean>;
  signup(input: SignupInput): Promise<User>;
  cancelWithdraw(userId: string): Promise<User>;
  findId(q: { name: string; birth: string; phone: string }): Promise<{ email: string; createdAt: string } | null>;
  sendCode(email: string): Promise<{ ok: true; sentCount: number; expiresAt: number } | { ok: false; reason: 'not_found' | 'limit' }>;
  verifyCode(email: string, code: string, now?: number): Promise<boolean>;
  resetPassword(email: string, newPassword: string): Promise<void>;
}
export const MOCK_CODE = '123456'; export const MAX_SEND = 3; export const CODE_TTL_MS = 300000;
```
`createMockAuthService({ delayMs, storage })` — storage는 `{ getItem, setItem }` 주입(테스트는 메모리 Map).

테스트 케이스:
- `test@wuzu.kr`/`wuzu1234!` 로그인 성공, ` Test@Wuzu.kr ` 도 성공, 틀린 비번 `invalid`.
- `leaving@wuzu.kr` → `withdrawing` + cancelDeadline(신청일+30일). `cancelWithdraw` 후 로그인 성공.
- `banned@wuzu.kr` → `banned`.
- `isEmailTaken('TEST@wuzu.kr')` true, 신규 false. signup 후 true, 로그인 가능.
- findId 일치 → 이메일, 불일치 → null.
- sendCode 3회 성공, 4회째 `limit`. 미가입 이메일 `not_found`.
- verifyCode `123456` true, 오답 false, `now = expiresAt + 1` false.
- resetPassword 후 새 비밀번호로 로그인.
- [ ] TDD 사이클 → 커밋.

### Task 3: 스토어 + 테마 토큰 + 공통 컴포넌트
**Files:** `src/store/session.ts` (Zustand persist: `user`, `pushConsent: 'agreed'|'declined'|null`, `setUser`, `logout`, `setPushConsent`, `hydrated`), `src/store/signupDraft.ts` (가입 단계 간 임시 데이터, persist 없음), `src/theme/index.ts` (colors, spacing, radius, typography), `src/components/{Screen,Header,Button,TextField,AppModal,CheckRow,SegmentedTabs,BottomCTA}.tsx`
- [ ] Pretendard 웹폰트 로드(`expo-font` + CDN otf), 실패해도 시스템 폰트로 동작.
- [ ] 컴포넌트를 임시 화면에 띄워 웹에서 확인, 커밋.

### Task 4: 스플래시 + 탭 레이아웃 + 홈
**Files:** `app/index.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/{home,create,my-invites,mypage}.tsx`, `src/data/{banners,notices,themes}.ts`, `src/config.ts` (`FORCE_UPDATE` 플래그, 스토어 URL)
- [ ] 스플래시 2초 → `/(tabs)/home` replace. `FORCE_UPDATE` true면 업데이트 모달 → `Linking.openURL(Platform.OS==='ios'? APP_STORE : PLAY_STORE)`.
- [ ] 홈: 로그인 여부별 상단 카드, 추천 초대장 2x2(테마로 이동), 배너 캐러셀(좌우 버튼, n/total), 공지, 푸터 사업자 정보. `pushConsent===null`이면 푸시 동의 모달.
- [ ] 탭 4개, 비로그인 시 마지막 탭 라벨 "로그인"이고 누르면 `/auth/login` push.
- [ ] 웹 확인, 커밋.

### Task 5: 로그인 + 탈퇴/제재 모달
**Files:** `app/auth/_layout.tsx`, `app/auth/login.tsx`
- [ ] 카카오 버튼 → `socialLogin('kakao')`; 신규면 draft에 provider/name 채우고 `/auth/signup/terms`. 기존이면 로그인 후 홈.
- [ ] 구글/애플 버튼: "2차 오픈 예정" 모달.
- [ ] 이메일 로그인: 결과별 처리 (invalid 오류 문구 / withdrawing 철회 모달 / banned 차단 모달).
- [ ] 웹에서 3개 시드 계정 확인, 커밋.

### Task 6: 회원가입 플로우
**Files:** `app/auth/signup/{intro,terms,profile,email,password,done}.tsx`
- [ ] terms: 필수 2개 미동의 시 다음 비활성. 모두 동의 토글. 소셜 가입은 terms → profile → `signup` → done.
- [ ] profile: 이름 필수/형식, 생년월일(YYYY-MM-DD 입력 마스크), 성별 3택, 휴대폰.
- [ ] email: 형식 오류 / 이미 가입 / 사용 가능 메시지(입력 400ms 후 확인).
- [ ] password: 형식·일치 메시지, 가입 완료 → `signup` → setUser → done.
- [ ] 웹에서 전체 흐름 확인, 커밋.

### Task 7: 아이디/비밀번호 찾기
**Files:** `app/auth/find.tsx`, `app/auth/find-id-result.tsx`, `app/auth/reset-password.tsx`
- [ ] 탭 전환. 아이디 찾기 불일치 모달 / 결과 화면(마스킹 이메일, 가입일, 로그인하기, 비밀번호 찾기 링크).
- [ ] 비밀번호 찾기: 발송(1/3), 5분 카운트다운, 4회째 "더 이상 발송할 수 없습니다", 인증 완료 후 다음 활성 → reset → 완료 모달 → 로그인.
- [ ] 커밋.

### Task 8: 초대장 테마/템플릿
**Files:** `app/(tabs)/create.tsx`, `app/create/[theme]/index.tsx`, `app/create/[theme]/[templateId].tsx`, `src/data/templates.ts`, `src/components/TemplatePreview.tsx`
- [ ] 테마 그리드 → 템플릿 캐러셀(좌우, n/10, 미리보기/선택하기) → 미리보기(표지/인사말/정보 섹션, 템플릿별 컬러·폰트 스타일).
- [ ] 선택/제작하기: 비로그인 → 로그인, 로그인 → "다음 단계에서 제공" 모달.
- [ ] 커밋.

### Task 9: 마이페이지 + 최종 점검
- [ ] mypage: 프로필, 로그아웃.
- [ ] `npx tsc --noEmit`, `npx jest` 통과. 웹에서 전체 흐름 캡처 확인. 커밋.
