import type { Config } from "tailwindcss";

// 디자인 토큰 — "회의 노트" 방향: 종이색 중성 램프 + 볼펜 파랑 강조 + 결정에 형광펜 표시
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1F1B16", soft: "#5E554A" },
        line: "#E7E1D6",
        surface: { DEFAULT: "#FFFFFF", alt: "#F7F4EE" },
        accent: { DEFAULT: "#4C6EF5", strong: "#2F4AC0", deep: "#233A99", soft: "#E9EDFB" },
        warn: { DEFAULT: "#B3402F", soft: "#FBECE8" },
        marker: "#FFE27A",
      },
      borderRadius: {
        sm: "10px",
        md: "14px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(31,27,22,.06)",
      },
      backgroundImage: {
        // 형광펜 밑줄: 글자 아래쪽 절반에만 칠하는 표시 (색이 바뀌는 그라데이션이 아님)
        marker: "linear-gradient(transparent 58%, #FFE27A 58%, #FFE27A 92%, transparent 92%)",
      },
      fontFamily: {
        // 제목·본문 모두 Wanted Sans로 통일 (font-display / font-body 이름은 그대로 유지)
        display: ["'Wanted Sans Variable'", "'Apple SD Gothic Neo'", "'Malgun Gothic'", "system-ui", "sans-serif"],
        body: ["'Wanted Sans Variable'", "'Apple SD Gothic Neo'", "'Malgun Gothic'", "system-ui", "sans-serif"],
      },
      maxWidth: { page: "1120px" },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fadeUp .5s ease both",
        "fade-in": "fadeUp .35s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
