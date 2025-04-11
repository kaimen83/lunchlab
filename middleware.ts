import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 공개 액세스가 허용된 경로 목록 정의
const publicRoutes = [
  '/',                      // 홈페이지
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

// 공개 경로 패턴 생성
const isPublicRoute = createRouteMatcher(publicRoutes);

export default clerkMiddleware(async (auth, request) => {
  // 사용자 인증 체크 및 공개 경로 관리
  if (!isPublicRoute(request)) {
    // 공개 경로가 아닌 경우만 인증 검사
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