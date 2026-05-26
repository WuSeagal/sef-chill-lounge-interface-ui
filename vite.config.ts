import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, './env', '')

  return {
    base: env.VITE_BASE_URL,
    envDir: './env',
    plugins: [
      vue(),
      {
        name: 'copy-404',
        closeBundle() {
          fs.copyFileSync('dist/index.html', 'dist/404.html')
        }
      }
    ],
    server: {
      port: 9045,
      proxy: {
        // 圖片靜態資源：dev 時把瀏覽器對 /image, /user, /sticker 的請求轉到後端 9041
        // 後端 ImageWebConfig 將這三個 prefix 對應到 file system 子目錄並設 nosniff header。
        // Prd 由 nginx 將同樣 path 轉到後端（與 /sef-cli/* API 共用 upstream）。
        '/image': { target: env.VITE_ENDPOINT || 'http://localhost:9041', changeOrigin: true },
        '/user':  { target: env.VITE_ENDPOINT || 'http://localhost:9041', changeOrigin: true },
        '/sticker': { target: env.VITE_ENDPOINT || 'http://localhost:9041', changeOrigin: true },
      },
    },
    resolve: {
      alias: [
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
        {
          find: '@assets',
          replacement: fileURLToPath(new URL('./src/assets', import.meta.url))
        }
      ]
    }
  }
})
