import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@ant-design/v5-patch-for-react-19'
import App from './App'
import './styles/global.css'
import { logEnvCheck, validateEnvVariables } from './lib/envCheck'

// 开发环境：打印环境变量检查结果
logEnvCheck()

// 生产环境：验证必需的环境变量，如果缺失则抛出错误
try {
  validateEnvVariables()
} catch (error) {
  console.error(error)
  // 在页面上显示友好的错误信息
  const rootEl = document.getElementById('root')
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; padding: 20px; background: #f5f5f5;">
        <div style="max-width: 600px; padding: 24px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="color: #ff4d4f; margin-top: 0;">⚠️ 应用配置错误</h2>
          <p style="color: #666;">应用缺少必需的环境变量配置，无法正常启动。</p>
          <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow: auto; font-size: 12px;">${error instanceof Error ? error.message : '未知错误'}</pre>
          <p style="color: #999; font-size: 14px; margin-bottom: 0;">
            如需帮助，请联系技术支持或查看项目文档。
          </p>
        </div>
      </div>
    `
  }
  throw error
}

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
