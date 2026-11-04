-- 1-D 파일 기록: R2 에 올린 파일 한 개가 한 줄이다. 파일 자체는 R2 에 있고, 초대장 JSON 에는 r2://<키> 만 들어간다.
-- 실행기가 파일마다 트랜잭션으로 감싸므로 begin/commit 은 쓰지 않는다.
-- 초대장이 지워져도 줄은 남는다(on delete set null). 지울 파일을 놓치지 않기 위해서다.
-- in_use: 저장된 초대장 내용이 이 파일을 가리키는지. 교체로 빠지면 표시만 풀리고 실제 삭제는 4단계.
-- delete_requested_at: 삭제 대기열에 들어간 시각. R2 에서 실제로 지우면 deleted_at 을 채운다(purge-media).

create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  r2_key text not null unique,
  invitation_id uuid references public.invitations(id) on delete set null,
  kind text not null check (kind in ('image', 'thumb', 'linkThumb', 'gif', 'video', 'bgm')),
  bytes bigint not null check (bytes > 0),
  in_use boolean not null default false,
  delete_requested_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index media_files_invitation_idx on public.media_files(invitation_id);
create index media_files_delete_queue_idx on public.media_files(delete_requested_at)
  where delete_requested_at is not null and deleted_at is null;

alter table public.media_files enable row level security;
revoke all on table public.media_files from public, anon, authenticated;

-- 서명 주소를 내주기 전에 sign-upload 가 본인 권한으로 부른다. 남의 초대장이면 NOT_FOUND 라 서명도 나가지 않는다.
-- 처음에는 in_use = false: 초대장을 저장해야 쓰임 표시가 된다.
-- 재시도로 같은 키(작은 사진)가 다시 와도 한 줄이다. 키는 그 초대장 폴더 안이어야 해서 남의 줄을 덮어쓸 수 없다.
create function public.record_media_file(p_invitation uuid, p_key text, p_kind text, p_bytes bigint) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public.lock_my_profile();
  -- 정상 사용으로는 닿지 않는 값(캔버스·갤러리를 여러 번 고쳐도 남는 수). 저장 비용의 상한이다
  v_max_files constant int := 500;
begin
  if not exists (select 1 from public.invitations where id = p_invitation and owner_id = p.id) then
    raise exception 'NOT_FOUND';
  end if;
  if p_key is null or position(('invitations/' || p_invitation::text || '/') in p_key) <> 1 then
    raise exception 'INVALID';
  end if;
  if (select count(*) from public.media_files where invitation_id = p_invitation and deleted_at is null) >= v_max_files then
    raise exception 'TOO_MANY';
  end if;
  insert into public.media_files (r2_key, invitation_id, kind, bytes)
  values (p_key, p_invitation, p_kind, p_bytes)
  on conflict (r2_key) do update set bytes = excluded.bytes;
end;
$$;

-- 초대장 저장 때 쓰임 표시를 맞춘다. 앱이 보낸 목록을 믿지 않고 저장된 내용에서 직접 찾는다.
-- 작은 사진(<난수>_thumb.<확장자>)은 JSON 에 없으므로 본 이미지(<난수>.<확장자>)를 따른다. 난수 길이가 고정이라 서로 겹치지 않는다
create function public.sync_media_in_use() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_text text := new.content::text || new.design::text || coalesce(new.link_thumb, '');
begin
  update public.media_files m
     set in_use = position(('r2://' || regexp_replace(m.r2_key, '(_thumb)?\.[a-z0-9]+$', '')) in v_text) > 0
   where m.invitation_id = new.id
     and m.delete_requested_at is null
     and m.deleted_at is null;
  return null;
end;
$$;

create trigger invitations_sync_media_in_use
  after update of content, design, link_thumb on public.invitations
  for each row execute function public.sync_media_in_use();

-- 초대장을 지울 때 그 파일을 모두 삭제 대기열에 넣는다. invitation_id 가 비워지기 전에 불러야 한다.
-- security definer 함수 안에서만 부른다(앱이 직접 부르지 못한다)
create function public.mark_media_removed(p_invitation uuid) returns void
language sql
set search_path = ''
as $$
  update public.media_files
     set in_use = false,
         delete_requested_at = coalesce(delete_requested_at, now())
   where invitation_id = p_invitation
     and deleted_at is null;
$$;

revoke execute on function public.record_media_file(uuid, text, text, bigint) from public, anon;
grant execute on function public.record_media_file(uuid, text, text, bigint) to authenticated;
revoke execute on function public.sync_media_in_use() from public, anon, authenticated;
revoke execute on function public.mark_media_removed(uuid) from public, anon, authenticated;
