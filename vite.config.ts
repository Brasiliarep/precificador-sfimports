import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    // ── PROXY: redireciona /api do Vite (3000) para o Express (3002) ─────────
    // Isso elimina o problema de "localhost:3000 para uma coisa, 3002 para outra"
    // Durante o dev, você acessa TUDO em localhost:3000
    // Em produção (npm run build), o Express serve o dist/ na 3002
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        proxyTimeout: 60000,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('❌ Proxy Error:', err);
          });
        }
      },
      '/imagens_sem_fundo': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/imagens_produtos': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/crops': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/editor.html': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
