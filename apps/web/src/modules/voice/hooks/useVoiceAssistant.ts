import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchSpeechSignature, type SpeechSignatureResponse } from '../../../lib/edgeFunctions'

type VoiceAssistantStatus = 'idle' | 'recording' | 'processing' | 'error'

type VoiceTranscript = {
  text: string
  createdAt: string
}

const isBrowser = typeof window !== 'undefined'
const isDev = import.meta.env.DEV

// 开发环境日志工具
const devLog = (...args: unknown[]) => {
  if (isDev) console.log(...args)
}
const devWarn = (...args: unknown[]) => {
  if (isDev) console.warn(...args)
}

export const useVoiceAssistant = (onTranscript?: (text: string) => void) => {
  const [status, setStatus] = useState<VoiceAssistantStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [history, setHistory] = useState<VoiceTranscript[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const mountedRef = useRef(true)

  const handleDataAvailable = useCallback((event: BlobEvent) => {
    if (event.data.size > 0) {
      audioChunksRef.current.push(event.data)
    }
  }, [])

  const handleRecorderError = useCallback((event: Event) => {
    console.error('[voice] recorder error', event)
    if (!mountedRef.current) return
    setError('录音过程中发生错误，请检查麦克风权限')
    setStatus('error')
  }, [])

  const cleanupRecorder = useCallback(() => {
    audioChunksRef.current = []
    mediaRecorderRef.current?.removeEventListener('dataavailable', handleDataAvailable as EventListener)
    mediaRecorderRef.current?.removeEventListener('error', handleRecorderError as EventListener)
    mediaRecorderRef.current = null
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }, [handleDataAvailable, handleRecorderError])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cleanupRecorder()
    }
  }, [cleanupRecorder])

  const processRecording = useCallback(async () => {
    devLog('[voice] processRecording start, audioChunks count:', audioChunksRef.current.length)
    if (!mountedRef.current) return
    if (audioChunksRef.current.length === 0) {
      devWarn('[voice] no audio chunks to process')
      setStatus('idle')
      return
    }

    setStatus('processing')

    try {
      devLog('[voice] creating audio blob')
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      devLog('[voice] blob size:', blob.size)
      
      // 检查音频大小，太小可能无法识别
      if (blob.size < 4000) {
        devWarn('[voice] audio too short, blob size:', blob.size)
        throw new Error('录音时间太短，请至少录音 2-3 秒并清晰说出您的需求')
      }
      
      const arrayBuffer = await blob.arrayBuffer()
      devLog('[voice] arrayBuffer size:', arrayBuffer.byteLength)
      
      devLog('[voice] converting to PCM16 base64...')
      const pcmBase64 = await convertToPcm16Base64(arrayBuffer)
      devLog('[voice] PCM base64 length:', pcmBase64.length)
      
      devLog('[voice] fetching speech signature...')
      const signature = await fetchSpeechSignature()
      devLog('[voice] signature received:', { appId: signature.appId, host: signature.host })
      
      devLog('[voice] sending to iFlyTek...')
      const result = await sendAudioToIFlyTek(signature, pcmBase64)
      devLog('[voice] recognition result:', result)

      if (!result || result.trim().length === 0) {
        throw new Error('未识别到有效语音，请确保在安静环境下清晰说话')
      }

      if (!mountedRef.current) return

      setTranscript(result)
      setHistory((prev) => [...prev, { text: result, createdAt: new Date().toISOString() }])
      onTranscript?.(result)
      setStatus('idle')
    } catch (processingError) {
      console.error('[voice] processing failed', processingError)
      if (!mountedRef.current) return
      setError(processingError instanceof Error ? processingError.message : '语音识别失败')
      setStatus('error')
    } finally {
      audioChunksRef.current = []
    }
  }, [onTranscript])

  const startRecording = useCallback(async () => {
    devLog('[voice] startRecording called')
    if (!isBrowser) {
      setError('当前环境不支持录音功能')
      setStatus('error')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('浏览器不支持 getUserMedia，请更换浏览器')
      setStatus('error')
      return
    }

    try {
      devLog('[voice] requesting microphone access...')
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } })
      devLog('[voice] microphone access granted')
      mediaStreamRef.current = stream
      audioChunksRef.current = []

      devLog('[voice] initializing MediaRecorder...')
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = recorder

      recorder.addEventListener('dataavailable', handleDataAvailable as EventListener)
      recorder.addEventListener('error', handleRecorderError as EventListener)
      recorder.addEventListener('stop', () => {
        devLog('[voice] recorder stopped, processing...')
        processRecording().finally(cleanupRecorder)
      })

      devLog('[voice] starting recorder...')
      recorder.start()
      setStatus('recording')
      devLog('[voice] recording started')
    } catch (recorderError) {
      console.error('[voice] recorder init failed', recorderError)
      setError(recorderError instanceof Error ? recorderError.message : '无法访问麦克风')
      setStatus('error')
      cleanupRecorder()
    }
  }, [cleanupRecorder, handleDataAvailable, handleRecorderError, processRecording])

  const stopRecording = useCallback(() => {
    if (status !== 'recording') return

    try {
      mediaRecorderRef.current?.stop()
    } catch (stopError) {
      console.error('[voice] stop recording failed', stopError)
      setError('停止录音失败，请重试')
      setStatus('error')
    }
  }, [status])

  const reset = useCallback(() => {
    setError(null)
    setTranscript('')
    setHistory([])
    setStatus('idle')
  }, [])

  const isRecording = useMemo(() => status === 'recording', [status])
  const isProcessing = useMemo(() => status === 'processing', [status])

  return {
    status,
    transcript,
    history,
    error,
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    reset,
  }
}

