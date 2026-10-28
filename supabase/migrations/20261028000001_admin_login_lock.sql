-- 운영자 로그인 시도 제한: 연달아 10번 틀리면 15분 잠근다.
-- 실행기가 파일마다 트랜잭션으로 감싸므로 begin/commit 은 쓰지 않는다.
alter table admins
  add column failed_login_count int not null default 0,
  add column locked_until timestamptz;
