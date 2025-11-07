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
import type { TripSummary } from '../../../state/useTripStore'
import { useTripStore } from '../../../state/useTripStore'

const { Title, Paragraph } = Typography
const { RangePicker } = DatePicker

const TripDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { trips, upsertTrip } = useTripStore()
  const [trip, setTrip] = useState<TripSummary | undefined>()
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    const found = trips.find((t) => t.id === id)
    if (found) {
      setTrip(found)
      form.setFieldsValue({
        ...found,
        dateRange:
          found.startDate && found.endDate ? [dayjs(found.startDate), dayjs(found.endDate)] : undefined,
      })
    } else if (id) {
      message.error('行程不存在')
      navigate('/planner')
    }
  }, [id, trips, navigate, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const [startDate, endDate] = values.dateRange || [null, null]

      const updated: TripSummary = {
        id: trip!.id,
        title: values.title,
        destination: values.destination,
        startDate: startDate ? startDate.format('YYYY-MM-DD') : undefined,
        endDate: endDate ? endDate.format('YYYY-MM-DD') : undefined,
      }

      upsertTrip(updated)
      setTrip(updated)
      setEditing(false)
      message.success('保存成功')
    } catch {
      message.error('请检查表单')
    }
  }

  const handleDelete = () => {
    // TODO: 实现删除逻辑（从 Supabase 删除）
    message.success('删除成功')
    navigate('/planner')
  }

  if (!trip) {
    return <div className="page-container">加载中...</div>
  }

  return (
    <div className="page-container">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row justify="space-between" align="middle">
          <Title level={3}>行程详情</Title>
          <Space>
            {editing ? (
              <>
                <Button icon={<SaveOutlined />} type="primary" onClick={handleSave}>
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
                  <Button icon={<DeleteOutlined />} danger>
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
                  <Form.Item name="partySize" label="出行人数">
                    <InputNumber min={1} placeholder="1" style={{ width: '100%' }} />
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
              <Descriptions.Item label="出发日期">{trip.startDate || '未设置'}</Descriptions.Item>
              <Descriptions.Item label="返回日期">{trip.endDate || '未设置'}</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {dayjs().format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
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
