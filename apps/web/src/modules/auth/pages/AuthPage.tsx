import { Button, Card, Checkbox, Form, Input, message, Space, Tabs, Typography } from 'antd'
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

const { Title, Text } = Typography

const REMEMBER_ME_KEY = 'lotus_remember_me'
const SAVED_EMAIL_KEY = 'lotus_saved_email'

const AuthPage = () => {
  const [loading, setLoading] = useState(false)
  const [savedEmail, setSavedEmail] = useState<string | null>(null)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [signInForm] = Form.useForm()

  // 页面加载时检查是否有保存的邮箱
  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true'
    const email = localStorage.getItem(SAVED_EMAIL_KEY)
    
    if (remembered && email) {
      setSavedEmail(email)
      signInForm.setFieldsValue({ email, rememberMe: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSignIn = async (values: { email: string; password: string; rememberMe?: boolean }) => {
    setLoading(true)
    const { error } = await signIn(values.email, values.password)
    setLoading(false)

    if (error) {
      message.error(`登录失败：${error.message}`)
    } else {
      // 处理"记住我"功能
      if (values.rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, 'true')
        localStorage.setItem(SAVED_EMAIL_KEY, values.email)
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY)
        localStorage.removeItem(SAVED_EMAIL_KEY)
      }
      
      message.success('登录成功！')
      navigate('/')
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
        message.success('注册成功！请查收邮箱验证邮件，点击验证链接后即可登录。', 8)
      } else if (data?.user && data.session) {
        // 即使返回了 session，也要求验证邮箱
        message.success('注册成功！请查收邮箱验证邮件，验证后账号将更安全。', 8)
        // 不自动跳转，让用户先验证邮箱
      } else {
        message.info('注册请求已提交，请查收邮箱完成验证。')
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
                  <Form 
                    form={signInForm}
                    onFinish={handleSignIn} 
                    layout="vertical" 
                    autoComplete="off"
                    initialValues={{ rememberMe: false }}
                  >
                    <Form.Item
                      name="email"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '邮箱格式不正确' },
                      ]}
                    >
                      <Input 
                        prefix={<MailOutlined />} 
                        placeholder="邮箱" 
                        size="large"
                        autoComplete="email"
                      />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                      <Input.Password 
                        prefix={<LockOutlined />} 
                        placeholder="密码" 
                        size="large"
                        autoComplete="current-password"
                      />
                    </Form.Item>
                    <Form.Item>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                          <Checkbox>
                            记住我
                          </Checkbox>
                        </Form.Item>
                        {savedEmail && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            上次登录：{savedEmail}
                          </Text>
                        )}
                      </div>
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
                  <Form onFinish={handleSignUp} layout="vertical" autoComplete="off">
                    <Form.Item
                      name="displayName"
                      rules={[{ required: true, message: '请输入昵称' }]}
                    >
                      <Input 
                        prefix={<UserOutlined />} 
                        placeholder="昵称" 
                        size="large"
                        autoComplete="off"
                      />
                    </Form.Item>
                    <Form.Item
                      name="email"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '邮箱格式不正确' },
                      ]}
                    >
                      <Input 
                        prefix={<MailOutlined />} 
                        placeholder="邮箱" 
                        size="large"
                        autoComplete="off"
                      />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      rules={[
                        { required: true, message: '请输入密码' },
                        { min: 6, message: '密码至少6位' },
                      ]}
                    >
                      <Input.Password 
                        prefix={<LockOutlined />} 
                        placeholder="密码（至少6位）" 
                        size="large"
                        autoComplete="new-password"
                      />
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
