# 나의 초대장 · 레터 · 인앱 충전 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 초대장 상태 5가지(작성중·비활성화·활성화·기한만료·사용불가), 레터로 활성화·기간 연장·수정 구매, 인앱 충전(mock), 나의 초대장 목록·필터·더보기·방명록 관리·이력 열람을 만든다.

**Architecture:** 저장 상태는 `draft`/`final`만 두고 화면 상태는 순수 함수 `screenStatus(inv, now)`로 계산한다. 가격·기간 계산은 순수 함수(`src/features/wallet/pricing.ts`), 차감과 초대장 변경은 mock 지갑 서비스가 한 번에 처리한다. 결제는 `PaymentService` 인터페이스 뒤에 두고, 지금은 앱 루트에 띄운 mock 결제 시트(iOS형/구글형)가 응답한다.

**Tech Stack:** Expo SDK 57, expo-router, TypeScript, Zustand, AsyncStorage, expo-local-authentication, expo-clipboard, jest-expo.

**Spec:** `docs/superpowers/specs/2026-10-20-my-invitations-and-letters-design.md`

## Global Constraints

- 영어 필수 표기(코드 식별자·명령어·고유명사·`feat:` 접두어·Co-Authored-By 줄) 외 사용자 문구·주석·커밋 메시지는 모두 한국어.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 패키지는 `npx expo install <pkg>`만. Expo Go 포함 모듈만 쓴다. `ios/`·`android/`를 만들거나 고치지 않는다.
- 라우트는 `src/app/`에만. 화해 스타일 토큰(`src/theme`) 사용, 분홍 강조색 쓰지 않음.
- 화폐 이름은 "레터". "젤리"라는 말은 쓰지 않는다.
- 가격: 활성화 50레터(기본 15일), 연장 +30일 30 / +60일 55(정가 60) / +180일 150(정가 180), 활성화된 초대장 수정 5레터.
- 충전 상품: 50레터 ₩5,500 / 110레터 ₩11,000 / 330레터 ₩33,000 / 550레터 ₩55,000. mock 새 계정 시작 잔액 200레터.
- 초대장 이름 1~30자.
- 화면 상태 우선순위: 제재 → 임시저장 → 활성화 이력 없음 → `now < expiresAt` 활성화 → 그 외 기한만료(`now === expiresAt`이면 기한만료).
- 활성화 전에는 공유 링크가 없다. 하객 보기는 활성화 상태에서만(작성자는 항상 미리보기 가능).
- 사용불가 초대장: 더보기는 [이력 열람][삭제]만, 구매·수정·공유·방명록 없음.
- 개발 서버는 사용자가 요청할 때만 켠다.
- 작업 완료 전: `npx tsc --noEmit`, `npx jest`. 마지막 작업에서 `npx expo lint`, `npx expo-doctor`.

## Review Focus

