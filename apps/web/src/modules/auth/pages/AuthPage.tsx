import { Button, Card, Form, Input, message, Space, Tabs, Typography } from 'antd'
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

const { Title, Text } = Typography

const AuthPage = () => {
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSignIn = async (values: { email: string; password: string }) => {
    setLoading(true)
    const { error } = await signIn(values.email, values.password)
    setLoading(false)

    if (error) {
      message.error(`登录失败：${error.message}`)
    } else {
      message.success('登录成功！')
      navigate('/planner')
    }
  }

  const handleSignUp = async (values: { email: string; password: string; displayName: string }) => {
    setLoading(true)
    const { data, error } = await signUp(values.email, values.password, values.displayName)
    setLoading(false)

    if (error) {
      message.error(`注册失败：${error.message}`)
    } else {
      // 检查是否需要邮箱验证
      if (data?.user?.identities && data.user.identities.length === 0) {
        message.warning('该邮箱已被注册，请直接登录。')
      } else if (data?.user && !data.session) {
        message.success('注册成功！请查收邮件验证账号后登录。')
      } else {
        message.success('注册成功！')
        // 如果自动登录成功，跳转到主页
        navigate('/planner')
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2}>LoTus&apos;AI</Title>
            <Text type="secondary">智能旅行规划助手</Text>
          </div>
          <Tabs
            items={[
              {
                key: 'signin',
                label: '登录',
                children: (
                  <Form onFinish={handleSignIn} layout="vertical">
                    <Form.Item
                      name="email"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '邮箱格式不正确' },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="邮箱" size="large" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                      <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={loading} block size="large">
                        登录
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
              {
                key: 'signup',
                label: '注册',
                children: (
                  <Form onFinish={handleSignUp} layout="vertical">
                    <Form.Item
                      name="displayName"
                      rules={[{ required: true, message: '请输入昵称' }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="昵称" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="email"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '邮箱格式不正确' },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="邮箱" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      rules={[
                        { required: true, message: '请输入密码' },
                        { min: 6, message: '密码至少6位' },
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="密码（至少6位）" size="large" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={loading} block size="large">
                        注册
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
            ]}
          />
        </Space>
      </Card>
    </div>
  )
}

export default AuthPage
