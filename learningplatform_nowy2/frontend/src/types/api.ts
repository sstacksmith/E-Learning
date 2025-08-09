export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  error?: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface ApiRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  signal?: AbortSignal;
}

export interface ApiMethods {
  get<T>(url: string, config?: ApiRequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<T>;
  delete<T>(url: string, config?: ApiRequestConfig): Promise<T>;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  status: number;
  timestamp: string;
}
