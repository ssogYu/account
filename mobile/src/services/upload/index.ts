import api from '../api';
import type { ApiResponse } from '../../shared';
import type { ChatAttachment } from '../chat/types';

export interface UploadResponse {
  url: string;
}

export interface UploadChatImageResponse {
  attachment: ChatAttachment;
}

interface UploadImageAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number;
  height?: number;
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

  async uploadChatImage(asset: UploadImageAsset): Promise<ChatAttachment> {
    const filename = asset.fileName || asset.uri.split('/').pop() || 'chat-image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    const mimeTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const mimeType = asset.mimeType || mimeTypeMap[ext] || 'image/jpeg';

    const formData = new FormData();
    formData.append(
      'file',
      {
        uri: asset.uri,
        name: filename,
        type: mimeType,
      } as unknown as Blob,
    );
    if (asset.width) formData.append('width', String(asset.width));
    if (asset.height) formData.append('height', String(asset.height));

    const { data } = await api.post<ApiResponse<UploadChatImageResponse>>(
      '/upload/chat-image',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );

    return data.data.attachment;
  },
};
