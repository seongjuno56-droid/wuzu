-- 1-B 회원 인증: 소셜 가입 트리거, 내 정보 RPC, profiles RLS, 탈퇴 확정 함수
-- 실행기가 파일마다 트랜잭션으로 감싸므로 begin/commit 은 쓰지 않는다.
-- 앱은 profiles 를 select 로만 읽고, 고치는 일은 모두 아래 RPC(security definer)로 한다.

-- 탈퇴 확정 때 auth.users 행만 지우고 익명 profiles 행은 결제·원장 연결용으로 남기므로 외래키를 없앤다
alter table profiles drop constraint profiles_id_fkey;

alter table profiles drop constraint profiles_status_check;
alter table profiles
  add constraint profiles_status_check check (status in ('active', 'withdrawing', 'banned', 'withdrawn'));

-- 가입 트리거: 소셜 로그인으로 auth.users 행이 생기면 profiles 행을 만든다.
-- provider 메타가 없는 행(어드민 시드·테스트가 직접 넣는 경우)은 건드리지 않는다.
-- 허용하지 않는 provider 는 profiles 의 check 에 걸려 가입 자체가 실패한다.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider text := new.raw_app_meta_data ->> 'provider';
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text;
  v_login_id text;
  v_chars constant text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  i int;
begin
  if v_provider is null then
    return new;
  end if;

  v_name := left(coalesce(
    nullif(btrim(v_meta ->> 'full_name'), ''),
    nullif(btrim(v_meta ->> 'name'), ''),
    nullif(btrim(v_meta ->> 'nickname'), ''),
    nullif(btrim(v_meta ->> 'preferred_username'), ''),
    '회원'
  ), 30);

  -- login_id: 'ka_' / 'go_' + 영소문자·숫자 8자. 이미 있으면 다시 뽑는다
  loop
    v_login_id := left(v_provider, 2) || '_';
    for i in 1..8 loop
      v_login_id := v_login_id || substr(v_chars, 1 + floor(random() * 36)::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where login_id = v_login_id);
  end loop;

  insert into public.profiles (id, email, name, provider, login_id)
  values (new.id, new.email, v_name, v_provider, v_login_id)
  on conflict (id) do nothing;

  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: 회원은 자기 행만 읽는다. 쓰기 권한은 주지 않는다
revoke all on table profiles from anon, authenticated;
grant select on table profiles to authenticated;
create policy profiles_select_own on profiles
  for select to authenticated
  using (id = auth.uid());

-- 내부용: 지금 회원의 행을 잠가서 가져온다. 정지·탈퇴 회원이면 account_unavailable
create function public.lock_my_profile() returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid() for update;
  if not found then
    raise exception 'profile_not_found';
  end if;
  if p.status in ('banned', 'withdrawn') then
    raise exception 'account_unavailable';
  end if;
  return p;
end;
$$;
revoke execute on function public.lock_my_profile() from public, anon, authenticated;

-- 내 정보 (없으면 null)
create function public.my_profile() returns public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles where id = auth.uid();
$$;

-- 추가 정보(생년월일·성별·마케팅 동의) 저장. 마케팅 값이 바뀔 때만 marketing_updated_at 갱신
create function public.update_my_profile(p_birth date, p_gender text, p_marketing boolean)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
begin
  update public.profiles
     set birth = p_birth,
         gender = p_gender,
         marketing_agreed = coalesce(p_marketing, p.marketing_agreed),
         marketing_updated_at = case
           when p_marketing is not null and p_marketing is distinct from p.marketing_agreed then now()
           else p.marketing_updated_at
         end,
         profile_updated_at = now()
   where id = p.id
  returning * into p;
  return p;
end;
$$;

-- 계정 정보(이름·생년월일·성별) 수정. 이름은 앞뒤 공백을 지우고 1~30자
create function public.update_my_account(p_name text, p_birth date, p_gender text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
  v_name text := btrim(p_name);
begin
  if v_name is null or char_length(v_name) < 1 or char_length(v_name) > 30 then
    raise exception 'invalid_name';
  end if;
  update public.profiles
     set name = v_name,
         birth = p_birth,
         gender = p_gender,
         profile_updated_at = now()
   where id = p.id
  returning * into p;
  return p;
end;
$$;

-- 마케팅 수신 동의 바꾸기
create function public.set_my_marketing(p_agreed boolean) returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
begin
  if p_agreed is null then
    raise exception 'invalid_marketing';
  end if;
  update public.profiles
     set marketing_agreed = p_agreed,
         marketing_updated_at = now()
   where id = p.id
  returning * into p;
  return p;
end;
$$;

-- 탈퇴 신청: active 일 때만. 30일 뒤 finalize_withdrawals 가 확정한다
create function public.request_withdraw() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
begin
  if p.status <> 'active' then
    raise exception 'invalid_status';
  end if;
  update public.profiles
     set status = 'withdrawing',
         withdraw_requested_at = now()
   where id = p.id;
end;
$$;

-- 탈퇴 취소: 신청 후 30일 안일 때만
create function public.cancel_withdraw() returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
begin
  if p.status <> 'withdrawing' or p.withdraw_requested_at < now() - interval '30 days' then
    raise exception 'cannot_cancel_withdraw';
  end if;
  update public.profiles
     set status = 'active',
         withdraw_requested_at = null
   where id = p.id
  returning * into p;
  return p;
end;
$$;

revoke execute on function public.my_profile() from public, anon;
revoke execute on function public.update_my_profile(date, text, boolean) from public, anon;
revoke execute on function public.update_my_account(text, date, text) from public, anon;
revoke execute on function public.set_my_marketing(boolean) from public, anon;
revoke execute on function public.request_withdraw() from public, anon;
revoke execute on function public.cancel_withdraw() from public, anon;
grant execute on function public.my_profile() to authenticated;
grant execute on function public.update_my_profile(date, text, boolean) to authenticated;
grant execute on function public.update_my_account(text, date, text) to authenticated;
grant execute on function public.set_my_marketing(boolean) to authenticated;
grant execute on function public.request_withdraw() to authenticated;
grant execute on function public.cancel_withdraw() to authenticated;

-- 탈퇴 확정: 신청 후 30일 지난 회원마다 초대장을 지우고(방명록·참석 응답은 cascade, 원장은 set null)
-- profiles 를 익명화한 뒤 auth.users 행을 지운다. 처리한 수를 돌려준다. pg_cron 이 매일 부른다
create function public.finalize_withdrawals() returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id from public.profiles
     where status = 'withdrawing'
       and withdraw_requested_at < now() - interval '30 days'
       for update skip locked
  loop
    delete from public.invitations where owner_id = r.id;
    update public.profiles
       set name = '탈퇴 회원',
           email = null,
           phone = null,
           birth = null,
           gender = null,
           login_id = null,
           status = 'withdrawn'
     where id = r.id;
    delete from auth.users where id = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.finalize_withdrawals() from public, anon, authenticated;
