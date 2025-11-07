import { Button, Card, Space, Typography, message, Descriptions, Alert } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { createTrip } from '../lib/tripApi'
import { useAuth } from '../contexts/AuthContext'

const { Title, Text, Paragraph } = Typography

const TripDebugPage = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [testResult, setTestResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    try {
      // 测试表是否存在
      const { error } = await supabase
        .from('trips')
        .select('count')
        .limit(1)
      
      if (error) {
        setTestResult(`❌ 表不存在或无权限: ${error.message}`)
      } else {
        setTestResult('✅ trips 表存在且可访问')
      }
    } catch (err) {
      setTestResult(`❌ 连接错误: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const testCreateTrip = async () => {
    if (!user) {
      message.error('用户未登录')
      return
    }

    setLoading(true)
    try {
      const trip = await createTrip({
        title: '测试行程',
        destination: '测试目的地',
      })
      
      setTestResult(`✅ 创建成功！行程 ID: ${trip.id}`)
      message.success('创建成功')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setTestResult(`❌ 创建失败: ${errorMsg}`)
      message.error(errorMsg)
      console.error('Create trip error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReLogin = async () => {
    try {
      await signOut()
      navigate('/auth', { replace: true })
    } catch (err) {
      console.error('Failed to sign out:', err)
      message.error('退出登录失败')
    }
  }

  const testAuth = async () => {
    setLoading(true)
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        setTestResult(`❌ 认证错误: ${error.message}`)
      } else if (!user) {
        setTestResult('❌ 用户未登录')
      } else {
        setTestResult(`✅ 用户已登录: ${user.email}`)
      }
    } catch (err) {
      setTestResult(`❌ 认证异常: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Title level={2}>🔍 行程创建调试面板</Title>
          <Paragraph type="secondary">
            用于诊断行程创建问题
          </Paragraph>
        </Card>

        {!user && (
          <Alert
            message="⚠️ 认证会话丢失"
            description="您的登录会话已过期或丢失。这就是为什么无法创建行程的原因。请点击下方按钮重新登录。"
            type="warning"
            showIcon
            action={
              <Button type="primary" onClick={handleReLogin}>
                重新登录
              </Button>
            }
          />
        )}

        <Card title="用户信息">
          <Descriptions column={1}>
            <Descriptions.Item label="用户 ID">
              {user?.id || '未登录'}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {user?.email || '未登录'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="测试操作">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button onClick={testAuth} loading={loading} block>
              1. 测试用户认证
            </Button>
            <Button onClick={testConnection} loading={loading} block>
              2. 测试数据库表
            </Button>
            <Button onClick={testCreateTrip} loading={loading} type="primary" block>
              3. 测试创建行程
            </Button>
          </Space>
        </Card>

        {testResult && (
          <Card title="测试结果">
            <Text style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {testResult}
            </Text>
          </Card>
        )}

        <Card title="环境信息">
          <Descriptions column={1}>
            <Descriptions.Item label="Supabase URL">
              {import.meta.env.VITE_SUPABASE_URL}
            </Descriptions.Item>
            <Descriptions.Item label="当前路径">
              {window.location.pathname}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </div>
  )
}

export default TripDebugPage
