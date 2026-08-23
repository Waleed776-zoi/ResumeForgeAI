import type { Config } from "tailwindcss";

/**
 * Design direction: graphite + emerald.
 *
 * Dark, precise, quiet. The base got a step darker and cooler in this pass,
 * which buys contrast everywhere at no cost — and the accent got brighter,
 * which is what lets there be LESS of it.
 *
 * THE ACCENT IS SEMANTIC, NOT DECORATIVE. Emerald means exactly four things
 * in this product: changed, matched, trusted, confirmed. It is spent on the
 * verified stamp, the primary action, matched skills, passing checks, and the
 * phrases a rewrite borrowed. It is NOT spent on background light, on
 * particles, or on making a link look lively — those were all green once and
 * are neutral now, because an accent that appears everywhere stops meaning
 * anything and starts being a brand colour.
 *
 * THE ACCENT IS A TWO-STOP RAMP, and the reason matters. A single deep
 * emerald cannot do both jobs on a dark base, because an accent used as TEXT
 * must be lighter than what it sits on, while an accent used as a FILL must
 * be dark enough for light text to sit on IT. #1E4B40 is darker than the
 * graphite base — as text it is effectively invisible — but as a filled stamp
 * under off-white it measures 8.49:1. So it keeps the fill job and a lifted
 * jade of the same hue takes the text job.
 *
 * Every ratio below is measured, not assumed:
 *
 *   ink    #F1EEE8 on #0D0F12 → 16.57:1   body text          (was 15.89)
 *   soft   #9AA2AD on #0D0F12 →  7.44:1   secondary text     (was  6.92)
 *   jade   #42B997 on #0D0F12 →  7.88:1   accent text, icons (was  6.28)
 *   jade   #42B997 on #12161A →  7.46:1   accent on a panel
 *   paper  #0D0F12 on #42B997 →  7.88:1   graphite on a jade button
 *   ink    #F1EEE8 on #1E4B40 →  8.49:1   off-white on the verified stamp
 *   jade   #42B997 on #152720 →  6.42:1   accent text on a tinted chip
 *   flag   #E5484D on #0D0F12 →  4.90:1   warnings           (was  4.70)
 *
 * TWO BORDER TOKENS, because WCAG treats them differently. `line` is a
 * decorative hairline — panel edges, dividers, rules — and has no contrast
 * minimum. `steel` is for the boundary of a CONTROL, where 1.4.11 wants 3:1
 * because the border is the only thing telling you where the input is; it
 * measures 3.97:1 on the base. Reaching for `line` on a text field is the
 * mistake this split exists to prevent.
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
        // Base graphite, and the two raised planes that sit on it. Three
        // steps only — more surface levels read as clutter at this scale.
        paper: "#0D0F12",
        surface: "#12161A",
        raised: "#161B20",

        ink: {
          DEFAULT: "#F1EEE8", // warm off-white; pure white would go clinical
          soft: "#9AA2AD",
        },

        // Emerald, in two stops. See the note above on why one value can't
        // serve both text and fill against a dark base.
        accent: {
          DEFAULT: "#42B997", // jade — text, icons, rules, primary button fill
          deep: "#1E4B40", // the verified stamp; carries off-white text
          soft: "#152720", // barely-there tint behind accented chips
          bright: "#5BC9A8", // hover only
        },

        flag: "#E5484D", // problems; kept clearly red so it reads as a
        // different category from the emerald, not a variant of it

        // The exported resume is ink on paper and always will be. This is
        // the swatch that represents it inside the dark UI — template
        // thumbnails must look like the document, not like the app.
        document: "#EFEBE3",

        // DECORATIVE hairlines: panel edges, dividers, rules. No contrast
        // minimum applies, and none is met — 1.32:1 on the base.
        line: "#242A30",
        // CONTROL boundaries: text fields, textareas, the upload dropzone.
        // 3.97:1 on the base, which clears WCAG 1.4.11's 3:1 floor for a
        // border that is the only thing delimiting an interactive element.
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
          from: { color: "#F1EEE8" },
          to: { color: "#42B997" },
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
