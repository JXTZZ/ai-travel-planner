import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useBudgetStore, type BudgetSummary } from '../state/useBudgetStore'

const fetchBudgetSummaries = async (): Promise<BudgetSummary[]> => {
  const { data, error } = await supabase
    .from('expenses')
    .select('trip_id, amount, currency')

  if (error) {
    if (error.code === '42P01') {
      console.warn('[useBudgetSummaries] expenses table not found. Did you run migrations?')
      return []
    }
    throw error
  }

  const grouped = new Map<string, { spent: number; currency: string }>()

  for (const expense of data ?? []) {
    if (!expense.trip_id) continue
    const group = grouped.get(expense.trip_id) ?? { spent: 0, currency: expense.currency ?? 'CNY' }
    group.spent += Number(expense.amount ?? 0)
    group.currency = expense.currency ?? group.currency
    grouped.set(expense.trip_id, group)
  }

  return Array.from(grouped.entries()).map(([tripId, value]) => ({
    tripId,
    planned: 0,
    spent: value.spent,
    currency: value.currency,
  }))
}

export const useBudgetSummaries = () => {
  const setSummaries = useBudgetStore((state) => state.setSummaries)

  const query = useQuery({
    queryKey: ['budget-summaries'],
    queryFn: fetchBudgetSummaries,
  })

  useEffect(() => {
    if (query.data) {
      setSummaries(query.data)
    }
  }, [query.data, setSummaries])

  return query
}
