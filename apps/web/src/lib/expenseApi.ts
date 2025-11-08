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

export const updateExpense = async (expenseId: string, input: Partial<ExpenseInput>): Promise<Expense> => {
  const updateData: Record<string, unknown> = {}
  
  if (input.category !== undefined) updateData.category = input.category
  if (input.amount !== undefined) updateData.amount = input.amount
  if (input.currency !== undefined) updateData.currency = input.currency
  if (input.note !== undefined) updateData.note = input.note
  if (input.incurredAt !== undefined) updateData.incurred_at = input.incurredAt

  const { data, error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', expenseId)
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
