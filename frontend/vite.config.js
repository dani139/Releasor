import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for Electron
  server: {
    port: 5175,
    strictPort: true,
    host: '0.0.0.0' // Expose to all network interfaces
  }
})
