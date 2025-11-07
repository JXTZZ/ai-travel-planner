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
  Popconfirm,
  Row,
  Space,
  Typography,
} from 'antd'
import { DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { getTripById } from '../../../lib/tripApi'
import { useUpdateTripMutation, useDeleteTripMutation } from '../../../hooks/useTripsQuery'

const { Title, Paragraph } = Typography
const { RangePicker } = DatePicker

const TripDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

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
      </Space>
    </div>
  )
}

export default TripDetailPage
