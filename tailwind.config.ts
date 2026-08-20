import type { Config } from "tailwindcss";

/**
 * Design direction: graphite + emerald.
 *
 * Dark, precise, quiet. The emerald accent is reserved for verification and
 * for the primary action — the moments where the product either proves
 * something or asks you to commit. Spending it on decoration is what would
 * make it stop meaning anything.
 *
 * THE ACCENT IS A TWO-STOP RAMP, and the reason matters. A single "deep
 * emerald" cannot do both jobs on a dark base, because an accent used as TEXT
 * must be lighter than what it sits on, while an accent used as a FILL must
 * be dark enough for light text to sit on IT. #1F4D3E is darker than the
 * graphite base — as text it measures 1.90:1, effectively invisible — but as
 * a filled stamp under off-white it measures 8.36:1. So it keeps the fill job
 * and a lifted jade of the same hue (160°) takes the text job.
 *
 * Every ratio below is measured, not assumed:
 *
 *   ink    #F2EFE9 on #14151A → 15.9:1   body text
 *   soft   #98A0AD on #14151A →  7.0:1   secondary text
 *   jade   #46A88A on #14151A →  6.3:1   accent text, icons, rules
 *   paper  #14151A on #46A88A →  6.3:1   graphite label on a jade button
 *   ink    #F2EFE9 on #1F4D3E →  8.4:1   off-white on the verified stamp
 *   jade   #46A88A on #16241F →  5.5:1   accent text on a tinted chip
 *   flag   #E5484D on #14151A →  4.7:1   warnings
 *
 * The brief specified steel #6B7280 for secondary text, but on this base it
 * lands at 3.8:1 — under the 4.5:1 floor for body copy. It's kept for borders
 * and dividers, where no contrast minimum applies, and secondary TEXT uses a
 * lifted steel that holds the same cool cast while staying readable.
 *
 * Note on red/green: warnings are red and verification is green, which is the
 * classic confusable pair. Nothing here relies on hue alone — every state
 * carries a distinct icon and an explicit label, so the colour is
 * reinforcement rather than the signal itself.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Base graphite, and the raised plane that cards sit on. Two steps
        // only — more surface levels read as clutter at this scale.
        paper: "#14151A",
        surface: "#1B1D23",
        raised: "#22252C",

        ink: {
          DEFAULT: "#F2EFE9", // warm off-white; pure white would go clinical
          soft: "#98A0AD",
        },

        // Emerald, in two stops. See the note above on why one value can't
        // serve both text and fill against a dark base.
        accent: {
          DEFAULT: "#46A88A", // jade — text, icons, rules, primary button fill
          deep: "#1F4D3E", // the verified stamp; carries off-white text
          soft: "#16241F", // barely-there tint behind accented chips
          bright: "#5BBF9D", // hover only
        },

        flag: "#E5484D", // problems; kept clearly red so it reads as a
        // different category from the emerald, not a variant of it

        // The exported resume is ink on paper and always will be. This is
        // the swatch that represents it inside the dark UI — template
        // thumbnails must look like the document, not like the app.
        document: "#EFEBE3",

        line: "#282C34", // structural hairlines
        // BORDERS AND DIVIDERS ONLY. At 3.8:1 on the graphite base this
        // fails the small-text floor — if you want muted TEXT, reach for
        // ink-soft (6.9:1), which holds the same cool cast.
        steel: "#6B7280",
      },
      fontFamily: {
        // Editorial serif for the human craft; see app/layout.tsx for why
        // this family and why only one weight of it.
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Reserved for verified data — machine-checked facts should look
        // machine-checked.
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "6px",
        lg: "10px",
      },
      // Optical corrections for a high-contrast display serif: it sets loose
      // by default, and at large sizes needs pulling in to feel composed.
      letterSpacing: {
        display: "-0.02em",
        eyebrow: "0.22em",
      },
      keyframes: {
        "rise-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "draw-underline": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "draw-down": {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        // The rewrite itself. Each word arrives out of focus and settles —
        // blur is what separates "text being written" from "text fading in",
        // and it is the whole difference between this reading as a document
        // transformation and reading as a slideshow.
        "word-in": {
          from: {
            opacity: "0",
            filter: "blur(5px)",
            transform: "translateY(4px)",
          },
          to: { opacity: "1", filter: "blur(0)", transform: "translateY(0)" },
        },
        // Borrowed language turning accent, one phrase at a time. Colour is
        // animated rather than transitioned so it can share the staged
        // delay schedule with everything else in the sequence.
        "mark-posting": {
          from: { color: "#F2EFE9" },
          to: { color: "#46A88A" },
        },
        "chain-in": {
          from: { opacity: "0", transform: "translateY(-5px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Sweeps a conic arc around a border. Aceternity's original steps a
        // radial gradient between four fixed edges; a continuous rotation
        // reads smoother and needs no JS timer to drive it.
        "border-sweep": {
          to: { transform: "rotate(360deg)" },
        },
        "lift-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "accent-pulse": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
        // Long, lazy travel. Anything faster stops reading as depth and
        // starts reading as something moving on the page.
        "drift-slow": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(6vw, 4vh, 0) scale(1.12)" },
        },
        "drift-slower": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1.08)" },
          "50%": { transform: "translate3d(-5vw, -5vh, 0) scale(1)" },
        },
      },
      animation: {
        "rise-in": "rise-in 0.5s cubic-bezier(0.2, 0.7, 0.3, 1) both",
        "draw-underline":
          "draw-underline 0.45s cubic-bezier(0.2, 0.7, 0.3, 1) both",
        "draw-down": "draw-down 0.55s cubic-bezier(0.2, 0.7, 0.3, 1) both",
        "word-in": "word-in 0.42s cubic-bezier(0.2, 0.7, 0.3, 1) both",
        "mark-posting": "mark-posting 0.5s ease-out both",
        "chain-in": "chain-in 0.4s cubic-bezier(0.2, 0.7, 0.3, 1) both",
        "accent-pulse": "accent-pulse 2.4s ease-in-out infinite",
        "drift-slow": "drift-slow 54s ease-in-out infinite",
        "drift-slower": "drift-slower 71s ease-in-out infinite",
        "border-sweep": "border-sweep var(--sweep-duration,2.5s) linear infinite",
        "lift-in": "lift-in 0.32s cubic-bezier(0.2,0.7,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
