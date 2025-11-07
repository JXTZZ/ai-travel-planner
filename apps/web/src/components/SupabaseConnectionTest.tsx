import { useEffect, useState } from 'react'
import { Alert, Button, Card, Space, Spin, Typography } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { supabase } from '../lib/supabaseClient'

const { Text, Paragraph } = Typography

export const SupabaseConnectionTest = () => {
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error: authError } = await supabase.auth.getSession()
      if (authError) throw authError
      
      // 尝试简单查询验证数据库连接
      const { error: dbError } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
      
      if (dbError && dbError.code !== 'PGRST116') {
        // PGRST116 = table doesn't exist, 这是正常的（表还未创建）
        throw dbError
      }
      
      setConnected(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setConnected(false)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <Card title="Supabase 连接状态" style={{ maxWidth: 500 }}>
      {loading ? (
        <Space>
          <Spin />
          <Text>正在测试连接...</Text>
        </Space>
      ) : connected ? (
        <Alert
          message="连接成功"
          description={
            <Space direction="vertical">
              <Paragraph>
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> Supabase 客户端已正常初始化
              </Paragraph>
              <Text type="secondary">URL: {import.meta.env.VITE_SUPABASE_URL}</Text>
            </Space>
          }
          type="success"
          showIcon
        />
      ) : (
        <Alert
          message="连接失败"
          description={
            <Space direction="vertical">
              <Paragraph>
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> {error}
              </Paragraph>
              <Button onClick={testConnection}>重试</Button>
            </Space>
          }
          type="error"
          showIcon
        />
      )}
    </Card>
  )
}
