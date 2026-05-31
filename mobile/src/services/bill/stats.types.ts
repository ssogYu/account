export interface CategoryStatItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface CategoryStats {
  month: string;
  type: string;
  totalAmount: number;
  items: CategoryStatItem[];
}

export interface DailyStatItem {
  date: string;
  expense: number;
  income: number;
}

export interface DailyStats {
  month: string;
  items: DailyStatItem[];
}

export interface MonthlyComparison {
  current: {
    month: string;
    totalExpense: number;
    totalIncome: number;
    balance: number;
  };
  previous: {
    month: string;
    totalExpense: number;
    totalIncome: number;
    balance: number;
  };
  expenseChange: number;
  incomeChange: number;
}
