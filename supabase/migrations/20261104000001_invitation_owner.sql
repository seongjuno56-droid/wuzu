-- 1-C 본인 초대장: 주소(slug)를 첫 활성화 때 발급하도록 바꾸고, 앱이 쓰는 RPC 를 만든다.
-- 실행기가 파일마다 트랜잭션으로 감싸므로 begin/commit 은 쓰지 않는다.
-- 앱은 invitations 표에 직접 닿지 않는다. 모든 RPC 는 auth.uid() 본인 것만 다루고 authenticated 만 실행한다.
-- 번호·작성자·제작일·활성화 기간·제재·slug·방명록 확인 시각은 서버 값이고, 앱이 보낸 값은 읽지 않는다.
-- 규칙의 원본: src/features/wallet/pricing.ts applyOrder, src/services/mock/mockInvitationService.ts save,
-- src/features/invitation/status.ts screenStatus. 가격·일수를 바꾸면 이 함수들도 새 마이그레이션으로 고친다.

-- 운영 Supabase 에서는 pgcrypto 가 이미 extensions 스키마에 있어 아무 일도 하지 않는다.
-- 테스트 PGlite 는 auth_stub.sql 이 extensions 스키마를 만들어 둔다
create extension if not exists pgcrypto with schema extensions;

alter table invitations alter column slug drop not null;
alter table invitations add column link_thumb text;

revoke all on table invitations from anon, authenticated;

-- ── 내부 함수: RPC 안에서만 부른다. 아래에서 모두 실행 권한을 뺀다 ──

-- 앱의 new Date().toISOString() 과 같은 형식. 앱이 날짜 문자열을 그대로 비교·정렬하므로 형식을 맞춘다
create function public.iso_utc(p_at timestamptz) returns text
language sql
stable
set search_path = ''
as $$
  select to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;

-- 앱 screenStatus 와 같다
create function public.invitation_screen_status(i public.invitations) returns text
language sql
stable
set search_path = ''
as $$
  select case
    when i.banned then 'blocked'
    when i.status = 'draft' then 'writing'
    when i.expires_at is null then 'inactive'
    when now() < i.expires_at then 'active'
    else 'expired'
  end;
$$;

-- 표의 행 → 앱 Invitation 모양. 앱 타입에서 선택 칸(?:)인 값은 없으면 키를 뺀다
create function public.invitation_json(i public.invitations) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
      'id', i.id,
      'ownerId', i.owner_id,
      'themeId', i.theme_id,
      'templateId', i.template_id,
      'name', i.name,
      'number', i.number,
      'linkThumb', i.link_thumb,
      'banned', i.banned,
      'status', i.status,
      'enabled', i.enabled,
      'order', i.page_order,
      'content', i.content,
      'viewMode', i.view_mode,
      'paletteId', i.palette_id,
      'design', i.design,
      'completed', i.completed,
      'createdAt', public.iso_utc(i.created_at),
      'updatedAt', public.iso_utc(i.updated_at)
    ) || jsonb_strip_nulls(jsonb_build_object(
      'slug', i.slug,
      'activatedAt', public.iso_utc(i.activated_at),
      'expiresAt', public.iso_utc(i.expires_at),
      'guestbookSeenAt', public.iso_utc(i.guestbook_seen_at)
    ));
$$;

-- 앱이 보낸 초대장 내용이 표에 넣을 수 있는 모양인지. 이름은 앱 isValidInvitationName 과 같이 1~30자.
-- status·viewMode·enabled·order·design·completed 는 없으면 기본값으로 저장한다(옛 저장본 보정과 같다)
create function public.valid_invitation_data(p jsonb) returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_typeof(p) = 'object'
    and p ->> 'themeId' in ('wedding', 'dol', 'corporate', 'meetup')
    and jsonb_typeof(p -> 'templateId') = 'string'
    and p ->> 'templateId' <> ''
    and jsonb_typeof(p -> 'name') = 'string'
    and char_length(btrim(p ->> 'name')) between 1 and 30
    and jsonb_typeof(p -> 'content') = 'object'
    and coalesce(p ->> 'status', 'draft') in ('draft', 'final')
    and coalesce(p ->> 'viewMode', 'story') in ('story', 'scroll')
    and coalesce(jsonb_typeof(p -> 'enabled'), 'object') = 'object'
    and coalesce(jsonb_typeof(p -> 'order'), 'array') = 'array'
    and coalesce(jsonb_typeof(p -> 'design'), 'object') = 'object'
    and coalesce(jsonb_typeof(p -> 'completed'), 'object') = 'object'
    and coalesce(jsonb_typeof(p -> 'paletteId'), 'null') in ('string', 'null')
    and coalesce(jsonb_typeof(p -> 'linkThumb'), 'null') in ('string', 'null'),
    false
  );
$$;

