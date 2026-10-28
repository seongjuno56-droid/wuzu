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
