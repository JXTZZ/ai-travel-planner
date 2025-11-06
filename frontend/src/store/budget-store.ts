import { create } from 'zustand';

export type ExpenseRecord = {
  id: string;
  category: string;
  amount: number;
  note?: string;
  createdAt: string;
  source: 'manual' | 'voice';
};

type BudgetState = {
  totalBudget: number;
  expenses: ExpenseRecord[];
  addExpense: (record: Omit<ExpenseRecord, 'id' | 'createdAt'>) => void;
  setBudget: (value: number) => void;
};

export const useBudgetStore = create<BudgetState>((set) => ({
  totalBudget: 12000,
  expenses: [],
  addExpense(record) {
    set((state) => ({
      expenses: [
        ...state.expenses,
        {
          ...record,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString()
        }
      ]
    }));
  },
  setBudget(value) {
    set({ totalBudget: Math.max(0, value) });
  }
}));