-- 초대장No: 앱 newInvitationNumber 와 같은 11자리(첫 자리 1~9). 추측되어도 괜찮아 random() 을 쓴다
create function public.new_invitation_number() returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_number text;
begin
  loop
    v_number := (10000000000 + floor(random() * 90000000000)::bigint)::text;
    exit when not exists (select 1 from public.invitations where number = v_number);
  end loop;
  return v_number;
end;
$$;

-- 공유 주소: base62 12자(약 71비트). 62로 나눌 때 치우치지 않게 248 이상인 바이트는 버린다
create function public.new_invitation_slug() returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_chars constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  v_bytes bytea;
  v_byte int;
  v_slug text;
  i int;
begin
  loop
    v_slug := '';
    while char_length(v_slug) < 12 loop
      v_bytes := extensions.gen_random_bytes(16);
      for i in 0..15 loop
        v_byte := get_byte(v_bytes, i);
        if v_byte < 248 and char_length(v_slug) < 12 then
          v_slug := v_slug || substr(v_chars, 1 + v_byte % 62, 1);
        end if;
      end loop;
    end loop;
    exit when not exists (select 1 from public.invitations where slug = v_slug);
  end loop;
  return v_slug;
end;
$$;

-- 앱이 고칠 수 있는 칸만 통째로 바꾼다. 모양 검사와 소유자·상태 확인은 부르는 쪽에서 한다
create function public.update_invitation_content(p_id uuid, p_data jsonb) returns public.invitations
language sql
volatile
set search_path = ''
as $$
  update public.invitations
     set theme_id = p_data ->> 'themeId',
         template_id = p_data ->> 'templateId',
         name = btrim(p_data ->> 'name'),
         status = coalesce(p_data ->> 'status', 'draft'),
         view_mode = coalesce(p_data ->> 'viewMode', 'story'),
         palette_id = p_data ->> 'paletteId',
         link_thumb = p_data ->> 'linkThumb',
         enabled = coalesce(p_data -> 'enabled', '{}'::jsonb),
         page_order = coalesce(p_data -> 'order', '[]'::jsonb),
         content = p_data -> 'content',
         design = coalesce(p_data -> 'design', '{}'::jsonb),
         completed = coalesce(p_data -> 'completed', '{}'::jsonb),
         updated_at = now()
   where id = p_id
  returning *;
$$;

revoke execute on function public.iso_utc(timestamptz) from public, anon, authenticated;
revoke execute on function public.invitation_screen_status(public.invitations) from public, anon, authenticated;
revoke execute on function public.invitation_json(public.invitations) from public, anon, authenticated;
revoke execute on function public.valid_invitation_data(jsonb) from public, anon, authenticated;
revoke execute on function public.new_invitation_number() from public, anon, authenticated;
revoke execute on function public.new_invitation_slug() from public, anon, authenticated;
revoke execute on function public.update_invitation_content(uuid, jsonb) from public, anon, authenticated;

-- ── 앱이 부르는 RPC. 쓰기는 lock_my_profile 로 정지·탈퇴 회원을 막는다 ──

-- 내 초대장 목록 (최근 수정순, 없으면 빈 배열)
create function public.list_my_invitations() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.invitation_json(i) order by i.updated_at desc, i.id), '[]'::jsonb)
    from public.invitations i
   where i.owner_id = auth.uid();
$$;

