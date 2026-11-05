# 하객 링크 켜기 (Cloudflare R2 · Vercel)

하객 링크와 사진 저장에 필요한 계정과 저장소를 만드는 순서입니다. 아래는 각 사이트 화면에서 직접 누르는 일입니다.
사이트별로 회차를 나눴습니다. 한 회차를 끝내면 "1회차 됨" 처럼 알려 주세요. 위에서부터 순서대로 하세요.

> 버튼 이름은 2026-11-04 에 Cloudflare·Vercel 공식 문서로 확인했습니다. 문서에 이름이 없는 항목은 **(화면 확인)** 이라고 적었습니다. 화면이 다르면 비슷한 이름을 찾고, 못 찾겠으면 화면을 캡처해 물어보세요. 캡처에 비밀 값이 보이지 않게 하세요.

## 먼저 알아 둘 것 (비밀 값)

| 값 | 어디에 넣나 | 남에게 보여도 되나 |
|---|---|---|
| R2 **Secret Access Key** | **Supabase Edge Function 비밀값(secrets)에만** | **절대 안 됨** |
| R2 **Access Key ID** | **Supabase Edge Function 비밀값(secrets)에만** | **안 됨** |
| Cloudflare Account ID | Supabase Edge Function 비밀값(secrets) | 되도록 보이지 않게 |
| Public Development URL (`https://pub-….r2.dev`) | 앱·하객 웹 환경 변수 | 됨 (공개 주소) |

- R2 키는 **채팅, 저장소, 앱, `.env.local` 어디에도 넣지 않습니다.** 앱에 넣으면 앱을 받은 누구나 꺼내 볼 수 있습니다.
- 비밀 값을 알려 달라는 단계는 없습니다. 뒤 단계에서 값을 넣은 뒤 "넣었음" 이라고만 알려 주세요.
- 실수로 밖에 나갔다면 그 토큰을 없애고 **(화면 확인)** 새로 만들어 바꿔 넣으면 됩니다.

## 1회차: Cloudflare R2

사진·동영상·음악 파일을 저장할 곳을 만듭니다.

### 가입

1. [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) 을 엽니다.
2. **Email** 과 **Password** 를 넣습니다. 회사에서 계속 쓸 이메일을 고르세요.
3. **Create Account** 를 누릅니다.
4. 받은 편지함에서 Cloudflare 가 보낸 메일을 열어 이메일 인증을 마칩니다.
5. 도메인을 추가하라는 화면이 나오면 추가하지 않고 왼쪽 메뉴로 넘어갑니다. 지금은 도메인이 필요 없습니다.

### R2 켜기

6. 왼쪽 메뉴 **Storage & databases** → **R2** → **Overview** 를 누릅니다. (문서에 따라 **R2 object storage** 라고도 적혀 있습니다.)
7. 안내에 따라 결제(checkout) 단계를 마칩니다. 카드 입력을 요구할 수 있습니다.
   - 매달 무료: 저장 10GB, 쓰기 요청(Class A) 100만 건, 읽기 요청(Class B) 1,000만 건. 내려받기 트래픽은 무료입니다.
   - 무료량을 넘으면 요금이 나갑니다.

### 버킷 만들기

> **되돌릴 수 없음.** 아래 9~11번은 한 번 정하면 바꾸기 어렵습니다. 특히 다음을 지키세요.
> - **Specify jurisdiction 을 고르지 마세요.** 만든 뒤에는 바꿀 수 없습니다.
> - 지역은 그 이름의 버킷을 **처음 만들 때만** 적용됩니다. 지웠다가 같은 이름으로 다시 만들어도 처음 지역이 그대로 쓰입니다.
> - 문서에 버킷 이름을 바꾸는 방법이 없습니다. 이름을 정확히 넣으세요.

8. **Create bucket** 을 누릅니다.
9. 이름에 `wuzu-media` 를 넣습니다.
10. **Location** 은 기본값 **Automatic** 을 그대로 둡니다. 화면에는 **None** 으로 보일 수 있습니다 **(화면 확인)**. 지역 목록과 **Specify jurisdiction** 은 고르지 않습니다.
11. 저장 등급(Storage Class) 칸이 보이면 **Standard** 로 둡니다 **(화면 확인)**. 무료 사용량은 Standard 에만 적용됩니다.
12. 아래쪽 **Create bucket** 을 누릅니다.

### 공개 주소 켜기

하객이 로그인 없이 사진을 봐야 하므로 공개로 엽니다. 주소를 아는 사람은 그 파일을 볼 수 있지만, 버킷의 파일 목록은 볼 수 없습니다. 파일 주소에는 추측할 수 없는 난수가 들어갑니다.

