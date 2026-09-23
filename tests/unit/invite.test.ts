import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUpsert, mockRequireMember } = vi.hoisted(() => ({
  mockUpsert: vi.fn().mockResolvedValue({
    id: 'invite-1',
    email: 'reinvite@estatescale.com',
    status: 'PENDING',
  }),
  mockRequireMember: vi.fn().mockResolvedValue({
    organization: { id: 'org-1', slug: 'test-org' },
    membership: { role: 'OWNER' },
  }),
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    organizationInvitation: {
      upsert: mockUpsert,
    },
  },
}));

vi.mock('../../src/lib/auth/authorization', () => ({
  requireOrganizationMember: mockRequireMember,
}));

describe('Invitation Flow & Re-invite Upsert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call organizationInvitation.upsert to support safe re-invitations', async () => {
    const { POST } = await import('../../src/app/api/invite/route');

    const fakeRequest = new Request('http://localhost:3000/api/invite', {
      method: 'POST',
      body: JSON.stringify({
        slug: 'test-org',
        email: 'REINVITE@estatescale.com',
        role: 'AGENT',
      }),
    });

    const response = await POST(fakeRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_email: {
            organizationId: 'org-1',
            email: 'reinvite@estatescale.com',
          },
        },
        update: expect.objectContaining({
          role: 'AGENT',
          status: 'PENDING',
        }),
      })
    );
  });

  it('should reject passwords without uppercase, lowercase, or numbers in registration action', async () => {
    const { registerAndAcceptInviteAction } = await import('../../src/lib/actions/auth');

    // Missing uppercase
    const resNoUpper = await registerAndAcceptInviteAction('dummy-token', {
      name: 'John Doe',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(resNoUpper.success).toBe(false);
    expect(resNoUpper.error).toContain('uppercase');

    // Missing number
    const resNoNumber = await registerAndAcceptInviteAction('dummy-token', {
      name: 'John Doe',
      password: 'PasswordLetters',
      confirmPassword: 'PasswordLetters',
    });
    expect(resNoNumber.success).toBe(false);
    expect(resNoNumber.error).toContain('number');
  });
});
