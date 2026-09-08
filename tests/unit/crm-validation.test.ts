import { describe, it, expect } from 'vitest';
import { contactSchema, leadSchema, paginationSchema } from '../../src/lib/validations/crm';
import { LeadStatus } from '@prisma/client';

describe('CRM Validations', () => {
  describe('paginationSchema', () => {
    it('applies defaults correctly', () => {
      const result = paginationSchema.parse({});
      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('parses valid input', () => {
      const result = paginationSchema.parse({ page: '2', limit: '50' });
      expect(result).toEqual({ page: 2, limit: 50 });
    });
  });

  describe('contactSchema', () => {
    it('requires email, phone, or first+last name', () => {
      expect(() => contactSchema.parse({ firstName: 'John' })).toThrowError();
      expect(() => contactSchema.parse({ email: 'test@example.com' })).not.toThrowError();
      expect(() => contactSchema.parse({ phone: '1234567890' })).not.toThrowError();
      expect(() => contactSchema.parse({ firstName: 'John', lastName: 'Doe' })).not.toThrowError();
    });
  });

  describe('leadSchema', () => {
    it('requires contactId or contact details inline', () => {
      expect(() => leadSchema.parse({ source: 'WEBSITE' })).toThrowError();

      expect(() => leadSchema.parse({
        contactId: 'cuid123'
      })).not.toThrowError();

      expect(() => leadSchema.parse({
        contact: { email: 'test@example.com' }
      })).not.toThrowError();
    });

    it('sets correct defaults', () => {
      const result = leadSchema.parse({ contactId: 'cuid123' });
      expect(result.status).toBe(LeadStatus.NEW);
      expect(result.source).toBe('MANUAL');
    });
  });
});
