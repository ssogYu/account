import api from '../api';
import type { ApiResponse } from '../../shared';
import type { LoginRequest, RegisterRequest, AuthResponse, UpdateProfileRequest } from './types';

export const authService = {
  login(data: LoginRequest) {
    return api.post<ApiResponse<AuthResponse>>('/auth/login', data);
  },

  register(data: RegisterRequest) {
    return api.post<ApiResponse<AuthResponse>>('/auth/register', data);
  },

  updateProfile(data: UpdateProfileRequest) {
    return api.patch<ApiResponse<AuthResponse['user']>>('/auth/profile', data);
  },
};
