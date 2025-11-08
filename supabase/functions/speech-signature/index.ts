// @ts-ignore: Supabase Edge Function runs on Deno runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

// @ts-ignore Deno global is injected by Supabase.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const appId = Deno.env.get('IFLYTEK_APP_ID')
const apiKey = Deno.env.get('IFLYTEK_API_KEY')
const apiSecret = Deno.env.get('IFLYTEK_API_SECRET')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}

const DEFAULT_HOST = 'iat-api.xfyun.cn'
const DEFAULT_PATH = '/v2/iat'

async function generateSignature(host: string, path: string) {
  if (!apiKey || !apiSecret) {
    throw new Error('Missing iFlyTek credentials')
  }

  const date = new Date().toUTCString()
  
  // iFlyTek WebSocket API 签名原文格式: host: xxx\ndate: xxx\nGET /v2/iat HTTP/1.1
  // 注意：request-line 使用 GET，不是 POST
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`

  console.log('[speech-signature] signature origin:', signatureOrigin)

  const encoder = new TextEncoder()
  const keyData = encoder.encode(apiSecret)
  const signingKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBytes = await crypto.subtle.sign('HMAC', signingKey, encoder.encode(signatureOrigin))
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))

  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
  const authorization = btoa(authorizationOrigin)

  console.log('[speech-signature] authorization origin:', authorizationOrigin)
  console.log('[speech-signature] authorization base64:', authorization)

  return {
    appId,
    host,
    path,
    date,
    authorization,
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  if (!appId || !apiKey || !apiSecret) {
    return new Response('Server misconfiguration', { status: 500, headers: corsHeaders })
  }

  let body: { host?: string; path?: string } | null = null
  try {
    body = await req.json()
  } catch (_error) {
    // Allow empty body
  }

  const host = body?.host ?? DEFAULT_HOST
  const path = body?.path ?? DEFAULT_PATH

  try {
    const signature = await generateSignature(host, path)
    return new Response(JSON.stringify(signature), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error) {
    console.error('[speech-signature] Failed to generate signature', error)
    return new Response('Failed to generate signature', { status: 500, headers: corsHeaders })
  }
})
