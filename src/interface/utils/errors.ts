export const AppCode = {
  // 成功
  OK: 0,

  // 10xxx - 请求参数错误
  VALIDATION_ERROR: 10001,

  // 20xxx - 认证 / 鉴权
  INVALID_CREDENTIALS: 20001,
  UNAUTHORIZED: 20002,
  TOKEN_EXPIRED: 20003,

  // 404xx - 资源不存在
  NOT_FOUND: 40400,

  // 500xx - 服务器内部错误
  INTERNAL_ERROR: 50000,
} as const;

export type AppCode = (typeof AppCode)[keyof typeof AppCode];

const codeMessages: Record<AppCode, string> = {
  [AppCode.OK]: 'ok',
  [AppCode.VALIDATION_ERROR]: 'Validation error',
  [AppCode.INVALID_CREDENTIALS]: 'Invalid credentials',
  [AppCode.UNAUTHORIZED]: 'Unauthorized',
  [AppCode.TOKEN_EXPIRED]: 'Token expired',
  [AppCode.NOT_FOUND]: 'Not found',
  [AppCode.INTERNAL_ERROR]: 'Internal server error',
};

export class AppError extends Error {
  constructor(
    public readonly appCode: AppCode,
    public readonly httpStatus: number,
    message?: string,
  ) {
    super(message ?? codeMessages[appCode]);
  }
}

export const Errors = {
  validationError: (msg?: string) => new AppError(AppCode.VALIDATION_ERROR, 400, msg),
  invalidCredentials: () => new AppError(AppCode.INVALID_CREDENTIALS, 401),
  unauthorized: () => new AppError(AppCode.UNAUTHORIZED, 401),
  tokenExpired: () => new AppError(AppCode.TOKEN_EXPIRED, 401),
  notFound: (msg?: string) => new AppError(AppCode.NOT_FOUND, 404, msg),
  internal: () => new AppError(AppCode.INTERNAL_ERROR, 500),
} as const;
