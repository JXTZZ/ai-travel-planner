import { Button, Card, Descriptions, Space, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

const { Title, Text, Paragraph } = Typography

const AuthDebugPage = () => {
  const { user, session, loading } = useAuth()
  const [connectionTest, setConnectionTest] = useState<string>('测试中...')

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1)
      if (error) {
        setConnectionTest(`❌ 连接失败: ${error.message}`)
      } else {
        setConnectionTest('✅ 数据库连接正常')
      }
    } catch (err: any) {
      setConnectionTest(`❌ 连接异常: ${err.message}`)
    }
  }

  const testSignUp = async () => {
    const testEmail = `test${Date.now()}@example.com`
    const testPassword = '123456'
    
    message.loading('正在测试注册...', 0)
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          display_name: 'Test User',
        },
      },
    })
    
    message.destroy()
    
    if (error) {
      message.error(`注册失败: ${error.message}`)
      console.error('SignUp Error:', error)
    } else {
      console.log('SignUp Success:', data)
      if (data.user && !data.session) {
        message.warning('注册成功但需要邮箱验证。请在 Supabase Dashboard 关闭邮箱验证。')
      } else if (data.user && data.session) {
        message.success(`注册成功并自动登录！用户ID: ${data.user.id}`)
      } else if (data.user?.identities && data.user.identities.length === 0) {
        message.warning('该邮箱已被注册')
      }
    }
  }

  const checkAuthSettings = async () => {
    message.info('请在浏览器中打开: https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/providers')
  }

  return (
    <div style={{ padding: '40px', maxWidth: 1200, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Title level={2}>🔍 认证系统调试面板</Title>
          <Paragraph type="secondary">
            此页面帮助您诊断 Supabase 认证问题
          </Paragraph>
        </Card>

        <Card title="📡 连接状态">
          <Descriptions column={1}>
            <Descriptions.Item label="Supabase URL">
              {import.meta.env.VITE_SUPABASE_URL}
            </Descriptions.Item>
            <Descriptions.Item label="Anon Key">
              {import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20)}...
            </Descriptions.Item>
            <Descriptions.Item label="数据库连接">
              {connectionTest}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="👤 当前用户状态">
          <Descriptions column={1}>
            <Descriptions.Item label="Loading">{loading ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="已登录">{user ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="用户 ID">{user?.id || '未登录'}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{user?.email || '未登录'}</Descriptions.Item>
            <Descriptions.Item label="Session">
              {session ? '有效' : '无'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="🧪 快速测试">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" onClick={testSignUp} block>
              测试注册（随机邮箱）
            </Button>
            <Button onClick={checkAuthSettings} block>
              打开 Auth 设置页面
            </Button>
            <Button onClick={testConnection} block>
              重新测试连接
            </Button>
          </Space>
        </Card>

        <Card title="📋 常见问题排查">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>1. 注册后无法登录</Text>
            <Paragraph>
              → 在 Supabase Dashboard → Authentication → Providers → Email<br />
              → 取消勾选 "Confirm email"<br />
              → 点击 Save
            </Paragraph>

            <Text strong>2. 提示 "Invalid login credentials"</Text>
            <Paragraph>
              → 确认邮箱和密码正确<br />
              → 检查用户是否已在 Dashboard 的 Users 列表中<br />
              → 如果开启了邮箱验证，需要点击验证邮件
            </Paragraph>

            <Text strong>3. 注册成功但没有自动登录</Text>
            <Paragraph>
              → 需要关闭邮箱验证（开发阶段）<br />
              → 或者在生产环境配置邮件服务
            </Paragraph>

            <Text strong>4. 创建 Profile 触发器</Text>
            <Paragraph>
              → 在 SQL Editor 执行：<br />
              <code>supabase/migrations/20251107000000_add_profile_trigger.sql</code>
            </Paragraph>
          </Space>
        </Card>

        <Card title="🔗 快速链接">
          <Space direction="vertical">
            <a href="https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/users" target="_blank" rel="noopener noreferrer">
              查看用户列表
            </a>
            <a href="https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/providers" target="_blank" rel="noopener noreferrer">
              Auth 设置
            </a>
            <a href="https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/editor" target="_blank" rel="noopener noreferrer">
              SQL Editor
            </a>
            <a href="https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/logs/edge-logs" target="_blank" rel="noopener noreferrer">
              查看日志
            </a>
          </Space>
        </Card>
      </Space>
    </div>
  )
}

export default AuthDebugPage
