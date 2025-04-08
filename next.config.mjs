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
  swcMinify: true,
  reactStrictMode: true,
  poweredByHeader: false
};

export default nextConfig; 