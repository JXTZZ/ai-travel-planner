import { create } from 'zustand'

export type BudgetSummary = {
  tripId: string
  planned: number
  spent: number
  currency: string
}

type BudgetState = {
  summaries: BudgetSummary[]
  setSummaries: (items: BudgetSummary[]) => void
  updateSummary: (tripId: string, changes: Partial<BudgetSummary>) => void
}

export const useBudgetStore = create<BudgetState>((set) => ({
  summaries: [],
  setSummaries: (items) => set({ summaries: items }),
  updateSummary: (tripId, changes) =>
    set((state) => ({
      summaries: state.summaries.map((summary) =>
        summary.tripId === tripId ? { ...summary, ...changes } : summary,
      ),
    })),
}))
