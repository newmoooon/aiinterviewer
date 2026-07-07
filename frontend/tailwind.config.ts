import type { Config } from "tailwindcss";

// Dark-first token set (validated dataviz reference palette).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#0d0d0d",
        surface: "#1a1a19",
        raised: "#232322",
        ink: "#ffffff",
        sub: "#c3c2b7",
        muted: "#898781",
        line: "#2c2c2a",
        hairline: "rgba(255,255,255,0.10)",
        accent: "#3987e5",
        accentDeep: "#1c5cab",
        aqua: "#199e70",
        good: "#0ca30c",
        warn: "#fab219",
        serious: "#ec835a",
        critical: "#d03b3b",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
