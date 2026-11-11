/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 예전 예시 주소를 프로젝트 주소 구조로 넘겨줌 (북마크·문서 링크 대비, 영구 이동은 아님)
  async redirects() {
    return [
      { source: "/dashboard", destination: "/p/sample", permanent: false },
      { source: "/meetings/sample", destination: "/p/sample/meetings/m3", permanent: false },
    ];
  },
};

export default nextConfig;
