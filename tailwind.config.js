/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./app/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#002045",
        secondary: "#3B82C4",
        tertiary: "#60A5D8",
        neutral: "#E5E7EB",
        background: "#f6faff",
        surface: "#f6faff",
        "surface-container": "#e8eff7",
        "surface-soft": "#edf4fc",
    
        "surface-muted": "#e8eff7",
        text: "#151c22",
        "text-secondary": "#43474e",

        outline: "#c4c6cf",
      },
      fontFamily: {
        body: ["var(--font-body)"],
        headline: ["var(--font-headline)"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "20px",
      },
    },
  },
  plugins: [],
};