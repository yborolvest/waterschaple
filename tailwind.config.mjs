/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        royal: {
          950: '#154273',
          900: '#1a4f85',
          800: '#1e5a96',
          700: '#1D4ED8',
          600: '#2563EB',
        },
        orange: {
          accent: '#F97316',
          light: '#FDBA74',
          400: '#FB923C',
        },
        teal: {
          accent: '#14B8A6',
          light: '#5EEAD4',
          400: '#2DD4BF',
        },
        highway: {
          accent: '#EAB308',
          light: '#FDE047',
          400: '#FACC15',
        },
        rail: {
          accent: '#E11D48',
          light: '#FDA4AF',
          400: '#F43F5E',
        },
        transfer: {
          accent: '#8B5CF6',
          light: '#C4B5FD',
          400: '#A78BFA',
        },
      },
      fontFamily: {
        display: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.35s ease-out forwards',
        'hub-fade-up': 'hubFadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'hub-float': 'hubFloat 4s ease-in-out infinite',
        'hub-pulse-soft': 'hubPulseSoft 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        hubFadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        hubFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        hubPulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
      },
      boxShadow: {
        'hub-orange': '0 12px 40px -8px rgba(249, 115, 22, 0.35)',
        'hub-teal': '0 12px 40px -8px rgba(20, 184, 166, 0.35)',
        'hub-highway': '0 12px 40px -8px rgba(234, 179, 8, 0.35)',
        'hub-rail': '0 12px 40px -8px rgba(225, 29, 72, 0.35)',
        'hub-transfer': '0 12px 40px -8px rgba(139, 92, 246, 0.35)',
      },
    },
  },
  plugins: [],
};
