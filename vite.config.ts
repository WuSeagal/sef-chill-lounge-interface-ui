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
      port: 9045
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
