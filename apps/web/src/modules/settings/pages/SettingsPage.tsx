import { useEffect, useMemo } from 'react'

import { Button, Card, Divider, Form, Input, InputNumber, Select, Space, Typography, message } from 'antd'

const { Title, Paragraph } = Typography

type PreferenceFormValues = {
  homeCity: string
  travelPace: 'easy' | 'balanced' | 'tight'
  dailyHours: number
}

const SettingsPage = () => {
  return (
    <div className="page-container">
      <Title level={3}>偏好设置</Title>
      <Paragraph type="secondary">
        调整常用出行偏好、语音助手行为与预算提醒阈值。
      </Paragraph>
      <Card bordered={false} style={{ maxWidth: 520 }}>
        <SettingsForm />
      </Card>
    </div>
  )
}

const SettingsForm = () => {
  const [form] = Form.useForm<PreferenceFormValues>()

  const defaultValues = useMemo<PreferenceFormValues>(
    () => ({
      homeCity: '南京',
      travelPace: 'balanced',
      dailyHours: 8,
    }),
    [],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('lotus-preferences')
    if (!saved) {
      form.setFieldsValue(defaultValues)
      return
    }
    try {
      const parsed = JSON.parse(saved) as PreferenceFormValues
      form.setFieldsValue(parsed)
    } catch (error) {
      console.warn('[SettingsPage] Failed to parse stored preferences', error)
      form.setFieldsValue(defaultValues)
    }
  }, [defaultValues, form])

  const handleFinish = (values: PreferenceFormValues) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('lotus-preferences', JSON.stringify(values))
    }
    message.success('偏好设置已更新')
  }

  const handleReset = () => {
    form.setFieldsValue(defaultValues)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('lotus-preferences')
    }
    message.info('已恢复默认偏好')
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={defaultValues}
    >
      <Title level={4}>行程默认偏好</Title>
          <Paragraph type="secondary">
            这些选项稍后会用于智能行程推荐与预算提醒。
          </Paragraph>
          <Form.Item
            label="常用出发城市"
            extra="用于默认填充新建行程的出发地。"
            name="homeCity"
            rules={[{ required: true, message: '请输入常用出发城市' }]}
          >
            <Input placeholder="例如：南京" allowClear />
          </Form.Item>
          <Form.Item
            label="偏好旅行节奏"
            extra="影响智能行程规划时的活动密度。"
            name="travelPace"
            rules={[{ required: true, message: '请选择旅行节奏' }]}
          >
            <Select
              options={[
                { label: '轻松游', value: 'easy' },
                { label: '均衡游', value: 'balanced' },
                { label: '紧凑游', value: 'tight' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="每日游玩时长上限 (小时)"
            extra="用于日程规划，控制每日活动数量。"
            name="dailyHours"
            rules={[{ required: true, message: '请输入每日游玩时长' }]}
          >
            <InputNumber min={2} max={16} />
          </Form.Item>
      <Divider />
      <Space>
        <Button type="primary" htmlType="submit">
          保存偏好
        </Button>
        <Button htmlType="button" onClick={handleReset}>
          恢复默认
        </Button>
      </Space>
    </Form>
  )
}

export default SettingsPage
