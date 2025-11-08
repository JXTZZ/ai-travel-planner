import { Component, type ReactNode } from 'react'
import { Button, Result } from 'antd'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

/**
 * 全局错误边界组件
 * 捕获子组件树中的 JavaScript 错误，显示友好的降级 UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 仅在开发环境打印详细错误信息
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    } else {
      // 生产环境可以上报到监控系统
      console.error('Application error:', error.message)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          padding: '20px',
          background: '#f5f5f5'
        }}>
          <Result
            status="error"
            title="应用发生错误"
            subTitle={
              import.meta.env.DEV && this.state.error
                ? this.state.error.message
                : '抱歉，应用遇到了意外错误。请尝试刷新页面或返回首页。'
            }
            extra={[
              <Button type="primary" key="home" onClick={this.handleReset}>
                返回首页
              </Button>,
              <Button key="refresh" onClick={() => window.location.reload()}>
                刷新页面
              </Button>,
            ]}
          />
        </div>
      )
    }

    return this.props.children
  }
}
