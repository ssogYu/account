import type { AccountType, BillType, BillSource, BillVisibility, AIConfidence, FamilyRole } from './enums';

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
  type: AccountType;
}

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  type: BillType;
  icon: string;
  isSystem: boolean;
}

export interface Bill {
  id: string;
  userId: string;
  amount: number;
  type: BillType;
  categoryId: string;
  accountId: string | null;
  date: string;
  remark: string;
  source: BillSource;
  payerId: string | null;
  visibility: BillVisibility;
  aiConfidence: AIConfidence | null;
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
  role: FamilyRole;
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
