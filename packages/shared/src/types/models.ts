export interface User {
  id: string;
  phone: string;
  nickname: string;
  avatar: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: import('./enums').AccountType;
}

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  type: import('./enums').BillType;
  icon: string;
  isSystem: boolean;
}

export interface Bill {
  id: string;
  userId: string;
  amount: number;
  type: import('./enums').BillType;
  categoryId: string;
  accountId: string | null;
  date: string;
  remark: string;
  source: import('./enums').BillSource;
  payerId: string | null;
  visibility: import('./enums').BillVisibility;
  aiConfidence: import('./enums').AIConfidence | null;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string | null;
  amount: number;
  month: string;
}

export interface Family {
  id: string;
  name: string;
  creatorId: string;
  inviteCode: string;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: import('./enums').FamilyRole;
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'ai';
  content: string;
  billId: string | null;
  createdAt: string;
}
