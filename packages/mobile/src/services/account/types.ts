export interface Account {
  id: string;
  userId: string | null;
  name: string;
  icon: string;
  isSystem: boolean;
}

export interface CreateAccountParams {
  name: string;
  icon: string;
}

export interface UpdateAccountParams {
  name?: string;
  icon?: string;
}
