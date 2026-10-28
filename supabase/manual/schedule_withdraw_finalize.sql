-- 운영 Supabase 에서 한 번만 손으로 실행한다(pg_cron 확장을 켠 뒤). 테스트·마이그레이션에는 넣지 않는다.
-- 탈퇴 신청 후 30일 지난 회원을 매일 확정한다. pg_cron 은 UTC 기준이라 UTC 19:17 = 한국 새벽 4:17
select cron.schedule('finalize-withdrawals', '17 19 * * *', $$select public.finalize_withdrawals()$$);
