export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const sessionExpiredEvent = 'lh-oj:session-expired';

export function sessionExpiredError(message = '登录已失效，请重新登录。'): ApiError {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(sessionExpiredEvent));
  return new ApiError(message);
}
