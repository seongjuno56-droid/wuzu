# wuzu 어드민

운영자용 웹 어드민(Next.js). 회원·초대장·운영자·작업 기록을 봅니다.

## 로컬에서 띄우기

```bash
cd admin
npm install
cp .env.example .env.local   # ADMIN_SESSION_SECRET 에 32자 이상 임의 문자열을 넣는다
npm run dev
```

- `DATABASE_URL` 을 비워 두면 `admin/.pglite` 에 로컬 DB 를 만들고 마이그레이션을 올립니다.
- 로컬 DB 에 운영자가 한 명도 없으면 시드(운영자 1명·회원 30명·초대장 40개·레터 원장)를 넣습니다.
  로그인: `admin@wuzu.local` / `wuzu-admin-1234`
- 처음부터 다시 하려면 개발 서버를 끄고 `admin/.pglite` 폴더를 지운 뒤 다시 띄웁니다.
- `DATABASE_URL` 이 있으면 시드는 절대 넣지 않습니다.

테스트: `npm test` · 타입 검사: `npx tsc --noEmit` · 빌드: `npm run build`

화면 확인 스크립트(시드 직후 한 번, 개발 서버가 떠 있을 때):
`npx playwright install chromium` 후 `npx tsx scripts/qa.ts http://localhost:3000 <스크린샷 폴더>`

## 실제 서비스에 연결하기 (직접 할 일, 순서대로)

1. **Supabase 프로젝트 만들기**
   [supabase.com](https://supabase.com) 에서 새 프로젝트를 만들고 DB 비밀번호를 안전한 곳에 적어 둡니다. 지역은 서울(Northeast Asia, ap-northeast-2)을 권합니다.

2. **스키마 올리기** (`supabase/migrations` 의 SQL)
   - 방법 A — 명령어: 저장소 루트에서
     ```bash
     npx supabase login
     npx supabase link --project-ref <프로젝트 ref>
     npx supabase db push
     ```
   - 방법 B — 화면: Supabase 대시보드 **SQL Editor** 에 `supabase/migrations/*.sql` 을 파일 이름 순서대로 붙여 넣고 실행합니다.
   - `supabase/test/auth_stub.sql` 은 로컬·테스트 전용입니다. 운영 DB 에는 올리지 않습니다(Supabase 에 이미 `auth` 가 있습니다).

3. **Vercel 에 어드민을 새 프로젝트로 올리기**
   Vercel 에서 **Add New → Project** 로 이 저장소를 가져오고, **Root Directory** 를 `admin` 으로 정합니다. 프레임워크는 Next.js 로 자동 인식됩니다.

4. **환경변수 넣기** (Vercel 프로젝트 → Settings → Environment Variables)
   - `DATABASE_URL`: Supabase 대시보드 **Connect** → 연결 문자열 중 **Session pooler**(세션 풀러) 주소. `[YOUR-PASSWORD]` 자리에 1번의 DB 비밀번호를 넣습니다.
   - `ADMIN_SESSION_SECRET`: 32자 이상 임의 문자열. 예:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   넣은 뒤 **Redeploy** 해야 반영됩니다.

5. **첫 운영자 만들기**
   내 컴퓨터에서 운영 DB 를 가리키게 하고 한 번 실행합니다(비밀번호 10자 이상).
   ```bash
   cd admin
   DATABASE_URL="<4번과 같은 주소>" npm run create-admin -- <이메일> <이름> <비밀번호>
   ```
   Windows PowerShell 이면 `$env:DATABASE_URL="<주소>"; npm run create-admin -- <이메일> <이름> <비밀번호>`.
   이 운영자로 배포 주소에 로그인한 뒤, 다른 운영자는 **운영자** 화면에서 추가합니다(처음 로그인할 때 비밀번호를 바꾸게 됩니다).
