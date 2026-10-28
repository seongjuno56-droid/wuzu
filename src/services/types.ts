import type { Invitation } from '../features/invitation/model';
import type { RsvpInput, RsvpResponse } from '../features/rsvp/rsvp';

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
  /** 아이디: 간편 로그인은 자동 부여 (ka_xxxxxxxx · go_xxxxxxxx). 예전 이메일 계정은 이메일 */
  loginId?: string;
  /** 회원정보(닉네임·생년월일·성별) 최종 수정 시각 */
  profileUpdatedAt?: string;
  /** 마케팅 수신 동의 최종 변경 시각 */
  marketingUpdatedAt?: string;
  status: AccountStatus;
  withdrawRequestedAt?: string; // ISO
}

export type SocialProvider = 'kakao' | 'google';

export type SocialLoginResult =
  | { ok: true; user: User; isNew: boolean }
  | { ok: false; reason: 'cancelled' | 'failed' | 'banned' }
  | { ok: false; reason: 'withdrawing'; userId: string; requestedAt: string; cancelDeadline: string };

/**
 * 회원 인증 (카카오·구글 간편 로그인 전용).
 * 실서버 구현은 userId 인자를 무시하고 로그인한 본인 기준으로 처리한다.
 */
export interface AuthService {
  /** banned 이면 세션을 스스로 끊는다. withdrawing 을 철회하지 않고 끝낼 때는 화면이 logout() 한다 */
  socialLogin(provider: SocialProvider): Promise<SocialLoginResult>;
  /** 앱 시작 때 저장된 세션으로 회원을 다시 읽는다. 세션이 없거나 쓸 수 없는 계정이면 null */
  currentUser(): Promise<User | null>;
  logout(): Promise<void>;
  cancelWithdraw(userId: string): Promise<User>;
  /** 선택 프로필 저장 (값이 undefined 면 비운다) */
  updateProfile(userId: string, values: Pick<User, 'birth' | 'gender' | 'marketingAgreed'>): Promise<User>;
  /** 회원정보 수정 (닉네임·생년월일·성별). 값이 undefined 면 비운다 */
  updateAccount(userId: string, values: { name: string; birth?: string; gender?: Gender }): Promise<User>;
  setMarketing(userId: string, agreed: boolean): Promise<User>;
  /** 탈퇴 신청: 30일 안에 다시 로그인하면 철회할 수 있다 */
  requestWithdraw(userId: string): Promise<void>;
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
  /** 이름만 바꾼다 (1~30자, 앞뒤 공백 제거) */
  rename(id: string, name: string): Promise<Invitation>;
  /** 작성자가 방명록 관리를 확인한 시각 */
  markGuestbookSeen(id: string, at: string): Promise<void>;
}

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
  /** 충전 결제 금액(원). 충전 기록에만 */
  priceWon?: number;
  /** 초대장No. 사용 기록에만 */
  invitationNumber?: string;
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

// ── 참석 응답 ───────────────────────────────────────

export type RsvpSubmitResult =
  | { ok: true; response: RsvpResponse; created: boolean }
  | { ok: false; reason: 'closed' | 'invalid' };

export interface RsvpService {
  /** 최신순 */
  list(invitationId: string): Promise<RsvpResponse[]>;
  get(invitationId: string, id: string): Promise<RsvpResponse | null>;
  /** 하객 제출. id 가 있고 그 행이 있으면 고친다. 마감·검사는 여기서 막는다 */
  submit(args: {
    invitationId: string;
    themeId: string;
    deadline: string;
    input: RsvpInput;
    id?: string;
  }): Promise<RsvpSubmitResult>;
  /** 만든 사람: 명단에 직접 넣기 (마감과 상관없음) */
  addManual(invitationId: string, themeId: string, input: RsvpInput): Promise<RsvpResponse>;
  /** 만든 사람: 고치기 (source 는 그대로) */
  update(invitationId: string, themeId: string, id: string, input: RsvpInput): Promise<RsvpResponse>;
  remove(invitationId: string, id: string): Promise<void>;
}

// ── 알림 ─────────────────────────────────────────────

export interface AppNotification {
  id: string;
  /** null = 모든 사용자(공지) */
  userId: string | null;
  category: 'notice' | 'purchase' | 'rsvp';
  title: string;
  body: string;
  /** [바로가기] 이동 경로 */
  link: string;
  createdAt: string;
}

export interface NotificationService {
  /** 보관 기간(15일) 안의 내 알림 + 공지, 최신순 */
  list(userId: string, now?: Date): Promise<AppNotification[]>;
  add(n: Omit<AppNotification, 'id'>): Promise<void>;
  unreadCount(userId: string, now?: Date): Promise<number>;
  markAllRead(userId: string, at: string): Promise<void>;
}
