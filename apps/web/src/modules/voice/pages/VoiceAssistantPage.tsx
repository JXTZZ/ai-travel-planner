import { AudioMutedOutlined, AudioOutlined, ClearOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Input, List, Popconfirm, message, Space, Spin, Typography } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { planItinerary } from '../../../lib/edgeFunctions'
import {
  useVoiceTranscriptsQuery,
  useSaveVoiceTranscriptMutation,
  useDeleteVoiceTranscriptMutation,
  useClearVoiceTranscriptsMutation,
} from '../../../hooks/useVoiceTranscripts'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input

const VoiceAssistantPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [transcriptDraft, setTranscriptDraft] = useState('')
  const [deletingTranscriptId, setDeletingTranscriptId] = useState<string | null>(null)

  const { data: savedTranscripts, isLoading: loadingTranscripts, error: transcriptsError } = useVoiceTranscriptsQuery()
  const saveTranscriptMutation = useSaveVoiceTranscriptMutation()
  const deleteTranscriptMutation = useDeleteVoiceTranscriptMutation()
  const clearTranscriptsMutation = useClearVoiceTranscriptsMutation()

  const handleTranscriptCaptured = useCallback(
    async (text: string) => {
      setTranscriptDraft(text)
      try {
        await saveTranscriptMutation.mutateAsync({ content: text })
      } catch (err) {
        console.warn('[voice] failed to persist transcript', err)
        message.warning('语音记录已生成，但保存到云端失败')
      }
    },
    [saveTranscriptMutation],
  )

  const { status, transcript, error, isRecording, isProcessing, startRecording, stopRecording, reset } =
    useVoiceAssistant(handleTranscriptCaptured)

  useEffect(() => {
    if (transcript) {
      setTranscriptDraft(transcript)
    }
  }, [transcript])

  const hasTranscript = useMemo(() => transcriptDraft.trim().length > 0, [transcriptDraft])
  const savedTranscriptCount = savedTranscripts?.length ?? 0
  const hasSavedHistory = savedTranscriptCount > 0
  const isClearingHistory = clearTranscriptsMutation.isPending

  const handleDeleteTranscript = useCallback(
    async (id: string) => {
      setDeletingTranscriptId(id)
      try {
        await deleteTranscriptMutation.mutateAsync({ id })
        message.success('已删除语音记录')
      } catch (deleteError) {
        message.error(deleteError instanceof Error ? deleteError.message : '删除语音记录失败')
      } finally {
        setDeletingTranscriptId(null)
      }
    },
    [deleteTranscriptMutation],
  )

  const handleClearHistory = useCallback(async () => {
    try {
      if (hasSavedHistory) {
        await clearTranscriptsMutation.mutateAsync()
      }
      reset()
      setTranscriptDraft('')
      message.success(hasSavedHistory ? '已清空语音历史' : '已清空当前识别内容')
    } catch (clearError) {
      message.error(clearError instanceof Error ? clearError.message : '清空语音历史失败')
    }
  }, [clearTranscriptsMutation, hasSavedHistory, reset])

  const handleGenerateItinerary = async () => {
    const prompt = transcriptDraft.trim()
    if (!prompt) {
      message.warning('请先录音获取需求描述')
      return
    }

    setGenerating(true)
    try {
      try {
        await saveTranscriptMutation.mutateAsync({ content: prompt })
      } catch (persistError) {
        console.warn('[voice] persist before planning failed', persistError)
      }

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
        // 仍然创建草稿让用户手动编辑
        const content = response.raw_content || response.raw.choices[0]?.message?.content
        if (content) {
          message.info('已保存为语音记录，您可以手动创建行程')
        }
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
          点击开始录音后，系统会通过科大讯飞实时语音识别接口转写内容，并结合 DeepSeek 模型进行后续规划。
        </Paragraph>
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
              <Popconfirm
                title="确定清空语音识别历史？"
                okText="清空"
                cancelText="取消"
                onConfirm={handleClearHistory}
                disabled={isRecording || (!hasTranscript && !hasSavedHistory)}
              >
                <Button
                  icon={<ClearOutlined />}
                  disabled={isRecording || (!hasTranscript && !hasSavedHistory)}
                  loading={isClearingHistory}
                >
                  清空历史
                </Button>
              </Popconfirm>
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
  <Card variant="borderless" title="识别历史">
          {transcriptsError && <Alert type="error" showIcon message="无法加载语音记录" description={transcriptsError.message} />}
          <List
            loading={loadingTranscripts}
            dataSource={savedTranscripts ?? []}
            locale={{ emptyText: '暂无云端历史记录，快来试试语音输入吧。' }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="delete"
                    title="删除这条语音记录？"
                    okText="删除"
                    cancelText="取消"
                    onConfirm={() => handleDeleteTranscript(item.id)}
                    disabled={deleteTranscriptMutation.isPending && deletingTranscriptId !== item.id}
                  >
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      loading={deleteTranscriptMutation.isPending && deletingTranscriptId === item.id}
                    >
                      删除
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Text type="secondary">{dayjs(item.transcribedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                  <Text>{item.content}</Text>
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
