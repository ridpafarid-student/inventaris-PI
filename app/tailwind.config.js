/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /* ═══════════════════════════════════════════════════════ */
      /* VERCEL DESIGN TOKENS - Tailwind Integration            */
      /* ═══════════════════════════════════════════════════════ */
      
      fontFamily: {
        sans: ['var(--font-family-primary)'],
        primary: ['var(--font-family-primary)'],
      },
      
      fontSize: {
        xs: ['var(--font-size-xs)', { lineHeight: 'var(--font-line-height-base)' }],
        sm: ['var(--font-size-sm)', { lineHeight: 'var(--font-line-height-base)' }],
        base: ['var(--font-size-base)', { lineHeight: 'var(--font-line-height-base)' }],
        md: ['var(--font-size-md)', { lineHeight: 'var(--font-line-height-base)' }],
      },
      
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '7': 'var(--space-7)',
        '8': 'var(--space-8)',
      },
      
            colors: {
        /* Vercel semantic tokens */
        'surface-base': 'hsl(var(--color-surface-base))',
        'surface-muted': 'hsl(var(--color-surface-muted))',
        'text-primary': 'hsl(var(--color-text-primary))',
        'text-secondary': 'hsl(var(--color-text-secondary))',
        'text-inverse': 'hsl(var(--color-text-inverse))',
        'border-default': 'hsl(var(--color-border-default))',
        'border-muted': 'hsl(var(--color-border-muted))',
        
        /* Status tokens (project extension) */
        'status-warning': 'hsl(var(--color-status-warning))',
        'status-danger': 'hsl(var(--color-status-danger))',
        'status-success': 'hsl(var(--color-status-success))',
        'status-info': 'hsl(var(--color-status-info))',
        
        /* Legacy compatibility */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      
      borderRadius: {
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'pill': 'var(--radius-lg)',
        'full': 'var(--radius-lg)',
      },
      
      boxShadow: {
        '1': 'var(--shadow-1)',
        '2': 'var(--shadow-2)',
        '3': 'var(--shadow-3)',
        'card': 'var(--shadow-1)',
        'focus': 'var(--shadow-2)',
        'elevated': 'var(--shadow-3)',
      },
      
      transitionDuration: {
        'instant': 'var(--motion-duration-instant)',
        'fast': 'var(--motion-duration-fast)',
      },
      
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      
      animation: {
        "accordion-down": "accordion-down var(--motion-duration-fast) ease-out",
        "accordion-up": "accordion-up var(--motion-duration-fast) ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}