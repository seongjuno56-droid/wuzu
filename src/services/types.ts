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
