import api from '../api';
import type { ApiResponse } from '@ai-account/shared';

export interface UploadResponse {
  url: string;
}

export const uploadService = {
  async uploadImage(uri: string): Promise<string> {
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    const mimeTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const mimeType = mimeTypeMap[ext] || 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);

    const { data } = await api.post<ApiResponse<UploadResponse>>('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // MinIO 返回的已是完整 URL（如 http://localhost:9000/account/avatars/xxx.jpg）
    return data.data.url;
  },
};
