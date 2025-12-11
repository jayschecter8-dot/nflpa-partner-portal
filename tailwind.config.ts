import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#C9243F',
          50: '#fef2f4',
          100: '#fce4e8',
          200: '#fbccd5',
          300: '#f7a3b4',
          400: '#f26e8a',
          500: '#e84465',
          600: '#C9243F',
          700: '#b01e38',
          800: '#931c34',
          900: '#7c1b32',
        },
        navy: {
          DEFAULT: '#0a1628',
          50: '#e8f1ff',
          100: '#d5e4ff',
          200: '#b3ccff',
          300: '#85a8ff',
          400: '#5675ff',
          500: '#2e42ff',
          600: '#1a1fff',
          700: '#1212f0',
          800: '#1414c1',
          900: '#0a1628',
        },
      },
    },
  },
  plugins: [],
};

export default config;
