import { useEffect } from 'react'

import { Alert, Button, Card, Divider, Form, Input, InputNumber, Select, Space, Spin, Typography, message } from 'antd'

import { usePreferencesQuery, useUpdatePreferencesMutation } from '../../../hooks/usePreferences'
import { DEFAULT_PREFERENCES, type UserPreferences } from '../../../types/preferences'

const { Title, Paragraph } = Typography

const SettingsPage = () => {
  return (
    <div className="page-container">
      <Title level={3}>偏好设置</Title>
      <Paragraph type="secondary">
        调整常用出行偏好、语音助手行为与预算提醒阈值。
      </Paragraph>
  <Card variant="outlined" style={{ maxWidth: 520 }}>
        <SettingsForm />
      </Card>
    </div>
  )
}

const SettingsForm = () => {
  const [form] = Form.useForm<UserPreferences>()
  const { data: preferences, isLoading, isError, error, refetch } = usePreferencesQuery()
  const updatePreferencesMutation = useUpdatePreferencesMutation()

  useEffect(() => {
    form.setFieldsValue(preferences ?? DEFAULT_PREFERENCES)
  }, [preferences, form])

  const handleFinish = async (values: UserPreferences) => {
    try {
      await updatePreferencesMutation.mutateAsync(values)
      message.success('偏好设置已更新')
    } catch (mutationError) {
      message.error(mutationError instanceof Error ? mutationError.message : '保存偏好失败')
    }
  }

  const handleReset = async () => {
    form.setFieldsValue(DEFAULT_PREFERENCES)
    try {
      await updatePreferencesMutation.mutateAsync(DEFAULT_PREFERENCES)
      message.info('已恢复默认偏好')
    } catch (mutationError) {
      message.error(mutationError instanceof Error ? mutationError.message : '恢复默认偏好失败')
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={DEFAULT_PREFERENCES}
      disabled={updatePreferencesMutation.isPending}
    >
      <Title level={4}>行程默认偏好</Title>
      <Paragraph type="secondary">这些选项稍后会用于智能行程推荐与预算提醒。</Paragraph>
      {isError && (
        <Alert
          type="error"
          showIcon
          message="加载偏好失败"
          description={
            <Space direction="vertical">
              <span>{error?.message}</span>
              <Button size="small" onClick={() => refetch()}>
                重试
              </Button>
            </Space>
          }
          style={{ marginBottom: 16 }}
        />
      )}
  <Spin spinning={isLoading && !preferences}>
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
          <Button type="primary" htmlType="submit" loading={updatePreferencesMutation.isPending}>
            保存偏好
          </Button>
          <Button htmlType="button" onClick={handleReset} loading={updatePreferencesMutation.isPending}>
            恢复默认
          </Button>
        </Space>
      </Spin>
    </Form>
  )
}

export default SettingsPage
