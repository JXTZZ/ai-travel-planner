import {
  Button,
  Card,
  Col,
  Empty,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Popconfirm,
  Select,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd'
import { DeleteOutlined, EditOutlined, RobotOutlined, SaveOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTripById } from '../../../lib/tripApi'
import { useUpdateTripMutation, useDeleteTripMutation } from '../../../hooks/useTripsQuery'
import { planItinerary } from '../../../lib/edgeFunctions'
import { useAuth } from '../../../contexts/AuthContext'
import { usePreferencesQuery } from '../../../hooks/usePreferences'
import type { TripActivity, TripDayWithActivities } from '../../../types/trip'
import TripDayMap from '../components/TripDayMap'

const { Title, Paragraph, Text } = Typography
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
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)

  const updateTripMutation = useUpdateTripMutation()
  const deleteTripMutation = useDeleteTripMutation()
  const { data: preferences } = usePreferencesQuery()

  const getMetadataTimeText = (activity: TripActivity, key: 'start' | 'end'): string | null => {
    const metadata = activity.metadata
    if (!metadata || typeof metadata !== 'object') {
      return null
    }
    const timeText = (metadata as { time_text?: Record<string, unknown> }).time_text
    if (!timeText || typeof timeText !== 'object') {
      return null
    }
    const raw = key === 'start' ? (timeText as { start?: unknown }).start : (timeText as { end?: unknown }).end
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      return trimmed || null
    }
    return null
  }

  const getActivityTime = (activity: TripActivity, key: 'start' | 'end'): string => {
    const timestamp = (key === 'start' ? activity.start_time : activity.end_time) ?? null
    if (typeof timestamp === 'string') {
      const isoMatch = timestamp.match(/T(\d{2}):(\d{2})/)
      if (isoMatch) {
        return `${isoMatch[1]}:${isoMatch[2]}`
      }
      const parsed = dayjs(timestamp)
      if (parsed.isValid()) {
        return parsed.format('HH:mm')
      }
    }
    return getMetadataTimeText(activity, key) ?? ''
  }

  const getCategoryColor = (category?: string | null) => {
    switch (category) {
      case 'transportation':
        return 'geekblue'
      case 'accommodation':
        return 'purple'
      case 'dining':
        return 'volcano'
      case 'sightseeing':
        return 'green'
      case 'shopping':
        return 'magenta'
      default:
        return 'cyan'
    }
  }

  const categoryLabelMap: Record<string, string> = {
    transportation: '交通',
    accommodation: '住宿',
    dining: '餐饮',
    sightseeing: '观光',
    shopping: '购物',
    other: '其他',
  }

  // 使用 React Query 获取行程详情
  const { data: trip, isLoading, isError, error } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => getTripById(id!),
    enabled: !!id,
  })

  const currency = trip?.budget_currency ?? 'CNY'

  const travelWindow = useMemo(() => {
    if (!trip?.metadata || typeof trip.metadata !== 'object') {
      return null
    }
    const rawWindow = (trip.metadata as { travel_window?: unknown }).travel_window
    if (!rawWindow || typeof rawWindow !== 'object' || Array.isArray(rawWindow)) {
      return null
    }
    return rawWindow as Record<string, unknown>
  }, [trip])

  const extractTravelWindowValue = (
    key: 'departure_time' | 'return_time' | 'departure_location',
  ): string | null => {
    if (!travelWindow) {
      return null
    }
    const raw = travelWindow[key]
    if (typeof raw !== 'string') {
      return null
    }
    const trimmed = raw.trim()
    return trimmed || null
  }

  const departureTime = extractTravelWindowValue('departure_time')
  const returnTime = extractTravelWindowValue('return_time')
  const departureLocation = extractTravelWindowValue('departure_location')

  const orderedTripDays = useMemo(() => {
    if (!trip?.trip_days) {
      return []
    }

    return [...trip.trip_days]
      .map((day) => {
        const activities = Array.isArray(day.trip_activities) ? [...day.trip_activities] : []

        activities.sort((a, b) => {
          const orderA = typeof a.order_index === 'number' ? a.order_index : Number.MAX_SAFE_INTEGER
          const orderB = typeof b.order_index === 'number' ? b.order_index : Number.MAX_SAFE_INTEGER

          if (orderA !== orderB) {
            return orderA - orderB
          }

          const startA = typeof a.start_time === 'string' ? a.start_time : ''
          const startB = typeof b.start_time === 'string' ? b.start_time : ''
          return startA.localeCompare(startB)
        })

        return {
          ...day,
          trip_activities: activities,
        }
      })
      .sort((a, b) => {
        const indexA = typeof a.day_index === 'number' ? a.day_index : Number.MAX_SAFE_INTEGER
        const indexB = typeof b.day_index === 'number' ? b.day_index : Number.MAX_SAFE_INTEGER
        return indexA - indexB
      })
  }, [trip])

  const resolveDayKey = (day: TripDayWithActivities, index: number) =>
    day.id ?? `day-${day.day_index ?? index + 1}-${index}`

  const dayOptions = useMemo(() => {
    return orderedTripDays.map((day, index) => {
      const displayDayIndex = day.day_index ?? index + 1
      const labelParts = [`第 ${displayDayIndex} 天`]
      if (day.summary) {
        labelParts.push(day.summary)
      }
      if (day.date) {
        labelParts.push(dayjs(day.date).format('YYYY-MM-DD'))
      }
      return {
        value: resolveDayKey(day, index),
        label: labelParts.join(' · '),
        day,
      }
    })
  }, [orderedTripDays])

  const dayOptionMap = useMemo(() => {
    return new Map(dayOptions.map((option) => [option.value, option.day]))
  }, [dayOptions])

  useEffect(() => {
    if (dayOptions.length === 0) {
      if (selectedDayKey !== null) {
        setSelectedDayKey(null)
      }
      return
    }

    const currentExists = selectedDayKey ? dayOptionMap.has(selectedDayKey) : false
    if (!currentExists) {
      setSelectedDayKey(dayOptions[0].value)
    }
  }, [dayOptions, dayOptionMap, selectedDayKey])

  const selectedDay = useMemo(() => {
    if (!selectedDayKey) {
      return null
    }
    return dayOptionMap.get(selectedDayKey) ?? null
  }, [dayOptionMap, selectedDayKey])

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
        departure_location: departureLocation,
      })
    }
  }, [trip, form, departureLocation])

  useEffect(() => {
    if (!trip || !preferences) return

  const snapshot = preferences
  const updates: Record<string, unknown> = {}

    if (!trip.destination) {
      updates.destination = snapshot.homeCity
    }

    if (!trip.notes) {
      updates.notes = `偏好节奏：${
        snapshot.travelPace === 'easy' ? '轻松' : snapshot.travelPace === 'tight' ? '紧凑' : '均衡'
      }，每日行程预计 ${snapshot.dailyHours} 小时。`
    }

    if (Object.keys(updates).length > 0) {
      form.setFieldsValue(updates)
    }
  }, [trip, preferences, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const [startDate, endDate] = values.dateRange || [null, null]

      const metadataBase: Record<string, unknown> =
        trip?.metadata && typeof trip.metadata === 'object' && !Array.isArray(trip.metadata)
          ? { ...(trip.metadata as Record<string, unknown>) }
          : {}

      const travelWindowBase: Record<string, unknown> =
        metadataBase.travel_window && typeof metadataBase.travel_window === 'object' && !Array.isArray(metadataBase.travel_window)
          ? { ...(metadataBase.travel_window as Record<string, unknown>) }
          : {}

      const normalizedDepartureLocation = typeof values.departure_location === 'string' ? values.departure_location.trim() : ''

      if (normalizedDepartureLocation) {
        travelWindowBase.departure_location = normalizedDepartureLocation
      } else {
        delete travelWindowBase.departure_location
      }

      if (Object.keys(travelWindowBase).length > 0) {
        metadataBase.travel_window = travelWindowBase
      } else {
        delete metadataBase.travel_window
      }

      metadataBase.updated_at = new Date().toISOString()

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
          metadata: metadataBase,
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
        const startLabel = dayjs(trip.start_date).format('YYYY年MM月DD日')
        const endLabel = dayjs(trip.end_date).format('YYYY年MM月DD日')
        const days = dayjs(trip.end_date).diff(dayjs(trip.start_date), 'day') + 1
        parts.push(`出发日期：${startLabel}`)
        parts.push(`返回日期：${endLabel}`)
        parts.push(`行程时长：${days}天`)
      }
      if (departureTime) {
        parts.push(`预计出发时间：${departureTime}`)
      }
      if (returnTime) {
        parts.push(`预计返程时间：${returnTime}`)
      }
      if (departureLocation) {
        parts.push(`出发地点：${departureLocation}`)
      }
      if (trip.party_size) parts.push(`${trip.party_size}人`)
      if (trip.budget_total) parts.push(`预算${trip.budget_total}元`)
      if (trip.notes) parts.push(trip.notes)
      
      if (parts.length > 0) {
        autoPrompt = `请为我生成详细的行程安排：${parts.join('，')}。请严格按照提供的出发地点以及出发和返回日期安排每日活动，并保持地点顺序贴合行程逻辑。`
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
      if (import.meta.env.DEV) {
        console.error('AI generation error:', err)
      }
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
          <Paragraph type="danger">
            {error instanceof Error ? error.message : '行程不存在或加载失败'}
          </Paragraph>
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

  <Card variant="borderless">
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
                  <Form.Item name="departure_location" label="出发地点">
                    <Input placeholder="例如：南京南站" />
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
              <Descriptions.Item label="出发地点">{departureLocation || '未设置'}</Descriptions.Item>
              <Descriptions.Item label="出发日期">{trip.start_date || '未设置'}</Descriptions.Item>
              <Descriptions.Item label="返回日期">{trip.end_date || '未设置'}</Descriptions.Item>
              {departureTime && (
                <Descriptions.Item label="出发时间">{departureTime}</Descriptions.Item>
              )}
              {returnTime && (
                <Descriptions.Item label="返回时间">{returnTime}</Descriptions.Item>
              )}
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

        {orderedTripDays.length > 0 && (
          <Card variant="borderless" title="地图探索视图">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Space size="middle" wrap align="center">
                <Text strong>选择查看日期</Text>
                <Select
                  style={{ minWidth: 240 }}
                  value={selectedDayKey ?? undefined}
                  onChange={(value) => setSelectedDayKey(value)}
                  options={dayOptions.map(({ value, label }) => ({ value, label }))}
                />
                <Text type="secondary">地图将自动定位该日活动地点并按顺序连线。</Text>
              </Space>
              <TripDayMap day={selectedDay} height={680} />
            </Space>
          </Card>
        )}

  <Card variant="borderless" title="每日行程">
          {orderedTripDays.length > 0 ? (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {orderedTripDays.map((day, dayIndex) => {
                const activities = day.trip_activities ?? []
                const displayDayIndex = day.day_index ?? dayIndex + 1
                const dayKey = resolveDayKey(day, dayIndex)
                return (
                  <Card
                    key={day.id}
                    type="inner"
                    title={`第 ${displayDayIndex} 天 · ${day.summary ?? '待补充概述'}`}
                    extra={(
                      <Space size="small">
                        {day.date && <Text type="secondary">{dayjs(day.date).format('YYYY-MM-DD')}</Text>}
                        <Button type="link" size="small" onClick={() => setSelectedDayKey(dayKey)}>
                          查看地图
                        </Button>
                      </Space>
                    )}
                  >
                    {activities.length > 0 ? (
                      <List
                        dataSource={activities}
                        renderItem={(activity) => {
                          const startTimeText = getActivityTime(activity, 'start')
                          const endTimeText = getActivityTime(activity, 'end')
                          const timeRange = [startTimeText, endTimeText].filter(Boolean)
                          const hasTime = timeRange.length > 0

                          return (
                            <List.Item key={activity.id} style={{ alignItems: 'flex-start' }}>
                              <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                <Space size="middle">
                                  <Text strong>{activity.title}</Text>
                                  {activity.category && (
                                    <Tag color={getCategoryColor(activity.category)}>
                                      {categoryLabelMap[activity.category] ?? activity.category}
                                    </Tag>
                                  )}
                                  {typeof activity.estimated_cost === 'number' && (
                                    <Tag>{`${activity.estimated_cost} ${currency}`}</Tag>
                                  )}
                                </Space>
                                {activity.location && (
                                  <Text type="secondary">地点：{activity.location}</Text>
                                )}
                                {hasTime && (
                                  <Text type="secondary">
                                    时间：{timeRange.join(' - ')}
                                  </Text>
                                )}
                                {activity.notes && <Text type="secondary">备注：{activity.notes}</Text>}
                              </Space>
                            </List.Item>
                          )
                        }}
                      />
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="此日期暂无活动安排"
                      />
                    )}
                  </Card>
                )
              })}
            </Space>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无详细行程，点击上方按钮生成。"
            />
          )}
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
                <li><strong>精确的地理位置（省+市+区+具体地点），便于地图定位</strong></li>
              </ul>
            </div>
            
            <TextArea
              placeholder="可以补充更多需求，如：喜欢美食和文化景点，不想太赶，希望有充足的自由活动时间...&#10;&#10;提示：请尽量提供详细信息（如具体的出发地、目的地城市），AI 将生成更精准的地点定位。"
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
