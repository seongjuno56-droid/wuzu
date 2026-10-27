import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite 는 wasm 파일을 함께 읽으므로 번들에 넣지 않고 node_modules 에서 그대로 불러온다
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default nextConfig;
