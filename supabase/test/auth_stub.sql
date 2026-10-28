-- 테스트·로컬 PGlite 전용: Supabase 의 auth 스키마와 역할을 같은 이름으로 흉내 낸다.
-- 운영 Supabase 에는 이미 있으므로 migrations 폴더에 두지 않는다.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
end
$$;
