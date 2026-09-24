import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app from /society-poker/ (the repo name)
  base: '/society-poker/',
  plugins: [react()],
})
