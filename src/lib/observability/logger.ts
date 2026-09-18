export const logger = {
  info: (obj: Record<string, unknown>, msg: string) =>
    console.log(JSON.stringify({ level: 'info', msg, ...obj })),
  error: (obj: Record<string, unknown>, msg: string) =>
    console.error(JSON.stringify({ level: 'error', msg, ...obj })),
  warn: (obj: Record<string, unknown>, msg: string) =>
    console.warn(JSON.stringify({ level: 'warn', msg, ...obj })),
};

export const auditLogger = {
  info: (obj: Record<string, unknown>, msg: string) =>
    console.log(JSON.stringify({ level: 'info', type: 'audit_event', msg, ...obj })),
  error: (obj: Record<string, unknown>, msg: string) =>
    console.error(JSON.stringify({ level: 'error', type: 'audit_event', msg, ...obj })),
  warn: (obj: Record<string, unknown>, msg: string) =>
    console.warn(JSON.stringify({ level: 'warn', type: 'audit_event', msg, ...obj })),
};
