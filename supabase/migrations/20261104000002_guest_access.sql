-- 1-C 하객 접근: slug 로 초대장 읽기, 방명록, 참석 응답, 그리고 만든 사람의 명단·방명록 관리.
-- 실행기가 파일마다 트랜잭션으로 감싸므로 begin/commit 은 쓰지 않는다.
-- 표에는 아무도 직접 닿지 않는다. anon 은 guest_ 로 시작하는 RPC 만, owner_ RPC 는 authenticated 만 실행한다.
-- 하객 RPC 는 초대장 표만 본다. 회원 표와 조인하지 않으므로 정지·탈퇴 신청 회원의 초대장도 열린다(사용자 결정).
-- 규칙의 원본: src/features/rsvp/rsvp.ts validateRsvp·isRsvpClosed, src/features/invitation/model.ts validateGuestbookEntry·rsvpOf,
-- src/features/invitation/corporate.ts isPhone. 앱 규칙을 바꾸면 이 함수들도 새 마이그레이션으로 고친다.
--
-- 하객 쓰기의 결과는 {ok:true, ...} | {ok:false, reason} 이다. reason:
--   not_found    활성화 중이 아니거나(만료·숨김·작성 중·삭제) 대상이 없다. 어느 경우인지 구별해 주지 않는다
--   closed       이 초대장이 그 항목을 받지 않는다(꺼 둠, 그런 항목이 없는 테마, 응답 마감)
--   invalid      입력 검사 위반
--   rate_limited 분당 30건(쓰기 칸·시도 칸 따로), 또는 방명록·응답 각 5000건을 넘었다
--   wrong_password 방명록 비밀번호가 틀렸다

-- 하객이 자기 응답을 다시 읽고 고칠 때 쓰는 토큰의 해시. 만든 사람이 직접 넣은 행은 null 이라 어떤 토큰으로도 닿지 못한다
alter table rsvp_responses add column guest_token_hash text;

-- 목록·건수 검사가 초대장 ID 로 찾으므로 인덱스가 있어야 한다
create index guestbook_entries_invitation_idx on guestbook_entries (invitation_id, created_at desc);
create index rsvp_responses_invitation_idx on rsvp_responses (invitation_id, created_at desc);

-- 초대장당 지금 분의 횟수. 칸마다 한 행만 두어 쌓이지 않는다.
-- write: 새 글·새 응답. attempt: 비밀번호·토큰을 내미는 요청(방명록 삭제, 자기 응답 고치기).
-- 칸을 나눠서 비밀번호를 맞히려는 시도가 다른 하객의 새 글을 막지 못하고, 도배가 자기 글 지우기를 막지 못한다
create table guest_write_rate (
  invitation_id uuid not null references invitations(id) on delete cascade,
  bucket text not null check (bucket in ('write', 'attempt')),
  window_start timestamptz not null,
  n int not null,
  primary key (invitation_id, bucket)
);
alter table guest_write_rate enable row level security;

revoke all on table guestbook_entries from anon, authenticated;
revoke all on table rsvp_responses from anon, authenticated;
revoke all on table guest_write_rate from anon, authenticated;

-- ── 내부 함수: RPC 안에서만 부른다. 아래에서 모두 실행 권한을 뺀다 ──

-- JS String.trim 과 같다. btrim 은 공백 문자만 지워서 전각 공백(한글 입력기)·줄바꿈만 있는 값을 통과시킨다
create function public.js_trim(p text) returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    p,
    '^[\u0009-\u000d \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+|[\u0009-\u000d \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+$',
    '',
    'g'
  );
$$;

-- JS String.length 와 같다(UTF-16 단위). char_length 로 재면 이모지를 앱의 절반으로 세어 앱보다 긴 글이 들어온다
create function public.js_length(p text) returns int
language sql
immutable
set search_path = ''
as $$
  select char_length(p) + char_length(regexp_replace(p, '[^\U00010000-\U0010FFFF]', '', 'g'));
$$;

