import type { Config } from "tailwindcss";

/**
 * Nucleus — Tailwind CSS v4 config
 *
 * Tailwind v4 moves theme customisation to CSS (@theme in globals.css).
 * This file handles:
 *  - content paths for class detection
 *  - darkMode strategy (class-based, matching our CSS .dark tokens)
 *
 * Extended colour/radius/spacing tokens are defined in globals.css @theme
 * and are automatically available as Tailwind utilities (e.g. bg-accent,
 * text-text-primary, rounded-radius-lg, etc.)
 */
const config: Config = {
  darkMode: "class",

  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      /**
       * Colors — all mapped to the CSS custom properties defined in globals.css.
       * This gives full Tailwind intellisense (bg-bg, text-accent, etc.)
       * alongside the @theme tokens.
       */
      colors: {
        bg:      "var(--color-bg)",
        surface: "var(--color-surface)",
        card:    "var(--color-card)",
        border:  "var(--color-border)",

        accent: {
          DEFAULT: "var(--color-accent)",
          hover:   "var(--color-accent-hover)",
        },

        text: {
          primary:   "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary:  "var(--color-text-tertiary)",
        },

        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger:  "var(--color-danger)",
      },

      /**
       * Font family — Inter first, then system-font stack.
       */
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
          '"Apple Color Emoji"',
        ],
        mono: [
          "ui-monospace",
          '"SF Mono"',
          '"Fira Code"',
          '"Fira Mono"',
          '"Roboto Mono"',
          "monospace",
        ],
      },

      /**
       * Border radius — 8px grid aligned.
       */
      borderRadius: {
        sm: "8px",
        md: "10px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        full: "9999px",
      },

      /**
       * Box shadows — token-mapped so Tailwind utilities work (shadow-sm, etc.)
       */
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },

      /**
       * Spacing — keeps Tailwind's default 4px-based scale intact.
       * Named grid tokens added for explicit 8px-grid usage.
       */
      spacing: {
        "grid-1": "8px",
        "grid-2": "16px",
        "grid-3": "24px",
        "grid-4": "32px",
        "grid-5": "40px",
        "grid-6": "48px",
        "grid-8": "64px",
      },
    },
  },

  plugins: [],
};

export default config;
