import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vitePluginImp from 'vite-plugin-imp'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vitePluginImp({
      libList: [
        {
          libName: 'antd',
          style: (name) => `antd/es/${name}/style/index.js`,
        },
      ],
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1500, // 调整警告阈值为 1500KB (1.5MB)
  },
})
