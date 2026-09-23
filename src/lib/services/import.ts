import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/observability/logger';

// Safe CSV Record Schema
export const CsvRecordSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    source: z.string().optional(),
  })
  .refine((data) => data.email || data.phone || (data.firstName && data.lastName), {
    message: 'Record must contain at least an email, phone, or full name to be meaningful.',
  });

export type ValidCsvRecord = z.infer<typeof CsvRecordSchema>;

export class ImportService {
  /**
   * Recovers import jobs stuck in PROCESSING state due to terminated serverless instances
   * or worker crashes older than the specified threshold.
   */
  static async recoverStaleImportJobs(staleThresholdMs: number = 15 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - staleThresholdMs);
    const stale = await prisma.importJob.updateMany({
      where: {
        status: 'PROCESSING',
        createdAt: { lte: cutoff },
      },
      data: {
        status: 'FAILED',
      },
    });

    if (stale.count > 0) {
      logger.warn({ count: stale.count, cutoff }, 'Recovered stale PROCESSING import jobs');
    }

    return stale.count;
  }

  static async queueCsvImport(organizationId: string, mappedRecords: unknown[]) {
    if (!Array.isArray(mappedRecords)) throw new Error('Invalid records format');
    if (mappedRecords.length > 5000) throw new Error('Max 5000 records allowed per import batch');

    // 1. Validate records
    const validRecords: ValidCsvRecord[] = [];
    let skipped = 0;

    for (const record of mappedRecords) {
      const parsed = CsvRecordSchema.safeParse(record);
      if (parsed.success) {
        validRecords.push(parsed.data);
      } else {
        skipped++;
      }
    }

    // 2. Initialize tracking job
    const importJob = await prisma.importJob.create({
      data: {
        organizationId,
        status: 'PROCESSING',
        totalRecords: validRecords.length + skipped,
        skipped,
        imported: 0,
        failed: 0,
      },
    });

    let importedCount = 0;
    let failedCount = 0;

    // 3. Batch chunking (100 records per transaction to eliminate N+1 latency)
    const CHUNK_SIZE = 100;
    const chunks: ValidCsvRecord[][] = [];
    for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
      chunks.push(validRecords.slice(i, i + CHUNK_SIZE));
    }

    try {
      for (const chunk of chunks) {
        await prisma.$transaction(
          async (tx) => {
            // Batch pre-fetch existing contacts for all emails and phones in this chunk
            const emails = chunk.map((r) => r.email).filter(Boolean) as string[];
            const phones = chunk.map((r) => r.phone).filter(Boolean) as string[];

            const orConditions: Array<{ email?: { in: string[] }; phone?: { in: string[] } }> = [];
            if (emails.length > 0) orConditions.push({ email: { in: emails } });
            if (phones.length > 0) orConditions.push({ phone: { in: phones } });

            const existingContacts =
              orConditions.length > 0
                ? await tx.contact.findMany({
                    where: {
                      organizationId,
                      OR: orConditions,
                    },
                  })
                : [];

            // Local cache maps for fast chunk resolution and intra-chunk deduplication
            const contactByEmail = new Map<string, string>();
            const contactByPhone = new Map<string, string>();

            for (const c of existingContacts) {
              if (c.email) contactByEmail.set(c.email.toLowerCase(), c.id);
              if (c.phone) contactByPhone.set(c.phone, c.id);
            }

            for (const record of chunk) {
              try {
                const normEmail = record.email ? record.email.toLowerCase() : null;
                const normPhone = record.phone || null;

                let contactId: string | undefined = undefined;
                if (normEmail && contactByEmail.has(normEmail)) {
                  contactId = contactByEmail.get(normEmail);
                } else if (normPhone && contactByPhone.has(normPhone)) {
                  contactId = contactByPhone.get(normPhone);
                }

                if (!contactId) {
                  const newContact = await tx.contact.create({
                    data: {
                      organizationId,
                      firstName: record.firstName || null,
                      lastName: record.lastName || null,
                      email: record.email || null,
                      phone: record.phone || null,
                    },
                  });
                  contactId = newContact.id;
                  if (normEmail) contactByEmail.set(normEmail, contactId);
                  if (normPhone) contactByPhone.set(normPhone, contactId);
                }

                await tx.lead.create({
                  data: {
                    organizationId,
                    contactId,
                    source: record.source || 'Import',
                    status: 'NEW',
                  },
                });

                importedCount++;
              } catch (recErr) {
                logger.warn({ recErr, record }, 'Failed to import individual record in chunk');
                failedCount++;
              }
            }
          },
          { timeout: 30000 }
        );

        // Update progress on job
        await prisma.importJob.update({
          where: { id: importJob.id },
          data: {
            imported: importedCount,
            failed: failedCount,
          },
        });
      }

      // Mark completed
      return await prisma.importJob.update({
        where: { id: importJob.id },
        data: {
          status: 'COMPLETED',
          imported: importedCount,
          failed: failedCount,
        },
      });
    } catch (batchErr) {
      logger.error({ batchErr, importJobId: importJob.id }, 'Critical CSV batch import failure');
      return await prisma.importJob.update({
        where: { id: importJob.id },
        data: {
          status: 'FAILED',
          imported: importedCount,
          failed: validRecords.length - importedCount,
        },
      });
    }
  }
}
