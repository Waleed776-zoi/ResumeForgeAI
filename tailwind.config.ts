import type { Config } from "tailwindcss";

// Design direction: this is a document-editing tool, not a marketing page.
// Lean into "paper and ink" — a quiet, legible workspace that gets out of
// the way of the resume itself, with a single confident accent for actions.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F6F2", // warm off-white background, not cream/terracotta
        ink: {
          DEFAULT: "#1C2430", // near-black navy for body text
          soft: "#4A5568",
        },
        accent: {
          DEFAULT: "#2F5D50", // deep forest green — trust + "verified", not another orange/violet default
          soft: "#DCE8E4",
        },
        flag: "#B4552F", // used ONLY for integrity warnings — a signal color, not a decoration
        line: "#DDD9CF",
      },
      fontFamily: {
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
