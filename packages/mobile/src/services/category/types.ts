export interface Category {
  id: string;
  userId: string | null;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  isSystem: boolean;
}

export interface CreateCategoryParams {
  name: string;
  type: 'expense' | 'income';
  icon: string;
}

export interface UpdateCategoryParams {
  name?: string;
  icon?: string;
}

export interface QueryCategoryParams {
  type?: 'expense' | 'income';
}
