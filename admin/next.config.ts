import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// 저장소 루트에도 package-lock.json 이 있어 Next 가 루트를 잘못 짐작한다. admin 폴더로 고정한다
const adminRoot = fileURLToPath(new URL('.', import.meta.url));

/** 모든 경로에 붙이는 보안 헤더: 다른 사이트의 iframe 에 넣지 못하게, 검색에 잡히지 않게 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  { key: 'Referrer-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  // PGlite 는 wasm 파일을 함께 읽으므로 번들에 넣지 않고 node_modules 에서 그대로 불러온다
  serverExternalPackages: ['@electric-sql/pglite'],
  outputFileTracingRoot: adminRoot,
  turbopack: { root: adminRoot },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