-- 내 초대장 하나 (없거나 남의 것이면 null)
create function public.get_my_invitation(p_id uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.invitation_json(i)
    from public.invitations i
   where i.id = p_id
     and i.owner_id = auth.uid();
$$;

-- 일반 저장. p_id 가 null 이면 새로 만든다. 활성화 중이면 PAID_EDIT_REQUIRED (내용 변경은 apply_invitation_order 의 edit 로만)
create function public.save_my_invitation(p_id uuid, p_data jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
  i public.invitations;
  v_id uuid := p_id;
begin
  if p_id is not null then
    select * into i
      from public.invitations
     where id = p_id
       and owner_id = p.id
       for update;
    if not found then
      raise exception 'NOT_FOUND';
    end if;
    if public.invitation_screen_status(i) = 'active' then
      raise exception 'PAID_EDIT_REQUIRED';
    end if;
  end if;

  if not public.valid_invitation_data(p_data) then
    raise exception 'INVALID';
  end if;

  if p_id is null then
    insert into public.invitations (owner_id, number, theme_id, template_id, name, content)
    values (
      p.id,
      public.new_invitation_number(),
      p_data ->> 'themeId',
      p_data ->> 'templateId',
      btrim(p_data ->> 'name'),
      p_data -> 'content'
    )
    returning id into v_id;
  end if;

  i := public.update_invitation_content(v_id, p_data);
  return public.invitation_json(i);
end;
$$;

-- 이름 바꾸기. 활성화 중에도 된다(mock 과 같다)
create function public.rename_my_invitation(p_id uuid, p_name text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
  i public.invitations;
  v_name text := btrim(p_name);
begin
  if v_name is null or char_length(v_name) < 1 or char_length(v_name) > 30 then
    raise exception 'INVALID';
  end if;
  update public.invitations
     set name = v_name,
         updated_at = now()
   where id = p_id
     and owner_id = p.id
  returning * into i;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  return public.invitation_json(i);
end;
$$;

-- 지우기. 방명록·참석 응답은 cascade 로 함께 지워진다. 없거나 남의 것이면 아무 일도 하지 않는다
create function public.remove_my_invitation(p_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
begin
  delete from public.invitations
   where id = p_id
     and owner_id = p.id;
end;
$$;

-- 방명록 확인 시각. 없거나 남의 것이면 아무 일도 하지 않는다. 수정 시각은 건드리지 않는다
create function public.mark_guestbook_seen(p_id uuid, p_at timestamptz) returns void
language sql
security definer
set search_path = ''
as $$
  update public.invitations
     set guestbook_seen_at = p_at
   where id = p_id
     and owner_id = auth.uid();
$$;

-- 활성화·연장·수정. 앱 SpendOrder 를 그대로 받아 {ok:true, invitation} | {ok:false, reason} 을 돌려준다.
-- reason: not_found(없거나 남의 것) / blocked(숨김) / invalid(지금 상태에서 할 수 없거나 값이 틀림).
-- slug 는 첫 활성화 때만 만들고 그 뒤로는 그대로 둔다.
-- 2단계 전까지 레터는 앱의 mock 지갑에서 차감하고 여기서는 검사하지 않는다(설계 5장에 적은 구멍, 2단계 전 출시 금지).
create function public.apply_invitation_order(p_order jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
  i public.invitations;
  v_kind text := p_order ->> 'kind';
  v_id text := case when p_order ->> 'kind' = 'edit'
    then p_order -> 'invitation' ->> 'id'
    else p_order ->> 'invitationId' end;
  v_status text;
  -- pricing.ts: ACTIVATION.days = 15, EXTEND_OPTIONS = 30·60·180일
  v_activation_days constant int := 15;
  v_days text := case when jsonb_typeof(p_order -> 'extendDays') = 'number'
    then p_order ->> 'extendDays' end;
begin
  if v_kind is null or v_kind not in ('activate', 'extend', 'edit') or v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if v_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into i
    from public.invitations
   where id = v_id::uuid
     and owner_id = p.id
     for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if i.banned then
    return jsonb_build_object('ok', false, 'reason', 'blocked');
  end if;

  v_status := public.invitation_screen_status(i);

  if v_kind = 'activate' then
    if v_status not in ('inactive', 'expired') or coalesce(v_days, '') not in ('0', '30', '60', '180') then
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    end if;
    update public.invitations
       set activated_at = now(),
           expires_at = now() + (v_activation_days + v_days::int) * interval '24 hours',
           slug = coalesce(slug, public.new_invitation_slug()),
           updated_at = now()
     where id = i.id
    returning * into i;
  elsif v_kind = 'extend' then
    if v_status <> 'active' or coalesce(v_days, '') not in ('30', '60', '180') then
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    end if;
    update public.invitations
       set expires_at = expires_at + v_days::int * interval '24 hours',
           updated_at = now()
     where id = i.id
    returning * into i;
  else
    if v_status <> 'active' or not public.valid_invitation_data(p_order -> 'invitation') then
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    end if;
    i := public.update_invitation_content(
      i.id,
      (p_order -> 'invitation') || jsonb_build_object('status', 'final')
    );
  end if;

  return jsonb_build_object('ok', true, 'invitation', public.invitation_json(i));
end;
$$;

revoke execute on function public.list_my_invitations() from public, anon;
revoke execute on function public.get_my_invitation(uuid) from public, anon;
revoke execute on function public.save_my_invitation(uuid, jsonb) from public, anon;
revoke execute on function public.rename_my_invitation(uuid, text) from public, anon;
revoke execute on function public.remove_my_invitation(uuid) from public, anon;
revoke execute on function public.mark_guestbook_seen(uuid, timestamptz) from public, anon;
revoke execute on function public.apply_invitation_order(jsonb) from public, anon;
grant execute on function public.list_my_invitations() to authenticated;
grant execute on function public.get_my_invitation(uuid) to authenticated;
grant execute on function public.save_my_invitation(uuid, jsonb) to authenticated;
grant execute on function public.rename_my_invitation(uuid, text) to authenticated;
grant execute on function public.remove_my_invitation(uuid) to authenticated;
grant execute on function public.mark_guestbook_seen(uuid, timestamptz) to authenticated;
grant execute on function public.apply_invitation_order(jsonb) to authenticated;
