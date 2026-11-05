-- 운영 Supabase 의 SQL Editor 에서 손으로 실행한다. 테스트·마이그레이션에는 넣지 않는다. 순서는 docs/setup/guest-link.md 5회차.
-- 필요한 것: pg_cron·pg_net 확장, Vault 의 wuzu_project_url·purge_media_secret, 마이그레이션 20261104000004.
-- 다시 실행해도 된다: cron.schedule 은 이름이 같은 작업을 새로 만들지 않고 바꾼다.
-- 비밀값은 이 파일에 적지 않는다. 작업이 돌 때마다 Vault 에서 읽으므로 비밀값을 바꿔도 다시 실행할 필요가 없다.
-- pg_cron 은 UTC 기준이다. 탈퇴 확정 finalize-withdrawals 는 UTC 19:17(한국 4:17).

do $$
declare
  v_name text;
begin
  if to_regnamespace('cron') is null then
    raise exception 'pg_cron 확장을 먼저 켜세요';
  end if;
  if to_regnamespace('net') is null then
    raise exception 'pg_net 확장을 먼저 켜세요';
  end if;
  foreach v_name in array array['wuzu_project_url', 'purge_media_secret'] loop
    if not exists (select 1 from vault.decrypted_secrets where name = v_name) then
      raise exception 'Vault 에 % 이(가) 없습니다', v_name;
    end if;
  end loop;
end;
$$;

-- 하객 데이터 파기: UTC 18:41(한국 3:41)
select cron.schedule('purge-guest-data', '41 18 * * *', $$select public.purge_guest_data()$$);

-- 파일 삭제: UTC 20:23(한국 5:23). 탈퇴 확정에서 대기열에 든 파일이 15분 지연을 넘긴 뒤 같은 밤에 지운다.
-- 함수가 최대 150초쯤 돌 수 있고 pg_net 기본 시간 제한은 2초라 늘려 둔다
select cron.schedule(
  'purge-media',
  '23 20 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'wuzu_project_url') || '/functions/v1/purge-media',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-purge-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'purge_media_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);