-- content·design 에서 하객에게 보일 부분만 남긴다. 늘 켜진 칸(테마 공통 값, 기본 정보, 일시·장소, 인사말, 오시는 길, 표지)과
-- enabled 가 true 인 항목뿐이다. 칸 이름은 테마와 상관없이 OptionalSection·PageKey 와 같다(src/features/invitation/model.ts).
-- 허용 목록이라 새 항목이 생겨도 저절로 나가지 않는다. 늘 켜진 항목이 새로 생기면 이 목록에 더한다.
-- 화면은 pageOrder 로 켠 장만 그리고 BGM 도 enabled.bgm 을 먼저 보므로 빠진 칸을 읽지 않는다
create function public.visible_invitation_part(p jsonb, p_enabled jsonb) returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    from jsonb_each(p) e
   where e.key in ('theme', 'cover', 'basic', 'ceremony', 'greeting', 'directions')
      or p_enabled -> e.key = 'true'::jsonb;
$$;

-- 하객에게 주는 초대장. 앱 Invitation 중 화면에 쓰는 값만 허용 목록으로 고른다.
-- 소유자·번호·방명록 확인 시각·입력 완료 표시·제작일은 내보내지 않는다. status·banned·expiresAt 은 화면의 screenStatus 가 읽는다
create function public.invitation_guest_json(i public.invitations) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id,
    'themeId', i.theme_id,
    'templateId', i.template_id,
    'name', i.name,
    'slug', i.slug,
    'linkThumb', i.link_thumb,
    'banned', i.banned,
    'status', i.status,
    'expiresAt', public.iso_utc(i.expires_at),
    'enabled', i.enabled,
    'order', i.page_order,
    'content', public.visible_invitation_part(i.content, i.enabled),
    'viewMode', i.view_mode,
    'paletteId', i.palette_id,
    'design', public.visible_invitation_part(i.design, i.enabled)
  );
$$;

-- 앱 GuestbookEntry 모양. password_hash·hidden 은 내보내지 않는다
create function public.guestbook_entry_json(e public.guestbook_entries) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id,
    'invitationId', e.invitation_id,
    'name', e.name,
    'content', e.content,
    'createdAt', public.iso_utc(e.created_at)
  );
$$;

-- 앱 RsvpResponse 모양. guest_token_hash 는 내보내지 않는다
create function public.rsvp_response_json(r public.rsvp_responses) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'invitationId', r.invitation_id,
    'name', r.name,
    'attending', r.attending,
    'org', r.org,
    'phone', r.phone,
    'companions', r.companions,
    'source', r.source,
    'createdAt', public.iso_utc(r.created_at),
    'updatedAt', public.iso_utc(r.updated_at)
  );
$$;

-- 화면이 방명록을 그리는 조건과 같다(기업 테마에는 방명록이 없다)
create function public.invitation_has_guestbook(i public.invitations) returns boolean
language sql
stable
set search_path = ''
as $$
  select i.theme_id <> 'corporate' and coalesce(i.enabled -> 'guestbook' = 'true'::jsonb, false);
$$;

-- 화면이 참석 신청을 그리는 조건과 같다: rsvpOf 가 있는 테마이고 켜 둔 경우
create function public.invitation_takes_rsvp(i public.invitations) returns boolean
language sql
stable
set search_path = ''
as $$
  select i.theme_id in ('corporate', 'meetup') and coalesce(i.enabled -> 'rsvp' = 'true'::jsonb, false);
$$;

