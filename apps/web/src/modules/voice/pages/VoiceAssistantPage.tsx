import { AudioMutedOutlined, AudioOutlined, ClearOutlined } from '@ant-design/icons'
import { Alert, Button, Card, List, Space, Spin, Typography } from 'antd'
import dayjs from 'dayjs'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'

const { Title, Paragraph, Text } = Typography

const VoiceAssistantPage = () => {
  const { status, transcript, history, error, isRecording, isProcessing, startRecording, stopRecording, reset } =
    useVoiceAssistant()

  const actionButton = isRecording ? (
    <Button type="primary" icon={<AudioMutedOutlined />} danger onClick={stopRecording}>
      停止录音
    </Button>
  ) : (
    <Button type="primary" icon={<AudioOutlined />} onClick={startRecording} disabled={isProcessing}>
      开始语音输入
    </Button>
  )

  return (
    <div className="page-container">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={3}>语音助手</Title>
        <Paragraph type="secondary">
          点击开始录音后，系统会通过科大讯飞实时语音识别接口转写内容，并结合 DeepSeek 模型进行后续规划。
        </Paragraph>
        <Card bordered={false} title="语音交互">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Space>
              {actionButton}
              <Button icon={<ClearOutlined />} onClick={reset} disabled={isRecording || (!transcript && history.length === 0)}>
                清空历史
              </Button>
            </Space>
            {status === 'processing' && (
              <Space>
                <Spin />
                <Text>正在向科大讯飞发送音频并等待识别结果…</Text>
              </Space>
            )}
            {error && <Alert type="error" showIcon message="语音识别失败" description={error} />}
            {transcript && (
              <Card type="inner" title="最新识别结果">
                <Text>{transcript}</Text>
              </Card>
            )}
          </Space>
        </Card>
        <Card bordered={false} title="识别历史">
          <List
            dataSource={history}
            locale={{ emptyText: '暂无历史记录，快来试试语音输入吧。' }}
            renderItem={(item) => (
              <List.Item>
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Text type="secondary">{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                  <Text>{item.text}</Text>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      </Space>
    </div>
  )
}

export default VoiceAssistantPage
