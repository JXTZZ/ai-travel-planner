import { supabase } from './supabaseClient'

export type SpeechSignatureResponse = {
	appId: string
	host: string
	path: string
	date: string
	authorization: string
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
