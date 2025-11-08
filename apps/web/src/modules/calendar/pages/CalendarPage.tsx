import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Badge,
  Button,
  Calendar,
  Card,
  Empty,
  Form,
  Input,
  List,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  TimePicker,
  Typography,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DroppableProvided,
  type DropResult,
} from '@hello-pangea/dnd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { TripActivity, TripDayWithActivities, TripWithDetails } from '../../../types/trip'
import {
  createTripActivity,
  createTripDay,
  deleteTripActivity,
  getTripById,
  updateTripDay,
  reorderTripActivities,
  updateTripActivity,
} from '../../../lib/tripApi'
import { useTripsQuery } from '../../../hooks/useTripsQuery'
import { useTripStore } from '../../../state/useTripStore'

const { Title, Paragraph, Text } = Typography
const { RangePicker: TimeRangePicker } = TimePicker

type ActivityCategory = Exclude<TripActivity['category'], null | undefined>

type ActivityFormValues = {
  title: string
  location?: string
  timeRange?: [Dayjs, Dayjs]
  category?: ActivityCategory
  notes?: string
}

type CalendarDay = {
  key: string
  date: Dayjs
  day: TripDayWithActivities
  activities: TripActivity[]
}

const ACTIVITY_CATEGORY_OPTIONS: { label: string; value: ActivityCategory }[] = [
  { label: '交通', value: 'transportation' },
  { label: '住宿', value: 'accommodation' },
  { label: '餐饮', value: 'dining' },
  { label: '景点', value: 'sightseeing' },
  { label: '购物', value: 'shopping' },
  { label: '其他', value: 'other' },
]

