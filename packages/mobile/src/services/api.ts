import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { ApiResponse } from '@ai-account/shared';
import { ErrorCode } from '@ai-account/shared';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:3000';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截：自动附加 token
api.interceptors.request.use((config) => {
  const token = __getToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一处理错误
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (!error.response) {
      // 网络错误或超时
      return Promise.reject(new AppError('网络连接失败，请检查网络设置'));
    }

    const { status, data } = error.response;

    // 401 未授权 → 自动登出
    if (status === 401 || data?.code === ErrorCode.UNAUTHORIZED) {
      __onUnauthorized?.();
    }

    // 业务错误 → 提取服务端消息
    const message = data?.message ?? getDefaultErrorMessage(status);
    return Promise.reject(new AppError(message, status));
  },
);

function getDefaultErrorMessage(status: number): string {
  const map: Record<number, string> = {
    400: '请求参数错误',
    401: '未授权，请重新登录',
    403: '无权限访问',
    404: '资源不存在',
    409: '资源冲突',
    429: '请求过于频繁',
    500: '服务器内部错误',
    502: '网关错误',
    503: '服务不可用',
  };
  return map[status] ?? '请求失败';
}

// 自定义错误类，方便调用方区分错误类型
export class AppError extends Error {
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

// Token getter/setter — 由 auth store 注册，避免循环依赖
let __getToken: (() => string | null) | null = null;
let __onUnauthorized: (() => void) | null = null;

export function registerTokenGetter(getter: () => string | null) {
  __getToken = getter;
}

export function registerUnauthorizedHandler(handler: () => void) {
  __onUnauthorized = handler;
}

export default api;
