import { supabase } from './supabaseClient'

export type SpeechSignatureResponse = {
  appId: string
  host: string
  path: string
  date: string
  authorization: string
}

export type PlanItineraryRequest = {
  prompt: string
  tripId?: string
  userId?: string
}

export type PlanItineraryResponse = {
  transcript_id: string | null
  raw: {
    choices: Array<{
      message: {
        content: string
      }
    }>
  }
}

export const fetchSpeechSignature = async () => {
  const { data, error } = await supabase.functions.invoke<SpeechSignatureResponse>('speech-signature', {
    body: {},
  })

  if (error) {
    throw new Error(error.message ?? '无法获取语音签名')
  }

  if (!data) {
    throw new Error('语音签名响应为空')
  }

  return data
}

export const planItinerary = async (request: PlanItineraryRequest) => {
  const { data, error } = await supabase.functions.invoke<PlanItineraryResponse>('plan-itinerary', {
    body: request,
  })

  if (error) {
    throw new Error(error.message ?? '行程规划失败')
  }

  if (!data) {
    throw new Error('行程规划响应为空')
  }

  return data
}