const CalendarPage = () => {
  const tripsQuery = useTripsQuery()
  const tripSummaries = useMemo(() => tripsQuery.data ?? [], [tripsQuery.data])
  const tripsLoading = tripsQuery.isLoading

  const currentTripId = useTripStore((state) => state.currentTripId)
  const setCurrentTrip = useTripStore((state) => state.setCurrentTrip)

  const [selectedTripId, setSelectedTripId] = useState<string | undefined>(currentTripId)
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null)
  const [activeActivities, setActiveActivities] = useState<TripActivity[]>([])
  const [activityModalOpen, setActivityModalOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<TripActivity | null>(null)
  const [activitySaving, setActivitySaving] = useState(false)
  const [reorderLoading, setReorderLoading] = useState(false)
  const [creatingDay, setCreatingDay] = useState(false)
  const [activityForm] = Form.useForm<ActivityFormValues>()

  const queryClient = useQueryClient()
  const userSelectedRef = useRef(false)

  useEffect(() => {
    if (selectedTripId) {
      setCurrentTrip(selectedTripId)
      return
    }
    if (tripSummaries.length === 0) {
      return
    }
    const inferred = currentTripId && tripSummaries.some((item) => item.id === currentTripId)
      ? currentTripId
      : tripSummaries[0].id
    setSelectedTripId(inferred)
    setCurrentTrip(inferred)
  }, [tripSummaries, currentTripId, selectedTripId, setCurrentTrip])

  const { data: tripDetail, isLoading: tripLoading } = useQuery<TripWithDetails | null>({
    queryKey: ['trip', selectedTripId],
    queryFn: () => getTripById(selectedTripId!),
    enabled: !!selectedTripId,
  })

  const calendarDays = useMemo<CalendarDay[]>(() => {
    if (!tripDetail?.trip_days) {
      return []
    }
    const base = tripDetail.start_date ? dayjs(tripDetail.start_date) : null
    return tripDetail.trip_days
      .map((tripDay) => {
        let computedDate: Dayjs | null = null
        if (tripDay.date) {
          computedDate = dayjs(tripDay.date)
        } else if (base && typeof tripDay.day_index === 'number') {
          computedDate = base.add(tripDay.day_index - 1, 'day')
        }
        if (!computedDate) {
          return null
        }
        const activities = [...(tripDay.trip_activities ?? [])].sort(
          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
        )
        return {
          key: computedDate.format('YYYY-MM-DD'),
          date: computedDate,
          day: tripDay,
          activities,
        }
      })
      .filter((item): item is CalendarDay => item !== null)
      .sort((a, b) => a.date.valueOf() - b.date.valueOf())
  }, [tripDetail])

  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDay>()
    calendarDays.forEach((item) => {
      map.set(item.key, item)
    })
    return map
  }, [calendarDays])

  useEffect(() => {
    if (!tripDetail) {
      setSelectedDate(null)
      userSelectedRef.current = false
      return
    }

    const firstAvailable = calendarDays[0]?.date

    if (!selectedDate) {
      if (firstAvailable) {
        setSelectedDate(firstAvailable)
      } else if (tripDetail.start_date) {
        setSelectedDate(dayjs(tripDetail.start_date))
      } else {
        setSelectedDate(dayjs())
      }
      userSelectedRef.current = false
      return
    }

    const selectedKey = selectedDate.format('YYYY-MM-DD')
    if (dayMap.has(selectedKey)) {
      userSelectedRef.current = false
      return
    }

    if (!userSelectedRef.current) {
      if (firstAvailable) {
        setSelectedDate(firstAvailable)
      } else if (tripDetail.start_date) {
        setSelectedDate(dayjs(tripDetail.start_date))
      }
    }
  }, [calendarDays, dayMap, selectedDate, tripDetail])

  const selectedDay = selectedDate ? dayMap.get(selectedDate.format('YYYY-MM-DD')) : undefined

  useEffect(() => {
    if (!selectedDay) {
      setActiveActivities([])
      return
    }
    setActiveActivities(selectedDay.activities)
  }, [selectedDay])

  const dateCellRender = (value: Dayjs) => {
    const cell = dayMap.get(value.format('YYYY-MM-DD'))
    if (!cell) {
      return null
    }
    const preview = cell.activities.slice(0, 3)
    return (
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        {preview.map((activity) => (
          <Badge key={activity.id} color="blue" text={activity.title} style={{ width: '100%' }} />
        ))}
        {cell.activities.length > 3 && (
          <Text type="secondary">+{cell.activities.length - 3} 更多</Text>
        )}
      </Space>
    )
  }

  const handleTripChange = (value: string) => {
    setSelectedTripId(value)
    setCurrentTrip(value)
    setSelectedDate(null)
    userSelectedRef.current = false
  }

  const ensureDayExists = async (): Promise<TripDayWithActivities | null> => {
    if (!selectedTripId || !selectedDate) {
      return null
    }

    const key = selectedDate.format('YYYY-MM-DD')
    const existing = dayMap.get(key)
    if (existing) {
      return existing.day
    }

    setCreatingDay(true)
    try {
      const base = tripDetail?.start_date ? dayjs(tripDetail.start_date) : null
      let dayIndex = 1
      if (base) {
        dayIndex = selectedDate.diff(base, 'day') + 1
      } else {
        const indices = calendarDays.map((item) => item.day.day_index ?? 0)
        const maxIndex = indices.length > 0 ? Math.max(...indices) : 0
        dayIndex = maxIndex + 1
      }

      const fallbackDay = tripDetail?.trip_days?.find(
        (day) => !day.date && (day.day_index ?? null) === dayIndex,
      )

      if (fallbackDay) {
        const updated = await updateTripDay(fallbackDay.id, {
          date: selectedDate.format('YYYY-MM-DD'),
        })
        message.success('已更新现有行程日')

        queryClient.setQueryData<TripWithDetails | null>(['trip', selectedTripId], (prev) => {
          if (!prev?.trip_days) {
            return prev
          }
          return {
            ...prev,
            trip_days: prev.trip_days.map((day) =>
              day.id === fallbackDay.id
                ? {
                    ...day,
                    date: updated.date,
                  }
                : day,
            ),
          }
        })

        return {
          ...fallbackDay,
          date: updated.date,
          trip_activities: fallbackDay.trip_activities ?? [],
        }
      }

      const createdDay = await createTripDay({
        trip_id: selectedTripId,
        day_index: dayIndex,
        date: selectedDate.format('YYYY-MM-DD'),
        summary: '',
      })
      message.success('已创建当日行程')

      await queryClient.invalidateQueries({ queryKey: ['trip', selectedTripId] })
      const latest = await queryClient.ensureQueryData({
        queryKey: ['trip', selectedTripId],
        queryFn: () => getTripById(selectedTripId),
      })

      const refreshedDay = latest?.trip_days?.find((day) => day.id === createdDay.id)
      return refreshedDay ?? { ...createdDay, trip_activities: [] }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建每日行程失败')
      return null
    } finally {
      setCreatingDay(false)
    }
  }

  const openCreateActivityModal = async () => {
    if (!selectedDate) {
      message.warning('请选择日期')
      return
    }
    const ensuredDay = await ensureDayExists()
    if (!ensuredDay) {
      return
    }
    setActiveActivities(
      (ensuredDay.trip_activities ?? []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    )
    setEditingActivity(null)
    activityForm.resetFields()
    setActivityModalOpen(true)
  }

  const openEditActivityModal = (activity: TripActivity) => {
    setEditingActivity(activity)
    activityForm.setFieldsValue({
      title: activity.title,
      location: activity.location ?? undefined,
      category: activity.category ?? undefined,
      notes: activity.notes ?? undefined,
      timeRange:
        activity.start_time && activity.end_time
          ? [dayjs(activity.start_time, 'HH:mm'), dayjs(activity.end_time, 'HH:mm')]
          : undefined,
    })
    setActivityModalOpen(true)
  }

  const handleActivitySubmit = async () => {
    if (!selectedTripId || !selectedDate) {
      return
    }
    const dayKey = selectedDate.format('YYYY-MM-DD')
    const calendarDay = dayMap.get(dayKey)

    let ensuredDay = calendarDay?.day
    if (!ensuredDay) {
      const createdDay = await ensureDayExists()
      if (createdDay) {
        ensuredDay = createdDay
      }
    }

    if (!ensuredDay) {
      message.error('请先创建当天的行程日')
      return
    }
    try {
      const values = await activityForm.validateFields()
      const [start, end] = values.timeRange ?? []
      setActivitySaving(true)
      if (editingActivity) {
        const updated = await updateTripActivity(editingActivity.id, {
          title: values.title,
          location: values.location,
          notes: values.notes,
          category: values.category ?? undefined,
          start_time: start ? start.format('HH:mm') : undefined,
          end_time: end ? end.format('HH:mm') : undefined,
        })
        message.success('活动已更新')
        setActiveActivities((prev) =>
          prev
            .map((activity) => (activity.id === updated.id ? updated : activity))
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
        )
        queryClient.setQueryData<TripWithDetails | null>(['trip', selectedTripId], (prev) => {
          if (!prev?.trip_days) {
            return prev
          }
          return {
            ...prev,
            trip_days: prev.trip_days.map((day) =>
              day.id === ensuredDay?.id
                ? {
                    ...day,
                    trip_activities: (day.trip_activities ?? [])
                      .map((activity) => (activity.id === updated.id ? updated : activity))
                      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
                  }
                : day,
            ),
          }
        })
      } else {
        const created = await createTripActivity({
          trip_id: selectedTripId,
          trip_day_id: ensuredDay.id,
          day_index: ensuredDay.day_index,
          order_index: activeActivities.length,
          title: values.title,
          location: values.location,
          notes: values.notes,
          category: values.category ?? 'other',
          start_time: start ? start.format('HH:mm') : undefined,
          end_time: end ? end.format('HH:mm') : undefined,
        })
        message.success('活动已添加')
        setActiveActivities((prev) =>
          [...prev, created].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
        )
        queryClient.setQueryData<TripWithDetails | null>(['trip', selectedTripId], (prev) => {
          if (!prev?.trip_days) {
            return prev
          }
          return {
            ...prev,
            trip_days: prev.trip_days.map((day) =>
              day.id === ensuredDay?.id
                ? {
                    ...day,
                    trip_activities: [...(day.trip_activities ?? []), created].sort(
                      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
                    ),
                  }
                : day,
            ),
          }
        })
      }
      setActivityModalOpen(false)
      setEditingActivity(null)
      activityForm.resetFields()
      await queryClient.invalidateQueries({ queryKey: ['trip', selectedTripId] })
      await queryClient.refetchQueries({ queryKey: ['trip', selectedTripId] })
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message)
      } else {
        message.error('保存活动失败')
      }
    } finally {
      setActivitySaving(false)
    }
  }

  const handleDeleteActivity = async (activity: TripActivity) => {
    try {
      await deleteTripActivity(activity.id)
      message.success('活动已删除')
      setActiveActivities((prev) => prev.filter((item) => item.id !== activity.id))
      queryClient.setQueryData<TripWithDetails | null>(['trip', selectedTripId], (prev) => {
        if (!prev?.trip_days) {
          return prev
        }
        return {
          ...prev,
          trip_days: prev.trip_days.map((day) =>
            day.id === activity.trip_day_id
              ? {
                  ...day,
                  trip_activities: (day.trip_activities ?? []).filter((item) => item.id !== activity.id),
                }
              : day,
          ),
        }
      })
      await queryClient.invalidateQueries({ queryKey: ['trip', selectedTripId] })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除活动失败')
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) {
      return
    }
    if (!selectedDay) {
      return
    }
    const previousActivities = activeActivities
    const reordered = [...activeActivities]
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    const updatedReordered = reordered.map((activity, index) => ({
      ...activity,
      order_index: index,
      trip_day_id: activity.trip_day_id ?? selectedDay.day.id,
    }))
    setActiveActivities(updatedReordered)
    setReorderLoading(true)
    try {
      await reorderTripActivities(
        updatedReordered.map((activity) => ({
          id: activity.id,
          trip_day_id: activity.trip_day_id ?? selectedDay.day.id,
          day_index: selectedDay.day.day_index ?? undefined,
          order_index: activity.order_index ?? 0,
        })),
      )
      queryClient.setQueryData<TripWithDetails | null>(['trip', selectedTripId], (prev) => {
        if (!prev?.trip_days) {
          return prev
        }
        return {
          ...prev,
          trip_days: prev.trip_days.map((day) =>
            day.id === selectedDay.day.id
              ? {
                  ...day,
                  trip_activities: updatedReordered,
                }
              : day,
          ),
        }
      })
      message.success('排序已更新')
      await queryClient.invalidateQueries({ queryKey: ['trip', selectedTripId] })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '调整排序失败')
      setActiveActivities(previousActivities)
    } finally {
      setReorderLoading(false)
    }
  }

  return (
    <div className="page-container">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={3}>行程日历</Title>
        <Paragraph type="secondary">
          通过日历查看行程安排，拖拽即可调整当天活动顺序，支持新增、编辑与删除。
        </Paragraph>

        <Card bordered={false}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Space wrap>
              <Text strong>选择行程：</Text>
              <Select
                style={{ minWidth: 240 }}
                placeholder="请选择行程"
                loading={tripsLoading}
                value={selectedTripId}
                onChange={handleTripChange}
                options={tripSummaries.map((trip) => ({ value: trip.id, label: trip.title }))}
              />
            </Space>

            {tripLoading ? (
              <Spin tip="正在加载行程详情" />
            ) : !tripDetail ? (
              <Empty description="请选择一个有效的行程" />
            ) : (
              <Space style={{ width: '100%' }} size="large" align="start">
                <div style={{ flex: '1 1 60%' }}>
                  <Calendar
                    value={selectedDate ?? dayjs()}
                    onSelect={(value) => {
                      userSelectedRef.current = true
                      setSelectedDate(value)
                    }}
                    dateCellRender={dateCellRender}
                  />
                </div>
                <div style={{ flex: '1 1 40%' }}>
                  <Card
                    title={
                      <Space>
                        <Text>当天安排</Text>
                        {selectedDate && (
                          <Tag color="blue">{selectedDate.format('YYYY年MM月DD日')}</Tag>
                        )}
                      </Space>
                    }
                    extra={
                      <Button type="primary" icon={<PlusOutlined />} onClick={openCreateActivityModal}>
                        新增活动
                      </Button>
                    }
                    bordered={false}
                  >
                    {!selectedDate ? (
                      <Empty description="请选择日期" />
                    ) : !selectedDay ? (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Empty description="当天暂无行程" />
                        <Button loading={creatingDay} onClick={ensureDayExists} type="dashed">
                          创建当天行程日
                        </Button>
                      </Space>
                    ) : activeActivities.length === 0 ? (
                      <Empty description="暂无活动，点击新增活动开始规划" />
                    ) : (
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="daily-activities">
                          {(provided: DroppableProvided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}>
                              <List
                                dataSource={activeActivities}
                                renderItem={(activity, index) => (
                                  <Draggable draggableId={activity.id} index={index} key={activity.id}>
                                    {(draggableProvided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                                      <div
                                        ref={draggableProvided.innerRef}
                                        {...draggableProvided.draggableProps}
                                        {...draggableProvided.dragHandleProps}
                                        style={{
                                          marginBottom: 12,
                                          borderRadius: 8,
                                          border: snapshot.isDragging ? '1px solid #1677ff' : '1px solid #f0f0f0',
                                          background: '#fff',
                                          boxShadow: snapshot.isDragging ? '0 4px 12px rgba(22, 119, 255, 0.15)' : undefined,
                                          ...draggableProvided.draggableProps.style,
                                        }}
                                      >
                                        <Card
                                          size="small"
                                          bordered={false}
                                          title={
                                            <Space>
                                              <Text strong>{activity.title}</Text>
                                              {activity.category && (
                                                <Tag color="geekblue">{
                                                  ACTIVITY_CATEGORY_OPTIONS.find((option) => option.value === activity.category)
                                                    ?.label ?? '其他'
                                                }</Tag>
                                              )}
                                            </Space>
                                          }
                                          extra={
                                            <Space>
                                              <Button
                                                size="small"
                                                icon={<EditOutlined />}
                                                onClick={() => openEditActivityModal(activity)}
                                              >
                                                编辑
                                              </Button>
                                              <Popconfirm
                                                title="确定删除该活动？"
                                                okText="删除"
                                                cancelText="取消"
                                                onConfirm={() => handleDeleteActivity(activity)}
                                              >
                                                <Button size="small" danger icon={<DeleteOutlined />}>
                                                  删除
                                                </Button>
                                              </Popconfirm>
                                            </Space>
                                          }
                                        >
                                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                            {(activity.start_time || activity.end_time) && (
                                              <Text type="secondary">
                                                时间：{activity.start_time ?? '--'} ~ {activity.end_time ?? '--'}
                                              </Text>
                                            )}
                                            {activity.location && (
                                              <Text type="secondary">地点：{activity.location}</Text>
                                            )}
                                            {activity.notes && <Text>备注：{activity.notes}</Text>}
                                          </Space>
                                        </Card>
                                      </div>
                                    )}
                                  </Draggable>
                                )}
                              />
                              {provided.placeholder}
                              {reorderLoading && <Text type="secondary">正在同步排序...</Text>}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    )}
                  </Card>
                </div>
              </Space>
            )}
          </Space>
        </Card>

        <Modal
          title={editingActivity ? '编辑活动' : '新增活动'}
          open={activityModalOpen}
          onCancel={() => {
            setActivityModalOpen(false)
            setEditingActivity(null)
            activityForm.resetFields()
          }}
          onOk={handleActivitySubmit}
          confirmLoading={activitySaving}
          destroyOnClose
        >
          <Form form={activityForm} layout="vertical" preserve={false}>
            <Form.Item
              name="title"
              label="活动名称"
              rules={[{ required: true, message: '请输入活动名称' }]}
            >
              <Input placeholder="例如：参观博物馆" />
            </Form.Item>
            <Form.Item name="location" label="地点">
              <Input placeholder="例如：南京博物院" />
            </Form.Item>
            <Form.Item name="timeRange" label="时间">
              <TimeRangePicker style={{ width: '100%' }} format="HH:mm" minuteStep={15} />
            </Form.Item>
            <Form.Item name="category" label="分类">
              <Select
                placeholder="请选择活动类型"
                allowClear
                options={ACTIVITY_CATEGORY_OPTIONS}
              />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={3} placeholder="补充说明" />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </div>
  )
}

export default CalendarPage
