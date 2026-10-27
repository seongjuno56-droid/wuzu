/**
 * 처음 운영자를 만든다.
 *   npm run create-admin -- <email> <name> <password>
 * DATABASE_URL 이 있으면 그 DB, 없으면 admin/.pglite 에 만든다. admin/ 에서 실행한다.
 * lib/db.ts 가 'server-only' 를 쓰므로 package.json 에서 --conditions=react-server 로 실행한다.
 */
import { createFirstAdmin, normalizeEmail } from '../lib/admins';
import { getDb } from '../lib/db';

async function main(): Promise<void> {
  const [email, name, password] = process.argv.slice(2);
  if (!email || !name || !password) {
    console.error('사용법: npm run create-admin -- <email> <name> <password>');
    process.exit(1);
  }

  const normalized = normalizeEmail(email);
  const db = await getDb();
  const [{ n }] = await db.query<{ n: number }>(
    `select count(*)::int as n from admins where email = $1`,
    [normalized],
  );
  if (n > 0) {
    console.error(`이미 있는 이메일입니다: ${normalized}`);
    process.exit(1);
  }

  const id = await createFirstAdmin(db, email, name, password);
  console.log(`운영자를 만들었습니다: ${normalized} (${id})`);
}

main().then(
  () => process.exit(0),
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
