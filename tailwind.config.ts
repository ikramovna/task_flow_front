import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter Tight', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        task: {
          blue: '#2567AD',
          blueDark: '#19528F',
          blueSoft: '#EAF2FC',
          ink: '#111827',
          muted: '#667085',
          line: '#E6EAF0',
          page: '#F3F7FB',
          card: '#FFFFFF',
          success: '#1FBF86',
          successSoft: '#E7F8F0',
          warning: '#F5A524',
          warningSoft: '#FFF4DC',
          danger: '#F04466',
          dangerSoft: '#FDEBED',
          lavender: '#F0EFFB',
          mint: '#EDF8EB',
          rose: '#FAECEF'
        }
      },
      boxShadow: {
        card: '0 12px 30px -24px rgba(15, 23, 42, 0.45)',
        button: '0 14px 22px -14px rgba(37, 103, 173, 0.75)'
      },
      borderRadius: {
        ui: '16px'
      }
    }
  },
  plugins: []
} satisfies Config
