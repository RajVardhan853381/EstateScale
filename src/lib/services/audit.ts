import { prisma } from '@/lib/prisma';
import { auditLogger } from '@/lib/observability/logger';
import { Prisma } from '@prisma/client';

export interface RecordAuditLogParams {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  changes?: Record<string, unknown> | null;
}

/**
 * Records an immutable administrative or security audit log entry.
 */
export async function recordAuditLog(params: RecordAuditLogParams) {
  try {
    const entry = await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId || null,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        changes: params.changes ? (params.changes as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    auditLogger.info(
      {
        auditLogId: entry.id,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
      },
      `Audit log recorded: ${params.action}`
    );

    return entry;
  } catch (error: unknown) {
    // Audit logging failure should not abort critical user transactions, but must be alerted
    auditLogger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        action: params.action,
      },
      'Failed to persist audit log entry'
    );
    return null;
  }
}
