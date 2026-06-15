/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#010102',
        surface: {
          1: '#0f1011',
          2: '#1c1d1f',
          3: '#232428',
          4: '#2a2b2e',
        },
        hairline: {
          DEFAULT: '#23252a',
          strong: '#2e3036',
          tertiary: '#1a1c1f',
        },
        ink: {
          DEFAULT: '#f7f8f8',
          muted: '#d0d6e0',
          subtle: '#8a8f98',
          tertiary: '#62666d',
        },
        primary: {
          DEFAULT: '#5e6ad2',
          hover: '#828fff',
          focus: '#5e69d1',
        },
        success: '#27a644',
        stage: {
          wishlist: '#8892a4',
          applied: '#4f9cf9',
          interviewing: '#f59e0b',
          offer: '#34d399',
          rejected: '#f87171',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        'display-xl': '-0.0375em',
        'display-lg': '-0.032em',
        'display-md': '-0.025em',
        headline: '-0.021em',
        'card-title': '-0.018em',
        subhead: '-0.01em',
        body: '-0.003em',
        eyebrow: '0.03em',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        xxl: '24px',
      },
      fontSize: {
        'display-xl': ['80px', { lineHeight: '1.05', letterSpacing: '-0.0375em', fontWeight: '600' }],
        'display-lg': ['56px', { lineHeight: '1.10', letterSpacing: '-0.032em', fontWeight: '600' }],
        'display-md': ['40px', { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '600' }],
        headline: ['28px', { lineHeight: '1.20', letterSpacing: '-0.021em', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};
