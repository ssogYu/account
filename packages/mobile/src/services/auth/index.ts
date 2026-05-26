import api from '../api';
import type { ApiResponse } from '@ai-account/shared';
import type { LoginRequest, RegisterRequest, AuthResponse } from './types';

export const authService = {
  login(data: LoginRequest) {
    return api.post<ApiResponse<AuthResponse>>('/auth/login', data);
  },

  register(data: RegisterRequest) {
    return api.post<ApiResponse<AuthResponse>>('/auth/register', data);
  },
};
