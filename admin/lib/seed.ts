import 'server-only';
import { createFirstAdmin } from './admins';
import type { Db } from './db';
import { MEMBER_STATUSES, THEMES, THEME_LABEL, type MemberStatus } from './labels';

/**
 * 로컬 개발용 시드. 빈 admin/.pglite 를 처음 열 때만 넣는다.
 * DATABASE_URL 이 있으면(운영·스테이징 DB) 절대 넣지 않는다.
 */

export const SEED_ADMIN_EMAIL = 'admin@wuzu.local';
export const SEED_ADMIN_PASSWORD = 'wuzu-admin-1234';

const MEMBER_COUNT = 30;
const INVITATION_COUNT = 40;
/** 검색의 % _ \ 처리를 확인하려는 이름 */
const SPECIAL_NAME = '50%_a\\';
const SIGNUP_BONUS = 50;
const ACTIVATE_COST = 20;
const PROVIDERS = ['email', 'kakao', 'google', 'apple'] as const;
/** 숨김 처리할 초대장 순번(0부터). 활성 하나·만료 하나 */
const HIDDEN_INVITATIONS = new Set([4, 11]);

const FAMILY = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
const GIVEN = ['서연', '민준', '지우', '하준', '수아', '도윤'];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** 운영자가 한 명도 없을 때 0 */
async function adminCount(db: Db): Promise<number> {
  const [{ n }] = await db.query<{ n: number }>(`select count(*)::int as n from admins`);
  return n;
}

/**
 * 시드를 넣어야 하면 넣고 true. DATABASE_URL 이 있거나 운영자가 이미 있으면 false.
 * lib/db.ts 의 로컬 PGlite 분기에서 마이그레이션 뒤에 부른다.
 */
export async function seedIfEmpty(db: Db, databaseUrl: string | undefined): Promise<boolean> {
  if (databaseUrl) return false;
  if ((await adminCount(db)) > 0) return false;
  await seed(db);
  return true;
}

function memberStatus(i: number): MemberStatus {
  if (i % 10 === 3) return 'banned';
  if (i % 10 === 6) return 'withdrawing';
  return MEMBER_STATUSES[0];
}

/** 11자리 번호. prefix 1자리 + 순번 */
function number11(prefix: number, seq: number): string {
  return `${prefix}${String(seq).padStart(10, '0')}`;
}

/** 운영자 1명·회원 30명·초대장 40개·원장을 한 트랜잭션으로 넣는다 */
export async function seed(db: Db): Promise<void> {
  const now = Date.now();
  await db.tx(async (tx) => {
    await createFirstAdmin(tx, SEED_ADMIN_EMAIL, '기본 운영자', SEED_ADMIN_PASSWORD);

    let ledgerSeq = 0;
    const addLedger = async (e: {
      userId: string;
      kind: 'signup_bonus' | 'charge' | 'activate';
      title: string;
      lines: { label: string; amount: number }[];
      createdAt: Date;
      invitationId?: string;
      invitationName?: string;
      priceWon?: number;
    }) => {
      ledgerSeq += 1;
      const total = e.lines.reduce((s, l) => s + l.amount, 0);
      await tx.query(
        `insert into ledger_entries(number, user_id, invitation_id, invitation_name, kind, title, lines, total, price_won, created_at)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
        [
          number11(1, ledgerSeq),
          e.userId,
          e.invitationId ?? null,
          e.invitationName ?? null,
          e.kind,
          e.title,
          JSON.stringify(e.lines),
          total,
          e.priceWon ?? null,
          e.createdAt,
        ],
      );
    };

    // 회원: auth.users 를 먼저 넣고 같은 id 로 profiles
    const members: { id: string; createdAt: Date }[] = [];
    for (let i = 0; i < MEMBER_COUNT; i++) {
      const provider = PROVIDERS[i % PROVIDERS.length];
      const status = memberStatus(i);
      const name = i === 7 ? SPECIAL_NAME : `${FAMILY[i % FAMILY.length]}${GIVEN[i % GIVEN.length]}`;
      const email = `${provider}${i + 1}@example.com`;
      const createdAt = new Date(now - (60 - i * 2) * DAY);
      const [u] = await tx.query<{ id: string }>(`insert into auth.users(email) values ($1) returning id`, [email]);
      await tx.query(
        `insert into profiles(id, login_id, email, name, phone, provider, marketing_agreed, status, withdraw_requested_at, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          u.id,
          provider === 'email' ? `user${i + 1}` : null,
          email,
          name,
          `010-${String(1000 + i).padStart(4, '0')}-${String(5000 + i * 7).slice(-4)}`,
          provider,
          i % 2 === 0,
          status,
          status === 'withdrawing' ? new Date(now - 2 * DAY) : null,
          createdAt,
        ],
      );
      members.push({ id: u.id, createdAt });
      await addLedger({
        userId: u.id,
        kind: 'signup_bonus',
        title: '가입 보너스',
        lines: [{ label: '가입 보너스', amount: SIGNUP_BONUS }],
        createdAt,
      });
      if (i % 3 === 0) {
        await addLedger({
          userId: u.id,
          kind: 'charge',
          title: '레터 충전',
          lines: [
            { label: '레터 100', amount: 100 },
            { label: '보너스 10', amount: 10 },
          ],
          createdAt: new Date(createdAt.getTime() + DAY),
          priceWon: 9900,
        });
      }
    }

    // 초대장: 회원 0~9 는 두 개씩 가진다(만든 회원으로 걸러 보기 확인용)
    for (let j = 0; j < INVITATION_COUNT; j++) {
      const owner = members[j % MEMBER_COUNT];
      const theme = THEMES[j % THEMES.length];
      const kind = j % 3; // 0 작성 중, 1 활성, 2 만료
      // 가입 1시간 뒤에 만들었다. 회원은 모두 2일 전보다 먼저 가입했으므로 지금보다 앞이다
      const createdAt = new Date(owner.createdAt.getTime() + HOUR);
      let activatedAt: Date | null = null;
      let expiresAt: Date | null = null;
      if (kind === 1) {
        activatedAt = new Date(now - DAY);
        expiresAt = new Date(now + 29 * DAY);
      } else if (kind === 2) {
        activatedAt = new Date(createdAt.getTime() + HOUR);
        expiresAt = new Date(Math.min(activatedAt.getTime() + 30 * DAY, now - HOUR));
      }
      const name = `${THEME_LABEL[theme]} 초대장 ${j + 1}`;
      const [inv] = await tx.query<{ id: string }>(
        `insert into invitations(owner_id, number, slug, theme_id, template_id, name, status, activated_at, expires_at, banned, content, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{}'::jsonb, $11, $11)
         returning id`,
        [
          owner.id,
          number11(3, j + 1),
          `seed-inv-${String(j + 1).padStart(3, '0')}`,
          theme,
          `${theme}-basic`,
          name,
          kind === 0 ? 'draft' : 'final',
          activatedAt,
          expiresAt,
          HIDDEN_INVITATIONS.has(j),
          createdAt,
        ],
      );
      if (activatedAt) {
        await addLedger({
          userId: owner.id,
          kind: 'activate',
          title: '초대장 활성화',
          lines: [{ label: '초대장 활성화', amount: -ACTIVATE_COST }],
          createdAt: activatedAt,
          invitationId: inv.id,
          invitationName: name,
        });
      }
    }
  });
}
