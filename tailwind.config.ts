import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'
import containerQueries from '@tailwindcss/container-queries'

export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#2f7f33",
        "background-light": "#f6f8f6",
        "background-dark": "#141e15",
        "surface-variant": "#e1e5df",
        "alert-yellow": "#fef9c3",
        "alert-border": "#fde047"
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "lg": "1rem",
        "xl": "1.5rem"
      },
    },
  },
  plugins: [
    forms,
    containerQueries,
  ],
} satisfies Config
