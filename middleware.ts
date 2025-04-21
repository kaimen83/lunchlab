import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// 공개 액세스가 허용된 경로 목록 정의
const publicRoutes = [
  '/sign-in(.*)',           // 로그인 관련 모든 경로 (SSO 콜백 포함)
  '/sign-up(.*)',           // 회원가입 관련 모든 경로
  '/api(.*)',               // API 경로
  '/sso-callback(.*)',      // SSO 콜백 경로
  '/_next/static/(.*)',     // Next.js 정적 자산
  '/_next/image(.*)',       // Next.js 이미지 최적화
  '/favicon.ico',           // 파비콘
  '/robots.txt',            // robots.txt
  '/sitemap.xml',           // sitemap.xml
];

// 루트 경로 매치 패턴
const isRootPath = (req: Request) => {
  const url = new URL(req.url);
  return url.pathname === '/';
};

// 공개 경로 패턴 생성
const isPublicRoute = createRouteMatcher(publicRoutes);

export default clerkMiddleware(async (auth, request) => {
  // 루트 경로 처리 - 인증 상태에 따라 즉시 리다이렉트
  if (isRootPath(request)) {
    try {
      // 인증 상태 확인 - auth.protect()는 인증되지 않으면 예외를 던짐
      await auth.protect();
      
      // 인증된 경우 /companies로 리다이렉트
      const companiesUrl = new URL('/companies', request.url);
      return NextResponse.redirect(companiesUrl);
    } catch (error) {
      // 인증되지 않은 경우 /sign-in으로 리다이렉트
      const signInUrl = new URL('/sign-in', request.url);
      return NextResponse.redirect(signInUrl);
    }
  }
  
  // 공개 경로가 아니면 인증 검사
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // 클라이언트 측 경로 검사
    '/((?!.*\\..*|_next).*)',
    // API 경로 검사
    '/(api|trpc)(.*)',
  ],
}; 