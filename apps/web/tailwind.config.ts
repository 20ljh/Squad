import type { Config } from "tailwindcss";

// Squad Soft UI 디자인 토큰 — Design 캔버스 목업의 :root 값과 1:1로 맞춘 것
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#372F52", soft: "#726A94" },
        line: "#ECE3FA",
        surface: { DEFAULT: "#FFFFFF", alt: "#F4EFFC" },
        accent: { DEFAULT: "#8B7CF6", strong: "#6C55E6", deep: "#5A45D6", soft: "#EFE9FE" },
        warn: { DEFAULT: "#B23F66", soft: "#FCE9F0" },
      },
      borderRadius: {
        sm: "16px",
        md: "20px",
        lg: "22px",
        xl: "28px",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(120,100,190,.08), 0 20px 44px rgba(120,100,190,.16)",
        glow: "0 10px 26px rgba(108,85,230,.35)",
        "glow-lg": "0 14px 32px rgba(108,85,230,.42)",
        panel: "0 24px 60px rgba(108,85,230,.28)",
      },
      backgroundImage: {
        page: "linear-gradient(160deg, #F7F2FD 0%, #FCF0F6 45%, #F1F6FD 100%)",
        panel: "linear-gradient(135deg, #9C8CF7 0%, #6FA6F2 100%)",
        cta: "linear-gradient(135deg, #6C55E6 0%, #5A45D6 100%)",
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