1. **예전 저장본의 초대장 번호가 열 때마다 바뀜** — 번호를 보정만 하고 저장하지 않으면 매번 새로 만들어진다. 기대: 처음 보정할 때 저장해서 다음에도 같은 번호(Task 3 테스트).
2. **화면을 열어 둔 사이 상태가 바뀐 구매** — 연장 화면을 열어 둔 사이 만료되면 연장은 거부되고 레터는 그대로(Task 2 `applyOrder`, Task 3 `spend` 테스트).
3. **레터가 딱 맞을 때** — 보유 50, 비용 50이면 구매되고 잔액 0. 49면 거부·변경 없음(Task 3 테스트).
4. **연도 필터와 상태 필터를 같이 쓸 때** — 두 조건을 모두 만족하는 것만, 결과가 없으면 "조건에 맞는 초대장이 없습니다."(Task 1 `filterInvitations` 테스트, Task 7 화면).
5. **방명록 "신규" 표시가 화면을 여는 순간 사라짐** — 들어올 때의 확인 시각을 기준으로 보여주고, 나갈 때만 갱신한다(Task 1 `isNewEntry` 테스트, Task 9 화면).

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/features/invitation/status.ts` | 화면 상태·라벨·기간 문구·연도 선택지·필터·방명록 신규 판정 |
| `src/features/wallet/pricing.ts` | 가격 상수, 주문 내역 줄, 합계, 주문 적용(기간 계산) |
| `src/services/types.ts` | `LedgerEntry`, `SpendOrder`, `WalletService`, `PaymentService`, `LetterProduct` 추가 |
| `src/services/mock/invitationStore.ts` | 초대장·방명록 저장소 읽기/쓰기(보정 포함) — 초대장·지갑 서비스가 같이 씀 |
| `src/services/mock/mockWalletService.ts` | 잔액·차감·충전·기록 |
| `src/services/mock/mockPaymentService.ts` | mock 결제(결제 시트 스토어 호출) |
| `src/features/wallet/paymentSheetStore.ts` | 떠 있는 결제 요청 상태 |
| `src/features/wallet/PaymentSheetHost.tsx` | iOS형/구글형 mock 결제 시트 |
| `src/features/wallet/useWallet.ts` | 보유 레터 상태 |
| `src/features/wallet/confirm.ts` | 생체인증 확인 |
| `src/features/wallet/usePurchaseFlow.tsx` | 구매 확인·부족·처리 공통 흐름 |
| `src/features/wallet/PurchaseScreen.tsx` | 활성화·기간 연장 화면 본문 |
| `src/features/wallet/LedgerCard.tsx` | 기록 카드 |
| `src/components/LetterBadge.tsx` | 헤더 레터 배지 |
| `src/components/SelectSheet.tsx` | 바텀시트 단일 선택 |
| `src/features/my-invites/*` | 카드·썸네일·더보기·이름 수정·공유 |
| `src/app/wallet.tsx` | 레터 지갑 |
| `src/app/invitation/[id]/activate.tsx`, `extend.tsx`, `guestbook.tsx`, `history.tsx` | 구매·방명록 관리·이력 |

(설계 문서의 `/my-invites/[id]/…` 경로는 탭 라우트 `/my-invites`와 겹치지 않도록 `/invitation/[id]/…`로 둔다. Task 11에서 설계 문서를 맞춘다.)

---

### Task 1: 초대장 상태 모델

**Files:**
- Create: `src/features/invitation/status.ts`
- Modify: `src/features/invitation/model.ts`, `src/lib/format.ts`
- Test: `src/features/invitation/__tests__/status.test.ts`, `src/features/invitation/__tests__/model.test.ts`(추가)

**Interfaces:**
- Produces:
  - `InvitationStatus = 'draft' | 'final'`
  - `Invitation`에 `number: string`, `activatedAt?: string`, `expiresAt?: string`, `banned?: boolean`, `guestbookSeenAt?: string`
  - `newInvitationNumber(random?): string`(11자리), `normalizeInvitation(inv): { invitation: Invitation; changed: boolean }`
  - `LIMITS.invitationName = { min: 1, max: 30 }`
  - `ScreenStatus = 'writing' | 'inactive' | 'active' | 'expired' | 'blocked'`, `STATUS_LABEL`, `STATUS_ORDER`, `screenStatus(inv, now?)`, `periodLabel(inv)`, `yearOptions(list)`, `InviteFilter`, `filterInvitations(list, filter, now?)`, `isNewEntry(entry, seenAt?)`, `hasNewGuestbook(entries, seenAt?)`
  - `formatDateTime(iso, sep?)` → `2024.01.01 11:50:33` (sep `'-'`이면 `2024-01-06 01:34:44`)

- [ ] **Step 1: 실패하는 테스트**

`src/features/invitation/__tests__/status.test.ts`:

```ts
import { formatDateTime } from '../../../lib/format';
import {
  filterInvitations,
  hasNewGuestbook,
  isNewEntry,
  periodLabel,
  screenStatus,
  yearOptions,
} from '../status';
import { createInvitation, Invitation } from '../model';

const NOW = new Date(2026, 9, 20, 12, 0, 0);
const iso = (d: Date) => d.toISOString();
const inv = (patch: Partial<Invitation> = {}): Invitation => ({
  ...createInvitation({ id: 'i', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1', today: new Date(2026, 0, 1) }),
  ...patch,
});

describe('screenStatus', () => {
  it('제재가 가장 먼저', () => {
    expect(screenStatus(inv({ banned: true, status: 'draft' }), NOW)).toBe('blocked');
  });
  it('임시저장 → 작성중, 최종저장·활성화 이력 없음 → 비활성화', () => {
    expect(screenStatus(inv({ status: 'draft' }), NOW)).toBe('writing');
    expect(screenStatus(inv({ status: 'final' }), NOW)).toBe('inactive');
  });
  it('종료 전 → 활성화, 종료 시각 정각부터 → 기한만료', () => {
    const later = new Date(NOW.getTime() + 1000);
    expect(screenStatus(inv({ status: 'final', activatedAt: iso(NOW), expiresAt: iso(later) }), NOW)).toBe('active');
    expect(screenStatus(inv({ status: 'final', activatedAt: iso(NOW), expiresAt: iso(NOW) }), NOW)).toBe('expired');
  });
});

describe('표시 도우미', () => {
  it('기간 문구', () => {
    const a = new Date(2024, 11, 30);
    const b = new Date(2025, 1, 28);
    expect(periodLabel(inv({ activatedAt: iso(a), expiresAt: iso(b) }))).toBe('2024.12.30 ~ 2025.02.28 까지 활성화');
    expect(periodLabel(inv())).toBeNull();
  });
  it('일시 형식', () => {
    const d = new Date(2024, 0, 6, 1, 34, 44);
    expect(formatDateTime(d.toISOString())).toBe('2024.01.06 01:34:44');
    expect(formatDateTime(d.toISOString(), '-')).toBe('2024-01-06 01:34:44');
  });
});

describe('필터', () => {
  const a = inv({ id: 'a', status: 'draft', createdAt: iso(new Date(2023, 4, 1)) });
  const b = inv({ id: 'b', status: 'final', createdAt: iso(new Date(2025, 4, 1)) });
  const c = inv({ id: 'c', status: 'draft', createdAt: iso(new Date(2025, 6, 1)) });

  it('연도 선택지는 만든 연도만, 중복 없이 최신순', () => {
    expect(yearOptions([a, b, c])).toEqual([2025, 2023]);
  });
  it('연도·상태를 함께 적용하고 제작일 최신순', () => {
    expect(filterInvitations([a, b, c], { year: 'all', status: 'all' }, NOW).map((i) => i.id)).toEqual(['c', 'b', 'a']);
    expect(filterInvitations([a, b, c], { year: 2025, status: 'writing' }, NOW).map((i) => i.id)).toEqual(['c']);
    expect(filterInvitations([a, b, c], { year: 2023, status: 'inactive' }, NOW)).toEqual([]);
  });
});

describe('방명록 신규', () => {
  it('확인한 적 없으면 모두 신규, 확인 시각 이후 글만 신규', () => {
    const e = { createdAt: '2026-10-20T03:00:00.000Z' };
    expect(isNewEntry(e)).toBe(true);
    expect(isNewEntry(e, '2026-10-20T02:00:00.000Z')).toBe(true);
    expect(isNewEntry(e, '2026-10-20T03:00:00.000Z')).toBe(false);
    expect(hasNewGuestbook([e], '2026-10-21T00:00:00.000Z')).toBe(false);
    expect(hasNewGuestbook([], undefined)).toBe(false);
  });
});
```

`src/features/invitation/__tests__/model.test.ts` 맨 아래에 추가(필요한 import는 파일 위 import 줄에 `isValidInvitationName, newInvitationNumber, normalizeInvitation, createInvitation`을 더한다):

```ts
describe('초대장 번호·이름·보정', () => {
  it('번호는 11자리 숫자', () => {
    expect(newInvitationNumber(() => 0)).toBe('10000000000');
    expect(newInvitationNumber(() => 0.999999999999)).toMatch(/^\d{11}$/);
    expect(createInvitation({ id: 'x', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1' }).number).toMatch(/^\d{11}$/);
  });
  it('이름은 1~30자', () => {
    expect(isValidInvitationName('가')).toBe(true);
    expect(isValidInvitationName('  ')).toBe(false);
    expect(isValidInvitationName('가'.repeat(31))).toBe(false);
  });
  it('예전 active 저장본은 final 로, 번호가 없으면 만들고 changed 표시', () => {
    const old = { ...createInvitation({ id: 'x', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1' }), status: 'active' } as unknown as Parameters<typeof normalizeInvitation>[0];
    delete (old as Partial<typeof old>).number;
    const { invitation, changed } = normalizeInvitation(old);
    expect(invitation.status).toBe('final');
    expect(invitation.number).toMatch(/^\d{11}$/);
    expect(changed).toBe(true);
    expect(normalizeInvitation(invitation).changed).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/features/invitation`
Expected: FAIL — `../status` 없음, `newInvitationNumber` 없음 등.

- [ ] **Step 3: 서식 함수**

`src/lib/format.ts`의 `formatDate` 아래에 추가:

```ts
/** 2024.01.01 11:50:33 (sep '-' 이면 2024-01-01 11:50:33) */
export function formatDateTime(iso: string, sep = '.'): string {
  const d = new Date(iso);
  return `${formatDate(iso, sep)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
```

- [ ] **Step 4: 모델 수정**

`src/features/invitation/model.ts`:

`export type InvitationStatus = 'draft' | 'active';` →

```ts
/** 저장 상태: 임시저장 / 최종저장. 화면 상태(작성중·비활성화·활성화·기한만료·사용불가)는 status.ts 에서 계산 */
export type InvitationStatus = 'draft' | 'final';
```

`Invitation` 인터페이스의 `name: string;` 아래에 추가:

```ts
  /** 초대장No (11자리) */
  number: string;
  /** 활성화 시작·종료 시각 (ISO). 한 번도 활성화하지 않았으면 없음 */
  activatedAt?: string;
  expiresAt?: string;
  /** 관리자 제재 */
  banned?: boolean;
  /** 작성자가 방명록 관리를 마지막으로 확인한 시각 */
  guestbookSeenAt?: string;
```

`LIMITS`의 `invitationName: { min: 2, max: 30 },` → `invitationName: { min: 1, max: 30 },`

`createInvitation` 위에 추가:

```ts
/** 초대장No: 11자리 숫자 */
export const newInvitationNumber = (random: () => number = Math.random) =>
  String(Math.floor(1e10 + Math.min(random(), 0.9999999999) * 9e10));
```

`createInvitation` 반환 객체의 `name: '',` 아래에 `number: newInvitationNumber(),` 추가.

`createInvitation` 아래에 추가:

```ts
/** 예전 저장본 보정: 'active' → 'final', 번호가 없으면 생성. changed 면 저장해야 번호가 고정된다 */
export function normalizeInvitation(inv: Invitation): { invitation: Invitation; changed: boolean } {
  const raw = inv as Omit<Invitation, 'status' | 'number'> & { status: string; number?: string };
  const status: InvitationStatus = raw.status === 'draft' ? 'draft' : 'final';
  const number = raw.number ?? newInvitationNumber();
  const changed = status !== raw.status || number !== raw.number;
  return { invitation: changed ? { ...inv, status, number } : inv, changed };
}
```

- [ ] **Step 5: 상태 도우미**

`src/features/invitation/status.ts`:

```ts
/**
 * 초대장 화면 상태 — 저장 상태(draft/final)와 활성화 기간으로 계산한다
 * (설계: docs/superpowers/specs/2026-10-20-my-invitations-and-letters-design.md)
 */
import { formatDate } from '../../lib/format';
import type { GuestbookEntry } from '../../services/types';
import type { Invitation } from './model';

export type ScreenStatus = 'writing' | 'inactive' | 'active' | 'expired' | 'blocked';

export const STATUS_ORDER: ScreenStatus[] = ['writing', 'inactive', 'active', 'expired', 'blocked'];

export const STATUS_LABEL: Record<ScreenStatus, string> = {
  writing: '작성중',
  inactive: '비활성화',
  active: '활성화',
  expired: '기한만료',
  blocked: '사용불가',
};

type StatusFields = Pick<Invitation, 'status' | 'banned' | 'expiresAt'>;

export function screenStatus(inv: StatusFields, now: Date = new Date()): ScreenStatus {
  if (inv.banned) return 'blocked';
  if (inv.status === 'draft') return 'writing';
  if (!inv.expiresAt) return 'inactive';
  return now.getTime() < new Date(inv.expiresAt).getTime() ? 'active' : 'expired';
}

/** 2024.12.30 ~ 2025.02.28 까지 활성화 */
export function periodLabel(inv: Pick<Invitation, 'activatedAt' | 'expiresAt'>): string | null {
  if (!inv.activatedAt || !inv.expiresAt) return null;
  return `${formatDate(inv.activatedAt)} ~ ${formatDate(inv.expiresAt)} 까지 활성화`;
}

/** 제작 연도 선택지: 실제 만든 연도만, 최신순 */
export function yearOptions(list: Pick<Invitation, 'createdAt'>[]): number[] {
  return [...new Set(list.map((i) => new Date(i.createdAt).getFullYear()))].sort((a, b) => b - a);
}

export interface InviteFilter {
  year: number | 'all';
  status: ScreenStatus | 'all';
}

/** 연도·상태를 함께 적용, 제작일시 최신순 */
export function filterInvitations<T extends Invitation>(list: T[], f: InviteFilter, now: Date = new Date()): T[] {
  return list
    .filter((i) => f.year === 'all' || new Date(i.createdAt).getFullYear() === f.year)
    .filter((i) => f.status === 'all' || screenStatus(i, now) === f.status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 마지막 확인 이후 글이면 신규 (확인한 적 없으면 모두 신규) */
export const isNewEntry = (e: Pick<GuestbookEntry, 'createdAt'>, seenAt?: string) => !seenAt || e.createdAt > seenAt;

export const hasNewGuestbook = (entries: Pick<GuestbookEntry, 'createdAt'>[], seenAt?: string) =>
  entries.some((e) => isNewEntry(e, seenAt));
```

- [ ] **Step 6: 상태값 사용처 정리**

Run: `npx tsc --noEmit`
Expected: `'active'`와 비교하는 곳에서 오류. 다음처럼 고친다.
- `src/app/create/editor/compose.tsx`: `status: saveKind === 'final' ? 'active' : draft.status,` → `status: saveKind === 'final' ? 'final' : draft.status,`
- `src/components/home/InvitationStatusCard.tsx`: import `import { screenStatus } from '../../features/invitation/status';` 추가, `list.filter((i) => i.status === 'active')` → `list.filter((i) => screenStatus(i) === 'active')`
- `src/features/invitation/useMyInvitations.ts`: 같은 방식으로 `screenStatus(i) === 'active'`
- `src/app/(tabs)/my-invites.tsx`: Task 7에서 전체를 다시 쓰므로, 지금은 `'active'` 비교를 `'final'`로 바꿔 컴파일만 통과시킨다.
- `src/services/__tests__/mockInvitationService.test.ts`: `status: 'active'` 두 곳을 `'final'`로.
- `src/features/invitation/editor/SaveModals.tsx`: 주석 `이름 2~30자` → `이름 1~30자`, 최종저장 안내 문구 `저장하면 초대장이 활성화되어 링크로 보낼 수 있어요.` → `저장 후 나의 초대장에서 활성화하면 링크로 보낼 수 있어요.`

- [ ] **Step 7: 통과 확인**

Run: `npx jest && npx tsc --noEmit`
Expected: 전부 통과.

- [ ] **Step 8: 커밋**

```bash
git add src
git commit -m "feat: 초대장 화면 상태 5가지·초대장 번호·이름 1~30자, 최종저장은 비활성화로

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 가격과 주문 계산

**Files:**
- Create: `src/features/wallet/pricing.ts`
- Modify: `src/services/types.ts`
- Test: `src/features/wallet/__tests__/pricing.test.ts`

**Interfaces:**
- Consumes: `screenStatus`, `Invitation`
- Produces (types.ts): `ExtendDays = 30 | 60 | 180`, `SpendOrder`, `LedgerKind`, `OrderLine`, `LedgerEntry`, `LetterProduct`, `PurchaseResult`, `WalletService`, `PaymentService`, `SpendResult`
- Produces (pricing.ts): `ACTIVATION`, `EXTEND_OPTIONS`, `EDIT_COST`, `SIGNUP_LETTERS`, `LETTER_PRODUCTS`, `LEDGER_TITLE`, `orderLines(order)`, `orderCost(order)`, `applyOrder(inv, order, now)`, `DAY_MS`

- [ ] **Step 1: 서비스 타입 추가**

`src/services/types.ts` 맨 아래에 추가:

```ts
// ── 레터(지갑) / 결제 ─────────────────────────────────

export type ExtendDays = 30 | 60 | 180;

/** 레터로 사는 것: 활성화(+연장) / 연장 / 활성화된 초대장 수정(수정 내용 저장까지) */
export type SpendOrder =
  | { kind: 'activate'; invitationId: string; extendDays: ExtendDays | 0 }
  | { kind: 'extend'; invitationId: string; extendDays: ExtendDays }
  | { kind: 'edit'; invitation: Invitation };

export type LedgerKind = 'activate' | 'extend' | 'edit' | 'charge';

/** 구매 정보·이력 한 줄 (amount: 차감은 음수, 충전은 양수) */
export interface OrderLine {
  label: string;
  amount: number;
}

export interface LedgerEntry {
  id: string;
  /** 이력No (11자리) */
  number: string;
  userId: string;
  invitationId: string | null;
  invitationName: string | null;
  kind: LedgerKind;
  title: string;
  lines: OrderLine[];
  /** 줄 합계 (부호 포함) */
  total: number;
  createdAt: string;
}

export type SpendResult =
  | { ok: true; invitation: Invitation; balance: number }
  | { ok: false; reason: 'insufficient' | 'blocked' | 'not_found' | 'invalid' };

export interface WalletService {
  balance(userId: string): Promise<number>;
  history(userId: string, filter?: { invitationId?: string; kind?: 'charge' | 'spend' }): Promise<LedgerEntry[]>;
  /** 잔액 확인 → 차감 → 초대장 변경 → 기록을 한 번에. 실패하면 아무것도 바꾸지 않는다 */
  spend(userId: string, order: SpendOrder): Promise<SpendResult>;
  /** 결제 성공 후에만 부른다. 새 잔액을 돌려준다 */
  charge(userId: string, productId: string): Promise<number>;
}

export interface LetterProduct {
  id: string;
  letters: number;
  bonus: number;
  /** 원 */
  price: number;
}

export type PurchaseResult = 'success' | 'cancelled' | 'failed';

export interface PaymentService {
  products(): Promise<LetterProduct[]>;
  purchase(productId: string): Promise<PurchaseResult>;
}
```

- [ ] **Step 2: 실패하는 테스트**

`src/features/wallet/__tests__/pricing.test.ts`:

```ts
import { createInvitation, Invitation } from '../../invitation/model';
import { applyOrder, DAY_MS, orderCost, orderLines } from '../pricing';

const NOW = new Date(2026, 9, 20, 12, 0, 0);
const base = (patch: Partial<Invitation> = {}): Invitation => ({
  ...createInvitation({ id: 'i', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1' }),
  status: 'final',
  ...patch,
});
const at = (ms: number) => new Date(ms).toISOString();

describe('주문 금액', () => {
  it('활성화만 / 활성화 + 연장', () => {
    expect(orderLines({ kind: 'activate', invitationId: 'i', extendDays: 0 })).toEqual([{ label: '서비스 활성화', amount: -50 }]);
    expect(orderCost({ kind: 'activate', invitationId: 'i', extendDays: 30 })).toBe(80);
    expect(orderLines({ kind: 'activate', invitationId: 'i', extendDays: 30 })[1]).toEqual({ label: '이용 기간 연장 +30일', amount: -30 });
  });
  it('연장 할인가, 수정 5레터', () => {
    expect(orderCost({ kind: 'extend', invitationId: 'i', extendDays: 60 })).toBe(55);
    expect(orderCost({ kind: 'extend', invitationId: 'i', extendDays: 180 })).toBe(150);
    expect(orderLines({ kind: 'edit', invitation: base() })).toEqual([{ label: '초대장 컨텐츠 수정', amount: -5 }]);
  });
});

describe('주문 적용(기간 계산)', () => {
  it('첫 활성화: 지금부터 15일 + 연장일', () => {
    const r = applyOrder(base(), { kind: 'activate', invitationId: 'i', extendDays: 30 }, NOW) as Invitation;
    expect(r.activatedAt).toBe(NOW.toISOString());
    expect(r.expiresAt).toBe(at(NOW.getTime() + 45 * DAY_MS));
  });
  it('기한만료 후 재활성화: 지금부터 새로', () => {
    const old = base({ activatedAt: at(NOW.getTime() - 40 * DAY_MS), expiresAt: at(NOW.getTime() - 25 * DAY_MS) });
    const r = applyOrder(old, { kind: 'activate', invitationId: 'i', extendDays: 0 }, NOW) as Invitation;
    expect(r.activatedAt).toBe(NOW.toISOString());
    expect(r.expiresAt).toBe(at(NOW.getTime() + 15 * DAY_MS));
  });
  it('활성 중 연장: 종료일 뒤에 더하고 시작일은 그대로', () => {
    const start = at(NOW.getTime() - DAY_MS);
    const end = NOW.getTime() + 3 * DAY_MS;
    const r = applyOrder(base({ activatedAt: start, expiresAt: at(end) }), { kind: 'extend', invitationId: 'i', extendDays: 60 }, NOW) as Invitation;
    expect(r.activatedAt).toBe(start);
    expect(r.expiresAt).toBe(at(end + 60 * DAY_MS));
  });
  it('상태가 맞지 않으면 invalid (만료된 초대장 연장, 활성 중 재활성화, 작성중 활성화)', () => {
    const expired = base({ activatedAt: at(0), expiresAt: NOW.toISOString() });
    expect(applyOrder(expired, { kind: 'extend', invitationId: 'i', extendDays: 30 }, NOW)).toBe('invalid');
    const active = base({ activatedAt: at(0), expiresAt: at(NOW.getTime() + DAY_MS) });
    expect(applyOrder(active, { kind: 'activate', invitationId: 'i', extendDays: 0 }, NOW)).toBe('invalid');
    expect(applyOrder(base({ status: 'draft' }), { kind: 'activate', invitationId: 'i', extendDays: 0 }, NOW)).toBe('invalid');
  });
  it('사용불가는 blocked', () => {
    expect(applyOrder(base({ banned: true }), { kind: 'activate', invitationId: 'i', extendDays: 0 }, NOW)).toBe('blocked');
  });
  it('수정: 새 내용을 쓰되 번호·기간·제재는 저장본 값 유지', () => {
    const saved = base({ activatedAt: at(0), expiresAt: at(NOW.getTime() + DAY_MS), number: '12345678901' });
    const edited = { ...saved, name: '새 이름', number: 'x', expiresAt: at(NOW.getTime() + 999 * DAY_MS) };
    const r = applyOrder(saved, { kind: 'edit', invitation: edited }, NOW) as Invitation;
    expect(r.name).toBe('새 이름');
    expect(r.number).toBe('12345678901');
    expect(r.expiresAt).toBe(saved.expiresAt);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx jest src/features/wallet`
Expected: FAIL — `../pricing` 없음.

- [ ] **Step 4: 구현**

`src/features/wallet/pricing.ts`:

```ts
/**
 * 레터 가격·주문 계산 — 가격은 이 파일 한 곳에서만 정한다
 * (설계: docs/superpowers/specs/2026-10-20-my-invitations-and-letters-design.md)
 */
import type { ExtendDays, LedgerKind, LetterProduct, OrderLine, SpendOrder } from '../../services/types';
import type { Invitation } from '../invitation/model';
import { screenStatus } from '../invitation/status';

export const DAY_MS = 24 * 60 * 60 * 1000;

export const ACTIVATION = { cost: 50, days: 15 } as const;

/** listCost: 정가(취소선) */
export const EXTEND_OPTIONS: { days: ExtendDays; cost: number; listCost?: number }[] = [
  { days: 30, cost: 30 },
  { days: 60, cost: 55, listCost: 60 },
  { days: 180, cost: 150, listCost: 180 },
];

export const EDIT_COST = 5;

/** mock 새 계정 시작 레터 */
export const SIGNUP_LETTERS = 200;

/** 인앱 충전 상품 (앱스토어 가격 등급 기준 기본안) */
export const LETTER_PRODUCTS: LetterProduct[] = [
  { id: 'letters_50', letters: 50, bonus: 0, price: 5500 },
  { id: 'letters_110', letters: 100, bonus: 10, price: 11000 },
  { id: 'letters_330', letters: 300, bonus: 30, price: 33000 },
  { id: 'letters_550', letters: 500, bonus: 50, price: 55000 },
];

export const LEDGER_TITLE: Record<LedgerKind, string> = {
  activate: '초대장 활성화',
  extend: '기간 연장 구매',
  edit: '초대장 수정',
  charge: '레터 충전',
};

const extendCost = (days: ExtendDays) => EXTEND_OPTIONS.find((o) => o.days === days)!.cost;
const extendLine = (days: ExtendDays): OrderLine => ({ label: `이용 기간 연장 +${days}일`, amount: -extendCost(days) });

/** 구매 정보 줄 */
export function orderLines(order: SpendOrder): OrderLine[] {
  switch (order.kind) {
    case 'activate':
      return [
        { label: '서비스 활성화', amount: -ACTIVATION.cost },
        ...(order.extendDays ? [extendLine(order.extendDays)] : []),
      ];
    case 'extend':
      return [extendLine(order.extendDays)];
    case 'edit':
      return [{ label: '초대장 컨텐츠 수정', amount: -EDIT_COST }];
  }
}

/** 차감할 레터 (양수) */
export const orderCost = (order: SpendOrder) => -orderLines(order).reduce((sum, l) => sum + l.amount, 0);

/**
 * 주문을 초대장에 적용한 결과. 지금 상태에서 할 수 없는 주문이면 'invalid', 제재면 'blocked'.
 * 저장된 초대장(inv)의 상태로 판단하므로 화면을 열어 둔 사이 만료돼도 안전하다.
 */
export function applyOrder(inv: Invitation, order: SpendOrder, now: Date): Invitation | 'blocked' | 'invalid' {
  if (inv.banned) return 'blocked';
  const status = screenStatus(inv, now);
  const plus = (fromMs: number, days: number) => new Date(fromMs + days * DAY_MS).toISOString();
  switch (order.kind) {
    case 'activate':
      if (status !== 'inactive' && status !== 'expired') return 'invalid';
      return { ...inv, activatedAt: now.toISOString(), expiresAt: plus(now.getTime(), ACTIVATION.days + order.extendDays) };
    case 'extend':
      if (status !== 'active') return 'invalid';
      return { ...inv, expiresAt: plus(new Date(inv.expiresAt!).getTime(), order.extendDays) };
    case 'edit':
      if (status !== 'active') return 'invalid';
      // 수정 내용만 받고, 번호·기간·제재·작성자는 저장본 값을 지킨다
      return {
        ...order.invitation,
        id: inv.id,
        ownerId: inv.ownerId,
        number: inv.number,
        status: 'final',
        activatedAt: inv.activatedAt,
        expiresAt: inv.expiresAt,
        banned: inv.banned,
        createdAt: inv.createdAt,
      };
  }
}
```

(상품 id `letters_110`의 `letters`는 기본 100 + 보너스 10 = 110이다. 화면에는 "110레터 (보너스 10)"로 보인다.)

- [ ] **Step 5: 통과 확인**

Run: `npx jest src/features/wallet && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src
git commit -m "feat: 레터 가격·주문 계산(활성화·연장·수정 기간과 금액)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: mock 지갑 서비스, 초대장 서비스 확장

**Files:**
- Create: `src/services/mock/invitationStore.ts`, `src/services/mock/mockWalletService.ts`
- Modify: `src/services/mock/mockInvitationService.ts`, `src/services/types.ts`, `src/services/index.ts`
- Test: `src/services/__tests__/mockWalletService.test.ts`, `src/services/__tests__/mockInvitationService.test.ts`(추가)

**Interfaces:**
- Consumes: Task 1·2 전부
- Produces:
  - `createInvitationStore(storage) → { load(): Promise<Db>; save(db): Promise<void> }`, `Db`, `StoredEntry`
  - `InvitationService`에 `rename(id, name): Promise<Invitation>`, `markGuestbookSeen(id, at): Promise<void>`
  - `createMockWalletService({ delayMs, storage, now? }): WalletService`
  - `walletService` (`src/services/index.ts`)

- [ ] **Step 1: 실패하는 테스트**

`src/services/__tests__/mockWalletService.test.ts`:

```ts
import { createInvitation, Invitation } from '../../features/invitation/model';
import { DAY_MS } from '../../features/wallet/pricing';
import { createMockInvitationService } from '../mock/mockInvitationService';
import { createMockWalletService } from '../mock/mockWalletService';
import { KeyValueStorage } from '../types';

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => {
      map.set(k, v);
    },
  };
}

const NOW = new Date(2026, 9, 20, 12, 0, 0);
let now = NOW;
let storage: KeyValueStorage;
let invitations: ReturnType<typeof createMockInvitationService>;
let wallet: ReturnType<typeof createMockWalletService>;

const final = (id: string, patch: Partial<Invitation> = {}): Invitation => ({
  ...createInvitation({ id, ownerId: 'u1', themeId: 'wedding', templateId: 'wedding-1' }),
  name: `초대장 ${id}`,
  status: 'final',
  ...patch,
});

beforeEach(() => {
  now = NOW;
  storage = memoryStorage();
  invitations = createMockInvitationService({ delayMs: 0, storage, now: () => now });
  wallet = createMockWalletService({ delayMs: 0, storage, now: () => now });
});

describe('지갑', () => {
  it('새 계정은 200레터', async () => {
    expect(await wallet.balance('u1')).toBe(200);
  });

  it('활성화 + 연장: 차감, 기간 반영, 기록', async () => {
    await invitations.save(final('a'));
    const r = await wallet.spend('u1', { kind: 'activate', invitationId: 'a', extendDays: 30 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.balance).toBe(120);
    expect(r.invitation.expiresAt).toBe(new Date(NOW.getTime() + 45 * DAY_MS).toISOString());
    expect((await invitations.get('a'))?.expiresAt).toBe(r.invitation.expiresAt);
    const [entry] = await wallet.history('u1', { invitationId: 'a' });
    expect(entry).toMatchObject({ kind: 'activate', title: '초대장 활성화', total: -80, invitationName: '초대장 a' });
    expect(entry.number).toMatch(/^\d{11}$/);
  });

  it('레터가 딱 맞으면 구매되고, 1 모자라면 아무것도 바뀌지 않는다', async () => {
    await invitations.save(final('a'));
    await invitations.save(final('b'));
    // 200레터 = 활성화 50 + 180일 150 → 딱 맞게 0
    const exact = await wallet.spend('u1', { kind: 'activate', invitationId: 'a', extendDays: 180 });
    expect(exact.ok && exact.balance).toBe(0);
    const fail = await wallet.spend('u1', { kind: 'activate', invitationId: 'b', extendDays: 0 });
    expect(fail).toEqual({ ok: false, reason: 'insufficient' });
    expect(await wallet.balance('u1')).toBe(0);
    expect((await invitations.get('b'))?.expiresAt).toBeUndefined();
    expect(await wallet.history('u1', { invitationId: 'b' })).toEqual([]);
    await wallet.charge('u1', 'letters_50');
    expect(await wallet.balance('u1')).toBe(50);
    const ok = await wallet.spend('u1', { kind: 'activate', invitationId: 'b', extendDays: 0 });
    expect(ok.ok && ok.balance).toBe(0);
  });

  it('화면을 열어 둔 사이 만료되면 연장은 invalid, 레터 그대로', async () => {
    await invitations.save(final('a'));
    await wallet.spend('u1', { kind: 'activate', invitationId: 'a', extendDays: 0 });
    now = new Date(NOW.getTime() + 15 * DAY_MS);
    const r = await wallet.spend('u1', { kind: 'extend', invitationId: 'a', extendDays: 30 });
    expect(r).toEqual({ ok: false, reason: 'invalid' });
    expect(await wallet.balance('u1')).toBe(150);
  });

  it('제재·남의 초대장·없는 초대장은 거부', async () => {
    await invitations.save(final('x', { banned: true }));
    await invitations.save(final('y', { ownerId: 'u2' }));
    expect(await wallet.spend('u1', { kind: 'activate', invitationId: 'x', extendDays: 0 })).toEqual({ ok: false, reason: 'blocked' });
    expect(await wallet.spend('u1', { kind: 'activate', invitationId: 'y', extendDays: 0 })).toEqual({ ok: false, reason: 'not_found' });
    expect(await wallet.spend('u1', { kind: 'activate', invitationId: 'z', extendDays: 0 })).toEqual({ ok: false, reason: 'not_found' });
  });

  it('활성화된 초대장 수정: 5레터 차감하고 새 내용 저장', async () => {
    await invitations.save(final('a'));
    await wallet.spend('u1', { kind: 'activate', invitationId: 'a', extendDays: 0 });
    const saved = (await invitations.get('a'))!;
    const r = await wallet.spend('u1', { kind: 'edit', invitation: { ...saved, name: '고친 이름' } });
    expect(r.ok && r.balance).toBe(145);
    expect((await invitations.get('a'))?.name).toBe('고친 이름');
  });

  it('충전 기록은 사용 기록과 따로 볼 수 있다', async () => {
    await wallet.charge('u1', 'letters_110');
    expect(await wallet.balance('u1')).toBe(310);
    const charges = await wallet.history('u1', { kind: 'charge' });
    expect(charges[0]).toMatchObject({ kind: 'charge', title: '레터 충전', total: 110, invitationId: null });
    expect(await wallet.history('u1', { kind: 'spend' })).toEqual([]);
  });
});
```

`src/services/__tests__/mockInvitationService.test.ts`의 `describe('invitations', …)` 안에 추가:

```ts
  it('이름 바꾸기 (앞뒤 공백 제거)', async () => {
    await svc.save(make('a'));
    const r = await svc.rename('a', '  새 이름 ');
    expect(r.name).toBe('새 이름');
    expect((await svc.get('a'))?.name).toBe('새 이름');
  });
  it('방명록 확인 시각 저장', async () => {
    await svc.save(make('a'));
    await svc.markGuestbookSeen('a', '2026-10-20T00:00:00.000Z');
    expect((await svc.get('a'))?.guestbookSeenAt).toBe('2026-10-20T00:00:00.000Z');
  });
  it('예전 저장본의 번호는 처음 보정할 때 저장되어 다음에도 같다', async () => {
    const storage = memoryStorage();
    const old = { ...make('old'), status: 'active' } as Record<string, unknown>;
    delete old.number;
    await storage.setItem('wuzu.mock.invitations.v1', JSON.stringify({ invitations: [old], guestbook: [] }));
    const s = createMockInvitationService({ delayMs: 0, storage });
    const first = await s.get('old');
    const second = await s.get('old');
    expect(first?.status).toBe('final');
    expect(first?.number).toMatch(/^\d{11}$/);
    expect(second?.number).toBe(first?.number);
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/services`
Expected: FAIL — `mockWalletService` 없음, `rename` 없음.

- [ ] **Step 3: 저장소 분리**

`src/services/mock/invitationStore.ts`:

```ts
import { Invitation, normalizeInvitation } from '../../features/invitation/model';
import type { GuestbookEntry, KeyValueStorage } from '../types';

export const INVITATIONS_KEY = 'wuzu.mock.invitations.v1';

export interface StoredEntry extends GuestbookEntry {
  password: string;
}
export interface Db {
  invitations: Invitation[];
  guestbook: StoredEntry[];
}

/** 초대장·방명록 저장소 — 초대장 서비스와 지갑 서비스가 같이 쓴다 */
export function createInvitationStore(storage: KeyValueStorage) {
  async function save(db: Db) {
    await storage.setItem(INVITATIONS_KEY, JSON.stringify(db));
  }
  async function load(): Promise<Db> {
    const raw = await storage.getItem(INVITATIONS_KEY);
    const db: Db = raw ? JSON.parse(raw) : { invitations: [], guestbook: [] };
    let changed = false;
    const invitations = db.invitations.map((inv) => {
      const r = normalizeInvitation(inv);
      changed ||= r.changed;
      return r.invitation;
    });
    const next = { ...db, invitations };
    // 보정한 값(특히 초대장 번호)이 매번 새로 만들어지지 않도록 바로 저장
    if (changed) await save(next);
    return next;
  }
  return { load, save };
}
```

- [ ] **Step 4: 초대장 서비스가 저장소를 쓰도록 바꾸고 기능 추가**

`src/services/types.ts`의 `InvitationService`에 추가:

```ts
  /** 이름만 바꾼다 (1~30자, 앞뒤 공백 제거) */
  rename(id: string, name: string): Promise<Invitation>;
  /** 작성자가 방명록 관리를 확인한 시각 */
  markGuestbookSeen(id: string, at: string): Promise<void>;
```

`src/services/mock/mockInvitationService.ts`:
- 파일 위의 `const DB_KEY`, `StoredEntry`, `Db` 정의와 `load`·`save` 함수를 지우고 다음으로 바꾼다:

```ts
import { Invitation, isValidInvitationName, validateGuestbookEntry } from '../../features/invitation/model';
import { GuestbookEntry, GuestbookInput, InvitationService, KeyValueStorage, RemoveGuestbookAuth } from '../types';
import { createInvitationStore, StoredEntry } from './invitationStore';
```

함수 안 첫 부분:

```ts
  const { delayMs, storage } = opts;
  const now = opts.now ?? (() => new Date());
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const { load, save } = createInvitationStore(storage);
  const strip = ({ password: _p, ...e }: StoredEntry): GuestbookEntry => e;
```

반환 객체의 `remove` 아래에 추가:

```ts
    async rename(id, name) {
      await wait();
      if (!isValidInvitationName(name)) throw new Error('INVALID');
      const db = await load();
      const inv = db.invitations.find((i) => i.id === id);
      if (!inv) throw new Error('NOT_FOUND');
      inv.name = name.trim();
      inv.updatedAt = now().toISOString();
      await save(db);
      return inv;
    },

    async markGuestbookSeen(id, at) {
      await wait();
      const db = await load();
      const inv = db.invitations.find((i) => i.id === id);
      if (!inv) return;
      inv.guestbookSeenAt = at;
      await save(db);
    },
```

(기존 `list`·`get`·`save` 등은 `load()`·`save()` 이름이 같으므로 그대로 동작한다. 기존 `save` 메서드 안의 지역 함수 호출 `await save(db)`가 메서드 이름과 겹치지 않는지 확인 — 메서드는 객체 속성이라 겹치지 않는다.)

- [ ] **Step 5: 지갑 서비스**

`src/services/mock/mockWalletService.ts`:

```ts
import { applyOrder, LEDGER_TITLE, LETTER_PRODUCTS, orderCost, orderLines, SIGNUP_LETTERS } from '../../features/wallet/pricing';
import { newInvitationNumber } from '../../features/invitation/model';
import type { KeyValueStorage, LedgerEntry, SpendOrder, WalletService } from '../types';
import { createInvitationStore } from './invitationStore';

const WALLET_KEY = 'wuzu.mock.wallet.v1';

interface WalletDb {
  balances: Record<string, number>;
  ledger: LedgerEntry[];
}

export function createMockWalletService(opts: { delayMs: number; storage: KeyValueStorage; now?: () => Date }): WalletService {
  const { delayMs, storage } = opts;
  const now = opts.now ?? (() => new Date());
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const invitations = createInvitationStore(storage);

  async function load(): Promise<WalletDb> {
    const raw = await storage.getItem(WALLET_KEY);
    return raw ? JSON.parse(raw) : { balances: {}, ledger: [] };
  }
  async function save(db: WalletDb) {
    await storage.setItem(WALLET_KEY, JSON.stringify(db));
  }
  const balanceOf = (db: WalletDb, userId: string) => db.balances[userId] ?? SIGNUP_LETTERS;
  const entry = (e: Omit<LedgerEntry, 'id' | 'number' | 'createdAt'>): LedgerEntry => ({
    ...e,
    id: `l-${now().getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    number: newInvitationNumber(),
    createdAt: now().toISOString(),
  });
  const targetId = (order: SpendOrder) => (order.kind === 'edit' ? order.invitation.id : order.invitationId);

  return {
    async balance(userId) {
      await wait();
      return balanceOf(await load(), userId);
    },

    async history(userId, filter = {}) {
      await wait();
      return (await load()).ledger
        .filter((e) => e.userId === userId)
        .filter((e) => !filter.invitationId || e.invitationId === filter.invitationId)
        .filter((e) => !filter.kind || (filter.kind === 'charge' ? e.kind === 'charge' : e.kind !== 'charge'))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async spend(userId, order) {
      await wait();
      const [db, invDb] = await Promise.all([load(), invitations.load()]);
      const idx = invDb.invitations.findIndex((i) => i.id === targetId(order));
      const inv = invDb.invitations[idx];
      if (!inv || inv.ownerId !== userId) return { ok: false, reason: 'not_found' };
      const next = applyOrder(inv, order, now());
      if (next === 'blocked' || next === 'invalid') return { ok: false, reason: next };
      const cost = orderCost(order);
      const balance = balanceOf(db, userId);
      if (balance < cost) return { ok: false, reason: 'insufficient' };

      const saved = { ...next, updatedAt: now().toISOString() };
      invDb.invitations[idx] = saved;
      db.balances[userId] = balance - cost;
      db.ledger.push(
        entry({
          userId,
          invitationId: saved.id,
          invitationName: saved.name,
          kind: order.kind,
          title: LEDGER_TITLE[order.kind],
          lines: orderLines(order),
          total: -cost,
        }),
      );
      await invitations.save(invDb);
      await save(db);
      return { ok: true, invitation: saved, balance: db.balances[userId] };
    },

    async charge(userId, productId) {
      await wait();
      const product = LETTER_PRODUCTS.find((p) => p.id === productId);
      if (!product) throw new Error('UNKNOWN_PRODUCT');
      const db = await load();
      const amount = product.letters + product.bonus;
      db.balances[userId] = balanceOf(db, userId) + amount;
      db.ledger.push(
        entry({
          userId,
          invitationId: null,
          invitationName: null,
          kind: 'charge',
          title: LEDGER_TITLE.charge,
          lines: [
            { label: `레터 ${product.letters}`, amount: product.letters },
            ...(product.bonus ? [{ label: `보너스 ${product.bonus}`, amount: product.bonus }] : []),
          ],
          total: amount,
        }),
      );
      await save(db);
      return db.balances[userId];
    },
  };
}
```

- [ ] **Step 6: 서비스 연결**

`src/services/index.ts`에 추가:

```ts
import { createMockWalletService } from './mock/mockWalletService';
```

```ts
export const walletService = createMockWalletService({ delayMs: 300, storage: AsyncStorage });
```

- [ ] **Step 7: 통과 확인**

Run: `npx jest && npx tsc --noEmit`
Expected: 통과.

- [ ] **Step 8: 커밋**

```bash
git add src
git commit -m "feat: mock 지갑 서비스(잔액·차감·충전·기록), 초대장 이름 수정·방명록 확인 시각

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 결제 시트·생체인증·보유 레터·구매 흐름

**Files:**
- Create: `src/features/wallet/paymentSheetStore.ts`, `src/features/wallet/PaymentSheetHost.tsx`, `src/services/mock/mockPaymentService.ts`, `src/features/wallet/useWallet.ts`, `src/features/wallet/confirm.ts`, `src/features/wallet/usePurchaseFlow.tsx`, `src/components/LetterBadge.tsx`
- Modify: `src/services/index.ts`, `src/app/_layout.tsx`, `app.json`(설치 명령으로 플러그인)

**Interfaces:**
- Consumes: `walletService`, `LETTER_PRODUCTS`, `orderCost`
- Produces:
  - `usePaymentSheet` (zustand): `request: { product: LetterProduct; resolve: (r: PurchaseResult) => void } | null`, `open(product): Promise<PurchaseResult>`, `settle(r)`
  - `paymentService` (`src/services/index.ts`)
  - `PaymentSheetHost` — 루트에 한 번
  - `useWallet` (zustand): `balance: number | null`, `refresh(): Promise<void>`, `set(n)`
  - `confirmWithBiometrics(): Promise<boolean>`
  - `usePurchaseFlow({ onDone(inv) }) → { ask(order, title, message?), run(order), busy, modals }`
  - `LetterBadge()`

- [ ] **Step 1: 생체인증 패키지**

Run: `npx expo install expo-local-authentication`
`app.json`의 `plugins`에 추가(설치가 자동으로 넣지 않았으면):

```json
      ["expo-local-authentication", { "faceIDPermission": "레터 구매를 확인하기 위해 Face ID를 사용합니다." }]
```

API 이름(`hasHardwareAsync`, `isEnrolledAsync`, `authenticateAsync`)은 `https://docs.expo.dev/versions/v57.0.0/sdk/local-authentication/`에서 확인한다.

- [ ] **Step 2: 결제 시트 상태와 mock 결제 서비스**

`src/features/wallet/paymentSheetStore.ts`:

```ts
import { create } from 'zustand';

import type { LetterProduct, PurchaseResult } from '../../services/types';

/** mock 인앱 결제: 결제 요청 하나를 시트에 띄우고 사용자의 선택으로 끝낸다 */
interface PaymentSheetState {
  request: { product: LetterProduct; resolve: (r: PurchaseResult) => void } | null;
  open: (product: LetterProduct) => Promise<PurchaseResult>;
  settle: (r: PurchaseResult) => void;
}

export const usePaymentSheet = create<PaymentSheetState>()((set, get) => ({
  request: null,
  open: (product) =>
    new Promise((resolve) => {
      // 이전 요청이 남아 있으면 취소로 끝낸다
      get().request?.resolve('cancelled');
      set({ request: { product, resolve } });
    }),
  settle: (r) => {
    get().request?.resolve(r);
    set({ request: null });
  },
}));
```

`src/services/mock/mockPaymentService.ts`:

```ts
import { usePaymentSheet } from '../../features/wallet/paymentSheetStore';
import { LETTER_PRODUCTS } from '../../features/wallet/pricing';
import type { PaymentService } from '../types';

/**
 * mock 인앱 결제 — 실제 도입 시 expo-iap(개발용 빌드) + 서버 영수증 검증으로 바꾼다.
 * 앱 루트의 PaymentSheetHost 가 iOS형/구글형 결제 시트를 보여준다.
 */
export function createMockPaymentService(): PaymentService {
  return {
    products: async () => LETTER_PRODUCTS,
    async purchase(productId) {
      const product = LETTER_PRODUCTS.find((p) => p.id === productId);
      if (!product) return 'failed';
      return usePaymentSheet.getState().open(product);
    },
  };
}
```

`src/services/index.ts`에 추가:

```ts
import { createMockPaymentService } from './mock/mockPaymentService';
```

```ts
export const paymentService = createMockPaymentService();
```

- [ ] **Step 3: 결제 시트 화면**

`src/features/wallet/PaymentSheetHost.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '../../components/Txt';
import { usePaymentSheet } from './paymentSheetStore';

const won = (n: number) => `₩${n.toLocaleString('ko-KR')}`;

/**
 * mock 인앱 결제 시트 — 안드로이드는 Google Play형, 그 외(iOS·웹)는 App Store형.
 * [결제 실패 시험]은 개발 중 실패 화면 확인용 (실제 결제로 바꾸면 없어진다).
 */
export function PaymentSheetHost() {
  const request = usePaymentSheet((s) => s.request);
  const settle = usePaymentSheet((s) => s.settle);
  const [busy, setBusy] = useState(false);
  if (!request) return null;
  const { product } = request;
  const google = Platform.OS === 'android';
  const title = `레터 ${product.letters + product.bonus}개`;

  const buy = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      settle('success');
    }, 900);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => !busy && settle('cancelled')}>
      <Pressable style={styles.dim} onPress={() => !busy && settle('cancelled')} accessibilityLabel="결제 취소">
        <Pressable style={[styles.sheet, google ? styles.google : styles.apple]} onPress={() => {}}>
          <View style={styles.head}>
            <Txt variant="caption" weight="semibold" color={google ? '#202124' : '#000000'}>
              {google ? 'Google Play' : 'App Store'}
            </Txt>
            <Pressable onPress={() => !busy && settle('cancelled')} hitSlop={10} accessibilityLabel="닫기">
              <Ionicons name="close" size={22} color="#5F6368" />
            </Pressable>
          </View>
          <View style={styles.product}>
            <View style={styles.appIcon}>
              <Txt variant="caption" weight="semibold" color="#FFFFFF">
                wuzu
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt weight="semibold">{title}</Txt>
              <Txt variant="caption" color="#5F6368">
                wuzu · 인앱 구매
              </Txt>
            </View>
            <Txt weight="semibold">{won(product.price)}</Txt>
          </View>
          <Txt variant="tiny" color="#5F6368">
            {google ? '결제 수단: Google Play 잔액 (테스트)' : '계정: 테스트 Apple 계정'}
          </Txt>
          <Pressable
            onPress={buy}
            disabled={busy}
            style={[styles.buy, google ? styles.buyGoogle : styles.buyApple]}
            accessibilityRole="button"
            accessibilityLabel="구매"
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Txt weight="semibold" color="#FFFFFF">
                {google ? '구매' : '구입하기'}
              </Txt>
            )}
          </Pressable>
          <Pressable onPress={() => settle('failed')} disabled={busy} style={styles.fail} accessibilityRole="button">
            <Txt variant="tiny" color="#9AA0A6">
              결제 실패 시험 (개발용)
            </Txt>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { padding: 20, gap: 14, backgroundColor: '#FFFFFF' },
  apple: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  google: { borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  product: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#183A2E', alignItems: 'center', justifyContent: 'center' },
  buy: { height: 48, alignItems: 'center', justifyContent: 'center' },
  buyApple: { borderRadius: 12, backgroundColor: '#0A84FF' },
  buyGoogle: { borderRadius: 24, backgroundColor: '#01875F' },
  fail: { alignItems: 'center', paddingBottom: 8 },
});
```

(결제 시트는 스토어 화면을 흉내 내는 것이라 앱 토큰 대신 각 스토어 색을 쓴다. `#183A2E`는 wuzu 브랜드 그린으로 앱 아이콘 자리.)

`src/app/_layout.tsx`: `import { PaymentSheetHost } from '../features/wallet/PaymentSheetHost';` 추가, `<ToastHost />` 바로 위에 `<PaymentSheetHost />`.

- [ ] **Step 4: 보유 레터 상태·배지**

`src/features/wallet/useWallet.ts`:

```ts
import { create } from 'zustand';

import { walletService } from '../../services';
import { useSession } from '../../store/session';

/** 보유 레터 — 화면에 돌아올 때 refresh, 구매·충전 직후 set */
interface WalletState {
  balance: number | null;
  refresh: () => Promise<void>;
  set: (balance: number) => void;
}

export const useWallet = create<WalletState>()((set) => ({
  balance: null,
  refresh: async () => {
    const userId = useSession.getState().user?.id;
    set({ balance: userId ? await walletService.balance(userId) : null });
  },
  set: (balance) => set({ balance }),
}));
```

`src/components/LetterBadge.tsx`:

```tsx
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useWallet } from '../features/wallet/useWallet';
import { colors, radius, spacing } from '../theme';
import { Txt } from './Txt';

/** 헤더 오른쪽 보유 레터 — 누르면 레터 지갑 */
export function LetterBadge() {
  const balance = useWallet((s) => s.balance);
  const refresh = useWallet((s) => s.refresh);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  return (
    <Pressable
      onPress={() => router.push('/wallet')}
      style={styles.badge}
      accessibilityRole="button"
      accessibilityLabel={`보유 레터 ${balance ?? ''}, 레터 지갑으로 이동`}
    >
      <Txt variant="tiny" weight="semibold" color={colors.infoInk}>
        레터 {balance ?? '–'}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.infoTint,
  },
});
```

- [ ] **Step 5: 생체인증**

`src/features/wallet/confirm.ts`:

```ts
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/**
 * 레터 사용 전 본인 확인. 웹이거나 생체정보가 없으면 확인 모달만으로 진행(true).
 * 사용자가 취소하거나 실패하면 false.
 */
export async function confirmWithBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return true;
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: '구매를 확인해 주세요', cancelLabel: '취소' });
    return result.success;
  } catch {
    // 인증 모듈 오류는 확인 모달을 거쳤으므로 진행
    return true;
  }
}
```

- [ ] **Step 6: 구매 흐름 훅**

`src/features/wallet/usePurchaseFlow.tsx`:

```tsx
import { router } from 'expo-router';
import { useState } from 'react';

import { AppModal } from '../../components/AppModal';
import { toast } from '../../components/Toast';
import { SpendOrder, walletService } from '../../services';
import { useSession } from '../../store/session';
import type { Invitation } from '../invitation/model';
import { confirmWithBiometrics } from './confirm';
import { orderCost } from './pricing';
import { useWallet } from './useWallet';

/**
 * 레터 구매 공통 흐름:
 * ask(): 잔액이 모자라면 충전 안내, 아니면 확인 모달 → run()
 * run(): 생체인증 → 차감·반영 → onDone
 */
export function usePurchaseFlow({ onDone }: { onDone: (invitation: Invitation) => void }) {
  const userId = useSession((s) => s.user?.id);
  const balance = useWallet((s) => s.balance);
  const [confirm, setConfirm] = useState<{ order: SpendOrder; title: string; message?: string } | null>(null);
  const [lacking, setLacking] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (order: SpendOrder) => {
    if (!userId || busy) return;
    if (!(await confirmWithBiometrics())) {
      toast('인증이 취소되었어요.');
      return;
    }
    setBusy(true);
    try {
      const r = await walletService.spend(userId, order);
      if (r.ok) {
        useWallet.getState().set(r.balance);
        onDone(r.invitation);
      } else if (r.reason === 'insufficient') setLacking(true);
      else if (r.reason === 'blocked') toast('사용불가 초대장은 구매할 수 없어요.');
      else toast('초대장 상태가 바뀌었어요. 다시 확인해 주세요.');
    } catch {
      toast('구매하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const ask = (order: SpendOrder, title: string, message?: string) => {
    if ((balance ?? 0) < orderCost(order)) setLacking(true);
    else setConfirm({ order, title, message });
  };

  const modals = (
    <>
      <AppModal
        visible={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        onDismiss={() => setConfirm(null)}
        actions={[
          { label: '취소', variant: 'outline', onPress: () => setConfirm(null) },
          {
            label: '구매하기',
            onPress: () => {
              const order = confirm!.order;
              setConfirm(null);
              run(order);
            },
          },
        ]}
      />
      <AppModal
        visible={lacking}
        title={'레터가 부족합니다.\n레터를 충전하시겠습니까?'}
        onDismiss={() => setLacking(false)}
        actions={[
          { label: '취소', variant: 'outline', onPress: () => setLacking(false) },
          {
            label: '레터 충전',
            onPress: () => {
              setLacking(false);
              router.push('/wallet');
            },
          },
        ]}
      />
    </>
  );

  return { ask, run, busy, modals, lack: () => setLacking(true) };
}
```

(`SpendOrder`가 `../../services`에서 다시 내보내지는지 확인 — `export * from './types'`라서 된다.)

- [ ] **Step 7: 확인 후 커밋**

Run: `npx tsc --noEmit && npx jest`
Expected: 통과.

```bash
git add app.json package.json package-lock.json src
git commit -m "feat: mock 인앱 결제 시트(iOS형·구글형)·생체인증·보유 레터 배지·구매 흐름

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 레터 지갑 화면

**Files:**
- Create: `src/features/wallet/LedgerCard.tsx`, `src/app/wallet.tsx`

**Interfaces:**
- Consumes: `paymentService`, `walletService`, `useWallet`, `LETTER_PRODUCTS`, `formatDateTime`
- Produces: `LedgerCard({ entry, showInvitation? })`, 라우트 `/wallet`

- [ ] **Step 1: 기록 카드**

`src/features/wallet/LedgerCard.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import { Txt } from '../../components/Txt';
import { formatDateTime } from '../../lib/format';
import type { LedgerEntry } from '../../services/types';
import { colors, radius, spacing } from '../../theme';

const signed = (n: number) => `${n > 0 ? '+' : '- '}${Math.abs(n)}레터`;

/** 이력 카드: 이력No / 일시 / 제목 / 내용 줄과 레터 */
export function LedgerCard({ entry, showInvitation }: { entry: LedgerEntry; showInvitation?: boolean }) {
  return (
    <View style={styles.card}>
      <Txt variant="tiny" color={colors.faint}>
        이력No. {entry.number}
      </Txt>
      <Txt variant="bodyStrong">{formatDateTime(entry.createdAt, '-')}</Txt>
      <Txt weight="semibold">{entry.title}</Txt>
      {showInvitation && entry.invitationName && (
        <Txt variant="caption" color={colors.muted}>
          {entry.invitationName}
        </Txt>
      )}
      {entry.lines.map((l) => (
        <View key={l.label} style={styles.line}>
          <Txt variant="caption" color={colors.label} style={styles.flex}>
            • {l.label}
          </Txt>
          <Txt variant="caption" color={l.amount > 0 ? colors.infoInk : colors.label}>
            {signed(l.amount)}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { backgroundColor: colors.canvas, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.hairline, padding: spacing.lg, gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center' },
});
```

- [ ] **Step 2: 지갑 화면**

`src/app/wallet.tsx`:

```tsx
import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Header } from '../components/Header';
import { Screen } from '../components/Screen';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { toast } from '../components/Toast';
import { Txt } from '../components/Txt';
import { LedgerCard } from '../features/wallet/LedgerCard';
import { LETTER_PRODUCTS } from '../features/wallet/pricing';
import { useWallet } from '../features/wallet/useWallet';
import { LedgerEntry, paymentService, walletService } from '../services';
import { useSession } from '../store/session';
import { colors, radius, shadow, spacing } from '../theme';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 레터 지갑: 보유 레터 / 인앱 충전 / 충전·사용 내역 */
export default function WalletScreen() {
  const user = useSession((s) => s.user);
  const balance = useWallet((s) => s.balance);
  const refresh = useWallet((s) => s.refresh);
  const [tab, setTab] = useState<'charge' | 'spend'>('charge');
  const [history, setHistory] = useState<LedgerEntry[] | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    refresh();
    setHistory(await walletService.history(user.id, { kind: tab }));
  }, [user, tab, refresh]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!user) return <Redirect href="/auth/login" />;

  const charge = async (productId: string) => {
    if (buying) return;
    setBuying(productId);
    try {
      const result = await paymentService.purchase(productId);
      if (result === 'success') {
        const next = await walletService.charge(user.id, productId);
        const p = LETTER_PRODUCTS.find((x) => x.id === productId)!;
        useWallet.getState().set(next);
        toast(`레터 ${p.letters + p.bonus}개가 충전되었어요.`);
        load();
      } else if (result === 'failed') {
        toast('결제에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setBuying(null);
    }
  };

  return (
    <Screen header={<Header title="레터" />} background={colors.surface} contentStyle={styles.content}>
      <View style={[styles.balance, shadow]}>
        <Txt variant="caption" color={colors.muted}>
          보유 레터
        </Txt>
        <Txt variant="headline">{balance ?? '–'}</Txt>
      </View>

      <Txt variant="subtitle" weight="semibold">
        레터 충전
      </Txt>
      <View style={styles.products}>
        {LETTER_PRODUCTS.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => charge(p.id)}
            style={({ pressed }) => [styles.product, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`레터 ${p.letters + p.bonus}개 ${won(p.price)}`}
          >
            <View style={styles.flex}>
              <Txt weight="semibold">레터 {p.letters + p.bonus}</Txt>
              {p.bonus > 0 && (
                <Txt variant="tiny" color={colors.infoInk}>
                  보너스 {p.bonus} 포함
                </Txt>
              )}
            </View>
            {buying === p.id ? <ActivityIndicator color={colors.inkSoft} /> : <Txt weight="semibold">{won(p.price)}</Txt>}
          </Pressable>
        ))}
      </View>

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'charge', label: '충전 내역' },
          { value: 'spend', label: '사용 내역' },
        ]}
      />
      {history === null ? (
        <ActivityIndicator color={colors.inkSoft} />
      ) : history.length === 0 ? (
        <Txt color={colors.muted} align="center" style={styles.empty}>
          {tab === 'charge' ? '충전 내역이 없습니다.' : '사용 내역이 없습니다.'}
        </Txt>
      ) : (
        history.map((e) => <LedgerCard key={e.id} entry={e} showInvitation={tab === 'spend'} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  balance: { backgroundColor: colors.canvas, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.xs },
  products: { gap: spacing.sm },
  product: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  pressed: { opacity: 0.85 },
  empty: { paddingVertical: spacing.xxl },
});
```

- [ ] **Step 3: 확인 후 커밋**

Run: `npx tsc --noEmit && npx jest`
Expected: 통과.

```bash
git add src
git commit -m "feat: 레터 지갑 화면(보유 레터·인앱 충전·충전/사용 내역)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 나의 초대장 부품 — 바텀시트 선택·썸네일·카드·더보기·이름 수정·공유

**Files:**
- Create: `src/components/SelectSheet.tsx`, `src/features/my-invites/CoverThumb.tsx`, `src/features/my-invites/InviteCard.tsx`, `src/features/my-invites/MoreSheet.tsx`, `src/features/my-invites/RenameModal.tsx`, `src/features/my-invites/share.ts`

**Interfaces:**
- Consumes: `screenStatus`, `STATUS_LABEL`, `periodLabel`, `formatDateTime`, `ACTIVATION`, `CoverPage`, `lookFor`, `LookProvider`, `invitationService.rename`
- Produces:
  - `SelectSheet<T>({ visible, title, options: { value: T; label: string }[], value, onSelect(v), onClose })` — 시트 안에서 고른 뒤 [선택]으로 확정
  - `CoverThumb({ invitation, blocked })`
  - `type CardAction = 'complete' | 'activate' | 'extend' | 'share' | 'guestbook' | 'more' | 'preview' | 'delete'`
  - `InviteCard({ invitation, now, hasNew, onAction(a) })`
  - `type MoreAction = 'history' | 'rename' | 'edit' | 'delete'`, `MoreSheet({ invitation, visible, onSelect(a), onClose })`
  - `RenameModal({ invitation, onClose, onRenamed(inv) })`
  - `shareInvitation(inv): Promise<void>`, `invitationUrl(id): string`

- [ ] **Step 1: 바텀시트 선택**

`src/components/SelectSheet.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { Txt } from './Txt';

interface Props<T extends string | number> {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}

/** 바텀시트 단일 선택: 고른 항목은 검정 바탕, [선택]으로 확정 */
export function SelectSheet<T extends string | number>({ visible, title, options, value, onSelect, onClose }: Props<T>) {
  const [picked, setPicked] = useState(value);
  useEffect(() => {
    if (visible) setPicked(value);
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.grabber} />
            <Txt variant="title" style={styles.title}>
              {title}
            </Txt>
            {options.map((o) => {
              const on = o.value === picked;
              return (
                <Pressable
                  key={String(o.value)}
                  onPress={() => setPicked(o.value)}
                  style={[styles.option, on && styles.optionOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                >
                  <Txt weight={on ? 'semibold' : 'regular'} color={on ? colors.canvas : colors.muted} align="center">
                    {o.label}
                  </Txt>
                </Pressable>
              );
            })}
            <Button label="선택" onPress={() => onSelect(picked)} style={styles.confirm} />
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: colors.dim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hairline, marginVertical: spacing.sm },
  title: { marginVertical: spacing.md },
  option: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  optionOn: { backgroundColor: colors.inkSoft, borderRadius: radius.xs },
  confirm: { marginTop: spacing.lg },
});
```

- [ ] **Step 2: 표지 썸네일**

`src/features/my-invites/CoverThumb.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import { Txt } from '../../components/Txt';
import { colors, radius } from '../../theme';
import type { Invitation } from '../invitation/model';
import { CoverPage } from '../invitation/view/CoverPage';
import { lookFor, LookProvider } from '../invitation/view/look';

const W = 120;
const H = 150;
const SCALE = W / 360;

/**
 * 표지 축소 미리보기: 360px 폭으로 그린 표지를 1/3 로 줄인다.
 * (표지 캔버스 작업 후에는 CoverSlide 에 폭만 넘기면 된다)
 */
export function CoverThumb({ invitation, blocked }: { invitation: Invitation; blocked: boolean }) {
  const look = lookFor(invitation.themeId, invitation.templateId);
  if (blocked) {
    return (
      <View style={[styles.box, styles.center]}>
        <Txt variant="tiny" color={colors.danger}>
          미리보기 불가
        </Txt>
      </View>
    );
  }
  return (
    <View style={[styles.box, { backgroundColor: look.bg }]} pointerEvents="none">
      <View style={styles.inner}>
        <LookProvider look={look}>
          <CoverPage content={invitation.content} />
        </LookProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: W, height: H, borderRadius: radius.xs, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  // 360 폭을 가운데 기준으로 줄이므로 (W-360)/2 만큼 당긴다
  inner: { position: 'absolute', width: 360, left: (W - 360) / 2, top: -60, transform: [{ scale: SCALE }] },
});
```

(`top: -60`은 표지 위 여백(96px)을 줄여 이름이 썸네일 가운데쯤 오게 하는 값이다. 화면 점검에서 보고 맞춘다.)

- [ ] **Step 3: 카드**

`src/features/my-invites/InviteCard.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '../../components/Txt';
import { formatDateTime } from '../../lib/format';
import { colors, radius, spacing } from '../../theme';
import type { Invitation } from '../invitation/model';
import { periodLabel, screenStatus, ScreenStatus, STATUS_LABEL } from '../invitation/status';
import { ACTIVATION } from '../wallet/pricing';
import { CoverThumb } from './CoverThumb';

export type CardAction = 'complete' | 'activate' | 'extend' | 'share' | 'guestbook' | 'more' | 'preview' | 'delete';

const BADGE: Record<ScreenStatus, { bg: string; fg: string }> = {
  writing: { bg: '#FFF1DB', fg: '#B25E00' },
  inactive: { bg: '#FDE7E7', fg: colors.danger },
  active: { bg: '#E6F4EC', fg: colors.success },
  expired: { bg: '#E8EAF0', fg: '#3A4256' },
  blocked: { bg: '#3A3A3A', fg: '#FFFFFF' },
};

const NOTE: Partial<Record<ScreenStatus, string>> = {
  writing: '작성 완료 후 초대장 활성화 가능',
  inactive: '활성화 전까지 무제한 수정 가능',
  expired: '활성화 전까지 무제한 수정 가능',
  blocked: '관리자로부터 제재받은 초대장',
};

function CardButton({
  label,
  sub,
  onPress,
  disabled,
  flex = 1,
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  disabled?: boolean;
  flex?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, { flex }, disabled && styles.btnOff, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Txt variant="caption" weight="semibold" color={disabled ? colors.placeholder : colors.label} align="center">
        {label}
      </Txt>
      {sub && (
        <Txt variant="tiny" color={colors.muted} align="center">
          {sub}
        </Txt>
      )}
    </Pressable>
  );
}

/** 나의 초대장 카드 — 상태별 문구·버튼 (설계 4-1) */
export function InviteCard({
  invitation,
  now,
  hasNew,
  onAction,
}: {
  invitation: Invitation;
  now: Date;
  hasNew: boolean;
  onAction: (a: CardAction) => void;
}) {
  const status = screenStatus(invitation, now);
  const badge = BADGE[status];
  const guestbookOn = invitation.enabled.guestbook;
  const more = (
    <Pressable onPress={() => onAction('more')} style={styles.more} accessibilityRole="button" accessibilityLabel="더보기">
      <Ionicons name="ellipsis-vertical" size={18} color={colors.label} />
    </Pressable>
  );

  return (
    <View style={styles.card}>
      <View style={styles.meta}>
        <Txt variant="tiny" color={colors.faint}>
          제작일시 {formatDateTime(invitation.createdAt)}
        </Txt>
        <Txt variant="tiny" color={colors.faint}>
          초대장No. {invitation.number}
        </Txt>
      </View>
      <View style={styles.body}>
        <View style={styles.info}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Txt variant="tiny" weight="semibold" color={badge.fg}>
              {STATUS_LABEL[status]}
            </Txt>
          </View>
          <Txt variant="caption" weight="semibold" color={colors.label}>
            #결혼식 초대장
          </Txt>
          <Txt variant="title" numberOfLines={2}>
            {invitation.name || '이름 없는 초대장'}
          </Txt>
          <Txt variant="tiny" color={status === 'active' ? colors.success : colors.muted}>
            {status === 'active' ? periodLabel(invitation) : NOTE[status]}
          </Txt>
        </View>
        <Pressable
          onPress={() => onAction('preview')}
          disabled={status === 'blocked'}
          accessibilityRole="button"
          accessibilityLabel="미리보기"
        >
          <CoverThumb invitation={invitation} blocked={status === 'blocked'} />
        </Pressable>
      </View>

      <View style={styles.actions}>
        {status === 'writing' && (
          <>
            <CardButton label="초대장 완성하러 가기" onPress={() => onAction('complete')} />
            {more}
          </>
        )}
        {(status === 'inactive' || status === 'expired') && (
          <>
            <CardButton label="초대장 활성화" sub={`레터 ${ACTIVATION.cost}`} onPress={() => onAction('activate')} flex={2} />
            <CardButton label="방명록" onPress={() => onAction('guestbook')} disabled={!guestbookOn} />
            {more}
          </>
        )}
        {status === 'active' && (
          <>
            <CardButton label="기간 연장" onPress={() => onAction('extend')} />
            <CardButton label="공유하기" onPress={() => onAction('share')} />
            <CardButton
              label={guestbookOn && hasNew ? '(New) 방명록' : '방명록'}
              onPress={() => onAction('guestbook')}
              disabled={!guestbookOn}
            />
            {more}
          </>
        )}
        {status === 'blocked' && (
          <>
            <CardButton label="관리자로부터 제재된 초대장" onPress={() => {}} disabled flex={4} />
            <Pressable onPress={() => onAction('delete')} style={styles.more} accessibilityRole="button" accessibilityLabel="삭제">
              <Ionicons name="trash-outline" size={18} color={colors.label} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.canvas, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline, padding: spacing.lg, gap: spacing.md },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  body: { flexDirection: 'row', gap: spacing.md },
  info: { flex: 1, gap: spacing.xs },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.xs },
  actions: { flexDirection: 'row', gap: spacing.xs },
  btn: {
    minHeight: 48,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.xs,
  },
  btnOff: { backgroundColor: colors.surface },
  pressed: { opacity: 0.8 },
  more: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.xs },
});
```

- [ ] **Step 4: 더보기 시트**

`src/features/my-invites/MoreSheet.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '../../components/Txt';
import { colors, radius, spacing } from '../../theme';
import type { Invitation } from '../invitation/model';
import { screenStatus } from '../invitation/status';

export type MoreAction = 'history' | 'rename' | 'edit' | 'delete';

const ITEMS: { key: MoreAction; label: string }[] = [
  { key: 'history', label: '이력 열람' },
  { key: 'rename', label: '초대장 이름 수정' },
  { key: 'edit', label: '초대장 수정' },
  { key: 'delete', label: '삭제' },
];

/** ⋮ 더보기: 사용불가 초대장은 이력 열람·삭제만 */
export function MoreSheet({
  invitation,
  visible,
  onSelect,
  onClose,
}: {
  invitation: Invitation | null;
  visible: boolean;
  onSelect: (a: MoreAction) => void;
  onClose: () => void;
}) {
  if (!invitation) return null;
  const blocked = screenStatus(invitation) === 'blocked';
  const items = blocked ? ITEMS.filter((i) => i.key === 'history' || i.key === 'delete') : ITEMS;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <SafeAreaView edges={['bottom']} style={styles.inner}>
            <View style={styles.head}>
              <Txt variant="tiny" color={colors.faint}>
                초대장No. {invitation.number}
              </Txt>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="닫기">
                <Ionicons name="close" size={24} color={colors.inkSoft} />
              </Pressable>
            </View>
            <Txt variant="caption" color={colors.muted} align="center">
              - 결혼식 초대장 -
            </Txt>
            <Txt variant="title" align="center">
              {invitation.name}
            </Txt>
            {items.map((i) => (
              <Pressable key={i.key} onPress={() => onSelect(i.key)} style={styles.item} accessibilityRole="button">
                <Txt align="center">{i.label}</Txt>
              </Pressable>
            ))}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: colors.dim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.canvas, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  inner: { padding: spacing.xl, gap: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  item: { paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.xs },
});
```

- [ ] **Step 5: 이름 수정 모달**

`src/features/my-invites/RenameModal.tsx`:

```tsx
import { useEffect, useState } from 'react';

import { AppModal } from '../../components/AppModal';
import { TextField } from '../../components/TextField';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { invitationService } from '../../services';
import { colors } from '../../theme';
import { Invitation, isValidInvitationName, LIMITS } from '../invitation/model';

/** 초대장 이름 수정: 1~30자, 1자 이상이면 [수정하기] */
export function RenameModal({
  invitation,
  onClose,
  onRenamed,
}: {
  invitation: Invitation | null;
  onClose: () => void;
  onRenamed: (inv: Invitation) => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (invitation) setName(invitation.name);
  }, [invitation]);
  const max = LIMITS.invitationName.max;
  const valid = isValidInvitationName(name);

  const submit = async () => {
    if (!invitation || !valid || saving) return;
    setSaving(true);
    try {
      const r = await invitationService.rename(invitation.id, name);
      toast('수정이 완료되었습니다.');
      onRenamed(r);
    } catch {
      toast('수정하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      visible={!!invitation}
      title="초대장 이름 수정"
      onDismiss={onClose}
      actions={[
        { label: '취소', variant: 'outline', onPress: onClose },
        { label: saving ? '수정 중…' : '수정하기', variant: valid ? 'primary' : 'secondary', onPress: submit },
      ]}
    >
      <TextField placeholder="초대장 이름을 입력하세요." value={name} onChangeText={setName} maxLength={max} />
      <Txt variant="tiny" color={name.length === 0 ? colors.danger : colors.faint} align="right">
        ({name.length}/{max})
      </Txt>
    </AppModal>
  );
}
```

- [ ] **Step 6: 공유**

`src/features/my-invites/share.ts`:

```ts
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

import { toast } from '../../components/Toast';
import type { Invitation } from '../invitation/model';

/** 하객 보기 주소 (실제 공유 도메인은 서버 단계) */
export function invitationUrl(id: string): string {
  if (Platform.OS === 'web') return `${window.location.origin}/invite/${id}`;
  return Linking.createURL(`/invite/${id}`);
}

/** 앱: 기기 공유 시트 / 웹: 주소 복사 */
export async function shareInvitation(inv: Invitation): Promise<void> {
  const url = invitationUrl(inv.id);
  if (Platform.OS === 'web') {
    await Clipboard.setStringAsync(url);
    toast('주소를 복사했어요.');
    return;
  }
  await Share.share({ message: `${inv.name}\n${url}` });
}
```

- [ ] **Step 7: 확인 후 커밋**

Run: `npx tsc --noEmit && npx jest`
Expected: 통과. (`Button`의 `variant`에 `'secondary'`가 있는지 `src/components/Button.tsx`의 `palette` 키로 확인. 없으면 비활성 표시는 `'outline'`으로.)

```bash
git add src
git commit -m "feat: 나의 초대장 부품(바텀시트 선택·표지 썸네일·상태별 카드·더보기·이름 수정·공유)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 나의 초대장 화면

**Files:**
- Modify: `src/app/(tabs)/my-invites.tsx`(전체)

**Interfaces:**
- Consumes: Task 6 전부, `filterInvitations`, `yearOptions`, `STATUS_ORDER`, `hasNewGuestbook`, `LetterBadge`, `useMyInvitations`, `useEditor.load`, `invitationService.listGuestbook/remove`
- Produces: 라우트 이동 `/invitation/[id]/activate|extend|guestbook|history`(Task 8·9에서 만듦), `/invite/[id]`, `/create/editor/compose`

- [ ] **Step 1: 화면 재작성**

`src/app/(tabs)/my-invites.tsx` 전체:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { LetterBadge } from '../../components/LetterBadge';
import { Screen } from '../../components/Screen';
import { SelectSheet } from '../../components/SelectSheet';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { useEditor } from '../../features/invitation/editorStore';
import { Invitation } from '../../features/invitation/model';
import {
  filterInvitations,
  hasNewGuestbook,
  InviteFilter,
  ScreenStatus,
  STATUS_LABEL,
  STATUS_ORDER,
  yearOptions,
} from '../../features/invitation/status';
import { useMyInvitations } from '../../features/invitation/useMyInvitations';
import { CardAction, InviteCard } from '../../features/my-invites/InviteCard';
import { MoreAction, MoreSheet } from '../../features/my-invites/MoreSheet';
import { RenameModal } from '../../features/my-invites/RenameModal';
import { shareInvitation } from '../../features/my-invites/share';
import { invitationService } from '../../services';
import { useSession } from '../../store/session';
import { colors, radius, spacing } from '../../theme';

function FilterButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.filter} accessibilityRole="button">
      <Txt variant="caption" color={colors.label}>
        {label}
      </Txt>
      <Ionicons name="caret-down" size={12} color={colors.label} />
    </Pressable>
  );
}

export default function MyInvites() {
  const user = useSession((s) => s.user);
  const { list, reload } = useMyInvitations();
  const [filter, setFilter] = useState<InviteFilter>({ year: 'all', status: 'all' });
  const [sheet, setSheet] = useState<'year' | 'status' | null>(null);
  const [more, setMore] = useState<Invitation | null>(null);
  const [renaming, setRenaming] = useState<Invitation | null>(null);
  const [deleting, setDeleting] = useState<Invitation | null>(null);
  const [newBook, setNewBook] = useState<Record<string, boolean>>({});
  const now = useMemo(() => new Date(), [list]);

  // 방명록 (New) 표시: 방명록을 켠 초대장만 확인
  useEffect(() => {
    if (!list) return;
    let alive = true;
    Promise.all(
      list
        .filter((i) => i.enabled.guestbook)
        .map(async (i) => [i.id, hasNewGuestbook(await invitationService.listGuestbook(i.id), i.guestbookSeenAt)] as const),
    ).then((pairs) => alive && setNewBook(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
  }, [list]);

  if (!user) return <Redirect href="/auth/login" />;

  const all = list ?? [];
  const shown = filterInvitations(all, filter, now);
  const years = yearOptions(all);

  const edit = (inv: Invitation) => {
    useEditor.getState().load(inv);
    router.push('/create/editor/compose');
  };

  const onCard = (inv: Invitation, a: CardAction) => {
    switch (a) {
      case 'complete':
        return edit(inv);
      case 'activate':
        return router.push(`/invitation/${inv.id}/activate`);
      case 'extend':
        return router.push(`/invitation/${inv.id}/extend`);
      case 'share':
        return shareInvitation(inv);
      case 'guestbook':
        return router.push(`/invitation/${inv.id}/guestbook`);
      case 'preview':
        return router.push(`/invite/${inv.id}`);
      case 'more':
        return setMore(inv);
      case 'delete':
        return setDeleting(inv);
    }
  };

  const onMore = (a: MoreAction) => {
    const inv = more!;
    setMore(null);
    if (a === 'history') router.push(`/invitation/${inv.id}/history`);
    if (a === 'rename') setRenaming(inv);
    if (a === 'edit') edit(inv);
    if (a === 'delete') setDeleting(inv);
  };

  const filtered = filter.year !== 'all' || filter.status !== 'all';

  return (
    <Screen
      edges={['top']}
      header={<Header title="나의 초대장" hideBack right={<LetterBadge />} />}
      background={colors.surface}
    >
      <View style={styles.filters}>
        <FilterButton label={filter.year === 'all' ? '제작 연도' : `${filter.year}년`} onPress={() => setSheet('year')} />
        <FilterButton label={filter.status === 'all' ? '상태' : STATUS_LABEL[filter.status]} onPress={() => setSheet('status')} />
      </View>

      {list === null ? (
        <ActivityIndicator style={styles.loading} color={colors.inkSoft} />
      ) : shown.length === 0 ? (
        <View style={styles.empty}>
          <Txt variant="subtitle" align="center">
            {all.length === 0 ? '제작된 초대장이 없습니다.' : '조건에 맞는 초대장이 없습니다.'}
          </Txt>
          {all.length === 0 ? (
            <Button label="초대장 제작하러 가기" variant="outline" size="md" onPress={() => router.navigate('/create')} style={styles.cta} />
          ) : (
            filtered && (
              <Button label="필터 초기화" variant="outline" size="md" onPress={() => setFilter({ year: 'all', status: 'all' })} style={styles.cta} />
            )
          )}
        </View>
      ) : (
        <View style={styles.list}>
          {shown.map((inv) => (
            <InviteCard key={inv.id} invitation={inv} now={now} hasNew={!!newBook[inv.id]} onAction={(a) => onCard(inv, a)} />
          ))}
        </View>
      )}

      <SelectSheet<number | 'all'>
        visible={sheet === 'year'}
        title="제작 연도"
        options={[{ value: 'all', label: '전체' }, ...years.map((y) => ({ value: y, label: `${y}년` }))]}
        value={filter.year}
        onClose={() => setSheet(null)}
        onSelect={(year) => {
          setFilter((f) => ({ ...f, year }));
          setSheet(null);
        }}
      />
      <SelectSheet<ScreenStatus | 'all'>
        visible={sheet === 'status'}
        title="상태"
        options={[{ value: 'all', label: '전체' }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
        value={filter.status}
        onClose={() => setSheet(null)}
        onSelect={(status) => {
          setFilter((f) => ({ ...f, status }));
          setSheet(null);
        }}
      />
      <MoreSheet invitation={more} visible={!!more} onSelect={onMore} onClose={() => setMore(null)} />
      <RenameModal
        invitation={renaming}
        onClose={() => setRenaming(null)}
        onRenamed={() => {
          setRenaming(null);
          reload();
        }}
      />
      <AppModal
        visible={!!deleting}
        title="삭제하시겠습니까?"
        message="삭제 시 복구할 수 없습니다."
        onDismiss={() => setDeleting(null)}
        actions={[
          { label: '취소', variant: 'outline', onPress: () => setDeleting(null) },
          {
            label: '삭제하기',
            onPress: async () => {
              if (!deleting) return;
              await invitationService.remove(deleting.id);
              setDeleting(null);
              toast('삭제가 완료되었습니다.');
              reload();
            },
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.canvas },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.xs,
    backgroundColor: colors.canvas,
  },
  loading: { marginTop: 80 },
  list: { padding: spacing.lg, gap: spacing.md },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xxl, minHeight: 420 },
  cta: { paddingHorizontal: spacing.xxl },
});
```

(`Header`가 `hideBack`일 때 왼쪽 빈 칸 때문에 제목이 가운데로 간다. 설계 화면처럼 제목을 왼쪽에 두려면 `Header`에 `align="left"` 같은 속성을 더하지 않고, 지금 탭 화면들과 같은 모양을 유지한다.)

- [ ] **Step 2: 확인 후 커밋**

Run: `npx tsc --noEmit && npx jest`
Expected: 통과(이동 대상 라우트 `/invitation/[id]/…`가 아직 없어 typed routes 오류가 나면 Task 8·9를 마친 뒤 다시 확인한다 — 이 프로젝트가 typed routes를 켰는지 `app.json`의 `experiments.typedRoutes`로 확인).

```bash
git add src
git commit -m "feat: 나의 초대장 — 연도·상태 필터, 상태별 카드, 더보기(이력·이름 수정·수정·삭제), 공유

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 초대장 활성화·기간 연장 화면

**Files:**
- Create: `src/features/wallet/PurchaseScreen.tsx`, `src/app/invitation/[id]/activate.tsx`, `src/app/invitation/[id]/extend.tsx`

**Interfaces:**
- Consumes: `usePurchaseFlow`, `useWallet`, `orderLines`, `orderCost`, `ACTIVATION`, `EXTEND_OPTIONS`, `periodLabel`, `formatDateTime`
- Produces: `PurchaseScreen({ mode: 'activate' | 'extend', invitationId })`

- [ ] **Step 1: 구매 화면 본문**

`src/features/wallet/PurchaseScreen.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { formatDateTime } from '../../lib/format';
import { ExtendDays, invitationService, SpendOrder } from '../../services';
import { colors, radius, spacing } from '../../theme';
import type { Invitation } from '../invitation/model';
import { periodLabel } from '../invitation/status';
import { ACTIVATION, EXTEND_OPTIONS, orderCost, orderLines } from './pricing';
import { usePurchaseFlow } from './usePurchaseFlow';
import { useWallet } from './useWallet';

const NOTICE = {
  activate: [
    '초대장을 활성화 한 시점부터 초대장 사용 기간이 카운트 됩니다.',
    '초대장을 활성화 하기 전까지는 초대장을 무제한으로 수정할 수 있습니다.',
    '초대장 활성화 이후에 초대장을 수정하기를 원하는 경우 별도로 수정권(레터 5)을 구매하여야 합니다.',
    '사용불가 상태의 초대장은 초대장 활성화, 기간 연장이 불가능합니다.',
  ],
  extend: [
    '초대장을 활성화 한 시점부터 초대장 사용 기간이 카운트 됩니다.',
    '이용 기간 연장 시, 기존의 활성화된 기간에 선택한 일자만큼 기간이 추가됩니다.',
    '초대장 활성화 이후에 초대장을 수정하기를 원하는 경우 별도로 수정권(레터 5)을 구매하여야 합니다.',
  ],
};

function Radio({ on, label, cost, listCost, onPress }: { on: boolean; label: string; cost?: number; listCost?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.radioRow} accessibilityRole="radio" accessibilityState={{ checked: on }}>
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.inkSoft : colors.placeholder} />
      <Txt style={styles.flex}>{label}</Txt>
      {cost !== undefined && (
        <View style={styles.costs}>
          <Txt>{cost}레터</Txt>
          {listCost && (
            <Txt variant="caption" color={colors.faint} style={styles.strike}>
              {listCost}레터
            </Txt>
          )}
        </View>
      )}
    </Pressable>
  );
}

/** 초대장 활성화 / 기간 연장 구매 (설계 4-3, 4-4) */
export function PurchaseScreen({ mode, invitationId }: { mode: 'activate' | 'extend'; invitationId: string }) {
  const balance = useWallet((s) => s.balance);
  const refresh = useWallet((s) => s.refresh);
  const [inv, setInv] = useState<Invitation | null | undefined>(undefined);
  const [days, setDays] = useState<ExtendDays | 0>(0);
  const flow = usePurchaseFlow({
    onDone: () => {
      toast('구매를 완료하였습니다.');
      router.back();
    },
  });

  // 충전하고 돌아오면 잔액만 새로 읽고 선택값은 유지
  useFocusEffect(
    useCallback(() => {
      refresh();
      invitationService.get(invitationId).then(setInv);
    }, [invitationId, refresh]),
  );

  const title = mode === 'activate' ? '초대장 활성화' : '기간 연장 구매';
  const close = <Header title={title} hideBack right={<Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="닫기"><Ionicons name="close" size={24} color={colors.inkSoft} /></Pressable>} />;

  if (inv === undefined) {
    return (
      <Screen header={close}>
        <ActivityIndicator style={styles.loading} color={colors.inkSoft} />
      </Screen>
    );
  }
  if (!inv) {
    return (
      <Screen header={close} contentStyle={styles.center}>
        <Txt color={colors.muted}>초대장을 찾을 수 없어요.</Txt>
      </Screen>
    );
  }

  const order: SpendOrder | null =
    mode === 'activate'
      ? { kind: 'activate', invitationId: inv.id, extendDays: days }
      : days
        ? { kind: 'extend', invitationId: inv.id, extendDays: days }
        : null;
  const lines = order ? orderLines(order) : [];
  const total = order ? orderCost(order) : 0;
  const after = (balance ?? 0) - total;
  const period = periodLabel(inv);

  const buy = () => {
    if (!order) return;
    flow.ask(order, '상품을 구매하시겠습니까?', mode === 'activate' ? '구매 시 서비스가 활성화 됩니다.' : undefined);
  };

  return (
    <Screen
      header={close}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button label={flow.busy ? '처리 중…' : '레터로 구매하기'} onPress={buy} disabled={!order || flow.busy} />
          <Txt variant="tiny" color={colors.muted} align="center">
            <Txt variant="tiny" color={colors.muted} onPress={() => toast('준비 중이에요.')}>이용약관</Txt>
            {' | '}
            <Txt variant="tiny" color={colors.muted} onPress={() => toast('준비 중이에요.')}>유료 이용약관</Txt>
            {' | '}
            <Txt variant="tiny" color={colors.muted} onPress={() => toast('준비 중이에요.')}>개인정보 처리방침</Txt>
            {' | '}
            <Txt variant="tiny" color={colors.muted} onPress={() => toast('복원할 구매 내역이 없어요.')}>구매 복원</Txt>
          </Txt>
        </View>
      }
    >
      <View style={styles.notice}>
        <View style={styles.noticeHead}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.infoInk} />
          <Txt variant="caption" weight="semibold">
            꼭 확인해 주세요!
          </Txt>
        </View>
        {NOTICE[mode].map((t) => (
          <Txt key={t} variant="tiny" color={colors.muted}>
            • {t}
          </Txt>
        ))}
      </View>

      <View style={styles.meta}>
        <Txt variant="tiny" color={colors.faint}>
          제작일시 {formatDateTime(inv.createdAt)}
        </Txt>
        <Txt variant="tiny" color={colors.faint}>
          초대장No. {inv.number}
        </Txt>
      </View>
      <Txt variant="caption" weight="semibold" color={colors.label}>
        #결혼식 초대장
      </Txt>
      <Txt variant="title">{inv.name}</Txt>
      {mode === 'extend' && period && (
        <Txt variant="caption" color={colors.success}>
          {period}
        </Txt>
      )}

      <View style={styles.balance}>
        <Txt weight="semibold" color={colors.canvas}>
          보유 레터
        </Txt>
        <Txt weight="semibold" color={colors.canvas}>
          {balance ?? '–'}
        </Txt>
      </View>

      {mode === 'activate' && (
        <View style={styles.box}>
          <Txt variant="subtitle" weight="semibold">
            이용권 구매
          </Txt>
          <View style={styles.row}>
            <Txt style={styles.flex}>서비스 활성화</Txt>
            <Txt>{ACTIVATION.cost}레터</Txt>
          </View>
          <Txt variant="caption" color={colors.muted}>
            • 공유하기 기능 활성화 (기본 {ACTIVATION.days}일 제공)
          </Txt>
        </View>
      )}

      <View style={styles.box}>
        <Txt variant="subtitle" weight="semibold">
          이용 기간 연장
        </Txt>
        <Txt variant="caption" color={colors.muted}>
          공유할 수 있는 기간을 연장합니다.
        </Txt>
        <Radio on={days === 0} label="선택 안함" onPress={() => setDays(0)} />
        {EXTEND_OPTIONS.map((o) => (
          <Radio key={o.days} on={days === o.days} label={`+${o.days}일`} cost={o.cost} listCost={o.listCost} onPress={() => setDays(o.days)} />
        ))}
      </View>

      <Txt variant="subtitle" weight="semibold">
        구매 정보
      </Txt>
      <View style={styles.row}>
        <Txt variant="caption" style={styles.flex}>
          • 보유중인 레터
        </Txt>
        <Txt variant="caption">{balance ?? '–'} 레터</Txt>
      </View>
      {lines.map((l) => (
        <View key={l.label} style={styles.row}>
          <Txt variant="caption" color={colors.danger} style={styles.flex}>
            • {l.label === '서비스 활성화' ? '서비스 이용료 차감' : l.label}
          </Txt>
          <Txt variant="caption" color={colors.danger}>
            {l.amount} 레터
          </Txt>
        </View>
      ))}
      <Txt weight="semibold" align="right" color={total ? colors.danger : colors.muted}>
        총 {total}레터 차감
      </Txt>
      <View style={styles.divider} />
      <Txt variant="subtitle" weight="semibold" align="right" color={after < 0 ? colors.danger : colors.infoInk}>
        구매 후 남은 레터 {after}
      </Txt>
      {flow.modals}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 80 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.sm },
  notice: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.md, gap: 4, marginBottom: spacing.sm },
  noticeHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  balance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.lg,
    marginVertical: spacing.sm,
  },
  box: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.sm, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  costs: { alignItems: 'flex-end' },
  strike: { textDecorationLine: 'line-through' },
  divider: { height: 1, backgroundColor: colors.hairline, marginVertical: spacing.sm },
  footer: { padding: spacing.lg, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.canvas },
});
```

(활성화 화면도 기간을 고르지 않으면 50레터만이라 [레터로 구매하기]는 항상 활성. 연장 화면은 "선택 안함"이면 `order === null` → 버튼 비활성, "총 0레터 차감".)

- [ ] **Step 2: 라우트**

`src/app/invitation/[id]/activate.tsx`:

```tsx
import { useLocalSearchParams } from 'expo-router';

