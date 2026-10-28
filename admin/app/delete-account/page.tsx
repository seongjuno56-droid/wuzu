import type { CSSProperties, ReactNode } from 'react';
import RequestForm from './RequestForm';

/**
 * 계정 삭제 안내·요청 화면. 로그인 없이 열린다(proxy.ts 의 PUBLIC_PATHS).
 * 구글 플레이 '계정 삭제' 요구 사항: 앱을 지운 사람도 웹에서 삭제를 요청할 수 있어야 한다.
 * 위는 한국어, 아래는 영어. 요청 폼은 두 언어를 함께 적은 하나만 둔다.
 */
export const metadata = {
  title: '계정 삭제 요청 · wuzu',
  description: 'wuzu 계정과 데이터 삭제를 요청하는 방법 / How to request deletion of your wuzu account and data',
};

const h2: CSSProperties = { margin: '28px 0 10px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' };
const p: CSSProperties = { margin: '0 0 10px', fontSize: 16, lineHeight: 1.7 };
const ul: CSSProperties = { margin: '0 0 10px', paddingLeft: 20, fontSize: 16, lineHeight: 1.7 };

function Path({ children }: { children: ReactNode }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, background: '#EEF3F0', color: 'var(--brand)', fontWeight: 700 }}>
      {children}
    </span>
  );
}

export default function DeleteAccountPage() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px 64px', overflowWrap: 'anywhere' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <img src="/brand/mark.png" alt="" width={32} height={32} style={{ borderRadius: 8 }} />
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand)' }}>wuzu</span>
      </div>

      <section lang="ko">
        <h1 style={{ margin: '0 0 12px', fontSize: 24, lineHeight: 1.35 }}>계정 삭제 요청</h1>
        <p style={p}>wuzu 계정과 데이터를 지우는 방법을 안내해 드려요.</p>

        <h2 style={h2}>앱에서 바로 탈퇴하기</h2>
        <p style={p}>
          앱을 쓰고 있다면 <Path>마이페이지 → 회원정보 → 수정하기 → 회원탈퇴</Path> 에서 안내를 확인하고 <b>탈퇴하기</b>를 누르면 바로 탈퇴할 수 있어요.
        </p>

        <h2 style={h2}>지워지는 것과 남는 것</h2>
        <p style={p}>탈퇴하면 30일 동안 유예 기간을 두고, 그 사이에는 앱에서 탈퇴를 취소할 수 있어요. 30일이 지나면 아래 정보를 지워요.</p>
        <ul style={ul}>
          <li>이름, 이메일 같은 회원 정보</li>
          <li>만든 초대장과 올린 사진</li>
          <li>초대장에 남겨진 방명록</li>
        </ul>
        <p style={p}>
          결제와 레터 사용 기록은 전자상거래법에 따라 5년 동안 보관해요. 이때 누구의 기록인지 알 수 있는 회원 정보는 지워요.
        </p>

        <h2 style={h2}>앱 없이 요청하기</h2>
        <p style={p}>
          앱을 지웠거나 로그인할 수 없다면 아래 폼으로 요청해 주세요. 7일 안에 처리하고 적어 주신 이메일로 알려 드려요.
        </p>
      </section>

      <section lang="en" style={{ marginTop: 32, paddingTop: 8, borderTop: '1px solid var(--divider)' }}>
        <h2 style={{ ...h2, fontSize: 20 }}>Request account deletion</h2>
        <p style={p}>This page explains how to delete your wuzu account and data.</p>

        <h2 style={h2}>Delete your account in the app</h2>
        <p style={p}>
          In the app, go to <Path>My page → Member info → Edit → Delete account</Path> (마이페이지 → 회원정보 → 수정하기 → 회원탈퇴), confirm the notice, and tap <b>탈퇴하기</b> (Delete).
        </p>

        <h2 style={h2}>What is deleted and what is kept</h2>
        <p style={p}>
          After you delete your account there is a 30-day grace period. During this period you can cancel the deletion in the app. After 30 days we delete:
        </p>
        <ul style={ul}>
          <li>Your profile information, such as your name and email</li>
          <li>Invitations you created and photos you uploaded</li>
          <li>Guestbook messages left on your invitations</li>
        </ul>
        <p style={p}>
          Payment and letter (in-app credit) records are kept for 5 years as required by Korean e-commerce law. Information that identifies you is removed from these records.
        </p>

        <h2 style={h2}>Request without the app</h2>
        <p style={p}>
          If you have removed the app or cannot sign in, send a request with the form below. We will process it within 7 days and reply to the email you provide.
        </p>
      </section>

      <section style={{ marginTop: 28, padding: '20px 16px', border: '1px solid var(--divider)', borderRadius: 12 }}>
        <h2 style={{ ...h2, marginTop: 0 }}>삭제 요청 폼 · Request form</h2>
        <RequestForm />
      </section>
    </main>
  );
}
