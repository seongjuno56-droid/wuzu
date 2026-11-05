-- 삭제 연결: 초대장을 지우는 길마다 파일을 삭제 대기열에 넣고, 예약 작업이 하객 데이터와 R2 파일을 지운다.
-- 실행기가 파일마다 트랜잭션으로 감싸므로 begin/commit 은 쓰지 않는다.
-- 대기열을 비우는 일은 Edge Function purge-media 가 한다(DB 함수는 R2 에 닿지 못한다). 예약은 supabase/manual/schedule_guest_link.sql.

-- 마지막으로 지우려 한 시각. 실패한 파일이 줄 앞을 막지 않게 뒤로 보내고, 같은 실행에서 다시 나오지 않게 한다
alter table public.media_files add column purge_tried_at timestamptz;

-- 만든 사람 삭제: 파일 표시를 먼저 한다(지우고 나면 invitation_id 가 비어 찾을 수 없다). 남의 것이면 둘 다 아무 일도 하지 않는다
create or replace function public.remove_my_invitation(p_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
begin
  perform public.mark_media_removed(i.id)
     from public.invitations i
    where i.id = p_id
      and i.owner_id = p.id;
  delete from public.invitations
   where id = p_id
     and owner_id = p.id;
end;
$$;

-- 탈퇴 확정: 20261029000001_member_auth.sql 의 동작 그대로이고, 초대장을 지우기 전에 파일을 대기열에 넣는 것만 더했다.
-- 탈퇴 전에 지운 초대장의 파일은 그때 이미 대기열에 들어갔다. media_files 에는 회원 칸이 없어 초대장이 없는 줄을 회원별로
-- 찾을 수 없으므로, 표시 없이 남은 줄은 회원과 상관없이 media_purge_claim 이 모두 대기열로 옮긴다
create or replace function public.finalize_withdrawals() returns int
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
    perform public.mark_media_removed(i.id)
       from public.invitations i
      where i.owner_id = r.id;
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

-- 하객 데이터 파기: 초대장 기간이 끝나고 30일 지난 방명록·참석 응답을 지운다. 지운 줄 수를 돌려준다.
-- 처리방침(src/data/terms.ts 4번)의 약속이다. 연장하면 expires_at 이 늦어져 그만큼 남는다.
-- 초대장과 파일은 그대로 둔다(만료 뒤 파일 삭제는 4단계, 처리방침 5번). 함수 주인인 예약 작업(pg_cron, postgres)만 부른다
create function public.purge_guest_data() returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entries int;
  v_responses int;
begin
  delete from public.guestbook_entries e
   using public.invitations i
   where e.invitation_id = i.id
     and i.expires_at < now() - interval '30 days';
  get diagnostics v_entries = row_count;
  delete from public.rsvp_responses r
   using public.invitations i
   where r.invitation_id = i.id
     and i.expires_at < now() - interval '30 days';
  get diagnostics v_responses = row_count;
  return v_entries + v_responses;
end;
$$;
revoke execute on function public.purge_guest_data() from public, anon, authenticated, service_role;

-- purge-media 가 지울 파일을 묶음으로 받아 간다. 실패한 파일은 표시하지 않고 남겨 뒀다가 다시 내준다.
-- 15분 지연: 삭제 직전에 내준 서명 주소(10분, _shared/presign.ts)로 올라오는 파일이 지운 뒤에 남지 않게 기다린다.
-- 1시간 안에 시도한 파일은 내주지 않아 한 실행 안에서 같은 파일을 되풀이하지 않는다.
-- 먼저 표시 없이 초대장만 사라진 줄을 대기열로 옮긴다. FK 가 비운 줄이라 어떤 초대장에도 쓰이지 않는다
-- (표시와 삭제 사이에 끼어든 기록, 손으로 지운 초대장).
-- 전제: 파일 하나는 초대장 하나에만 속한다(record_media_file 이 키에 그 초대장 id 를 강제한다). 초대장을 복사해 키를 나눠 쓰는 기능을 만들면 이 삭제를 먼저 고쳐야 한다.
-- invitation_id is null 은 방어선이다. 표시가 잘못 남아도 초대장이 살아 있는 파일은 지우지 않는다
create function public.media_purge_claim(p_limit int) returns table (r2_key text, kind text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.media_files m
     set in_use = false,
         delete_requested_at = now()
   where m.invitation_id is null
     and m.delete_requested_at is null
     and m.deleted_at is null;

  return query
  with picked as (
    select m.id
      from public.media_files m
     where m.delete_requested_at < now() - interval '15 minutes'
       and m.invitation_id is null
       and m.deleted_at is null
       and (m.purge_tried_at is null or m.purge_tried_at < now() - interval '1 hour')
     order by m.purge_tried_at nulls first, m.delete_requested_at, m.id
     limit greatest(least(p_limit, 200), 0)
       for update skip locked
  )
  update public.media_files m
     set purge_tried_at = now()
    from picked
   where m.id = picked.id
  returning m.r2_key, m.kind;
end;
$$;

-- R2 에서 지운 파일 표시. 대기열에 든 것만 표시한다. 표시한 수를 돌려준다
create function public.media_purge_done(p_keys text[]) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update public.media_files
     set deleted_at = now()
   where r2_key = any(p_keys)
     and delete_requested_at is not null
     and deleted_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.media_purge_claim(int) from public, anon, authenticated;
revoke execute on function public.media_purge_done(text[]) from public, anon, authenticated;
grant execute on function public.media_purge_claim(int) to service_role;
grant execute on function public.media_purge_done(text[]) to service_role;