import { PurchaseScreen } from '../../../features/wallet/PurchaseScreen';

export default function ActivateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PurchaseScreen mode="activate" invitationId={id} />;
}
```

`src/app/invitation/[id]/extend.tsx`:

```tsx
import { useLocalSearchParams } from 'expo-router';

import { PurchaseScreen } from '../../../features/wallet/PurchaseScreen';

export default function ExtendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PurchaseScreen mode="extend" invitationId={id} />;
}
```

(전체 화면 모달처럼 아래에서 올라오게 하려면 `src/app/invitation/[id]/_layout.tsx`에 `<Stack screenOptions={{ headerShown: false, presentation: 'modal' }} />`. 웹에서는 일반 화면으로 보인다.)

`src/app/invitation/[id]/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

import { colors } from '../../../theme';

export default function InvitationManageLayout() {
  return <Stack screenOptions={{ headerShown: false, presentation: 'modal', contentStyle: { backgroundColor: colors.canvas } }} />;
}
```

- [ ] **Step 3: 확인 후 커밋**

Run: `npx tsc --noEmit && npx jest`
Expected: 통과.

```bash
git add src
git commit -m "feat: 초대장 활성화·기간 연장 구매 화면(구매 정보·확인·레터 부족 안내)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 방명록 관리·이력 열람 화면

