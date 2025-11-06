import { Card, Form, Input, Switch, Typography } from 'antd'

const { Title, Paragraph } = Typography

const SettingsPage = () => {
  return (
    <div className="page-container">
      <Title level={3}>偏好设置</Title>
      <Paragraph type="secondary">
        调整常用出行偏好、语音助手行为与预算提醒阈值。
      </Paragraph>
      <Card bordered={false} style={{ maxWidth: 520 }}>
        <Form layout="vertical">
          <Form.Item label="常用出发城市">
            <Input placeholder="例如：南京" disabled />
          </Form.Item>
          <Form.Item label="预算提醒 (启用后超支会通知)">
            <Switch disabled defaultChecked />
          </Form.Item>
          <Form.Item label="语音助手语言">
            <Input placeholder="即将支持多语言切换" disabled />
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default SettingsPage
