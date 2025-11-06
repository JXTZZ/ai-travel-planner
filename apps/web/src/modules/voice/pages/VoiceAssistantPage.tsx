import { Button, Card, Space, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

const VoiceAssistantPage = () => {
  return (
    <div className="page-container">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={3}>语音助手</Title>
        <Paragraph type="secondary">
          之后会通过科大讯飞语音 API 实现实时语音输入，并结合 DeepSeek 模型提供语音交互式建议。
        </Paragraph>
        <Card bordered={false}>
          <Space direction="vertical">
            <Text>语音录制控件与实时转写结果即将上线。</Text>
            <Button type="primary" disabled>
              即将支持语音规划
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  )
}

export default VoiceAssistantPage