**Files:**
- Create: `src/app/invitation/[id]/guestbook.tsx`, `src/app/invitation/[id]/history.tsx`

**Interfaces:**
- Consumes: `invitationService.get/listGuestbook/removeGuestbook/markGuestbookSeen`, `walletService.history`, `isNewEntry`, `periodLabel`, `screenStatus`, `LedgerCard`, `formatDateTime`

- [ ] **Step 1: 방명록 관리**

`src/app/invitation/[id]/guestbook.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { toast } from '../../../components/Toast';
import { Txt } from '../../../components/Txt';
import { isNewEntry } from '../../../features/invitation/status';
import { formatDateTime } from '../../../lib/format';
import { GuestbookEntry, invitationService } from '../../../services';
import { useSession } from '../../../store/session';
import { colors, radius, spacing } from '../../../theme';

const PAGE = 50;

/** 방명록 관리 (작성자): 신규 표시·삭제·50개씩 더보기. 나갈 때 확인 시각 저장 */
export default function GuestbookManage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user);
  const [entries, setEntries] = useState<GuestbookEntry[] | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [removing, setRemoving] = useState<GuestbookEntry | null>(null);
  // 들어올 때의 확인 시각 기준으로 '신규'를 보여준다 (보는 중에 사라지지 않게)
  const seenAt = useRef<string | undefined>(undefined);

  const load = useCallback(async () => setEntries(await invitationService.listGuestbook(id)), [id]);

  useEffect(() => {
    invitationService.get(id).then((inv) => {
      seenAt.current = inv?.guestbookSeenAt;
      load();
    });
    return () => {
      invitationService.markGuestbookSeen(id, new Date().toISOString());
    };
  }, [id, load]);

  const close = (
    <Header
      title="방명록"
      hideBack
      right={
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="닫기">
          <Ionicons name="close" size={24} color={colors.inkSoft} />
        </Pressable>
      }
    />
  );

  return (
    <Screen header={close} background={colors.surface} contentStyle={styles.content}>
      {entries === null ? (
        <ActivityIndicator style={styles.loading} color={colors.inkSoft} />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Txt color={colors.muted}>작성된 방명록이 없습니다.</Txt>
        </View>
      ) : (
        <>
          {entries.slice(0, limit).map((e) => (
            <View key={e.id} style={styles.card}>
              {isNewEntry(e, seenAt.current) && (
                <View style={styles.newTag}>
                  <Txt variant="tiny" weight="semibold" color={colors.canvas}>
                    신규
                  </Txt>
                </View>
              )}
              <View style={styles.flex}>
                <View style={styles.row}>
                  <Txt variant="caption" weight="semibold" style={styles.flex}>
                    {e.name}
                  </Txt>
                  <Txt variant="tiny" color={colors.faint}>
                    {formatDateTime(e.createdAt)}
                  </Txt>
                </View>
                <Txt variant="caption" color={colors.label}>
                  {e.content}
                </Txt>
              </View>
              <Pressable onPress={() => setRemoving(e)} style={styles.remove} accessibilityRole="button" accessibilityLabel={`${e.name} 방명록 삭제`}>
                <Ionicons name="close" size={18} color={colors.label} />
              </Pressable>
            </View>
          ))}
          {entries.length > limit && (
            <Pressable onPress={() => setLimit((n) => n + PAGE)} style={styles.moreBtn} accessibilityRole="button">
              <Txt weight="semibold">{Math.min(PAGE, entries.length - limit)}개 더보기</Txt>
              <Ionicons name="caret-down" size={14} color={colors.label} />
            </Pressable>
          )}
        </>
      )}
      <AppModal
        visible={!!removing}
        title="삭제하시겠습니까?"
        onDismiss={() => setRemoving(null)}
        actions={[
          { label: '취소', variant: 'outline', onPress: () => setRemoving(null) },
          {
            label: '삭제하기',
            onPress: async () => {
              if (!removing || !user) return;
              const r = await invitationService.removeGuestbook(id, removing.id, { ownerId: user.id });
              setRemoving(null);
              if (r === 'ok') {
                toast('삭제가 완료되었습니다.');
                load();
              } else toast('삭제하지 못했어요.');
            },
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 80 },
  content: { padding: spacing.lg, gap: spacing.sm },
  empty: { minHeight: 420, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.canvas },
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.canvas, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.hairline, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  newTag: { position: 'absolute', top: -6, left: -4, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: colors.danger, borderRadius: 2, transform: [{ rotate: '-12deg' }] },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, height: 48, backgroundColor: colors.surfaceStrong, borderRadius: radius.xs },
});
```