-- 앱 isRsvpClosed 와 같다: 마감일 당일까지 받고, 날짜 모양이 아니면 마감 없음.
-- 앱은 기기 날짜로 비교한다. 서버는 UTC 라 그대로 비교하면 한국 아침 9시에야 넘어가므로 한국 날짜로 본다
create function public.rsvp_deadline_passed(p_deadline text, p_now timestamptz) returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(p_deadline ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', false)
     and to_char(p_now at time zone 'Asia/Seoul', 'YYYY-MM-DD') collate "C" > p_deadline collate "C";
$$;

-- 앱 validateRsvp + mock clean. 저장할 값을 돌려주고, 위반이면 null.
-- 받는 항목은 테마가 정한다. 받지 않는 칸은 길이 검사가 없으므로 입력을 버리고 기본값을 넣는다(도배로 저장량이 늘지 않게).
-- 정규식을 돌리기 전에 바이트 수로 거른다. 앞뒤 공백을 넉넉히 봐도 400바이트를 넘는 이름·소속·연락처는 없다
create function public.clean_rsvp_input(p jsonb, p_theme text) returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_name text;
  v_org text := '';
  v_phone text := '';
  v_companions numeric := 0;
  v_attending boolean;
begin
  if p_theme is null or p_theme not in ('corporate', 'meetup') then
    return null;
  end if;
  if jsonb_typeof(p) is distinct from 'object'
     or jsonb_typeof(p -> 'name') is distinct from 'string'
     or jsonb_typeof(p -> 'attending') is distinct from 'boolean' then
    return null;
  end if;

  if octet_length(p ->> 'name') > 400 then
    return null;
  end if;

  v_attending := (p ->> 'attending')::boolean;
  v_name := public.js_trim(p ->> 'name');
  if v_name = '' or public.js_length(v_name) > 10 then
    return null;
  end if;

  if p_theme = 'corporate' then
    if jsonb_typeof(p -> 'org') is distinct from 'string'
       or jsonb_typeof(p -> 'phone') is distinct from 'string' then
      return null;
    end if;
    if octet_length(p ->> 'org') > 400 or octet_length(p ->> 'phone') > 400 then
      return null;
    end if;
    v_org := public.js_trim(p ->> 'org');
    v_phone := public.js_trim(p ->> 'phone');
    if v_org = '' or public.js_length(v_org) > 20 then
      return null;
    end if;
    -- JS 의 \d 는 ASCII 숫자만이다. 여기 \d 는 다른 문자권 숫자도 받을 수 있어 [0-9] 로 쓴다
    if v_phone !~ '^0[0-9]{1,2}-?[0-9]{3,4}-?[0-9]{4}$' then
      return null;
    end if;
  elsif v_attending then
    -- 불참이면 동반 인원을 검사하지 않고 0 으로 둔다
    if jsonb_typeof(p -> 'companions') is distinct from 'number' then
      return null;
    end if;
    v_companions := (p ->> 'companions')::numeric;
    if v_companions <> trunc(v_companions) or v_companions < 0 or v_companions > 9 then
      return null;
    end if;
  end if;

  return jsonb_build_object(
    'name', v_name,
    'attending', v_attending,
    'org', v_org,
    'phone', v_phone,
    'companions', v_companions::int
  );
end;
$$;

-- 이번 요청을 세고, 분당 한도 안이면 true. 세는 행을 잠그므로 같은 칸의 요청은 트랜잭션 끝까지 차례로 돈다.
-- 그래서 write 칸 뒤의 5000건 검사가 동시 요청에 뚫리지 않는다. 단 그 검사는 이 함수와 다른 문장이어야 한다:
-- 한 문장 안이면 잠금을 기다리기 전의 스냅샷으로 세어 그사이 들어온 행을 놓친다.
-- 비밀번호 해시 계산도 attempt 칸 덕분에 초대장당 분당 30번을 넘지 않는다.
-- 예외를 던지지 않고 값으로 알리므로 횟수가 되돌려지지 않는다
-- 부르는 쪽은 초대장 행을 먼저 for key share 로 잡는다. 초대장 삭제의 cascade 와 서로 기다리는 일을 막고, 숨김·기간 변경은 막지 않는다
create function public.take_guest_write(p_id uuid, p_bucket text) returns boolean
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_limit constant int := 30;
  v_window timestamptz := date_trunc('minute', now());
begin
  insert into public.guest_write_rate as t (invitation_id, bucket, window_start, n)
  values (p_id, p_bucket, v_window, 1)
  on conflict (invitation_id, bucket) do update
     set window_start = greatest(t.window_start, excluded.window_start),
         n = case when t.window_start < excluded.window_start then 1 else t.n + 1 end
   where t.window_start < excluded.window_start or t.n < v_limit;
  return found;
end;
$$;

revoke execute on function public.js_trim(text) from public, anon, authenticated;
revoke execute on function public.js_length(text) from public, anon, authenticated;
revoke execute on function public.visible_invitation_part(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.invitation_guest_json(public.invitations) from public, anon, authenticated;
revoke execute on function public.guestbook_entry_json(public.guestbook_entries) from public, anon, authenticated;
revoke execute on function public.rsvp_response_json(public.rsvp_responses) from public, anon, authenticated;
revoke execute on function public.invitation_has_guestbook(public.invitations) from public, anon, authenticated;
revoke execute on function public.invitation_takes_rsvp(public.invitations) from public, anon, authenticated;
revoke execute on function public.rsvp_deadline_passed(text, timestamptz) from public, anon, authenticated;
revoke execute on function public.clean_rsvp_input(jsonb, text) from public, anon, authenticated;
revoke execute on function public.take_guest_write(uuid, text) from public, anon, authenticated;

-- ── 하객 RPC: 로그인 없이 부른다 ──

-- {state:'active', invitation} | {state:'expired'} | {state:'not_found'}.
-- 숨김·작성 중·활성화 전·삭제·없는 주소는 모두 not_found 로, 서로 구별되지 않는다. 숨김은 만료보다 먼저 본다
create function public.guest_invitation(p_slug text) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  i public.invitations;
  v_status text;
begin
  -- slug 는 12자다. 주소로 들어오는 값이라 긴 값은 찾아보지 않는다
  if octet_length(p_slug) > 64 then
    return jsonb_build_object('state', 'not_found');
  end if;
  select * into i from public.invitations where slug = p_slug;
  if not found then
    return jsonb_build_object('state', 'not_found');
  end if;
  v_status := public.invitation_screen_status(i);
  if v_status = 'active' then
    return jsonb_build_object('state', 'active', 'invitation', public.invitation_guest_json(i));
  elsif v_status = 'expired' then
    return jsonb_build_object('state', 'expired');
  end if;
  return jsonb_build_object('state', 'not_found');
end;
$$;

-- 방명록 목록: 보이는 글 중 최신 200건(anon 이 반복해서 받아도 응답 크기가 일정하게).
-- 활성화 중이 아니거나 방명록을 껐으면 빈 배열이다. 전체는 만든 사람의 owner_list_guestbook 으로 본다
create function public.guest_list_guestbook(p_id uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(v.j order by v.created_at desc, v.id), '[]'::jsonb)
    from (
      select public.guestbook_entry_json(e) as j, e.created_at, e.id
        from public.invitations i
        join public.guestbook_entries e on e.invitation_id = i.id
       where i.id = p_id
         and not e.hidden
         and public.invitation_screen_status(i) = 'active'
         and public.invitation_has_guestbook(i)
       order by e.created_at desc, e.id
       limit 200
    ) v;
$$;

-- 방명록 쓰기: {ok:true, entry} | {ok:false, reason}. 내용은 앱처럼 그대로 저장하고 이름만 다듬는다
create function public.guest_add_guestbook(p_id uuid, p_name text, p_password text, p_content text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cap constant int := 5000;
  i public.invitations;
  e public.guestbook_entries;
  v_name text;
begin
  select * into i from public.invitations where id = p_id for key share;
  if not found or public.invitation_screen_status(i) <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if not public.invitation_has_guestbook(i) then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  -- 정규식을 돌리기 전에 바이트 수로 거른다. UTF-16 한 단위는 최대 3바이트라 비밀번호 20은 60, 내용 300은 900바이트를 넘지 않는다.
  -- 이름은 앞뒤 공백을 다듬은 뒤의 길이를 보므로 넉넉히 400바이트까지 받는다
  if p_name is null or octet_length(p_name) > 400
     or p_password is null or octet_length(p_password) > 60
     or p_content is null or octet_length(p_content) > 900 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  v_name := public.js_trim(p_name);
  if v_name = '' or public.js_length(v_name) > 10
     or public.js_length(p_password) not between 4 and 20
     or public.js_trim(p_content) = '' or public.js_length(p_content) > 300 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if not public.take_guest_write(i.id, 'write') then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;
  -- take_guest_write 의 잠금을 얻은 뒤의 스냅샷으로 세야 하므로 문장을 나눈다
  if (select count(*) from public.guestbook_entries where invitation_id = i.id) >= v_cap then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  insert into public.guestbook_entries (invitation_id, name, password_hash, content)
  values (i.id, v_name, extensions.crypt(p_password, extensions.gen_salt('bf', 8)), p_content)
  returning * into e;
  return jsonb_build_object('ok', true, 'entry', public.guestbook_entry_json(e));
end;
$$;

-- 비밀번호로 방명록 지우기: {ok:true} | {ok:false, reason}.
-- 틀린 시도도 attempt 칸에 세어 4자리 비밀번호를 맞히는 시도를 늦춘다. 숨긴 글은 운영자 몫이라 없는 글로 본다
create function public.guest_remove_guestbook(p_id uuid, p_entry uuid, p_password text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.invitations;
  e public.guestbook_entries;
begin
  select * into i from public.invitations where id = p_id for key share;
  if not found or public.invitation_screen_status(i) <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into e
    from public.guestbook_entries
   where id = p_entry
     and invitation_id = i.id
     and not hidden;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- 앱에서 쓸 수 없는 길이는 해시를 계산하지 않고 끝낸다
  if p_password is null or octet_length(p_password) > 60 or public.js_length(p_password) not between 4 and 20 then
    return jsonb_build_object('ok', false, 'reason', 'wrong_password');
  end if;
  if not public.take_guest_write(i.id, 'attempt') then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;
  if extensions.crypt(p_password, e.password_hash) <> e.password_hash then
    return jsonb_build_object('ok', false, 'reason', 'wrong_password');
  end if;

  delete from public.guestbook_entries where id = e.id;
  return jsonb_build_object('ok', true);
end;
$$;

-- 참석 응답 제출: {ok:true, response, token, created} | {ok:false, reason}.
-- p_response 가 있으면 그 행을 고치고, 응답 ID·토큰·초대장이 모두 맞아야 한다. 하나라도 틀리면 not_found 이고 새 행을 만들지 않는다.
-- 토큰은 256비트 난수라 느린 해시가 필요 없고, 원문은 처음 제출한 응답에서 한 번만 준다
create function public.guest_rsvp_submit(p_id uuid, p_input jsonb, p_response uuid, p_token text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cap constant int := 5000;
  i public.invitations;
  r public.rsvp_responses;
  v_clean jsonb;
  v_token text;
begin
  select * into i from public.invitations where id = p_id for key share;
  if not found or public.invitation_screen_status(i) <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if not public.invitation_takes_rsvp(i)
     or public.rsvp_deadline_passed(i.content -> 'rsvp' ->> 'deadline', now()) then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  v_clean := public.clean_rsvp_input(p_input, i.theme_id);
  if v_clean is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if p_response is not null then
    -- 발급한 토큰은 16진수 64자다. 길이가 다르면 맞을 수 없으니 세지도 않는다
    if p_token is null or octet_length(p_token) <> 64 then
      return jsonb_build_object('ok', false, 'reason', 'not_found');
    end if;
    -- 행 수가 늘지 않고 토큰을 내미는 요청이라 attempt 칸에 센다
    if not public.take_guest_write(i.id, 'attempt') then
      return jsonb_build_object('ok', false, 'reason', 'rate_limited');
    end if;
    update public.rsvp_responses
       set name = v_clean ->> 'name',
           attending = (v_clean ->> 'attending')::boolean,
           org = v_clean ->> 'org',
           phone = v_clean ->> 'phone',
           companions = (v_clean ->> 'companions')::int,
           updated_at = now()
     where id = p_response
       and invitation_id = i.id
       and guest_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    returning * into r;
    if not found then
      return jsonb_build_object('ok', false, 'reason', 'not_found');
    end if;
    return jsonb_build_object(
      'ok', true,
      'response', public.rsvp_response_json(r),
      'token', p_token,
      'created', false
    );
  end if;

  if not public.take_guest_write(i.id, 'write') then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;
  -- take_guest_write 의 잠금을 얻은 뒤의 스냅샷으로 세야 하므로 문장을 나눈다
  if (select count(*) from public.rsvp_responses where invitation_id = i.id) >= v_cap then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.rsvp_responses (invitation_id, name, attending, org, phone, companions, source, guest_token_hash)
  values (
    i.id,
    v_clean ->> 'name',
    (v_clean ->> 'attending')::boolean,
    v_clean ->> 'org',
    v_clean ->> 'phone',
    (v_clean ->> 'companions')::int,
    'guest',
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
  )
  returning * into r;
  return jsonb_build_object(
    'ok', true,
    'response', public.rsvp_response_json(r),
    'token', v_token,
    'created', true
  );
end;
$$;

-- 자기 응답 다시 읽기. 토큰이 틀리거나 활성화 중이 아니면 null 이고, 어느 쪽인지 구별해 주지 않는다
create function public.guest_rsvp_get(p_id uuid, p_response uuid, p_token text) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.rsvp_response_json(r)
    from public.invitations i
    join public.rsvp_responses r on r.invitation_id = i.id
   where i.id = p_id
     and r.id = p_response
     and octet_length(p_token) = 64
     and r.guest_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and public.invitation_screen_status(i) = 'active';
$$;

-- ── 만든 사람 RPC: auth.uid() 본인 초대장만. 읽기는 초대장 상태와 상관없고, 쓰기는 lock_my_profile 로 정지·탈퇴 회원을 막는다 ──

-- 방명록 관리 목록(최신순, 남의 것이면 빈 배열). 숨긴 글은 운영자 몫이라 여기에도 없다
create function public.owner_list_guestbook(p_id uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.guestbook_entry_json(e) order by e.created_at desc, e.id), '[]'::jsonb)
    from public.invitations i
    join public.guestbook_entries e on e.invitation_id = i.id
   where i.id = p_id
     and i.owner_id = auth.uid()
     and not e.hidden;
$$;

-- 비밀번호 없이 지우기: {ok:true} | {ok:false, reason:'not_found'} (없거나 남의 것)
create function public.owner_remove_guestbook(p_id uuid, p_entry uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
begin
  delete from public.guestbook_entries e
   using public.invitations i
   where e.id = p_entry
     and e.invitation_id = p_id
     and not e.hidden
     and i.id = e.invitation_id
     and i.owner_id = p.id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 참석자 명단(최신순, 남의 것이면 빈 배열)
create function public.owner_rsvp_list(p_id uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.rsvp_response_json(r) order by r.created_at desc, r.id), '[]'::jsonb)
    from public.invitations i
    join public.rsvp_responses r on r.invitation_id = i.id
   where i.id = p_id
     and i.owner_id = auth.uid();
$$;

-- 명단에 직접 넣기. 마감·활성화와 상관없다. NOT_FOUND(없거나 남의 것) / INVALID / RATE_LIMITED(5000건).
-- 초대장 행을 for update 로 잠가 하객 쓰기(for key share)와 차례로 돌게 하고, 잠금을 얻은 뒤 다음 문장에서 센다
create function public.owner_rsvp_add(p_id uuid, p_input jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cap constant int := 5000;
  p public.profiles := public.lock_my_profile();
  i public.invitations;
  r public.rsvp_responses;
  v_clean jsonb;
begin
  select * into i from public.invitations where id = p_id and owner_id = p.id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  v_clean := public.clean_rsvp_input(p_input, i.theme_id);
  if v_clean is null then
    raise exception 'INVALID';
  end if;
  if (select count(*) from public.rsvp_responses where invitation_id = i.id) >= v_cap then
    raise exception 'RATE_LIMITED';
  end if;
  insert into public.rsvp_responses (invitation_id, name, attending, org, phone, companions, source)
  values (
    i.id,
    v_clean ->> 'name',
    (v_clean ->> 'attending')::boolean,
    v_clean ->> 'org',
    v_clean ->> 'phone',
    (v_clean ->> 'companions')::int,
    'manual'
  )
  returning * into r;
  return public.rsvp_response_json(r);
end;
$$;

-- 명단 고치기. source 는 그대로 두고, 하객의 토큰도 그대로라 하객이 계속 고칠 수 있다. NOT_FOUND / INVALID
create function public.owner_rsvp_update(p_id uuid, p_response uuid, p_input jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
  i public.invitations;
  r public.rsvp_responses;
  v_clean jsonb;
begin
  select * into i from public.invitations where id = p_id and owner_id = p.id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  v_clean := public.clean_rsvp_input(p_input, i.theme_id);
  if v_clean is null then
    raise exception 'INVALID';
  end if;
  update public.rsvp_responses
     set name = v_clean ->> 'name',
         attending = (v_clean ->> 'attending')::boolean,
         org = v_clean ->> 'org',
         phone = v_clean ->> 'phone',
         companions = (v_clean ->> 'companions')::int,
         updated_at = now()
   where id = p_response
     and invitation_id = i.id
  returning * into r;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  return public.rsvp_response_json(r);
end;
$$;

-- 명단에서 지우기. 없거나 남의 것이면 아무 일도 하지 않는다(mock 과 같다)
create function public.owner_rsvp_remove(p_id uuid, p_response uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
begin
  delete from public.rsvp_responses r
   using public.invitations i
   where r.id = p_response
     and r.invitation_id = p_id
     and i.id = r.invitation_id
     and i.owner_id = p.id;
end;
$$;

-- Supabase 는 public 의 새 함수를 기본으로 anon·authenticated 에 연다. 그래서 전부 먼저 뺀 뒤 필요한 역할에만 준다
revoke execute on function public.guest_invitation(text) from public, anon, authenticated;
revoke execute on function public.guest_list_guestbook(uuid) from public, anon, authenticated;
revoke execute on function public.guest_add_guestbook(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.guest_remove_guestbook(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.guest_rsvp_submit(uuid, jsonb, uuid, text) from public, anon, authenticated;
revoke execute on function public.guest_rsvp_get(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.guest_invitation(text) to anon, authenticated;
grant execute on function public.guest_list_guestbook(uuid) to anon, authenticated;
grant execute on function public.guest_add_guestbook(uuid, text, text, text) to anon, authenticated;
grant execute on function public.guest_remove_guestbook(uuid, uuid, text) to anon, authenticated;
grant execute on function public.guest_rsvp_submit(uuid, jsonb, uuid, text) to anon, authenticated;
grant execute on function public.guest_rsvp_get(uuid, uuid, text) to anon, authenticated;

revoke execute on function public.owner_list_guestbook(uuid) from public, anon;
revoke execute on function public.owner_remove_guestbook(uuid, uuid) from public, anon;
revoke execute on function public.owner_rsvp_list(uuid) from public, anon;
revoke execute on function public.owner_rsvp_add(uuid, jsonb) from public, anon;
revoke execute on function public.owner_rsvp_update(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.owner_rsvp_remove(uuid, uuid) from public, anon;
grant execute on function public.owner_list_guestbook(uuid) to authenticated;
grant execute on function public.owner_remove_guestbook(uuid, uuid) to authenticated;
grant execute on function public.owner_rsvp_list(uuid) to authenticated;
grant execute on function public.owner_rsvp_add(uuid, jsonb) to authenticated;
grant execute on function public.owner_rsvp_update(uuid, uuid, jsonb) to authenticated;
grant execute on function public.owner_rsvp_remove(uuid, uuid) to authenticated;
