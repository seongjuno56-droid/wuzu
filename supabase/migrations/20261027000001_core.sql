-- 서버 핵심 스키마: 회원·초대장·방명록·참석 응답·레터 원장·운영자·작업 기록
-- 실행기가 파일마다 트랜잭션으로 감싸므로 begin/commit 은 쓰지 않는다.
-- RLS 정책은 1-B·1-C 에서 붙인다. 지금은 모든 표에 RLS 만 켜서 anon·authenticated 는 아무것도 못 한다.

-- 회원
create table profiles (
  id uuid primary key references auth.users(id),
  login_id text unique,
  email text,
  name text not null,
  birth date,
  gender text check (gender in ('male', 'female', 'none')),
  phone text,
  provider text not null check (provider in ('email', 'kakao', 'google', 'apple')),
  marketing_agreed boolean not null default false,
  status text not null default 'active' check (status in ('active', 'withdrawing', 'banned')),
  withdraw_requested_at timestamptz,
  profile_updated_at timestamptz,
  marketing_updated_at timestamptz,
  created_at timestamptz not null default now()
);
create index profiles_created_at_idx on profiles (created_at desc);

-- 초대장 (앱의 order 는 예약어라 page_order)
create table invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  number text not null unique check (number ~ '^[0-9]{11}$'),
  slug text not null unique check (char_length(slug) >= 10),
  theme_id text not null check (theme_id in ('wedding', 'dol', 'corporate', 'meetup')),
  template_id text not null,
  palette_id text,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'final')),
  view_mode text not null default 'story' check (view_mode in ('story', 'scroll')),
  activated_at timestamptz,
  expires_at timestamptz,
  banned boolean not null default false,
  files_purged_at timestamptz,
  guestbook_seen_at timestamptz,
  enabled jsonb not null default '{}',
  page_order jsonb not null default '[]',
  content jsonb not null,
  design jsonb not null default '{}',
  completed jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invitations_owner_id_idx on invitations (owner_id);
create index invitations_expires_at_idx on invitations (expires_at);

-- 방명록
create table guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references invitations(id) on delete cascade,
  name text not null,
  password_hash text not null,
  content text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- 참석 응답
create table rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references invitations(id) on delete cascade,
  name text not null,
  attending boolean not null,
  org text not null default '',
  phone text not null default '',
  companions int not null default 0 check (companions between 0 and 9),
  source text not null check (source in ('guest', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 레터 원장 (잔액은 이 표의 합)
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  user_id uuid not null references profiles(id),
  invitation_id uuid references invitations(id) on delete set null,
  invitation_name text,
  kind text not null check (kind in (
    'activate', 'extend', 'edit', 'charge', 'signup_bonus', 'admin_grant', 'admin_revoke', 'refund'
  )),
  title text not null,
  lines jsonb not null default '[]',
  total int not null,
  price_won int,
  memo text,
  created_at timestamptz not null default now()
);
create index ledger_entries_user_created_idx on ledger_entries (user_id, created_at desc);

-- 회원별 레터 잔액 (원장이 없는 회원은 조회 쪽에서 coalesce(balance, 0))
-- security_invoker: 뷰 소유자 권한으로 원장 RLS 를 건너뛰지 않도록 조회하는 쪽 권한으로 읽는다
create view letter_balances with (security_invoker = true) as
  select user_id, sum(total) as balance
    from ledger_entries
   group by user_id;

-- 운영자 (전원 같은 권한, 역할은 admin 하나)
create table admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  role text not null default 'admin' check (role = 'admin'),
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- 운영자 작업 기록
create table admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid not null references admins(id),
  action text not null,
  target_type text not null,
  target_id text,
  before jsonb,
  after jsonb,
  memo text,
  created_at timestamptz not null default now()
);
create index admin_audit_logs_created_at_idx on admin_audit_logs (created_at desc);
create index admin_audit_logs_target_idx on admin_audit_logs (target_type, target_id);

alter table profiles enable row level security;
alter table invitations enable row level security;
alter table guestbook_entries enable row level security;
alter table rsvp_responses enable row level security;
alter table ledger_entries enable row level security;
alter table admins enable row level security;
alter table admin_audit_logs enable row level security;
