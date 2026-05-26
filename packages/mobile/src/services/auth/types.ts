export interface LoginRequest {
  phone?: string;
  email?: string;
  password: string;
}

export interface RegisterRequest {
  phone?: string;
  email?: string;
  password: string;
  nickname?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    phone: string | null;
    email: string | null;
    nickname: string | null;
    avatar: string | null;
    createdAt: string;
  };
  token: string;
}