13. 방금 만든 `wuzu-media` 를 엽니다.
14. **Settings** 를 누릅니다.
15. **Public Development URL** 에서 **Enable** 을 누릅니다.
16. **Allow Public Access?** 창에 `allow` 를 입력하고 **Allow** 를 누릅니다.
17. **Public URL Access** 가 **Allowed** 인지 봅니다.
18. 나온 주소(`https://pub-….r2.dev`)를 메모합니다. 공개 값이라 채팅에 보내도 됩니다.

- 이 주소는 요청 수가 제한된 **시험용**입니다. Cloudflare 도 실서비스용이 아니라고 안내합니다. 출시 전에 자체 도메인으로 바꿉니다. 이 주소로 보낸 링크는 시험용으로만 쓰세요.
- 나중에 **Disable** 을 누르면 하객 화면의 사진이 모두 안 나옵니다.

### API 토큰 만들기

> **다시 볼 수 없음.** **Secret Access Key** 는 만들 때 한 번만 보입니다. 창을 닫기 전에 복사하세요.

19. **R2** → **Overview** 로 돌아갑니다.
20. **Account Details** 의 **API Tokens** 옆 **Manage** 를 누릅니다.
21. **Create Account API token** 을 누릅니다. (**User** 토큰이 아닙니다. User 토큰은 그 사용자가 계정에서 빠지면 멈춥니다.)
22. 이름에 `wuzu-supabase` 를 넣습니다 **(화면 확인)**.
23. **Permissions** 에서 **Object Read & Write** 를 고릅니다. **Admin** 으로 시작하는 항목은 고르지 않습니다.
24. 버킷 범위를 특정 버킷으로 좁혀 `wuzu-media` 만 고릅니다 **(화면 확인)**.
25. 만료 기간을 고르는 칸이 있으면 만료 없음(**Forever**)을 고릅니다 **(화면 확인)**. 만료되면 그날부터 사진 올리기가 멈춥니다.
26. **Create Account API token** 을 누릅니다.
27. **Access Key ID** 와 **Secret Access Key** 를 복사해 비밀번호 관리자에 잠시 둡니다. 비밀번호 관리자가 없으면 이 컴퓨터에만 있는 저장소 밖 메모 파일에 둡니다. **채팅에 붙이지 마세요. Secret Access Key 를 동기화되는 메모나 클라우드 메모에 두지 마세요.**
28. Account ID 를 복사해 같은 곳에 둡니다. 검색(`Ctrl + K`)에 `Copy account ID` 를 입력해 고르면 복사됩니다. 안 되면 **Workers & Pages** → **Account Details** 의 **Account ID** 옆 복사 버튼을 누릅니다.

- **Access Key ID**, **Secret Access Key**, **Account ID** 는 뒤에 Supabase Edge Function 비밀값에 넣습니다. 넣는 순서는 아래 **3회차** 에 있습니다. 다 넣은 뒤 임시로 적어 둔 값은 지웁니다.
- Secret Access Key 를 잃어버리면 **R2** → **Overview** → **Account Details** → **API Tokens** → **Manage** 로 가서 그 토큰을 없앱니다 **(화면 확인)**. 그다음 같은 화면에서 **Create Account API token** 을 누르고, 이름 `wuzu-supabase`, 권한 **Object Read & Write**, 버킷 `wuzu-media`, 만료 없음(**Forever**)으로 새로 만듭니다. 새 토큰은 **Access Key ID 와 Secret Access Key 가 둘 다 새 값입니다.** Supabase Edge Function 비밀값에 이미 넣었다면 `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` 두 개를 모두 바꿔 넣습니다.

**여기까지 하면 "1회차 됨" 과 `https://pub-….r2.dev` 주소를 보내 주세요.**

## 2회차: Vercel `wuzu-guest`

하객이 여는 웹 주소가 될 프로젝트를 만듭니다. 어드민 `wuzu-admin` 과 같은 저장소를 쓰는 별도 프로젝트입니다. `wuzu-admin` 의 설정은 건드리지 않습니다.

> **꼭 지키세요: 11번을 빠뜨리고 Deploy 하지 마세요.** 하객 웹 설정(`vercel.json`)이 아직 저장소에 없습니다. 이 상태로 배포하면 Vercel 이 저장소 맨 위 폴더의 파일을 **그대로 인터넷에 공개**할 수 있습니다(소스 코드, 문서, DB 파일). 11번은 설정이 준비될 때까지 일부러 빌드를 실패시켜 아무것도 공개되지 않게 합니다.

### 프로젝트 만들기

