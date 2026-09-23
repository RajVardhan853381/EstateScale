import { getRequestContext } from './context';

function formatLog(level: string, obj: Record<string, unknown>, msg: string, type?: string) {
  const ctx = getRequestContext();
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...(type ? { type } : {}),
    ...(ctx.requestId ? { traceId: ctx.requestId } : {}),
    ...(ctx.organizationId ? { organizationId: ctx.organizationId } : {}),
    ...(ctx.userId ? { userId: ctx.userId } : {}),
    msg,
    ...obj,
  });
}

export const logger = {
  info: (obj: Record<string, unknown>, msg: string) => console.log(formatLog('info', obj, msg)),
  error: (obj: Record<string, unknown>, msg: string) => console.error(formatLog('error', obj, msg)),
  warn: (obj: Record<string, unknown>, msg: string) => console.warn(formatLog('warn', obj, msg)),
};

export const auditLogger = {
  info: (obj: Record<string, unknown>, msg: string) =>
    console.log(formatLog('info', obj, msg, 'audit_event')),
  error: (obj: Record<string, unknown>, msg: string) =>
    console.error(formatLog('error', obj, msg, 'audit_event')),
  warn: (obj: Record<string, unknown>, msg: string) =>
    console.warn(formatLog('warn', obj, msg, 'audit_event')),
};

