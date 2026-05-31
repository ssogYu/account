export interface Account {
  id: string;
  userId: string | null;
  name: string;
  isSystem: boolean;
}

export interface CreateAccountParams {
  name: string;
}

export interface UpdateAccountParams {
  name?: string;
}
