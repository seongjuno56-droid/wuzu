# wuzu 프론트엔드 1단계 설계

## 목표
사용자가 폰에서 직접 초대장을 만드는 앱 "wuzu"의 1단계 프론트엔드.
범위: 스플래시 → 로그인/회원가입/계정 찾기 → 메인 → 초대장 테마/템플릿 선택 → 템플릿 미리보기.
서버 없음. 모든 데이터는 mock 서비스로 처리하고, 이후 실제 DB로 교체 가능하게 한다.

## 결정 사항
- Expo(최신 SDK) + TypeScript + expo-router. 개발 확인은 웹(`expo start --web`)과 Expo Go.
- 상태: Zustand + AsyncStorage persist (세션, 푸시 동의 여부).
- 디자인: 그린 계열 포인트 컬러, 따뜻한 아이보리 서피스, Pretendard 폰트. 토큰은 `src/theme`.
- 네이티브 전용 기능(카카오 SDK, 푸시, 스토어 이동)은 mock. 카카오 로그인 버튼은 mock 카카오 계정으로 로그인.
- 구글/애플 로그인 버튼은 "2차 적용" — 표시만 하고 준비중 안내.

## 데이터 계층
- `src/services/types.ts`: `AuthService` 인터페이스 (login, socialLogin, signup, checkEmail, findId, sendCode, verifyCode, resetPassword, withdrawCancel, logout).
- `src/services/mock/`: AsyncStorage 기반 mock 구현 + 300~600ms 지연.
- `src/services/index.ts`: 현재 구현을 export. 실제 서버 도입 시 이 파일만 교체.
- 시드 계정 (비밀번호 `wuzu1234!`):
  - `test@wuzu.kr` 정상 (닉네임 홍길동, 휴대폰 01012345678, 생년월일 1991-01-01)
  - `leaving@wuzu.kr` 탈퇴 신청 중 (철회 가능 기한 표시)
  - `banned@wuzu.kr` 제재 계정
- 인증번호: mock 고정 `123456`, 화면에 테스트 안내. 유효시간 5분, 발송 최대 3회.
- 목업 콘텐츠(`src/data`): 테마 4종, 테마별 템플릿 10개, 배너 여러 장, 공지.

## 검증 규칙
- 이메일: 일반 이메일 정규식.
- 비밀번호: 8~20자, 영문 소문자 + 숫자 + 특수문자(`~!@#$^&*`) 각 1자 이상, 그 외 문자 불가.
- 이름/닉네임: 한글·영문·숫자, 1~20자.
- 휴대폰: 숫자 10~11자리.

## 화면 / 라우트
| 경로 | 내용 |
|---|---|
| `/` | 스플래시. 2초 후 홈. 강제 업데이트 플래그 시 업데이트 모달(플랫폼별 스토어 링크 mock) |
| `/(tabs)/index` | 홈. 비로그인: 로그인 유도 카드. 로그인: `{닉네임}님의 초대장 현황`. 추천 초대장 2x2, 배너 캐러셀(n/total), 공지, 푸터(약관 링크, 사업자 정보). 최초 진입 시 푸시 동의 모달 |
| `/(tabs)/create` | 테마 선택. "안녕하세요, {닉네임}님" |
| `/(tabs)/my-invites` | 빈 상태(다음 단계) |
| `/(tabs)/mypage` | 비로그인 시 탭 라벨 "로그인" → 로그인 화면. 로그인 시 간단한 프로필 + 로그아웃 |
| `/auth/login` | 로고, 카카오(구글/애플 2차) + 이메일/비밀번호 로그인, 찾기 링크, 회원가입, "로그인 전에 먼저 구경할래요". 탈퇴 상태 → 철회 모달, 제재 → 차단 모달 |
| `/auth/find` | 아이디 찾기/비밀번호 찾기 탭 |
| `/auth/find-id-result` | 마스킹된 이메일 + 가입일 |
| `/auth/reset-password` | 새 비밀번호 + 확인 → 완료 모달 |
| `/auth/signup/intro` | 소개 3항목 + 시작 버튼 |
| `/auth/signup/terms` | 필수 2 + 선택(프로모션) + 모두 동의 |
| `/auth/signup/profile` | 이름*, 생년월일, 성별(남/여/선택안함), 휴대폰 |
| `/auth/signup/email` | 이메일 입력 + 중복 확인 |
| `/auth/signup/password` | 비밀번호 + 확인 → 가입 |
| `/auth/signup/done` | 환영 + "WUZU 서비스 둘러보기" |
| `/create/[theme]` | 템플릿 캐러셀 n/10, 미리보기 / 선택하기 |
| `/create/[theme]/[templateId]` | 템플릿 미리보기(표지, 인사말, 예식정보 섹션) + 제작하기 |

- 소셜 로그인 첫 진입(신규): 약관 → 프로필(이름 프리필) → 완료. 이메일/비밀번호 단계 생략.
- "선택하기"/"제작하기"는 로그인 필요. 비로그인 시 로그인 화면으로. 로그인 상태면 "다음 단계에서 제공" 안내.

## 공통 컴포넌트 (`src/components`)
Button, TextField(지우기/비밀번호 보기 버튼, 도움말/오류 메시지), Header(뒤로가기), AppModal, CheckRow, SegmentedTabs, Screen(안전영역 + 폭 제한 컨테이너).

## 테스트
- Jest: validators, mock authService(로그인 상태별, 가입, 중복, 인증번호 제한, 아이디 찾기, 재설정).
- 화면: 웹에서 실행 후 브라우저로 주요 흐름 캡처 확인.
