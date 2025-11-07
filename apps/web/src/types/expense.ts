export type ExpenseCategory = '交通' | '住宿' | '餐饮' | '门票' | '购物' | '其他'

export type Expense = {
  id: string
  trip_id: string
  category: ExpenseCategory
  amount: number
  currency: string
  note?: string
  incurred_at: string
  created_by: string
}

export type ExpenseInput = {
  tripId: string
  category: ExpenseCategory
  amount: number
  currency: string
  note?: string
  incurredAt?: string
}
