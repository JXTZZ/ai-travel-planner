import { AudioMutedOutlined, AudioOutlined, ClearOutlined, SendOutlined } from '@ant-design/icons'
import { Alert, Button, Card, List, message, Space, Spin, Typography } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { planItinerary } from '../../../lib/edgeFunctions'
import { useTripStore } from '../../../state/useTripStore'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'

const { Title, Paragraph, Text } = Typography

const VoiceAssistantPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const { status, transcript, history, error, isRecording, isProcessing, startRecording, stopRecording, reset } =
    useVoiceAssistant()
  const upsertTrip = useTripStore((state) => state.upsertTrip)

  const handleGenerateItinerary = async () => {
    if (!transcript) {
      message.warning('请先录音获取需求描述')
      return
    }

    setGenerating(true)
    try {
      const response = await planItinerary({
        prompt: transcript,
        userId: user?.id,
      })

      const content = response.raw.choices[0]?.message?.content
      if (content) {
        // 创建新行程草稿
        const tripId = crypto.randomUUID()
        upsertTrip({
          id: tripId,
          title: `语音规划 - ${dayjs().format('YYYY-MM-DD HH:mm')}`,
          destination: '待完善',
        })

        message.success('行程已生成！正在跳转...')
        setTimeout(() => {
          navigate('/planner')
        }, 1000)
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '生成行程失败')
    } finally {
      setGenerating(false)
    }
  }

  const actionButton = isRecording ? (
    <Button type="primary" icon={<AudioMutedOutlined />} danger onClick={stopRecording}>
      停止录音
    </Button>
  ) : (
    <Button type="primary" icon={<AudioOutlined />} onClick={startRecording} disabled={isProcessing || generating}>
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
              <Button
                icon={<SendOutlined />}
                onClick={handleGenerateItinerary}
                loading={generating}
                disabled={!transcript || isRecording || isProcessing}
              >
                生成行程
              </Button>
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
            {generating && (
              <Space>
                <Spin />
                <Text>正在调用 DeepSeek 生成行程方案…</Text>
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
