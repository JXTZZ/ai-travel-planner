// @ts-ignore: Supabase Edge Function runs on Deno runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// eslint-disable-next-line import/no-relative-packages
import { supabaseAdmin } from '../_shared/supabaseClient.ts'

// @ts-ignore Supabase Edge Function environment.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!supabaseUrl) {
    return new Response('Server misconfiguration', { status: 500 })
  }

  type BudgetRequestBody = {
    tripId: string
  }

  let body: BudgetRequestBody | null = null
  try {
    body = await req.json()
  } catch (_error) {
    return new Response('Invalid JSON payload', { status: 400 })
  }

  if (!body?.tripId) {
    return new Response('tripId is required', { status: 422 })
  }

  const { tripId } = body

  try {
    type ExpenseRow = {
      amount: number | null
      currency: string | null
    }

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .select('amount, currency')
      .eq('trip_id', tripId)

    if (error) {
      throw error
    }

    const expenses = (data ?? []) as ExpenseRow[]
    const total = expenses.reduce((acc, expense) => acc + Number(expense.amount ?? 0), 0)

    return new Response(
      JSON.stringify({
        tripId,
        total,
        currency: expenses[0]?.currency ?? 'CNY',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('[budget-sync] Failed to aggregate expenses', error)
    return new Response('Failed to aggregate expenses', { status: 500 })
  }
})
