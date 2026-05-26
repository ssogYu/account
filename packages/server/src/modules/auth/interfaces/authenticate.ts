export interface AuthenticatedUser {
  id: number;
  email: string;
  phone: string;
  nickname?: string;
  avatar?: string | null;
}
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
