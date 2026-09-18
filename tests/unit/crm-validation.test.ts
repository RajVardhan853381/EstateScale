import { describe, it, expect } from "vitest";
import {
  contactSchema,
  leadSchema,
  noteSchema,
  tagSchema,
  paginationSchema
} from "@/lib/validations/crm";

describe("CRM Validations", () => {
  describe("contactSchema", () => {
    it("should accept valid contact data with email", () => {
      const data = { email: "test@example.com" };
      const parsed = contactSchema.parse(data);
      expect(parsed.email).toBe("test@example.com");
    });

    it("should reject contact data without required contact info", () => {
      const data = { firstName: "John" };
      expect(() => contactSchema.parse(data)).toThrow("Must provide at least email, phone, or full name");
    });
  });

  describe("leadSchema", () => {
    it("should reject if neither contactId nor contact details are provided", () => {
      const data = { source: "WEBSITE" };
      expect(() => leadSchema.parse(data)).toThrow("Must provide either contactId or new contact details");
    });

    it("should accept valid lead creation using contact details", () => {
      const data = {
        contact: { email: "john@example.com", firstName: "John" },
        budget: 500000,
        propertyType: "condo"
      };
      const parsed = leadSchema.parse(data);
      expect(parsed.contact?.email).toBe("john@example.com");
      expect(parsed.budget).toBe(500000);
    });
  });

  describe("tagSchema", () => {
    it("should validate alphanumeric tags", () => {
      const parsed = tagSchema.parse({ name: "urgent-buyer" });
      expect(parsed.name).toBe("urgent-buyer");
    });

    it("should reject spaces in tags", () => {
      expect(() => tagSchema.parse({ name: "urgent buyer" })).toThrow();
    });
  });

  describe("paginationSchema", () => {
    it("should provide default values", () => {
      const parsed = paginationSchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(20);
    });

    it("should coerce string inputs to numbers", () => {
      const parsed = paginationSchema.parse({ page: "2", limit: "50" });
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(50);
    });
  });
});
