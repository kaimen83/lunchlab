/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  /* config options here */
  images: {
    domains: ["img.clerk.com"],
  },
  eslint: {
    ignoreDuringBuilds: true, // 빌드 시 ESLint 검사를 무시합니다
  },
  typescript: {
    ignoreBuildErrors: true, // 빌드 시 TypeScript 에러를 무시합니다
  },
  // 최신 Next.js에서는 swcMinify가 기본값이므로 명시적으로 지정할 필요가 없음
  reactStrictMode: true,
  poweredByHeader: false,
  // 실험적인 App Router 최적화 - 성능 향상을 위해 추가
  experimental: {
    optimizePackageImports: ['lucide-react'],
  }
};

export default nextConfig; 