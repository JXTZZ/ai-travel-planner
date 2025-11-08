import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useBudgetStore, type BudgetSummary } from '../state/useBudgetStore'

const fetchBudgetSummaries = async (): Promise<BudgetSummary[]> => {
  // 获取所有行程的预算信息
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('id, budget_total, budget_currency')

  if (tripsError) {
    throw tripsError
  }

  // 获取所有费用记录
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('trip_id, amount, currency')

  if (expensesError) {
    if (expensesError.code === '42P01') {
      console.warn('[useBudgetSummaries] expenses table not found. Did you run migrations?')
      return []
    }
    throw expensesError
  }

  // 按行程分组计算支出
  const spentByTrip = new Map<string, { spent: number; currency: string }>()

  for (const expense of expenses ?? []) {
    if (!expense.trip_id) continue
    const group = spentByTrip.get(expense.trip_id) ?? { spent: 0, currency: expense.currency ?? 'CNY' }
    group.spent += Number(expense.amount ?? 0)
    group.currency = expense.currency ?? group.currency
    spentByTrip.set(expense.trip_id, group)
  }

  // 合并行程预算和实际支出
  return (trips ?? []).map((trip) => {
    const spent = spentByTrip.get(trip.id)
    return {
      tripId: trip.id,
      planned: Number(trip.budget_total ?? 0),
      spent: spent?.spent ?? 0,
      currency: trip.budget_currency ?? spent?.currency ?? 'CNY',
    }
  })
}

export const useBudgetSummaries = () => {
  const setSummaries = useBudgetStore((state) => state.setSummaries)

  const query = useQuery({
    queryKey: ['budget-summaries'],
    queryFn: fetchBudgetSummaries,
    staleTime: 30000, // 30秒内不重复请求
  })

  useEffect(() => {
    if (query.data) {
      setSummaries(query.data)
    }
  }, [query.data, setSummaries])

  return query
}
