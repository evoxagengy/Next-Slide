import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#070B12",
        surface: "#0E1624",
        card: "#111827",
        border: "#1F2937",
        primary: "#2563EB",
        cyan: "#06B6D4",
        success: "#22C55E",
        warning: "#FACC15",
        danger: "#EF4444",
        text: "#F8FAFC",
        muted: "#94A3B8"
      },
      boxShadow: {
        glow: "0 0 60px rgba(37,99,235,0.18)",
        card: "0 24px 80px rgba(0,0,0,0.32)"
      },
      backgroundImage: {
        "radial-blue": "radial-gradient(circle at top left, rgba(37,99,235,0.26), transparent 36%), radial-gradient(circle at top right, rgba(6,182,212,0.18), transparent 34%)"
      }
    }
  },
  plugins: []
};

export default config;
