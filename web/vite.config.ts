import react from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4096',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/health': {
        target: 'http://localhost:4096',
        changeOrigin: true,
      },
      '/event': {
        target: 'http://localhost:4096',
        changeOrigin: true,
      },
      '/session': {
        target: 'http://localhost:4096',
        changeOrigin: true,
      },
      '/config': {
        target: 'http://localhost:4096',
        changeOrigin: true,
      },
      '/permission': {
        target: 'http://localhost:4096',
        changeOrigin: true,
      },
      '/provider': {
        target: 'http://localhost:4096',
        changeOrigin: true,
      },
      '/global': {
        target: 'http://localhost:4096',
        changeOrigin: true,
      },
    },
  },
})
