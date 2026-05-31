export interface FamilyMemberUser {
  id: string;
  nickname: string | null;
  avatar: string | null;
  phone: string | null;
}

export interface FamilyMember {
  id: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
  user: FamilyMemberUser;
}

export interface FamilyInfo {
  id: string;
  name: string;
  creatorId: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
  members: FamilyMember[];
  myRole?: 'owner' | 'member';
}

export interface CreateFamilyRequest {
  name: string;
}

export interface JoinFamilyRequest {
  inviteCode: string;
}
