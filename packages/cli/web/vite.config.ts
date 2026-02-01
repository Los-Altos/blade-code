import react from "@vitejs/plugin-react"
import path from "path"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:4097'

  return {
    plugins: [react()],
    build: {
      outDir: '../dist/web',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@api": path.resolve(__dirname, "../src/api"),
      },
    },
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        '/health': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/sessions': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/configs': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/permissions': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/providers': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/models': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/global': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/suggestions': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/terminal/ws': {
          target: apiTarget.replace('http', 'ws'),
          ws: true,
        },
        '/terminal': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/mcp': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/skills': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
