-- 계정 삭제 요청 (구글 플레이 계정 삭제 요구 사항)
-- 앱을 지운 사람도 로그인 없이 어드민의 /delete-account 에서 요청을 남긴다. 운영자가 어드민에서 처리한다.
-- 어드민은 DB 에 직접 연결하므로 RLS 만 켜고 anon·authenticated 에는 아무 권한도 주지 않는다.
-- admin_audit_logs 의 action·target_type 에는 DB check 가 없어 넓힐 것이 없다.

create table deletion_requests (
  id uuid primary key default gen_random_uuid(),
  contact_email text not null,
  provider text not null default 'unknown' check (provider in ('kakao', 'google', 'unknown')),
  account_name text,
  message text,
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references admins(id)
);
create index deletion_requests_created_at_idx on deletion_requests (created_at desc);

alter table deletion_requests enable row level security;
revoke all on deletion_requests from anon, authenticated;
