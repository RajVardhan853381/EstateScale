import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { ImportService } from "../../src/lib/services/import";

describe("CSV Import Duplicate Logic", () => {
  beforeEach(async () => {
    await prisma.organization.deleteMany();
  });

  afterAll(async () => {
    await prisma.organization.deleteMany();
  });

  it("should process import, map records, and detect duplicates", async () => {
    const org = await prisma.organization.create({
      data: { name: "Import Org", slug: "import-org" }
    });

    const records = [
      { firstName: "John", lastName: "Doe", email: "john@example.com", phone: "123" },
      { firstName: "Jane", email: "jane@example.com" }, // No last name, valid due to email
      { firstName: "Invalid" }, // Missing email/phone/last name -> invalid
      { firstName: "John", lastName: "Duplicate", email: "john@example.com" } // Duplicate email
    ];

    const job = await ImportService.queueCsvImport(org.id, records);

    expect(job.status).toBe("COMPLETED");
    expect(job.totalRecords).toBe(4);
    expect(job.skipped).toBe(1); // Invalid record
    expect(job.imported).toBe(3); // 2 distinct + 1 duplicate updated/mapped to same contact

    const contacts = await prisma.contact.findMany({ where: { organizationId: org.id } });
    expect(contacts.length).toBe(2); // John and Jane

    const leads = await prisma.lead.findMany({ where: { organizationId: org.id } });
    expect(leads.length).toBe(3); // Both Johns created leads
  });
});
