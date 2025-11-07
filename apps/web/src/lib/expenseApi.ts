import { supabase } from '../lib/supabaseClient'
import type { Expense, ExpenseInput } from '../types/expense'

export const addExpense = async (input: ExpenseInput, userId: string): Promise<Expense> => {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      trip_id: input.tripId,
      category: input.category,
      amount: input.amount,
      currency: input.currency,
      note: input.note,
      incurred_at: input.incurredAt ?? new Date().toISOString(),
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Expense
}

export const getExpensesByTrip = async (tripId: string): Promise<Expense[]> => {
  const { data, error } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('incurred_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data as Expense[]
}

export const deleteExpense = async (expenseId: string): Promise<void> => {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId)

  if (error) {
    throw new Error(error.message)
  }
}