(설계 문구는 "50개 더보기"이지만 남은 수가 50 미만이면 남은 수만큼 보인다. 방명록을 끈 초대장은 카드에서 버튼이 비활성이라 들어오지 않는다.)

- [ ] **Step 2: 이력 열람**

`src/app/invitation/[id]/history.tsx`:

```tsx
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { Txt } from '../../../components/Txt';
import { Invitation } from '../../../features/invitation/model';
import { periodLabel, screenStatus } from '../../../features/invitation/status';
import { LedgerCard } from '../../../features/wallet/LedgerCard';
import { formatDateTime } from '../../../lib/format';
import { invitationService, LedgerEntry, walletService } from '../../../services';
import { useSession } from '../../../store/session';
import { colors, radius, spacing } from '../../../theme';

/** 이력 열람: 활성화·연장·수정 기록 */
export default function HistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user);
  const [inv, setInv] = useState<Invitation | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);

  useEffect(() => {
    invitationService.get(id).then(setInv);
    if (user) walletService.history(user.id, { invitationId: id, kind: 'spend' }).then(setEntries);
  }, [id, user]);

  const active = inv && screenStatus(inv) === 'active';

  return (
    <Screen header={<Header title="이력 열람" />} contentStyle={styles.content}>
      {inv && (
        <View style={styles.info}>
          <View style={styles.meta}>
            <Txt variant="tiny" color={colors.faint}>
              제작일시 {formatDateTime(inv.createdAt)}
            </Txt>
            <Txt variant="tiny" color={colors.faint}>
              초대장No. {inv.number}
            </Txt>
          </View>
          <Txt variant="caption" weight="semibold" color={colors.label}>
            #결혼식 초대장
          </Txt>
          <Txt variant="title">{inv.name}</Txt>
          <Txt variant="caption" color={active ? colors.success : colors.danger}>
            {active ? periodLabel(inv) : '초대장 비활성화'}
          </Txt>
        </View>
      )}
      {entries === null ? (
        <ActivityIndicator color={colors.inkSoft} />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Txt color={colors.muted}>이력 정보가 없습니다.</Txt>
        </View>
      ) : (
        entries.map((e) => <LedgerCard key={e.id} entry={e} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  info: { gap: spacing.xs, marginBottom: spacing.sm },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: { minHeight: 420, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.sm },
});
```

