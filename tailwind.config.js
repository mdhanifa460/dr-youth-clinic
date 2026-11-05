/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./app/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0B2560",
        "primary-hover": "#143274",
        // Was #3B82C4 — real Lighthouse/axe finding: 4.06:1 contrast on
        // white, which fails WCAG AA for normal-size text (needs 4.5:1) —
        // confirmed live via a full accessibility audit, this exact color
        // used as text (not as the button/badge backgrounds it also
        // appears in, which weren't touched) failed on every page audited.
        // #2A6BA8 keeps the same hue, just darkened enough for a
        // comfortable 5.57:1 — same fix applied to every raw text-[#3B82C4]
        // utility class across the codebase for visual consistency (see
        // that commit). tertiary below is unaffected — it's used as a
        // background/decorative tint, a different contrast pairing.
        secondary: "#2A6BA8",
        tertiary: "#60A5D8",
        neutral: "#E5E7EB",
        background: "#FBF9F5",
        surface: "#FBF9F5",
        canvas: "#FBF9F5",
        sand: "#F3EFE7",
        line: "#E7E1D6",
        "line-strong": "#CFC7B8",
        // Bronze is for text on light surfaces, champagne for dark ones.
        bronze: "#8A5A1F",
        champagne: "#E3C48D",
        "champagne-hover": "#EBD3A6",
        "surface-container": "#F3EFE7",
        "surface-soft": "#F3EFE7",
    
        "surface-muted": "#F3EFE7",
        text: "#151c22",
        "text-secondary": "#43474e",

        outline: "#CFC7B8",
      },
      fontFamily: {
        body: ["var(--font-body)"],
        headline: ["var(--font-headline)"],
      },
      borderRadius: {
        xl: "10px",
        "2xl": "14px",
        "3xl": "18px",
      },
    },
  },
  plugins: [],
};