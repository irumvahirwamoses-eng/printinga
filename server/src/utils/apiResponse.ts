export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
}

export function ok<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, ...(message ? { message } : {}) };
}

export function fail(message: string, errors?: unknown): ApiResponse<never> {
  return { success: false, message, ...(errors ? { errors } : {}) };
}
