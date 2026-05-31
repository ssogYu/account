import api from '../api';
import type { ApiResponse } from '../../shared';
import type {
  FamilyInfo,
  CreateFamilyRequest,
  JoinFamilyRequest,
} from './types';

export const familyService = {
  getMyFamily() {
    return api.get<ApiResponse<FamilyInfo | null>>('/family');
  },

  create(data: CreateFamilyRequest) {
    return api.post<ApiResponse<FamilyInfo>>('/family/create', data);
  },

  join(data: JoinFamilyRequest) {
    return api.post<ApiResponse<FamilyInfo>>('/family/join', data);
  },

  leave() {
    return api.post<ApiResponse<{ dissolved: boolean }>>('/family/leave');
  },

  removeMember(memberId: string) {
    return api.delete<ApiResponse<{ success: boolean }>>(`/family/member/${memberId}`);
  },
};
