/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 배포 이미지는 실행에 필요한 파일만 담은 standalone 출력으로 (apps/web/Dockerfile)
  output: "standalone",
  // 예전 예시 주소를 프로젝트 주소 구조로 넘겨줌 (북마크·문서 링크 대비, 영구 이동은 아님)
  async redirects() {
    return [
      { source: "/dashboard", destination: "/p/sample", permanent: false },
      { source: "/meetings/sample", destination: "/p/sample/meetings/m3", permanent: false },
      // 받아쓰기·요약 시험 결과는 DB로 옮기면서 시험 프로젝트(rec-test)로 분리
      { source: "/p/sample/meetings/stt-test", destination: "/p/rec-test/meetings/stt-test", permanent: false },
    ];
  },
};

export default nextConfig;
