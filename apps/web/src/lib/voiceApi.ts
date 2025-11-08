import { supabase } from './supabaseClient'
import type { VoiceTranscriptRecord } from '../types/voice'

export const fetchVoiceTranscripts = async (): Promise<VoiceTranscriptRecord[]> => {
  const { data, error } = await supabase
    .from('voice_transcripts')
    .select('id, trip_id, content, transcribed_at')
    .order('transcribed_at', { ascending: false })

  if (error) {
    throw new Error(`获取语音记录失败: ${error.message}`)
  }

  return (
    data?.map((item) => ({
      id: item.id,
      tripId: item.trip_id,
      content: item.content,
      transcribedAt: item.transcribed_at,
    })) ?? []
  )
}

export const createVoiceTranscript = async (content: string, options?: { tripId?: string | null }): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('保存语音记录失败：用户未登录')
  }

  const { error } = await supabase.from('voice_transcripts').insert({
    content,
    trip_id: options?.tripId ?? null,
    user_id: user.id,
  })

  if (error) {
    throw new Error(`保存语音记录失败: ${error.message}`)
  }
}

export const deleteVoiceTranscript = async (id: string): Promise<void> => {
  const { error } = await supabase.from('voice_transcripts').delete().eq('id', id)

  if (error) {
    throw new Error(`删除语音记录失败: ${error.message}`)
  }
}

export const clearVoiceTranscripts = async (): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('清空语音记录失败：用户未登录')
  }

  const { error } = await supabase
    .from('voice_transcripts')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`清空语音记录失败: ${error.message}`)
  }
}