const convertToPcm16Base64 = async (arrayBuffer: ArrayBuffer) => {
  if (!isBrowser) {
    throw new Error('仅浏览器环境支持音频转换')
  }

  const audioContext = new AudioContext()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))

  const OfflineContext = getOfflineAudioContextConstructor()
  if (!OfflineContext) {
    await audioContext.close()
    throw new Error('当前浏览器不支持离线音频处理')
  }

  const targetSampleRate = 16000
  const offlineContext = new OfflineContext(1, Math.ceil(audioBuffer.duration * targetSampleRate), targetSampleRate)
  const source = offlineContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineContext.destination)
  source.start(0)

  const renderedBuffer = await offlineContext.startRendering()
  await audioContext.close()

  const channelData = renderedBuffer.getChannelData(0)
  const pcmBuffer = encodePcm16(channelData)

  return arrayBufferToBase64(pcmBuffer.buffer)
}

const encodePcm16 = (channelData: Float32Array) => {
  const buffer = new ArrayBuffer(channelData.length * 2)
  const view = new DataView(buffer)

  for (let i = 0; i < channelData.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, channelData[i]))
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }

  return new Int16Array(buffer)
}

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const getOfflineAudioContextConstructor = () => {
  if (!isBrowser) return null
  const globalScope = window as typeof window & {
    webkitOfflineAudioContext?: typeof OfflineAudioContext
  }
  return globalScope.OfflineAudioContext ?? globalScope.webkitOfflineAudioContext ?? null
}

type IFlyTekMessage = {
  code: number
  message?: string
  sid?: string
  data?: {
    status: number
    result?: {
      ws: Array<{
        cw: Array<{
          w: string
        }>
      }>
    }
  }
}

const sendAudioToIFlyTek = (signature: SpeechSignatureResponse, audioBase64: string) => {
  devLog('[voice] sendAudioToIFlyTek start, audio length:', audioBase64.length)
  return new Promise<string>((resolve, reject) => {
    const { host, path, authorization, date, appId } = signature
    
    // 构建 WebSocket URL - 参数必须按字母顺序排列
    const params = new URLSearchParams({
      authorization: authorization,
      date: date,
      host: host,
    })
    const url = `wss://${host}${path}?${params.toString()}`
    devLog('[voice] connecting to WebSocket:', url)

    let aggregatedText = ''
    let settled = false

    const socket = new WebSocket(url)

    socket.onopen = () => {
      devLog('[voice] WebSocket connected')
      const basePayload = {
        common: { app_id: appId },
        business: {
          language: 'zh_cn',
          domain: 'iat',
          accent: 'mandarin',
          vad_eos: 5000,
        },
      } as const

      // 分帧发送音频数据，每帧最大 8KB
      const CHUNK_SIZE = 8192 // 8KB per frame
      const totalFrames = Math.ceil(audioBase64.length / CHUNK_SIZE)
      devLog(`[voice] splitting audio into ${totalFrames} frames`)

      for (let i = 0; i < totalFrames; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, audioBase64.length)
        const chunk = audioBase64.slice(start, end)
        
        // status: 0=首帧, 1=中间帧, 2=尾帧
        // 当只有一帧时，直接设为 2（既是首帧也是尾帧）
        let status: number
        if (totalFrames === 1) {
          status = 2 // 单帧情况：直接标记为尾帧
        } else if (i === 0) {
          status = 0 // 首帧
        } else if (i === totalFrames - 1) {
          status = 2 // 尾帧
        } else {
          status = 1 // 中间帧
        }

        devLog(`[voice] sending frame ${i + 1}/${totalFrames}, status: ${status}, chunk size: ${chunk.length}`)
        
        socket.send(
          JSON.stringify({
            ...basePayload,
            data: {
              status,
              format: 'audio/L16;rate=16000',
              encoding: 'raw',
              audio: chunk,
            },
          }),
        )
      }
    }

    socket.onmessage = (event) => {
      devLog('[voice] received message:', event.data)
      try {
        const response = JSON.parse(event.data) as IFlyTekMessage
        if (response.code !== 0) {
          console.error('[voice] iFlyTek error code:', response.code, 'message:', response.message)
          throw new Error(response.message ?? `语音识别失败 (code: ${response.code})`)
        }

        if (response.data?.result?.ws) {
          const text = response.data.result.ws
            .map((item) => item.cw.map((word) => word.w).join(''))
            .join('')
          devLog('[voice] partial result:', text)
          aggregatedText += text
        }

        if (response.data?.status === 2) {
          devLog('[voice] recognition complete, final text:', aggregatedText)
          settled = true
          resolve(aggregatedText.trim())
          socket.close()
        }
      } catch (err) {
        console.error('[voice] message parse error:', err)
        settled = true
        socket.close()
        reject(err instanceof Error ? err : new Error('解析语音识别结果失败'))
      }
    }

    socket.onerror = (error) => {
      console.error('[voice] WebSocket error:', error)
      if (!settled) {
        settled = true
        reject(new Error('语音识别连接异常'))
      }
    }

    socket.onclose = (event) => {
      devLog('[voice] WebSocket closed, code:', event.code, 'reason:', event.reason)
      if (!settled && event.code !== 1000) {
        reject(new Error(event.reason || '语音识别连接被关闭'))
      }
    }
  })
}
