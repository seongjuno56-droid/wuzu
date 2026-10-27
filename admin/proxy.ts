import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from './lib/session';

/**
 * /login 외 모든 화면에서 세션 쿠키 서명만 빠르게 확인한다.
 * 운영자가 아직 활성인지, 비밀번호를 바꿔야 하는지 같은 DB 확인은 requireAdmin 이 한다.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname !== '/login') {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySession(token) : null;
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Next 내부 정적 파일·이미지 최적화·파비콘·브랜드 이미지는 건너뛴다
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/).*)'],
};
