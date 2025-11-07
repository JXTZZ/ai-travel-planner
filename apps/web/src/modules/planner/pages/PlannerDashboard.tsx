import { Alert, Button, Card, Col, Empty, List, Row, Space, Typography, message, Modal } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTripsQuery, useCreateTripMutation } from '../../../hooks/useTripsQuery'
import { useAuth } from '../../../contexts/AuthContext'

const { Title, Paragraph, Text } = Typography

const PlannerDashboard = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { data: trips, isLoading, isError, error, refetch } = useTripsQuery()
  const createTripMutation = useCreateTripMutation()

  const handleCreateDraft = async () => {
    // 检查用户是否已登录
    if (!user) {
      Modal.confirm({
        title: '需要重新登录',
        content: '您的登录会话已过期，请重新登录后再创建行程。',
        okText: '去登录',
        cancelText: '取消',
        onOk: async () => {
          await signOut()
          navigate('/auth', { replace: true })
        },
      })
      return
    }

    try {
      const newTrip = await createTripMutation.mutateAsync({
        title: '新的行程草稿',
        destination: '目的地待定',
      })
      message.success('行程创建成功')
      navigate(`/planner/${newTrip.id}`)
    } catch (err) {
      console.error('Failed to create trip:', err)
      const errorMessage = err instanceof Error ? err.message : '创建行程失败，请重试'
      
      // 如果是认证错误，提示重新登录
      if (errorMessage.includes('session') || errorMessage.includes('未登录') || errorMessage.includes('auth')) {
        Modal.error({
          title: '认证失败',
          content: '您的登录会话已失效，请重新登录。',
          okText: '去登录',
          onOk: async () => {
            await signOut()
            navigate('/auth', { replace: true })
          },
        })
      } else {
        message.error(errorMessage)
      }
    }
  }

  const handleViewTrip = (tripId: string) => {
    navigate(`/planner/${tripId}`)
  }

  return (
    <div className="page-container">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row justify="space-between" align="middle">
          <div>
            <Title level={3}>行程规划中心</Title>
            <Paragraph type="secondary">
              在这里通过文字或语音描述旅行需求，AI 将生成路线建议、交通方案与住宿推荐。
            </Paragraph>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreateDraft} 
            size="large"
            loading={createTripMutation.isPending}
          >
            创建新行程
          </Button>
        </Row>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="我的行程" bordered={false}>
              {isError ? (
                <Alert
                  type="error"
                  showIcon
                  message="无法加载行程"
                  description={String((error as Error)?.message ?? error)}
                  action={
                    <Button size="small" onClick={() => refetch()}>
                      重试
                    </Button>
                  }
                />
              ) : (
                <List
                  dataSource={trips ?? []}
                  loading={isLoading}
                  locale={{ emptyText: <Empty description="暂无行程，点击上方按钮创建" /> }}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Button type="link" onClick={() => handleViewTrip(item.id)} key="view">
                          查看详情
                        </Button>,
                      ]}
                    >
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Text strong>{item.title}</Text>
                        <Text type="secondary">
                          {item.destination ?? '目的地待定'} ·{' '}
                          {item.startDate ? `${item.startDate} ~ ${item.endDate ?? '未设置'}` : '日期待定'}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  )
}

export default PlannerDashboard
