import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        editorial: [
          "var(--font-editorial)",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
        label: ["var(--font-label)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    }
  },
  plugins: []
} satisfies Config;

