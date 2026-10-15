import type { Invitation } from '../features/invitation/model';

export type Gender = 'male' | 'female' | 'none';
export type AccountStatus = 'active' | 'withdrawing' | 'banned';
export type Provider = 'email' | 'kakao' | 'google' | 'apple';

export interface User {
  id: string;
  email: string | null;
  name: string;
  birth?: string; // YYYY-MM-DD
  gender?: Gender;
  phone?: string;
  provider: Provider;
  marketingAgreed: boolean;
  createdAt: string; // ISO
  status: AccountStatus;
  withdrawRequestedAt?: string; // ISO
}

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; reason: 'invalid' | 'banned' }
  | {
      ok: false;
      reason: 'withdrawing';
      userId: string;
      requestedAt: string;
      cancelDeadline: string;
    };

export interface SignupInput {
  email?: string;
  password?: string;
  name: string;
  birth?: string;
  gender?: Gender;
  phone?: string;
  marketingAgreed: boolean;
  provider: Provider;
  /** 소셜 가입 시 공급자 측 계정 키 */
  providerKey?: string;
}

export interface SocialProfile {
  providerKey: string;
  name: string;
}

export type SendCodeResult =
  | { ok: true; sentCount: number; expiresAt: number }
  | { ok: false; reason: 'not_found' | 'limit' };

export interface AuthService {
  login(email: string, password: string): Promise<LoginResult>;
  /** user가 null이면 신규 가입이 필요한 소셜 계정 */
  socialLogin(provider: 'kakao'): Promise<{ result: LoginResult | null; profile: SocialProfile }>;
  isEmailTaken(email: string): Promise<boolean>;
  signup(input: SignupInput): Promise<User>;
  cancelWithdraw(userId: string): Promise<User>;
  findId(query: { name: string; birth: string; phone: string }): Promise<{ email: string; createdAt: string } | null>;
  sendCode(email: string, now?: number): Promise<SendCodeResult>;
  verifyCode(email: string, code: string, now?: number): Promise<boolean>;
  resetPassword(email: string, newPassword: string): Promise<void>;
}

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

// ── 초대장 / 방명록 ───────────────────────────────────

export interface GuestbookEntry {
  id: string;
  invitationId: string;
  name: string;
  content: string;
  createdAt: string;
}

export interface GuestbookInput {
  name: string;
  password: string;
  content: string;
}

/** 방명록 삭제 권한: 작성 시 비밀번호, 또는 초대장 작성자 */
export type RemoveGuestbookAuth = { password: string } | { ownerId: string };

export interface InvitationService {
  list(ownerId: string): Promise<Invitation[]>;
  get(id: string): Promise<Invitation | null>;
  save(invitation: Invitation): Promise<Invitation>;
  remove(id: string): Promise<void>;
  listGuestbook(invitationId: string): Promise<GuestbookEntry[]>;
  addGuestbook(invitationId: string, input: GuestbookInput): Promise<GuestbookEntry>;
  removeGuestbook(
    invitationId: string,
    entryId: string,
    auth: RemoveGuestbookAuth,
  ): Promise<'ok' | 'wrong_password' | 'not_found'>;
}
