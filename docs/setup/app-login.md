# 앱 로그인 켜기 (카카오 · 구글)

wuzu 앱의 로그인을 실제 Supabase 에 연결하는 순서입니다. 코드는 이미 준비되어 있고, 아래는 각 사이트 화면에서 직접 누르는 일입니다.
한 줄에 한 가지 일만 적었습니다. 위에서부터 순서대로 하세요.

> 사이트 화면은 가끔 바뀝니다. 메뉴 이름이 조금 다르면 비슷한 이름을 찾고, 못 찾겠으면 화면을 캡처해 물어보세요.

## 먼저 알아 둘 것 (비밀 값)

| 값 | 어디에 넣나 | 남에게 보여도 되나 |
|---|---|---|
| Supabase Project URL, publishable(anon) 키 | 앱 `.env.local` | 됨 (앱 안에 그대로 들어가는 공개 값) |
| Supabase **service_role(secret) 키** | 어디에도 넣지 않음 | **절대 안 됨.** 앱·채팅·스크린샷 어디에도 붙이지 마세요 |
| Supabase **DB 비밀번호** | Vercel `DATABASE_URL` 안에만 | **절대 안 됨.** 채팅에 붙여 넣지 마세요 |
| 구글 **Client Secret** | Supabase 구글 설정 칸에만 | **안 됨** |
| 카카오 **Client Secret** | Supabase 카카오 설정 칸에만 | **안 됨** |

- 비밀 값을 채팅에 붙여야 할 것 같으면 대신 "넣었음" 이라고만 알려 주세요.
- 실수로 비밀 값이 밖에 나갔다면 그 사이트에서 새로 발급(재발급)하고, 새 값으로 바꿔 넣으면 됩니다.

## 0. 공통으로 쓰는 주소 하나 복사해 두기 (Supabase 콜백 주소)

