import pino from 'pino';

// Define sensitive fields to redact from logs
const redactionPaths = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'cookie',
  'authorization',
  'headers.authorization',
  'headers.cookie',
  'x-twilio-signature',
  'TWILIO_AUTH_TOKEN',
  'AUTH_SECRET',
  'OPENAI_API_KEY',
  'body', // General precaution against logging raw sensitive POST bodies
  'email',
  'phone',
  'firstName',
  'lastName'
];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  redact: {
    paths: redactionPaths,
    censor: '[REDACTED]',
  },
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

export default logger;
