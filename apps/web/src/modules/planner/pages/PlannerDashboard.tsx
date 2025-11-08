import { Alert, Button, Card, Col, Empty, Input, List, Row, Space, Typography, message, Modal } from 'antd'
import { PlusOutlined, RobotOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTripsQuery, useCreateTripMutation } from '../../../hooks/useTripsQuery'
import { useAuth } from '../../../contexts/AuthContext'
import { planItinerary } from '../../../lib/edgeFunctions'
import { usePreferencesQuery } from '../../../hooks/usePreferences'
import { DEFAULT_PREFERENCES } from '../../../types/preferences'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input

const PlannerDashboard = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { data: trips, isLoading, isError, error, refetch } = useTripsQuery()
  const createTripMutation = useCreateTripMutation()
  const { data: preferences } = usePreferencesQuery()

  const preferenceSnapshot = useMemo(() => preferences ?? DEFAULT_PREFERENCES, [preferences])
  
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)

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
        title: `${preferenceSnapshot.homeCity} 出发行程草稿`,
        destination: '目的地待定',
        notes: `偏好节奏：${
          preferenceSnapshot.travelPace === 'easy'
            ? '轻松'
            : preferenceSnapshot.travelPace === 'tight'
              ? '紧凑'
              : '均衡'
        }，每日预计行程 ${preferenceSnapshot.dailyHours} 小时。`,
        metadata: {
          preferenceSnapshot,
        },
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

  const handleOpenAiPlanner = () => {
    if (!user) {
      Modal.confirm({
        title: '需要登录',
        content: '使用 AI 规划功能需要先登录。',
        okText: '去登录',
        cancelText: '取消',
        onOk: async () => {
          await signOut()
          navigate('/auth', { replace: true })
        },
      })
      return
    }
    setAiModalOpen(true)
  }

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      message.warning('请输入您的旅行需求')
      return
    }

    if (!user) {
      message.error('用户未登录')
      return
    }

    setAiGenerating(true)
    try {
      const response = await planItinerary({
        prompt: aiPrompt,
        userId: user.id,
      })

      if (response.trip_id) {
        message.success('🎉 AI 行程已生成！正在跳转...')
        setAiModalOpen(false)
        setAiPrompt('')
        setTimeout(() => {
          navigate(`/planner/${response.trip_id}`)
        }, 500)
      } else if (response.parse_error) {
        message.error(`解析失败：${response.parse_error}`)
        Modal.info({
          title: 'AI 生成的内容',
          content: (
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{response.raw_content}</pre>
            </div>
          ),
          width: 600,
        })
      } else {
        message.error('AI 未返回有效内容')
      }
    } catch (err) {
      console.error('AI generation error:', err)
      message.error(err instanceof Error ? err.message : '生成失败，请重试')
    } finally {
      setAiGenerating(false)
    }
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
          <Space>
            <Button 
              type="primary" 
              icon={<RobotOutlined />} 
              onClick={handleOpenAiPlanner}
              size="large"
            >
              AI 智能规划
            </Button>
            <Button 
              icon={<PlusOutlined />} 
              onClick={handleCreateDraft} 
              size="large"
              loading={createTripMutation.isPending}
            >
              创建空白行程
            </Button>
          </Space>
        </Row>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="我的行程" variant="borderless">
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

        <Modal
          title="AI 智能规划行程"
          open={aiModalOpen}
          onCancel={() => {
            setAiModalOpen(false)
            setAiPrompt('')
          }}
          footer={[
            <Button key="cancel" onClick={() => setAiModalOpen(false)} disabled={aiGenerating}>
              取消
            </Button>,
            <Button
              key="generate"
              type="primary"
              icon={<RobotOutlined />}
              loading={aiGenerating}
              onClick={handleAiGenerate}
            >
              生成行程
            </Button>,
          ]}
          width={600}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Paragraph>
                描述您的旅行需求，AI 将为您智能规划详细行程，包括：
              </Paragraph>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>每日景点安排与时间规划</li>
                <li>交通方式与路线建议</li>
                <li>餐厅推荐与特色美食</li>
                <li>住宿区域建议</li>
                <li>预算估算与费用明细</li>
              </ul>
            </div>
            
            <TextArea
              placeholder="示例：我想去上海玩3天，预算3000元，喜欢美食和文化景点，不想太赶"
              rows={6}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={aiGenerating}
              maxLength={500}
              showCount
            />

            <Alert
              type="info"
              message="提示"
              description="建议包含：目的地、天数、预算、人数、兴趣偏好等信息，描述越详细，生成的行程越符合您的需求。"
              showIcon
            />
          </Space>
        </Modal>
      </Space>
    </div>
  )
}

export default PlannerDashboard