1. [supabase.com/dashboard](https://supabase.com/dashboard) 에 로그인합니다.
2. wuzu 프로젝트를 엽니다.
3. 왼쪽 메뉴 **Authentication** 을 누릅니다.
4. **Sign In / Providers** 를 누릅니다.
5. 목록에서 **Google** 을 누릅니다.
6. 펼쳐진 칸 아래쪽 **Callback URL (for OAuth)** 의 주소를 복사해 메모장에 둡니다.
   모양: `https://<프로젝트 ref>.supabase.co/auth/v1/callback`
7. 아직 아무것도 켜지 말고 창을 닫습니다. (구글·카카오 둘 다 이 주소 하나를 씁니다.)

## 1. Supabase 키를 앱에 넣기

1. Supabase 대시보드 왼쪽 아래 **Project Settings** (톱니바퀴) 를 누릅니다.
2. **API Keys** 를 누릅니다.
3. **Project URL** 을 복사합니다. (화면에 없으면 **Data API** 메뉴에 있습니다.)
4. **publishable** 키 (예전 이름 **anon** `public`) 를 복사합니다.
5. **secret / service_role** 키는 복사하지 않습니다.
6. 저장소 맨 위 폴더(`invite app`)에 있는 `.env.example` 을 복사해 같은 폴더에 `.env.local` 이라는 이름으로 만듭니다.
7. `.env.local` 을 메모장으로 열어 아래처럼 채우고 저장합니다.
   ```
   EXPO_PUBLIC_SUPABASE_URL=<3번에서 복사한 Project URL>
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<4번에서 복사한 publishable 키>
   ```
   - 두 값이 모두 있어야 실제 로그인으로 동작합니다. 하나라도 비어 있으면 앱은 예전처럼 가짜(mock) 로그인으로 돕니다.
   - `.env.local` 은 git 에 올라가지 않는 파일입니다.

## 2. 구글 로그인 준비

1. [console.cloud.google.com](https://console.cloud.google.com) 에 로그인합니다.
2. 맨 위 프로젝트 선택 상자 → **새 프로젝트** → 이름 `wuzu` → **만들기**.
3. 만든 `wuzu` 프로젝트가 선택되어 있는지 맨 위에서 확인합니다.
4. 왼쪽 메뉴 **APIs & Services** → **OAuth consent screen** 을 누릅니다.
   (새 화면에서는 **Google Auth Platform** 으로 열리고, 메뉴가 **Branding / Audience / Clients** 로 나뉘어 있습니다.)
5. **Get started** (또는 **CONFIGURE CONSENT SCREEN**) 을 누릅니다.
6. 앱 이름 `wuzu`, 사용자 지원 이메일에 내 이메일을 넣습니다.
7. 대상(Audience)은 **External** 을 고릅니다.
8. 연락처 이메일을 넣고, 약관에 동의한 뒤 **Create** (만들기) 를 누릅니다.
9. 왼쪽 **Credentials** (새 화면에서는 **Clients**) 를 누릅니다.
10. **Create credentials** → **OAuth client ID** 를 누릅니다.
11. Application type 은 **Web application** 을 고릅니다. (Android 가 아닙니다.)
12. 이름은 `wuzu supabase` 처럼 아무거나 적습니다.
13. **Authorized redirect URIs** 의 **+ Add URI** 를 누르고 0단계에서 복사한 콜백 주소를 붙여 넣습니다.
14. **Create** 를 누릅니다.
15. 나온 **Client ID** 와 **Client Secret** 을 복사합니다. **Client Secret 은 비밀 값입니다.**
16. Supabase 대시보드 → **Authentication** → **Sign In / Providers** → **Google** 을 엽니다.
17. **Enable Sign in with Google** 을 켭니다.
18. **Client IDs** 칸에 15번의 Client ID 를 붙여 넣습니다.
19. **Client Secret (for OAuth)** 칸에 15번의 Client Secret 을 붙여 넣습니다.
20. **Save** 를 누릅니다.
21. 테스트하는 동안에는 구글 동의 화면이 "테스트 중" 상태라 등록한 사람만 로그인됩니다.
    구글 콘솔 **OAuth consent screen** (새 화면: **Audience**) → **Test users** → **+ Add users** 에 테스트할 구글 계정을 넣습니다.
22. **출시 전에** 같은 화면의 **Publish app** 을 눌러야 모든 사람이 로그인할 수 있습니다. (지금은 누르지 않아도 됩니다.)

## 3. 카카오 로그인 준비

1. [developers.kakao.com](https://developers.kakao.com) 에 로그인합니다.
2. 위 메뉴 **내 애플리케이션** → **애플리케이션 추가하기** 를 누릅니다.
3. 앱 이름 `wuzu`, 사업자명 `어썸피플즈` 를 넣고 저장합니다.
4. 만든 앱을 엽니다.
5. 왼쪽 **카카오 로그인** 을 누르고 **활성화 설정** 을 **ON** 으로 바꿉니다.
6. 같은 화면 **Redirect URI** 의 **Redirect URI 등록** 을 누르고 0단계의 Supabase 콜백 주소를 붙여 넣어 저장합니다.
7. **비즈 앱 전환 (꼭 해야 함)** — Supabase 는 카카오 로그인 때 항상 이메일 동의를 요청합니다. 카카오는 비즈 앱이어야 이메일 동의항목을 켤 수 있고, 이 항목이 없으면 로그인 화면에서 오류(KOE205)가 납니다. 어썸피플즈 사업자등록번호로 전환합니다.
8. 왼쪽 **앱 설정** → **비즈니스** 를 누릅니다.
9. **사업자 정보 등록** 을 누르고 어썸피플즈 **사업자등록번호** 와 사업자 정보를 넣어 저장합니다.
10. 같은 화면에서 **비즈 앱 전환** 을 누르고 안내에 따라 마칩니다. (전환되면 화면에 "비즈 앱" 표시가 보입니다.)
11. 왼쪽 **카카오 로그인** → **동의항목** 을 누릅니다.
12. **닉네임** 을 **필수 동의** (또는 선택 동의) 로 설정합니다.
13. **프로필 사진** 을 **선택 동의** 로 설정합니다.
14. **카카오계정(이메일)** 을 **선택 동의** 로 설정합니다. (설정 칸에 쓰임새를 적으라고 하면 "회원 식별 및 고객 문의 응대" 처럼 적습니다.)
15. 왼쪽 **카카오 로그인** → **보안** 을 누릅니다.
16. **Client Secret** 의 **코드 생성** 을 누르고, **활성화 상태** 를 **사용함** 으로 바꿉니다.
17. 나온 Client Secret 코드를 복사합니다. **비밀 값입니다.**
18. 왼쪽 **앱 키** (새 화면: **앱 → 플랫폼 키**) 에서 **REST API 키** 를 복사합니다.
19. Supabase 대시보드 → **Authentication** → **Sign In / Providers** → **Kakao** 를 엽니다.
20. **Enable Sign in with Kakao** 를 켭니다.
21. **REST API Key** 칸에 18번의 REST API 키를 붙여 넣습니다.
22. **Client Secret Code** 칸에 17번의 Client Secret 을 붙여 넣습니다.
23. **Allow users without an email** 을 **켭니다** (항상). 이메일이 선택 동의라서 사용자가 이메일 체크를 풀고 가입할 수 있는데, 이것이 꺼져 있으면 그 사람은 가입이 안 됩니다.
24. **Save** 를 누릅니다.

> 위를 다 했는데도 카카오 로그인 화면에 **KOE205** 오류가 나오면 화면을 캡처해 Claude 에게 알려 주세요. 코드에서 요청하는 동의 범위(scopes)를 조정해야 합니다.

## 4. 이메일 가입 끄기

wuzu 는 카카오·구글로만 가입합니다. Supabase 기본값인 이메일 가입을 꺼 둡니다.

1. Supabase 대시보드 → **Authentication** → **Sign In / Providers** 를 엽니다.
2. 목록에서 **Email** 을 누릅니다.
3. **Enable Email provider** 를 **끕니다**.
4. **Save** 를 누릅니다.
5. 같은 화면 위쪽 **Allow new users to sign up** 은 **켜 둔 채로** 둡니다. (끄면 카카오·구글 가입도 막힙니다.)

## 5. 앱으로 돌아오는 주소 허용

1. Supabase 대시보드 → **Authentication** → **URL Configuration** 을 엽니다.
2. **Redirect URLs** 의 **Add URL** 을 누르고 `wuzu://auth/callback` 을 넣어 저장합니다. (설치한 앱용)
3. 한 번 더 **Add URL** 을 누르고 `exp://**` 를 넣어 저장합니다. (Expo Go 테스트용)

## 6. DB 바꾸기 (마이그레이션 2개, 순서 지킴)

운영 DB 에는 `20261027000001_core.sql`, `20261028000001_admin_login_lock.sql` 이 이미 올라가 있습니다. 아래 두 개만 **이 순서대로** 올립니다. 각각 한 번만 실행합니다.

1. Supabase 대시보드 왼쪽 **SQL Editor** 를 엽니다.
2. **+ New query** 를 누릅니다.
3. 저장소의 `supabase/migrations/20261029000001_member_auth.sql` 내용을 전부 복사해 붙여 넣습니다.
4. **Run** 을 누르고 `Success. No rows returned` 가 나오는지 봅니다.
5. 다시 **+ New query** 를 누릅니다.
6. `supabase/migrations/20261029000002_deletion_requests.sql` 내용을 전부 복사해 붙여 넣습니다.
7. **Run** 을 누르고 성공을 확인합니다.

- 오류가 나면 그 다음 파일은 실행하지 말고 오류 문구를 그대로 복사해 알려 주세요. (`already exists` 는 이미 실행했다는 뜻입니다.)
- `supabase/test/auth_stub.sql` 은 테스트 전용입니다. 운영 DB 에 올리지 않습니다.

## 7. 탈퇴 자동 처리 예약 (한 번만)

탈퇴 신청 후 30일이 지난 회원을 매일 새벽 4시 17분(한국 시간)에 자동으로 확정합니다.

1. Supabase 대시보드 왼쪽 **Database** → **Extensions** 를 엽니다.
2. 검색 칸에 `pg_cron` 을 입력합니다.
3. 스위치를 켜고 **Enable extension** 을 누릅니다.
4. **SQL Editor** → **+ New query** 를 누릅니다.
5. `supabase/manual/schedule_withdraw_finalize.sql` 내용을 붙여 넣고 **Run** 을 누릅니다.
6. 결과에 숫자 하나(작업 번호)가 나오면 성공입니다. **두 번 실행하지 마세요.**

## 8. 탈퇴 요청 폼에 요청 수 제한 걸기 (Vercel Firewall)

로그인 없이 쓰는 `/delete-account` 폼은 자체 요청 수 제한이 없습니다. 누군가 폼을 마구 보내지 못하게 Vercel 방화벽 규칙을 겁니다. `/login` 에 걸어 둔 규칙과 같은 곳에서 합니다.

1. [vercel.com](https://vercel.com) → `wuzu-admin` 프로젝트를 엽니다.
2. 위 메뉴 **Firewall** 을 누릅니다.
3. **Configure** (또는 **Edit Rules**) → **+ New Rule** 을 누릅니다.
4. 이름: `delete-account rate limit`.
5. **If** 조건 첫 줄: **Request Path** · **Equals** · `/delete-account`.
6. **+ And** 를 눌러 둘째 줄: **Method** · **Equals** · `POST`.
7. **Then** 에서 **Rate Limit** 을 고릅니다.
8. 기준은 **IP**, 한도는 `60초에 5번` 정도로 둡니다. 넘으면 **Deny** (429).
9. **Save Rule** → 위의 **Review Changes** → **Publish** 를 눌러야 실제로 적용됩니다.

- 요금제 때문에 규칙을 더 만들 수 없다고 나오면, `/login` 규칙을 열어 조건을 "(**Request Path Equals** `/login` **Or** **Request Path Equals** `/delete-account`) **And** **Method Equals** `POST`" 가 되게 고치세요. 경로를 더할 때도 **Method = POST** 조건은 꼭 함께 남겨야 화면을 여는 일반 방문(GET)이 막히지 않습니다.
- 폼 보내기는 화면 주소(`/delete-account`)로 POST 요청이 가므로 위 조건으로 잡힙니다. 화면을 여는 GET 은 막지 않습니다.

## 9. 앱에서 Expo Go 로 해 보기

1. 1단계의 `.env.local` 이 저장소 맨 위 폴더에 있는지 확인합니다.
2. 이미 `npx expo start` 가 켜져 있으면 터미널에서 `Ctrl + C` 로 끕니다. (환경 변수는 켤 때만 읽습니다.)
3. 저장소 맨 위 폴더에서 `npx expo start -c` 로 다시 켭니다. (`-c` 는 이전 캐시를 지웁니다.)
4. 휴대폰 Expo Go 로 QR 을 찍어 앱을 엽니다.
5. 로그인 화면에서 **구글** 또는 **카카오** 를 눌러 봅니다.
6. 로그인 뒤 브라우저가 앱으로 돌아오지 않고 멈추면 5단계의 `exp://**` 가 저장됐는지 다시 확인합니다.

## 10. 실서버 확인 (설정을 마친 뒤)

10-1~10-4 는 어드민이 최신으로 배포된 뒤에 합니다(Vercel `wuzu-admin` 의 Production 이 `main` 브랜치 최신 커밋인지 먼저 확인).

각 항목이 무엇을 확인하는지 함께 적었습니다. 결과(되었음/안 됨, 화면 캡처)를 알려 주세요.

### 10-1. 가입이 실제로 되는지

1. Expo Go 에서 **카카오** 로 처음 가입합니다.
2. 어드민(`https://wuzu-admin.vercel.app`) → **회원** 에 새 회원이 보이고 **가입 경로** 가 `카카오`, **아이디** 가 `ka_` 로 시작하는지 봅니다.
3. 로그아웃 후 **구글** 로 처음 가입합니다.
4. 어드민 **회원** 에 새 회원이 보이고 **가입 경로** 가 `구글`, **아이디** 가 `go_` 로 시작하는지 봅니다.

→ 확인하는 것: 실제 Supabase 에서 가입할 때 회원 표(profiles)를 만드는 장치(가입 트리거)가 돌아간다는 것. 테스트용 DB 가 아닌 진짜 Supabase 에서는 이것으로만 확인할 수 있습니다.

### 10-2. 탈퇴 확정이 실제로 되는지

테스트 회원 **한 명** 으로만 합니다. 실제 회원에게는 하지 마세요.

1. 앱에서 테스트 회원으로 **마이페이지 → 회원정보 → 수정하기 → 회원탈퇴** → **탈퇴하기** 를 누릅니다.
2. 어드민 **회원** 에서 그 회원 상태가 `탈퇴 진행 중` 인지 봅니다.
3. 30일을 기다리는 대신 탈퇴 신청 날짜를 31일 앞으로 당깁니다. SQL Editor → **+ New query** 에 아래를 붙이고 이메일을 그 테스트 회원 것으로 바꾼 뒤 **Run**:
   ```sql
   update public.profiles
      set withdraw_requested_at = withdraw_requested_at - interval '31 days'
    where email = '테스트회원@이메일.com'
      and status = 'withdrawing'
   returning id, name, email, login_id, withdraw_requested_at;
   ```
   - 결과 표에 **한 줄이 나와야 합니다**. 아무 줄도 안 나오면 이메일이 틀렸거나 탈퇴 신청이 안 된 것입니다.
   - 카카오 회원이라 어드민에 이메일이 `-` 로 나오면 `where email = '…'` 대신 `where login_id = '…'` 로 바꾸고, 어드민에 보이는 아이디를 그대로 넣습니다 (예: `where login_id = 'ka_ab12cd34'`).
4. 확정하기 전에, 확정될 회원이 그 테스트 회원 한 명뿐인지 봅니다:
   ```sql
   select id, name, email, login_id, withdraw_requested_at
     from public.profiles
    where status = 'withdrawing'
      and withdraw_requested_at < now() - interval '30 days';
   ```
   테스트 회원 한 줄만 나와야 합니다. 다른 회원이 함께 나오면 멈추고 알려 주세요. (다음 명령은 나온 회원 모두를 되돌릴 수 없게 확정합니다.)
5. 탈퇴를 확정합니다. **되돌릴 수 없습니다.**
   ```sql
   select public.finalize_withdrawals();
   ```
   결과가 `1` 이면 성공입니다.
6. 어드민 **회원** 에서 그 회원이 이름 `탈퇴 회원`, 상태 `탈퇴 완료` 로 바뀌었는지 봅니다.
7. 앱에서 같은 카카오/구글 계정으로 다시 로그인합니다. 새 회원으로 가입되고, 어드민 **회원** 에 새 아이디로 한 명 더 생기면 성공입니다.

→ 확인하는 것: 30일 뒤 확정 때 Supabase 로그인 계정(auth.users)까지 실제로 지워진다는 것. 지워지지 않았다면 7번에서 새 가입이 되지 않습니다.

### 10-3. 매일 예약이 걸렸는지

1. SQL Editor 에서 실행:
   ```sql
   select * from cron.job;
   ```
2. `jobname` 이 `finalize-withdrawals`, `schedule` 이 `17 19 * * *` 인 줄이 **한 줄** 있으면 성공입니다.

→ 확인하는 것: 30일 지난 탈퇴가 사람 손 없이 매일 확정되도록 예약되어 있다는 것.

### 10-4. 탈퇴 요청 폼

1. 휴대폰이나 시크릿 창에서 `https://wuzu-admin.vercel.app/delete-account` 를 엽니다. (로그인 없이 열려야 합니다.)
2. 이메일을 넣고 폼을 보냅니다.
3. 어드민 **탈퇴 요청** 메뉴에 방금 요청이 보이면 성공입니다.

→ 확인하는 것: 앱을 지운 사람도 웹에서 삭제를 요청할 수 있다는 것 (구글 플레이 요구 사항).

## 11. 출시 때 (플레이 콘솔)

1. 구글 **Play Console** → wuzu 앱 → **앱 콘텐츠** → **데이터 보안** 을 엽니다.
2. 계정 삭제 URL 에 `https://wuzu-admin.vercel.app/delete-account` 를 넣습니다.
3. 2단계 22번의 구글 동의 화면 **Publish app** 도 이때 누릅니다.

## 탈퇴 요청 처리하기 (운영자)

`/delete-account` 폼으로 들어온 요청은 어드민 **탈퇴 요청** 메뉴의 **미처리** 탭에 쌓입니다. **받은 날부터 7일 안에** 처리하고 연락 이메일로 회신합니다. (폼과 화면에 7일이라고 약속해 두었습니다.)

### 1) 본인인지 확인

로그인 없이 받은 요청이라 누구나 남의 이메일을 적을 수 있습니다. 확인 없이 탈퇴시키지 않습니다.

1. 기본은 **앱에서 직접 회원탈퇴** 하도록 안내하는 것입니다. 연락 이메일로 "앱에서 **마이페이지 → 회원정보 → 수정하기 → 회원탈퇴** 로 직접 탈퇴할 수 있어요" 라고 회신합니다. 본인이 로그인해서 하므로 따로 확인할 필요가 없습니다.
2. 앱을 지웠거나 로그인할 수 없다는 경우에는 어드민 **회원** 에서 그 회원을 찾습니다.
   - 구글 회원: 검색 칸에 요청의 연락 이메일을 넣어 찾습니다.
   - 카카오 회원: 이메일이 없을 수 있습니다. **가입 경로** 를 `카카오` 로 고르고 검색 칸에 요청의 **앱 닉네임** 을 넣어 찾습니다.
3. 찾은 회원의 이메일이 연락 이메일과 같으면, 그 이메일로 "탈퇴를 요청하셨나요?" 라고 보내 **답장을 받은 뒤** 진행합니다.
4. 이메일이 없거나 다르거나, 같은 닉네임이 여러 명이라 누구인지 확실하지 않으면 **탈퇴시키지 않습니다.** 앱에 다시 로그인해 직접 탈퇴하도록 안내하는 회신을 보내고 아래 3) 으로 가서 처리 완료로 표시합니다.

### 2) 확인되면 탈퇴 신청 상태로 바꾸기

1. 어드민 **회원** 에서 그 회원을 눌러 상세 화면을 열고 **회원 id** (긴 영문·숫자) 를 복사합니다.
2. Supabase 대시보드 → **SQL Editor** → **+ New query** 에 아래를 붙이고 `<회원 id>` 를 복사한 값으로 바꾼 뒤 **Run**:
   ```sql
   update public.profiles
      set status = 'withdrawing', withdraw_requested_at = now()
    where id = '<회원 id>' and status = 'active'
   returning id, name, email, login_id, status;
   ```
3. 결과 표에 **한 줄이 나와야 합니다** (`status` 가 `withdrawing`). 아무 줄도 안 나오면 id 가 틀렸거나 이미 탈퇴 진행 중·정지·탈퇴 완료인 회원입니다 — 다시 확인합니다.
4. 이제 앱에서 탈퇴를 신청한 것과 같습니다. **30일 뒤** 매일 예약(7번)이 자동으로 탈퇴를 확정합니다. 그 전에 본인이 앱에 로그인하면 철회할 수 있습니다.

### 3) 처리 완료 표시와 회신

1. 어드민 **탈퇴 요청** → **미처리** 에서 그 요청의 **처리 완료** 를 누릅니다.
2. 메모에 한 일을 적습니다. 예: `이메일 회신으로 본인 확인 → withdrawing 처리, 30일 뒤 자동 삭제` 또는 `본인 확인 안 됨 → 앱에서 직접 탈퇴 안내`.
3. 연락 이메일로 결과를 회신합니다 (탈퇴 신청 처리됨 · 30일 안에 로그인하면 철회 가능 · 30일 뒤 삭제).

## 나중에 할 일 (메모)

- **1-D (사진 저장소 R2 도입) 때**: `finalize_withdrawals()` 가 탈퇴 확정 회원의 업로드 파일도 지우도록 연결합니다. 지금은 DB 행만 정리합니다.
- **2단계 (원장 서버화) 때**: 탈퇴 확정 시 `ledger_entries` 의 `invitation_name`·`memo` 도 익명화합니다.
- 두 가지 모두 6번에서 올리는 마이그레이션(`20261029000001_member_auth.sql`)을 고치지 말고 **새 마이그레이션** 으로 `finalize_withdrawals` 를 바꿉니다.