- [ ] **Step 3: 확인 후 커밋**

Run: `npx tsc --noEmit && npx jest`
Expected: 통과.

```bash
git add src
git commit -m "feat: 방명록 관리(신규·삭제·더보기)와 이력 열람 화면

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 편집기 수정 모드와 하객 보기 제한

**Files:**
- Modify: `src/features/invitation/editorStore.ts`, `src/app/create/editor/compose.tsx`, `src/app/invite/[id].tsx`
- Create: `src/features/invitation/editor/EditPayModal.tsx`
- Test: `src/features/invitation/__tests__/editorStore.test.ts`(추가)

**Interfaces:**
- Consumes: `usePurchaseFlow`, `useWallet`, `EDIT_COST`, `screenStatus`, `canFinalize`, `sectionTabs`
- Produces: 편집 스토어 `origin: Invitation | null`(불러온 저장본, 새로 만들면 null), `EditPayModal({ visible, invitation, balance, busy, onPay, onCancel })`

- [ ] **Step 1: 실패하는 테스트**

`src/features/invitation/__tests__/editorStore.test.ts`의 describe 안에 추가(파일 위 import에 `createInvitation` 추가):

```ts
  it('저장본을 불러오면 origin 에 남고, 새로 시작하면 비운다', () => {
    const saved = { ...createInvitation({ id: 's', ownerId: 'u1', themeId: 'wedding', templateId: 'wedding-1' }), status: 'final' as const };
    useEditor.getState().load(saved);
    expect(useEditor.getState().origin?.id).toBe('s');
    useEditor.getState().patch('greeting', { content: '바뀜' });
    expect(useEditor.getState().origin?.content.greeting.content).toBe('');
    start();
    expect(useEditor.getState().origin).toBeNull();
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/features/invitation/__tests__/editorStore.test.ts`
Expected: FAIL — `origin` 없음.

- [ ] **Step 3: 스토어에 origin 추가**

`src/features/invitation/editorStore.ts`:
- `EditorState`에 추가:

```ts
  /** 나의 초대장에서 불러온 저장본 (수정 모드 판단용). 새로 만들면 null */
  origin: Invitation | null;
```

- 초깃값 `origin: null,`
- `start`: `set({ draft: …, dirty: false, origin: null })`
- `load`: `load: (invitation) => set({ draft: invitation, dirty: false, origin: invitation }),`
- `reset`: `set({ draft: null, dirty: false, origin: null })`
- `markSaved`: `markSaved: (saved) => set({ draft: saved, dirty: false, origin: saved }),`

- [ ] **Step 4: 수정 결제 모달**

`src/features/invitation/editor/EditPayModal.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { EDIT_COST } from '../../wallet/pricing';
import type { Invitation } from '../model';

/** 활성화된 초대장 수정: 보유 레터를 보여주고 [수정 (레터 -5)] / [이전] */
export function EditPayModal({
  visible,
  invitation,
  balance,
  busy,
  onPay,
  onCancel,
}: {
  visible: boolean;
  invitation: Invitation;
  balance: number | null;
  busy: boolean;
  onPay: () => void;
  onCancel: () => void;
}) {
  return (
    <AppModal
      visible={visible}
      onDismiss={onCancel}
      actions={[
        { label: '이전', variant: 'outline', onPress: onCancel },
        { label: busy ? '처리 중…' : `수정 (레터 -${EDIT_COST})`, onPress: onPay },
      ]}
    >
      <Txt variant="tiny" color={colors.faint}>
        초대장No. {invitation.number}
      </Txt>
      <Txt variant="caption" color={colors.muted} align="center">
        - 결혼식 초대장 -
      </Txt>
      <Txt variant="title" align="center">
        {invitation.name}
      </Txt>
      <View style={styles.balance}>
        <Txt weight="semibold" color={colors.canvas}>
          보유 레터 {balance ?? '–'}
        </Txt>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  balance: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.sm },
});
```

- [ ] **Step 5: compose 수정 모드**

`src/app/create/editor/compose.tsx`:

import 추가:

```tsx
import { AppModal } from '../../../components/AppModal';
import { EditPayModal } from '../../../features/invitation/editor/EditPayModal';
import { screenStatus } from '../../../features/invitation/status';
import { usePurchaseFlow } from '../../../features/wallet/usePurchaseFlow';
import { useWallet } from '../../../features/wallet/useWallet';
```

컴포넌트 상단(다른 훅 옆)에 추가:

```tsx
  const origin = useEditor((s) => s.origin);
  const balance = useWallet((s) => s.balance);
  const [incomplete, setIncomplete] = useState(false);
  const [paying, setPaying] = useState(false);
  const pay = usePurchaseFlow({
    onDone: (saved) => {
      markSaved(saved);
      setPaying(false);
      toast(`수정이 완료되었습니다. (레터 -5개 차감)`);
      guard.allow();
      useEditor.getState().reset();
      router.dismissTo('/my-invites');
    },
  });
```

`if (!draft) return <Redirect … />;` 아래에 추가:

```tsx
  // 나의 초대장에서 불러온 저장본이면 수정 모드. 활성화된 초대장은 수정할 때마다 레터 차감
  const editing = !!origin;
  const paid = !!origin && screenStatus(origin) === 'active';

  const missingTab = () => tabs.find((k) => !draft.completed[k]);

  const askPaidEdit = () => {
    if (!canFinalize(draft)) {
      setIncomplete(true);
      return;
    }
    useWallet.getState().refresh();
    setPaying(true);
  };
```

헤더를 바꾼다:

```tsx
      <Header
        title={editing ? '초대장 수정' : '정보 입력'}
        // 새로 만들 때 ←는 초대장 설정(Step3), 수정 모드 ←는 나의 초대장으로 (이탈 경고 적용)
        onBack={
          editing
            ? () => router.back()
            : () => {
                guard.allow();
                router.dismissTo('/create/editor/options');
              }
        }
        right={
          <View style={styles.headerActions}>
            {editing && (
              <Button
                label="설정"
                variant="chip"
                onPress={() => {
                  guard.allow();
                  router.push('/create/editor/options');
                }}
              />
            )}
            {!paid && <Button label="임시저장" variant="chip" onPress={() => setSaveKind('draft')} />}
            <Button
              label={editing && origin?.status === 'final' ? '수정' : '최종저장'}
              variant="chip"
              onPress={paid ? askPaidEdit : askFinal}
            />
          </View>
        }
      />
```

모달들 옆(`{guard.modal}` 위)에 추가:

```tsx
      <AppModal
        visible={incomplete}
        title="초대장 정보를 모두 입력하세요."
        onDismiss={() => setIncomplete(false)}
        actions={[
          {
            label: '확인',
            onPress: () => {
              setIncomplete(false);
              const k = missingTab();
              if (k) setSection(k);
            },
          },
        ]}
      />
      {paid && (
        <EditPayModal
          visible={paying}
          invitation={origin!}
          balance={balance}
          busy={pay.busy}
          onCancel={() => setPaying(false)}
          onPay={() => {
            if ((balance ?? 0) < EDIT_COST) {
              setPaying(false);
              pay.lack();
              return;
            }
            pay.run({ kind: 'edit', invitation: draft });
          }}
        />
      )}
      {pay.modals}
```

(`askFinal`은 그대로 — 작성중·비활성화·기한만료의 [수정]/[최종저장]은 무료 저장. import에 `import { EDIT_COST } from '../../../features/wallet/pricing';`도 추가한다. 성공 토스트의 `5`도 `${EDIT_COST}`로 쓴다.)

설정에서 Step3로 가는 경우: Step3·4의 [다음]/[정보 입력]이 `router.push('/create/editor/compose')`라서 compose가 두 번 쌓일 수 있다. Step4의 이동이 `dismissTo` 또는 `navigate`인지 `src/app/create/editor/order.tsx`에서 확인하고, `push`면 `router.navigate('/create/editor/compose')`로 바꾼다(이미 있는 compose 화면으로 돌아감).

- [ ] **Step 6: 하객 보기 제한**

`src/app/invite/[id].tsx`:
- import `import { screenStatus } from '../../features/invitation/status';`
- `const isOwner = …` 아래에 추가:

```tsx
  // 활성화 전·만료·제재 초대장은 하객에게 보이지 않는다 (작성자는 미리보기)
  if (!isOwner && screenStatus(invitation) !== 'active') {
    return (
      <Screen header={<Header title="초대장" />} contentStyle={styles.empty}>
        <Txt variant="title" align="center">
          지금은 볼 수 없는 초대장이에요
        </Txt>
      </Screen>
    );
  }
```

- 기존 임시저장 배너 조건 `invitation.status === 'draft'`를 `isOwner && screenStatus(invitation) !== 'active'`로, 문구를 `미리보기예요. 나의 초대장에서 활성화하면 하객에게 보낼 수 있어요.`로 바꾼다.

- [ ] **Step 7: 확인 후 커밋**

Run: `npx jest && npx tsc --noEmit`
Expected: 통과.

```bash
git add src
git commit -m "feat: 초대장 수정 모드(활성화된 초대장은 레터 5 차감), 활성화 전 하객 보기 제한

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 최종 점검과 문서 보정

**Files:**
- Modify: `docs/superpowers/specs/2026-10-20-my-invitations-and-letters-design.md`, `docs/superpowers/plans/2026-10-16-canvas-cover-and-view-modes.md`

- [ ] **Step 1: 설계 문서 보정**
- 라우트를 `/invitation/[id]/activate|extend|guestbook|history`로 고친다(탭 `/my-invites`와 겹침 방지).
- 충전 상품 표기를 "50 / 110(100+보너스 10) / 330(300+30) / 550(500+50)"으로 명시.
- 4-5 "50개 더보기": 남은 수가 50 미만이면 그 수로 보인다는 문장 추가.

- [ ] **Step 2: 캔버스 계획 보정 메모**

`docs/superpowers/plans/2026-10-16-canvas-cover-and-view-modes.md` 맨 위 Global Constraints 아래에 추가:

```markdown
> **선행 작업 반영(2026-10-20 나의 초대장·레터):**
> - `normalizeInvitation`은 이미 있다(`{ invitation, changed }` 반환, 저장소에서 바뀌면 저장). Task 3의 viewMode·design 보정은 이 함수 안에 더하고 `changed` 판정에 포함한다. mock 저장소는 `src/services/mock/invitationStore.ts`.
> - Task 8의 compose 전체 코드는 수정 모드(origin·설정·임시저장 숨김·수정 결제·입력 누락 모달)를 포함하도록 합쳐서 쓴다 — 지금 `compose.tsx`의 수정 모드 부분을 그대로 옮긴다.
> - 나의 초대장 썸네일 `CoverThumb`은 `CoverPage` 축소를 쓴다. Task 5에서 `CoverPage`를 지울 때 `CoverThumb`을 `CoverSlide`(폭 120)로 바꾼다.
```

- [ ] **Step 3: 전체 검사**

Run: `npx tsc --noEmit && npx jest && npx expo lint && npx expo-doctor`
Expected: 오류 0, 전부 통과. (`expo lint` 설정 파일이 새로 생기면 함께 커밋)

- [ ] **Step 4: 브라우저 점검 (서버를 켜도 되는지 사용자에게 먼저 묻는다)**

Playwright MCP로:
1. 로그인 → 나의 초대장(빈 화면) → 제작 → 최종저장 → 목록에 "비활성화" 카드.
2. 필터: 제작 연도·상태 바텀시트, 조합 결과, 결과 없음 문구.
3. [초대장 활성화] → +180일 선택(구매 후 남은 레터 음수) → 레터 부족 모달 → [레터 충전] → 지갑에서 330 충전(결제 시트 → 구매) → 뒤로 → 선택 유지 확인 → 구매 → "구매를 완료하였습니다." → 카드 "활성화"·기간 초록.
4. [공유하기] → 주소 복사 토스트 → 새 탭에서 `/invite/[id]`(로그아웃 상태)로 보임. 비활성화 초대장 주소는 "지금은 볼 수 없는 초대장이에요".
5. 하객으로 방명록 작성 → 목록 "(New) 방명록" → 방명록 관리: 신규 띠, 삭제, 나갔다 오면 신규 없음.
6. [기간 연장] → 선택 안함이면 버튼 비활성 → +60일(55, 정가 취소선) 구매 → 종료일 연장.
7. ⋮: 이름 수정(0자면 수정하기 비활성, 31자 입력 불가) / 이력 열람(활성화·연장 카드) / 초대장 수정 → [수정] → "수정 (레터 -5)" → 완료 토스트 → 이력에 "초대장 수정 −5".
8. 지갑: 충전 내역·사용 내역, 결제 실패 시험 → 실패 토스트, 취소 → 아무 일 없음.
9. 삭제 → "삭제가 완료되었습니다."
찾은 문제는 고치고 해당 작업 방식으로 테스트를 더한다.

- [ ] **Step 5: 커밋**

```bash
git add -A docs src
git commit -m "docs: 나의 초대장 설계·캔버스 계획 보정, 최종 점검 수정

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: 확인 못 한 것 보고**

실제 폰(Expo Go)의 생체인증 창, 안드로이드 결제 시트 모양, 기기 공유 시트, 모달 화면 전환은 웹 점검으로 확인하지 못했다고 분명히 적는다.
