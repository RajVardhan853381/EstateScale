import { randomUUID } from 'crypto';
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";

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
       try {
           await prisma.$transaction(async (tx) => {
               // 1. Gather all emails and phones in the chunk
               const emails = chunk.map(r => r.email).filter(Boolean) as string[];
               const phones = chunk.map(r => r.phone).filter(Boolean) as string[];

               // 2. Pre-fetch existing contacts
               const existingContacts = await tx.contact.findMany({
                   where: {
                       organizationId,
                       OR: [
                           { email: { in: emails } },
                           { phone: { in: phones } }
                       ]
                   }
               });

               const contactByEmail = new Map<string, any>();
               const contactByPhone = new Map<string, any>();

               for (const c of existingContacts) {
                   if (c.email) contactByEmail.set(c.email, c);
                   if (c.phone) contactByPhone.set(c.phone, c);
               }

               const newContactCacheByEmail = new Map<string, any>();
               const newContactCacheByPhone = new Map<string, any>();

               // Array to track the resolved contact ID for each record in the chunk
               // This maps 1:1 with the chunk array.
               const resolvedContactIds: string[] = [];

               // 3. Generate missing contacts to insert and resolve IDs
               const contactsToInsert = [];
               for (const record of chunk) {
                   let existingContact = null;

                   // Try to find by email first
                   if (record.email) {
                       existingContact = contactByEmail.get(record.email) || newContactCacheByEmail.get(record.email);
                   }
                   // If not found by email, try phone
                   if (!existingContact && record.phone) {
                       existingContact = contactByPhone.get(record.phone) || newContactCacheByPhone.get(record.phone);
                   }

                   if (existingContact?.id) {
                       resolvedContactIds.push(existingContact.id);
                   } else {
                       // Must create a new contact
                       const newId = randomUUID();
                       const newContact = {
                           id: newId,
                           organizationId,
                           firstName: record.firstName,
                           lastName: record.lastName,
                           email: record.email || null,
                           phone: record.phone || null
                       };

                       contactsToInsert.push(newContact);
                       if (record.email) newContactCacheByEmail.set(record.email, newContact);
                       if (record.phone) newContactCacheByPhone.set(record.phone, newContact);

                       resolvedContactIds.push(newId);
                   }
               }

               if (contactsToInsert.length > 0) {
                   await tx.contact.createMany({ data: contactsToInsert });
               }

               // 4. Bulk create leads using the strictly matched index array
               const leadsData = chunk.map((record, index) => {
                   return {
                       organizationId,
                       contactId: resolvedContactIds[index],
                       source: record.source || "Import",
                       status: "NEW" as LeadStatus
                   };
               });

               if (leadsData.length > 0) {
                   await tx.lead.createMany({ data: leadsData });
               }
           });
           importedCount += chunk.length;
       } catch (error) {

           // Fallback to sequential processing if bulk fails to ensure partial success
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
                   }

                   await tx.lead.create({
                       data: {
                           organizationId,
                           contactId,
                           source: record.source || "Import",
                           status: "NEW" as LeadStatus
                       }
                   });
                });
                importedCount++;
             } catch {
                 failedCount++;
             }
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
