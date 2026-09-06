import pino from 'pino';

const errSerializer = (err: Record<string, unknown> | Error | null) => {
  if (!err) return err;
  const errorObj = {
    type: (err as Error).name || 'Error',
    message: (err as Error).message,
    code: (err as Record<string, unknown>).code || (err as Record<string, unknown>).statusCode || undefined,
  };
  if (process.env.NODE_ENV !== 'production') {
    (errorObj as Record<string, unknown>).stack = (err as Error).stack;
  }
  if ((err as Record<string, unknown>).requestId) (errorObj as Record<string, unknown>).requestId = (err as Record<string, unknown>).requestId;
  if ((err as Record<string, unknown>).correlationId) (errorObj as Record<string, unknown>).correlationId = (err as Record<string, unknown>).correlationId;
  return errorObj;
};

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'email', '*.email', 'phone', '*.phone', 'phoneNumber', '*.phoneNumber',
      'body', '*.body', 'smsBody', '*.smsBody', 'password', '*.password',
      'token', '*.token', 'accessToken', '*.accessToken', 'refreshToken', '*.refreshToken',
      'cookie', '*.cookie', 'authorization', '*.authorization', 'apiKey', '*.apiKey',
      '*.secret', 'secret', 'databaseUrl', 'redisUrl', 'DATABASE_URL', 'REDIS_URL'
    ],
    censor: '[REDACTED]'
  },
  serializers: {
    err: errSerializer,
    error: errSerializer,
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});
