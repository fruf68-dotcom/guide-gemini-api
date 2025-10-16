import { defineConfig } from 'vite'

export default defineConfig({
  theme: {
    extend: {
      colors: {
        'brand-bg': '#121212',
        'brand-surface': '#1e1e1e',
        'brand-primary': '#8A2BE2',
        'brand-secondary': '#4A90E2',
        'brand-text-primary': '#E0E0E0',
        'brand-text-secondary': '#B0B0B0',
      },
    },
  },
})