1. [vercel.com](https://vercel.com) 에 로그인합니다.
2. 대시보드의 팀 선택 메뉴에서 **sjport** 를 고릅니다.
3. **Create New** → **Project** 를 누릅니다. (화면에 **Add New** 또는 **New Project** 로 보일 수도 있습니다.)
4. **Import Git Repository** 목록에서 `wuzu` 옆 **Import** 를 누릅니다. 목록에 없으면 화면의 GitHub 권한 설정 링크로 `seongjuno56-droid/wuzu` 접근을 허용합니다 **(화면 확인)**.
5. 설정 화면이 열립니다. 아직 **Deploy** 를 누르지 않습니다.
6. 프로젝트 이름(**Project Name**)에 `wuzu-guest` 를 넣습니다.
7. **Root Directory** 는 저장소 맨 위(`./`)입니다. `admin` 으로 바꾸지 말고 그대로 둡니다.
8. **Framework Preset** 에서 **Other** 를 고릅니다.
9. 빌드 설정(**Build and Output Settings**) 부분을 펼칩니다. (이름이 조금 다를 수 있습니다.)
10. **Build Command** 줄의 **Override** 를 켭니다.
11. **Build Command** 칸에 정확히 `exit 1` 을 넣습니다.
12. 나머지 칸(Output Directory, Install Command, **Environment Variables**)은 그대로 둡니다.
13. 이름이 `wuzu-guest`, Root Directory 가 `./`, Build Command 가 `exit 1` 인지 다시 봅니다.
14. **Deploy** 를 누릅니다.
15. 빌드가 **실패(Error)** 로 끝나는 것을 확인합니다. **실패가 정상입니다.** 프로젝트는 만들어졌고 아무것도 공개되지 않았습니다.
16. 앞으로 저장소에 push 할 때마다 같은 실패 알림이 올 수 있습니다. 4회차의 환경 변수를 넣을 때까지 무시해도 됩니다.

- 빌드가 **성공(Ready)** 으로 나오면 11번이 빠진 것입니다. 바로 **Settings** → **General** → **Pause Project** 를 누릅니다. 창이 열리면 프로젝트 이름 `wuzu-guest` 를 입력하고 **Pause Project** 를 한 번 더 누른 뒤 Claude 에게 알려 주세요.

### 공개 범위 확인

17. `wuzu-guest` 프로젝트에서 **Settings** → **Deployment Protection** 을 엽니다.
18. 보호 범위가 **Standard Protection** 인지 봅니다. (앞에 **Legacy** 가 붙어 있어도 괜찮습니다.) **All Deployments 로 바꾸지 마세요.** 그러면 하객과 카카오톡 미리보기가 정식 주소를 열 수 없습니다.

**여기까지 하면 "2회차 됨" 이라고 보내 주세요.**

## 3회차: 파일 올리기 함수 (Supabase Edge Function)

앱이 사진을 R2 에 올릴 때 쓰는 서명 주소를 내주는 함수 `sign-upload` 를 올립니다. 1회차를 끝낸 뒤에 합니다.

> **순서를 지키세요.** 표(마이그레이션) → 비밀값 → 함수 배포 → 앱 환경 변수 순서입니다. 표가 없으면 서명이 모두 실패합니다.

### 표 만들기

1. Supabase 대시보드에서 프로젝트 `wuzu` 를 엽니다.
2. 왼쪽 메뉴 **SQL Editor** 를 누릅니다.
3. 먼저 아래 한 줄을 붙여 넣고 **Run** 을 누릅니다. 결과가 정확히 `extensions` 여야 합니다. 다른 값이거나 결과가 없으면 **여기서 멈추고** Claude 에게 알려 주세요. 초대장 주소를 만드는 함수가 이 위치의 pgcrypto 를 씁니다.

```sql
select extnamespace::regnamespace from pg_extension where extname='pgcrypto';
```

4. 마이그레이션 네 파일을 **아래 순서대로** 하나씩 실행합니다. Claude 가 한 파일씩 클립보드에 넣어 줍니다. 내용을 붙여 넣고 **Run** 을 누른 뒤, 오류가 없으면 다음 파일로 갑니다. 각 파일은 **한 번만** 실행합니다. 다시 실행하면 "이미 있다" 오류가 납니다.

| 순서 | 파일 | 하는 일 |
|---|---|---|
| 1 | `supabase/migrations/20261104000001_invitation_owner.sql` | 앱이 쓰는 내 초대장 함수 |
| 2 | `supabase/migrations/20261104000002_guest_access.sql` | 하객 화면·방명록·참석 응답 |
| 3 | `supabase/migrations/20261104000003_media_files.sql` | 파일 기록 표 |
| 4 | `supabase/migrations/20261104000004_invitation_purge.sql` | 삭제 대기열, 하객 데이터 파기, 탈퇴 확정 고침 |

### 비밀값 넣기

> 이 값들은 **이 화면에만** 넣습니다. 채팅, 저장소, 앱, `.env.local` 에 넣지 않습니다.

5. 왼쪽 메뉴 **Edge Functions** → **Secrets** 를 누릅니다. (주소: `supabase.com/dashboard/project/_/functions/secrets`)
6. **Add new secrets** 칸의 **Key**, **Value** 에 아래 네 줄을 넣습니다. 한 줄을 넣고 **Add another** 를 누르면 다음 줄이 생깁니다.

| Key | Value |
|---|---|
| `R2_ACCOUNT_ID` | 1회차 28번의 Account ID |
| `R2_ACCESS_KEY_ID` | 1회차 27번의 Access Key ID |
| `R2_SECRET_ACCESS_KEY` | 1회차 27번의 Secret Access Key |
| `R2_BUCKET` | `wuzu-media` |

7. **Save** 를 누릅니다.
8. 임시로 적어 둔 값을 지웁니다. Secret Access Key 를 다시 볼 수는 없습니다. 잃어버리면 1회차 맨 아래 안내대로 토큰을 새로 만듭니다.

### 함수 배포

컴퓨터의 PowerShell 에서 합니다. 저장소 폴더(`invite app`)에서 실행합니다.

9. `npx supabase login` 을 실행합니다. 브라우저가 열리면 로그인하고 승인합니다.
10. 프로젝트 ID 를 복사합니다. Supabase 대시보드 **Project Settings** → **General** 의 **Project ID** 입니다 **(화면 확인)**.
11. 아래 명령을 실행합니다. `<프로젝트 ID>` 를 10번 값으로 바꿉니다.

```powershell
npx supabase functions deploy sign-upload --no-verify-jwt --project-ref <프로젝트 ID>
```

- `--no-verify-jwt` 를 빠뜨리지 마세요. 함수가 로그인을 직접 확인하므로 앞단 검사를 끕니다. 로그인하지 않은 요청은 함수가 401 로 거절합니다.
- Docker 가 없다는 오류가 나면 끝에 `--use-api` 를 붙여 다시 실행합니다.

12. 대시보드 **Edge Functions** 목록에 `sign-upload` 가 보이는지 확인합니다.

### 앱 환경 변수

13. 앱 폴더의 `.env.local` 에 한 줄을 더합니다. 값은 1회차 18번의 공개 주소입니다. 비밀 값이 아닙니다.

```
EXPO_PUBLIC_MEDIA_BASE_URL=https://pub-….r2.dev
```

14. 개발 서버를 켜 둔 상태였다면 껐다 켭니다. 환경 변수는 시작할 때 읽습니다.

**여기까지 하면 "3회차 됨" 이라고 보내 주세요.**

## 4회차: 하객 웹 배포 (Vercel `wuzu-guest`)

저장소에 `vercel.json` 이 들어가면서 2회차 11번의 `exit 1` 을 이 파일의 `buildCommand` 가 대신합니다. Vercel 문서상 `vercel.json` 값이 프로젝트 설정보다 먼저입니다. 앞 번호 회차(1·3회차)와 Supabase 마이그레이션을 먼저 마친 뒤에 합니다.

> **언제 공개되나.** 정식 주소(`wuzu-guest.vercel.app`)는 Production 브랜치(보통 `main`)에 코드가 들어가야 바뀝니다. main 병합은 사용자가 정합니다. 작업 브랜치의 Preview 주소는 2회차의 **Standard Protection** 때문에 로그인한 사람만 열 수 있고, 카카오톡 봇은 읽지 못합니다. 카드 확인은 정식 주소로 합니다.

### 환경 변수 넣기

1. Vercel 대시보드에서 팀 **sjport** → 프로젝트 `wuzu-guest` 를 엽니다.
2. **Settings** → **Environment Variables** 를 누릅니다.
3. 아래 네 줄을 하나씩 넣습니다. 환경(**Environments**)은 **Production** 과 **Preview** 를 고르고 **Save** 를 누릅니다 **(화면 확인)**. 모두 공개 값입니다. Sensitive 로 표시하지 않아도 됩니다.

| Key | Value | 어디서 보나 |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://….supabase.co` | Supabase **Project Settings** → **API Keys** 의 Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` | 같은 화면의 **publishable** 키. **secret 키가 아닙니다** |
| `EXPO_PUBLIC_MEDIA_BASE_URL` | `https://pub-….r2.dev` | 1회차 18번의 공개 주소 |
| `EXPO_PUBLIC_GUEST_WEB_URL` | `https://wuzu-guest.vercel.app` | `wuzu-guest` 의 **Settings** → **Domains** 에 보이는 정식 주소. 끝에 `/` 없이 |

- 네 값 중 하나라도 비었거나 주소가 `https` 가 아니면 빌드가 일부러 실패합니다. 값이 없는 채로 공개되면 하객이 시험용(mock) 화면을 보기 때문입니다. secret 키를 넣어도 빌드가 실패합니다.
- `EXPO_PUBLIC_GUEST_SITE` 는 넣지 않습니다. 빌드 스크립트가 직접 켭니다.
- service_role·R2 키는 이 화면에 넣지 않습니다.

4. 앱 폴더의 `.env.local` 에도 `EXPO_PUBLIC_GUEST_WEB_URL` 한 줄을 같은 값으로 더합니다. 공유 버튼이 이 주소를 씁니다. 개발 서버를 켜 둔 상태면 껐다 켭니다.

> **주소는 보낸 뒤 바꾸기 어렵습니다.** 이미 보낸 링크는 그 주소로 남습니다. 지금의 `vercel.app` 주소는 시험용으로만 쓰고, 출시 전에 자체 도메인으로 바꿉니다.

### 배포

5. Production 브랜치에 코드가 들어가면 Vercel 이 알아서 빌드합니다. 환경 변수를 나중에 넣었다면 **Deployments** 에서 맨 위 배포의 **…** → **Redeploy** 를 누릅니다 **(화면 확인)**. 환경 변수는 빌드 때 번들에 들어가므로 다시 빌드해야 반영됩니다.
6. 빌드가 **Ready** 로 끝나는지 봅니다. 실패하면 기록(**Build Logs**)에서 `[build-guest-web]` 으로 시작하는 줄을 찾아 Claude 에게 알려 줍니다. 비밀 값이 보이지 않게 하세요.

### 첫 배포 때 가장 먼저 볼 것

코드와 문서로만 확인했고 Vercel·Supabase 실서버에서는 아직 시험하지 못한 세 가지입니다. 아래 순서대로 봅니다. 하나라도 어긋나면 Claude 에게 알려 주세요.

1. **함수에 `dist/shell.html` 이 들어갔는가.** `vercel.json` 의 `includeFiles` 는 빌드가 끝난 파일을 가리킵니다. 함수가 빌드 뒤에 묶이는지는 실제 배포로만 알 수 있습니다.
   - 확인: 먼저 활성화한 초대장의 `/i/<slug>` 주소를 휴대폰이나 시크릿 창에서 **한 번 엽니다.** 함수가 한 번도 불리지 않으면 기록이 없어 정상처럼 보입니다. 그다음 `wuzu-guest` → **Logs** 에서 `[guest-page] shell.html 을 읽지 못했다` 줄을 찾습니다 **(화면 확인)**. 없어야 정상입니다.
   - 이 줄이 있어도 하객 화면은 정적 `/shell.html` 을 받아 열립니다. 다만 그 응답은 캐시되지 않으니 고쳐야 합니다.
2. **`apikey` 헤더만으로 호출이 받아들여지는가.** 함수와 하객 화면이 `Authorization` 없이 publishable 키를 `apikey` 헤더로만 보냅니다.
   - 확인: 활성화한 초대장의 `/i/<slug>` 에서 초대장이 보이면 정상입니다. **"초대장을 불러오지 못했어요"** 와 **다시 시도** 버튼이 나오면 거절된 것입니다. 이때는 하객 링크가 모두 열리지 않으니 바로 알려 주세요.
3. **`X-Robots-Tag: noindex` 가 있어도 카카오톡 카드가 나오는가.** 사이트 전체에 이 헤더가 있고, 카카오톡 봇이 이것을 따르는지는 문서로 확인하지 못했습니다.
   - 확인: 아래 **카카오톡 카드 확인** 을 합니다. 제목·썸네일이 안 나오면 이 헤더를 먼저 의심합니다.

### 주소 확인

휴대폰이나 시크릿 창에서 엽니다. `<주소>` 는 `EXPO_PUBLIC_GUEST_WEB_URL` 값입니다.

| 주소 | 나와야 하는 것 |
|---|---|
| `<주소>/i/<활성화한 초대장의 slug>` | 초대장 화면 |
| `<주소>/privacy` | 개인정보 처리방침 |
| `<주소>/` , `<주소>/home` , `<주소>/auth/login` , `<주소>/create` | "페이지를 찾을 수 없어요" 만. 로그인·홈이 보이면 안 됩니다 |
| `<주소>/package.json` , `<주소>/.env` , `<주소>/admin` , `<주소>/docs` , `<주소>/supabase` | 같은 안내. 파일 내용이 보이면 **바로 Pause Project** 를 누르고 알려 주세요 |
| `<주소>/api/guest-page` , `<주소>/api/guest-page?slug=없는값` | **열리는 것이 정상입니다(정해 둔 예외).** rewrite 가 이 주소를 쓰므로 막지 않습니다. 화면은 "페이지를 찾을 수 없어요" 이고, 페이지 소스의 `og:title` 은 기본값 `wuzu 모바일 초대장` 입니다. 초대장 이름·사진이 소스에 있으면 안 됩니다 |
| `<주소>/shell.html` | **열리는 것이 정상입니다(정해 둔 예외).** `/privacy` 가 이 파일을 쓰므로 막지 않습니다. 화면은 "페이지를 찾을 수 없어요" 이고, 페이지 소스에 초대장 정보나 `og:` 태그가 없어야 합니다 |

### 카카오톡 카드 확인

7. 활성화한 초대장의 링크를 카카오톡 나와의 채팅에 보냅니다.
8. 제목(초대장 이름)과 썸네일이 나오는지, **가로세로 2:1(800×400) 이미지가 잘리지 않는지** 봅니다. 썸네일을 직접 올린 초대장과 안 올린 초대장을 각각 봅니다. 잘림 여부는 사용자와 함께 눈으로 확인합니다.
9. 카드가 옛 내용으로 나오면 카카오톡이 기억하는 것입니다. [카카오 개발자 도구의 초기화 화면](https://developers.kakao.com/tool/clear/og)에서 주소를 넣고 초기화합니다 **(화면 확인)**. 이 화면은 카카오 개발자 로그인이 필요합니다.
10. 썸네일이 전혀 안 나오면 알려 주세요. 사이트 전체에 검색 제외 헤더(`X-Robots-Tag: noindex`)가 있는데, 카카오톡 봇이 이것을 따르는지는 문서로 확인하지 못했습니다.

**여기까지 하면 "4회차 됨" 이라고 보내 주세요.**

## 5회차: 삭제 예약 (파일 삭제 함수와 매일 예약)

초대장을 지우거나 탈퇴가 확정된 회원의 파일을 R2 에서 실제로 지우는 함수 `purge-media` 를 올리고, 하객 데이터 파기와 함께 매일 돌게 예약합니다. 3회차를 끝낸 뒤에 합니다.

**이 회차를 하기 전에는 지운 초대장의 파일이 R2 에 그대로 남고, 하객 데이터도 기간이 지나도 지워지지 않습니다.** 처리방침에 적은 약속이므로 실제 하객에게 링크를 보내기 전에 꼭 끝냅니다.

### 호출 비밀값 만들기

예약 작업이 함수를 부를 때 내는 비밀값입니다. R2 키나 Supabase secret 키가 아니라 이 일에만 쓰는 새 값입니다.

1. 컴퓨터의 PowerShell 에서 아래를 실행합니다. 화면에 나오지 않고 클립보드에 들어갑니다.

```powershell
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); (($b | ForEach-Object { $_.ToString('x2') }) -join '') | Set-Clipboard
```

2. Supabase 대시보드 **Edge Functions** → **Secrets** 를 누릅니다.
3. **Add new secrets** 의 **Key** 에 `PURGE_MEDIA_SECRET`, **Value** 에 클립보드 값을 붙여 넣고 **Save** 를 누릅니다.

### Vault 에 넣기

> SQL Editor 의 `vault.create_secret` 대신 화면으로 넣습니다. SQL 로 넣으면 비밀값이 SQL Editor 기록에 남을 수 있습니다.

4. Supabase 대시보드 **Integrations** → **Vault** 를 누릅니다 **(화면 확인)**. 안 보이면 **Integrations** 목록에서 Vault 를 찾아 켭니다.
5. **Secrets** 탭의 새 비밀값 추가 버튼을 누릅니다 **(화면 확인)**.
6. **Name** 에 `purge_media_secret`, **Secret value** 에 클립보드 값(1번과 같은 값)을 넣고 저장합니다 **(화면 확인)**.
7. 같은 방법으로 하나 더 넣습니다. **Name** 은 `wuzu_project_url`, 값은 `https://<프로젝트 ID>.supabase.co` 입니다. 끝에 `/` 를 붙이지 않습니다. 이 값은 비밀이 아닙니다.
8. 클립보드를 다른 내용으로 덮어씁니다(아무 글자나 복사). 이 비밀값은 다시 볼 일이 없습니다. 잃어버리면 1번부터 새로 만들어 3번과 6번 두 곳 모두 바꾸면 됩니다.

- 두 곳의 값이 다르면 함수가 401 로 거절하고 파일이 지워지지 않습니다.
- `Name` 철자가 틀리면 15번에서 "Vault 에 … 이(가) 없습니다" 오류가 나고 예약되지 않습니다.

### 함수 배포

3회차의 9~10번을 했다면 그대로 이어서 합니다. 저장소 폴더(`invite app`)의 PowerShell 에서 실행합니다.

9. 아래 명령을 실행합니다. `<프로젝트 ID>` 를 3회차 10번 값으로 바꿉니다.

```powershell
npx supabase functions deploy purge-media --no-verify-jwt --project-ref <프로젝트 ID>
```

- `--no-verify-jwt` 를 빠뜨리지 마세요. 예약 작업은 로그인 토큰이 없고, 함수가 `x-purge-secret` 헤더를 직접 확인합니다. 비밀값이 틀린 요청은 함수가 401 로 거절합니다.
- Docker 가 없다는 오류가 나면 끝에 `--use-api` 를 붙여 다시 실행합니다.

10. 대시보드 **Edge Functions** 목록에 `purge-media` 가 보이는지 확인합니다.

### 확장 켜기와 예약

11. 대시보드 **Database** → **Extensions** 를 누릅니다.
12. 검색 칸에 `pg_cron` 을 넣고 켭니다. 이미 켜져 있으면 그대로 둡니다.
13. 검색 칸에 `pg_net` 을 넣고 켭니다.
14. 왼쪽 메뉴 **SQL Editor** 를 누릅니다.
15. Claude 가 클립보드에 넣어 준 `supabase/manual/schedule_guest_link.sql` 내용을 붙여 넣고 **Run** 을 누릅니다. 이 파일은 다시 실행해도 예약이 겹치지 않습니다.
16. 아래를 실행합니다.

```sql
select jobname, schedule, active from cron.job order by jobname;
```

아래 세 줄이 나와야 합니다. 시각은 UTC 입니다.

| jobname | schedule | 한국 시각 | 하는 일 |
|---|---|---|---|
| `finalize-withdrawals` | `17 19 * * *` | 새벽 4:17 | 탈퇴 확정 |
| `purge-guest-data` | `41 18 * * *` | 새벽 3:41 | 만료 30일 지난 방명록·참석 응답 삭제 |
| `purge-media` | `23 20 * * *` | 새벽 5:23 | 대기열의 파일을 R2 에서 삭제 |

- `finalize-withdrawals` 줄이 없으면 `supabase/manual/schedule_withdraw_finalize.sql` 을 같은 방법으로 실행합니다.

### 바로 한 번 돌려 보기

17. SQL Editor 에서 아래를 실행합니다. 비밀값은 Vault 에서 읽으므로 고칠 곳이 없습니다.

```sql
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'wuzu_project_url') || '/functions/v1/purge-media',
  headers := jsonb_build_object('Content-Type', 'application/json', 'x-purge-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'purge_media_secret')),
  body := '{}'::jsonb,
  timeout_milliseconds := 150000
);
```

18. 몇 초 뒤 아래를 실행합니다.

```sql
select status_code, content, timed_out, error_msg from net._http_response order by created desc limit 1;
```

이 표의 내용은 6시간 뒤 사라집니다.

- `200` 이고 `content` 가 `{"deleted":0,"failed":0,"skipped":0}` 이면 **비밀값과 DB 연결만** 확인된 것입니다. 대기열이 비어 있으면 R2 에 아무 요청도 보내지 않으므로, **R2 연결과 삭제 권한은 아직 모릅니다.** 아래 **실제로 파일이 지워지는지 확인** 을 꼭 합니다.
- `401`: 3번과 6번 값이 다릅니다. 1번부터 다시 만들어 두 곳을 바꿉니다.
- `500`: 두 가지 중 하나입니다. **Edge Functions** → **Secrets** 에 `PURGE_MEDIA_SECRET` 이 없거나 32자보다 짧은 경우, 또는 함수가 DB 함수를 부르지 못한 경우입니다. 뒤의 경우 3회차 4번의 네 번째 마이그레이션을 실행했는지 봅니다.
- `timed_out` 이 `true` 이거나 `error_msg` 에 글이 있으면 응답을 받지 못한 것입니다. 함수가 실행되었는지는 이 값으로 알 수 없으니 Claude 에게 알려 주세요.
- `failed` 가 0 보다 크면 파일을 지우지 못한 것입니다. **Edge Functions** → **Secrets** 의 R2 네 값(빠지면 500 이 아니라 여기에 나옵니다), `R2_BUCKET` 철자, 1회차 23번의 토큰 권한 **Object Read & Write** 를 봅니다. 그래도 같으면 Claude 에게 알려 주세요. 실패한 파일은 대기열에 남고, 시도한 지 **1시간이 지나야** 다시 나옵니다. 값을 고쳤다면 1시간 뒤 17번을 다시 실행합니다.
- `skipped` 가 0 보다 크면 아래 **대기열 점검** 의 건너뛴 파일을 봅니다.

### 실제로 파일이 지워지는지 확인

19. 앱에서 시험용 초대장을 만들고 음악 파일 하나나 사진 한 장을 넣어 저장합니다. 실제 하객에게 보낸 초대장을 쓰지 마세요.
20. **R2** → `wuzu-media` → **Objects** 에서 `invitations/` 아래에 그 파일이 있는지 봅니다 **(화면 확인)**. 폴더 이름(초대장 id)을 메모합니다.
21. 앱에서 그 초대장을 삭제합니다.
22. **15분을 기다립니다.** 삭제 직전에 내준 올리기 주소가 끝나기를 기다리는 시간이라, 그 전에는 대기열에서 나오지 않습니다.
23. 17번과 18번을 다시 실행합니다.
    - 음악 파일 하나면 `deleted` 가 `1` 입니다. 사진은 본 이미지와 작은 사진 두 개라 `2` 입니다. `failed` 는 `0` 이어야 합니다.
24. 20번 폴더를 다시 열어 파일이 없어졌는지 봅니다. `deleted` 숫자만 믿지 말고 눈으로 확인합니다.

### 대기열 점검

매일 새벽 지우므로 **요청한 지 이틀이 지난 파일은 없어야 합니다.** 어드민 **초대장** 화면 맨 위에 빨간 글자로 "삭제가 밀린 파일" 이 보이면 이 점검을 합니다. SQL Editor 에서도 볼 수 있습니다.

```sql
select count(*), min(delete_requested_at) from public.media_files
 where delete_requested_at < now() - interval '2 days' and deleted_at is null;
```

- `count` 가 0 보다 크면 먼저 **Integrations** → **Cron** 에서 `purge-media` 가 돌았는지 보고 **(화면 확인)**, 17번과 18번으로 원인을 찾습니다.

**건너뛴 파일(`skipped`)** 은 키 모양이 규칙과 달라 함수가 일부러 지우지 않은 기록입니다. 정상 사용으로는 생기지 않으므로 잘못된 값이 들어왔다는 신호입니다. 아래로 찾습니다.

```sql
select id, kind, r2_key, delete_requested_at from public.media_files
 where delete_requested_at is not null and deleted_at is null
   and r2_key !~ ('^invitations/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{32}' || case kind
     when 'image' then '\.(webp|jpg|png)$'
     when 'thumb' then '_thumb\.(webp|jpg|png)$'
     when 'linkThumb' then '\.(jpg|png)$'
     when 'gif' then '\.gif$'
     when 'video' then '\.(mp4|mov)$'
     when 'bgm' then '\.(mp3|m4a|aac|wav|ogg)$'
     else '^$' end);
```

- **R2 에서 비슷한 이름의 파일을 지우지 말고** 결과를 Claude 에게 보내 주세요. 키가 다른 초대장의 파일을 가리킬 수 있습니다.
- 지우지 않고 두어도 다른 파일 삭제를 막지 않습니다. 다만 위 점검 숫자에 계속 잡힙니다.

> **참고.** 예약이 돌 때 pg_net 은 요청을 보내기 전까지 비밀값이 든 헤더를 `net.http_request_queue` 표에 잠시 둡니다(Supabase 문서에 적힌 동작). 이 표를 조회하는 사람은 DB 에 로그인할 수 있는 운영자뿐이고, 새어도 대기열을 비우는 호출만 할 수 있습니다. 그래서 이 값을 Supabase secret 키나 R2 키와 따로 둡니다. 이 표를 조회한 화면을 캡처해 보내지 마세요.

**여기까지 하면 "5회차 됨" 이라고 보내 주세요.**

## 실제 하객에게 링크를 보내기 전에: Hobby → Pro

> **꼭 해야 함.** 개발 중에는 무료 Hobby 로 둡니다. **실제 하객에게 링크가 나가기 전에** 팀 `sjport` 를 Pro 로 올립니다.
> - Hobby 는 비상업적 개인 용도로만 쓸 수 있습니다.
> - Hobby 는 사용량을 넘으면 대개 30일을 기다려야 합니다. 결혼식 당일에 링크가 멈출 수 있습니다.

지금은 하지 않아도 됩니다. 때가 되면 다음 순서로 합니다. 요금은 개발 좌석 한 명당 월 20달러입니다(결제 전 화면에서 확인).

1. Vercel 대시보드에서 팀 **sjport** 를 고릅니다.
2. **Settings** → **Billing** 을 엽니다.
3. **Plan** 의 **Upgrade** 를 누릅니다.
4. 카드 정보를 넣습니다.
5. **Confirm and Upgrade** 를 누릅니다.
6. **Settings** 의 **Spend Management** 에서 **Pause all production deployments** 를 **켜지 않습니다.** 켜 두면 사용량 때문에 하객 링크가 멈출 수 있습니다.

### 출시 전에 함께 할 일

- **`/i/*` 와 `/api/guest-page` 요청 수 제한을 권합니다.** `wuzu-guest` 의 **Firewall** 에 경로가 `/i/` 로 시작하거나 `/api/guest-page` 로 시작하는 요청의 Rate Limit 규칙을 더합니다 **(화면 확인)**. 두 경로 모두 같은 함수를 부르므로 `/i/*` 만 막으면 `/api/guest-page?slug=…` 로 비켜 갈 수 있습니다. 주소 뒤에 `?x=1` 같은 값을 붙이면 CDN 캐시를 비켜 함수와 Supabase 호출을 늘릴 수 있기 때문입니다. 한도 값은 실제 사용량을 본 뒤 정합니다. 결혼식 당일 하객이 몰려도 막히지 않을 만큼 넉넉해야 합니다.
- **첫 EAS 설정 때 (미확인).** 저장소에 `app.config.js` 가 있어 `npx eas-cli@latest init` 이 `projectId` 를 `app.json` 에 저절로 쓰지 못할 수 있습니다. 그러면 안내에 나온 `extra.eas.projectId` 를 직접 넣어야 합니다. `app.config.js` 는 `config.extra` 를 그대로 이어받으므로 `app.json` 에 넣으면 됩니다. 실제로 해 보지 않았습니다.
