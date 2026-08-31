import { describe, it, expect, vi } from 'vitest';
import { assertTenantOwnership } from '../../src/lib/auth/authorization';

// Mock NextAuth to avoid 'next/server' importing issues in Vitest
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

describe('Authorization Logic', () => {
  describe('assertTenantOwnership', () => {
    it('should not throw if organization IDs match', async () => {
      await expect(assertTenantOwnership('org1', 'org1')).resolves.not.toThrow();
    });

    it('should throw an error if organization IDs do not match', async () => {
      await expect(assertTenantOwnership('org1', 'org2')).rejects.toThrow(
        'Forbidden: Tenant isolation violation'
      );
    });
  });
});
