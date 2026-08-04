import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Necessário para expor o servidor para fora do container Docker
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Garante que o HMR funcione em volumes montados no Docker
    }
  }
})