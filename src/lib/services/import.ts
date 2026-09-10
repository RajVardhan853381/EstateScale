import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Safe CSV Record Schema
const CsvRecordSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.string().optional(),
}).refine(data => data.email || data.phone || (data.firstName && data.lastName), {
  message: "Record must contain at least an email, phone, or full name to be meaningful."
});

export class ImportService {
  static async queueCsvImport(organizationId: string, mappedRecords: unknown[]) {
    if (!Array.isArray(mappedRecords)) throw new Error("Invalid records format");
    if (mappedRecords.length > 5000) throw new Error("Max 5000 records allowed per import batch");

    // 1. Validate records
    const validRecords: z.infer<typeof CsvRecordSchema>[] = [];
    let skipped = 0;

    for (const record of mappedRecords) {
       const parsed = CsvRecordSchema.safeParse(record);
       if (parsed.success) {
           validRecords.push(parsed.data);
       } else {
           skipped++;
       }
    }

    // 2. Process records safely (simulated worker or batch processing)
    // For approximately 20 clients scale, doing batch inserts here directly in chunks of 500 is okay,
    // or passing to the background worker. We'll do a synchronous batch insert for simplicity.

    const importJob = await prisma.importJob.create({
      data: {
        organizationId,
        status: "PROCESSING",
        totalRecords: validRecords.length + skipped,
        skipped,
        imported: 0,
        failed: 0
      }
    });

    let importedCount = 0;
    let failedCount = 0;

    // Batch processing to avoid N+1 transaction hangs
    // For large imports, split into chunks of 50
    const chunks = [];
    for (let i = 0; i < validRecords.length; i += 50) {
        chunks.push(validRecords.slice(i, i + 50));
    }

    for (const chunk of chunks) {
       for (const record of chunk) {
         try {
            await prisma.$transaction(async (tx) => {
               let existingContact = null;
               if (record.email) {
                   existingContact = await tx.contact.findFirst({
                      where: { organizationId, email: record.email }
                   });
               } else if (record.phone) {
                   existingContact = await tx.contact.findFirst({
                      where: { organizationId, phone: record.phone }
                   });
               }

               let contactId = existingContact?.id;

               if (!contactId) {
                   const contact = await tx.contact.create({
                       data: {
                           organizationId,
                           firstName: record.firstName,
                           lastName: record.lastName,
                           email: record.email || null,
                           phone: record.phone || null
                       }
                   });
                   contactId = contact.id;
               } else {
                   // Optional safe update of missing fields could go here
               }

               // Duplicate handling strategy check (Currently "CREATE" new lead under existing contact)
               // This prevents silent data loss of leads.
               await tx.lead.create({
                   data: {
                       organizationId,
                       contactId,
                       source: record.source || "Import",
                       status: "NEW"
                   }
               });
            });
            importedCount++;
         } catch {
             failedCount++;
         }
       }
    }

    // Update job status
    const finalizedJob = await prisma.importJob.update({
       where: { id: importJob.id },
       data: {
          status: "COMPLETED",
          imported: importedCount,
          failed: failedCount
       }
    });

    return finalizedJob;
  }
}
