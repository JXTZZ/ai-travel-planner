import { AudioMutedOutlined, AudioOutlined, ClearOutlined, SendOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Input, message, Space, Spin, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { planItinerary } from '../../../lib/edgeFunctions'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input

const VoiceAssistantPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [transcriptDraft, setTranscriptDraft] = useState('')

  const handleTranscriptCaptured = useCallback(
    async (text: string) => {
      setTranscriptDraft(text)
    },
    [],
  )

  const { status, transcript, error, isRecording, isProcessing, startRecording, stopRecording } =
    useVoiceAssistant(handleTranscriptCaptured)

  useEffect(() => {
    if (transcript) {
      setTranscriptDraft(transcript)
    }
  }, [transcript])

  const hasTranscript = useMemo(() => transcriptDraft.trim().length > 0, [transcriptDraft])

  const handleGenerateItinerary = async () => {
    const prompt = transcriptDraft.trim()
    if (!prompt) {
      message.warning('请先录音获取需求描述')
      return
    }

    setGenerating(true)
    try {
      const response = await planItinerary({
        prompt,
        userId: user?.id,
      })

      // 检查是否成功创建行程
      if (response.trip_id) {
        message.success('行程已生成！正在跳转...')
        setTimeout(() => {
          navigate(`/planner/${response.trip_id}`)
        }, 1000)
      } else if (response.parse_error) {
        // AI 返回了内容但解析失败
        message.error(`行程解析失败: ${response.parse_error}`)
      } else {
        message.error('AI 未返回有效内容')
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
          点击"开始语音输入"后说出您的旅行需求（建议录音 3-10 秒），系统会通过科大讯飞实时语音识别接口转写内容，并结合
          DeepSeek 模型生成行程方案。
        </Paragraph>
        {isRecording && (
          <Alert
            type="info"
            showIcon
            message="正在录音中..."
            description="请清晰说出您的旅行需求，例如：我想从南京去杭州玩三天，预算三千元。录音完成后点击【停止录音】。"
          />
        )}
  <Card variant="borderless" title="语音交互">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Space>
              {actionButton}
              <Button
                icon={<SendOutlined />}
                onClick={handleGenerateItinerary}
                loading={generating}
                disabled={!hasTranscript || isRecording || isProcessing}
              >
                生成行程
              </Button>
              <Button
                icon={<ClearOutlined />}
                disabled={isRecording || !hasTranscript}
                onClick={() => setTranscriptDraft('')}
              >
                清空文本
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
            <Card type="inner" title="需求文本">
              <TextArea
                rows={4}
                placeholder="示例：我想从南京出发去杭州玩3天，喜欢西湖、灵隐寺这些景点，希望品尝当地美食...&#10;&#10;提示：请提供详细的出发地和目的地信息，AI 会生成精确的地理位置（省+市+区+地点）。"
                value={transcriptDraft}
                onChange={(event) => setTranscriptDraft(event.target.value)}
                disabled={isProcessing}
              />
              <Paragraph type="secondary" style={{ marginTop: 8 }}>
                如果录音不可用，也可直接在此输入需求再点击"生成行程"。AI 会自动为每个活动生成详细地址，方便地图定位。
              </Paragraph>
            </Card>
          </Space>
        </Card>
      </Space>
    </div>
  )
}

export default VoiceAssistantPage
