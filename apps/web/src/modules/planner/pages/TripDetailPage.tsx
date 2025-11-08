import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Space,
  Typography,
} from 'antd'
import { DeleteOutlined, EditOutlined, RobotOutlined, SaveOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTripById } from '../../../lib/tripApi'
import { useUpdateTripMutation, useDeleteTripMutation } from '../../../hooks/useTripsQuery'
import { planItinerary } from '../../../lib/edgeFunctions'
import { useAuth } from '../../../contexts/AuthContext'

const { Title, Paragraph } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input

const TripDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()
  
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)

  const updateTripMutation = useUpdateTripMutation()
  const deleteTripMutation = useDeleteTripMutation()

  // 使用 React Query 获取行程详情
  const { data: trip, isLoading, isError } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => getTripById(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (trip) {
      form.setFieldsValue({
        title: trip.title,
        destination: trip.destination,
        dateRange:
          trip.start_date && trip.end_date 
            ? [dayjs(trip.start_date), dayjs(trip.end_date)] 
            : undefined,
        party_size: trip.party_size,
        budget_total: trip.budget_total,
        budget_currency: trip.budget_currency,
        notes: trip.notes,
      })
    }
  }, [trip, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const [startDate, endDate] = values.dateRange || [null, null]

      await updateTripMutation.mutateAsync({
        id: id!,
        updates: {
          title: values.title,
          destination: values.destination,
          start_date: startDate ? startDate.format('YYYY-MM-DD') : undefined,
          end_date: endDate ? endDate.format('YYYY-MM-DD') : undefined,
          party_size: values.party_size,
          budget_total: values.budget_total,
          budget_currency: values.budget_currency,
          notes: values.notes,
        },
      })

      setEditing(false)
      message.success('保存成功')
      navigate('/planner')
    } catch (err) {
      if (err instanceof Error && err.message) {
        message.error(`保存失败: ${err.message}`)
      } else {
        message.error('请检查表单')
      }
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTripMutation.mutateAsync(id!)
      message.success('删除成功')
      navigate('/planner')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleOpenAiGenerator = () => {
    if (!user) {
      message.error('用户未登录')
      return
    }

    // 根据现有行程信息生成提示词
    let autoPrompt = ''
    if (trip) {
      const parts = []
      if (trip.destination) parts.push(`目的地：${trip.destination}`)
      if (trip.start_date && trip.end_date) {
        const days = dayjs(trip.end_date).diff(dayjs(trip.start_date), 'day') + 1
        parts.push(`${days}天`)
      }
      if (trip.party_size) parts.push(`${trip.party_size}人`)
      if (trip.budget_total) parts.push(`预算${trip.budget_total}元`)
      if (trip.notes) parts.push(trip.notes)
      
      if (parts.length > 0) {
        autoPrompt = `请为我生成详细的行程安排：${parts.join('，')}`
      }
    }
    
    setAiPrompt(autoPrompt)
    setAiModalOpen(true)
  }

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      message.warning('请输入行程需求描述')
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
        tripId: id,
        userId: user.id,
      })

      if (response.trip_id) {
        message.success('🎉 AI 详细行程已生成！')
        setAiModalOpen(false)
        setAiPrompt('')
        // 刷新当前行程数据
        queryClient.invalidateQueries({ queryKey: ['trip', id] })
        // 如果 AI 创建了新的 trip，跳转过去
        if (response.trip_id !== id) {
          setTimeout(() => {
            navigate(`/planner/${response.trip_id}`)
          }, 500)
        }
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

  if (isLoading) {
    return <div className="page-container">加载中...</div>
  }

  if (isError || !trip) {
    return (
      <div className="page-container">
        <Card>
          <Paragraph type="danger">行程不存在或加载失败</Paragraph>
          <Button onClick={() => navigate('/planner')}>返回列表</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-container">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row justify="space-between" align="middle">
          <Title level={3}>行程详情</Title>
          <Space>
            {editing ? (
              <>
                <Button 
                  icon={<SaveOutlined />} 
                  type="primary" 
                  onClick={handleSave}
                  loading={updateTripMutation.isPending}
                >
                  保存
                </Button>
                <Button onClick={() => setEditing(false)}>取消</Button>
              </>
            ) : (
              <>
                <Button 
                  icon={<RobotOutlined />} 
                  type="primary"
                  onClick={handleOpenAiGenerator}
                >
                  AI 生成详细行程
                </Button>
                <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
                  编辑
                </Button>
                <Popconfirm
                  title="确定删除此行程？"
                  description="删除后无法恢复"
                  onConfirm={handleDelete}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button 
                    icon={<DeleteOutlined />} 
                    danger
                    loading={deleteTripMutation.isPending}
                  >
                    删除
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        </Row>

        <Card bordered={false}>
          {editing ? (
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="title" label="行程名称" rules={[{ required: true, message: '请输入行程名称' }]}>
                    <Input placeholder="例如：南京三日游" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="destination" label="目的地" rules={[{ required: true, message: '请输入目的地' }]}>
                    <Input placeholder="例如：南京" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="dateRange" label="出行日期">
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="party_size" label="出行人数">
                    <InputNumber min={1} placeholder="1" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="budget_total" label="预算金额">
                    <InputNumber min={0} precision={2} placeholder="0.00" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="budget_currency" label="货币类型">
                    <Input placeholder="CNY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="notes" label="备注">
                <Input.TextArea rows={4} placeholder="补充说明..." />
              </Form.Item>
            </Form>
          ) : (
            <Descriptions column={2} bordered>
              <Descriptions.Item label="行程名称">{trip.title}</Descriptions.Item>
              <Descriptions.Item label="目的地">{trip.destination || '未设置'}</Descriptions.Item>
              <Descriptions.Item label="出发日期">{trip.start_date || '未设置'}</Descriptions.Item>
              <Descriptions.Item label="返回日期">{trip.end_date || '未设置'}</Descriptions.Item>
              <Descriptions.Item label="出行人数">{trip.party_size || '未设置'}</Descriptions.Item>
              <Descriptions.Item label="预算">
                {trip.budget_total ? `${trip.budget_total} ${trip.budget_currency || 'CNY'}` : '未设置'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {trip.created_at ? dayjs(trip.created_at).format('YYYY-MM-DD HH:mm') : '未知'}
              </Descriptions.Item>
              {trip.notes && (
                <Descriptions.Item label="备注" span={2}>
                  {trip.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          )}
        </Card>

        <Divider />

        <Card bordered={false} title="每日行程">
          <Paragraph type="secondary">行程详细安排将在此展示（待实现）</Paragraph>
        </Card>

        <Modal
          title="AI 生成详细行程"
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
              生成详细行程
            </Button>,
          ]}
          width={600}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Paragraph>
                AI 将基于您的行程信息，生成包含以下内容的详细安排：
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
              placeholder="可以补充更多需求，如：喜欢美食和文化景点，不想太赶，希望有充足的自由活动时间..."
              rows={6}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={aiGenerating}
              maxLength={500}
              showCount
            />

            <div style={{ 
              padding: 12, 
              background: '#f0f0f0', 
              borderRadius: 4,
              fontSize: 12,
              color: '#666'
            }}>
              <strong>当前行程信息：</strong>
              <div>目的地：{trip?.destination || '未设置'}</div>
              <div>日期：{trip?.start_date && trip?.end_date 
                ? `${trip.start_date} ~ ${trip.end_date}` 
                : '未设置'}</div>
              <div>人数：{trip?.party_size || '未设置'}</div>
              <div>预算：{trip?.budget_total ? `${trip.budget_total} ${trip.budget_currency || 'CNY'}` : '未设置'}</div>
            </div>
          </Space>
        </Modal>
      </Space>
    </div>
  )
}

export default TripDetailPage
