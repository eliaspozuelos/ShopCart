import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// El proxy deja la cookie HttpOnly de sesión en el mismo origen del navegador.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
