import { describe, it, expect } from 'vitest';
import {
  validateLeadStatusTransition,
  IllegalStateTransitionError,
} from '../../src/lib/domain/lead-state-machine';
import { LeadStatus } from '@prisma/client';

describe('Domain Lead State Machine & Invariant Enforcement', () => {
  it('should allow valid sequential status transitions', () => {
    // NEW -> CONTACTED
    expect(() =>
      validateLeadStatusTransition(LeadStatus.NEW, LeadStatus.CONTACTED)
    ).not.toThrow();

    // CONTACTED -> QUALIFIED
    expect(() =>
      validateLeadStatusTransition(LeadStatus.CONTACTED, LeadStatus.QUALIFIED)
    ).not.toThrow();

    // QUALIFIED -> APPOINTMENT_BOOKED
    expect(() =>
      validateLeadStatusTransition(LeadStatus.QUALIFIED, LeadStatus.APPOINTMENT_BOOKED)
    ).not.toThrow();

    // APPOINTMENT_BOOKED -> CLOSED_WON
    expect(() =>
      validateLeadStatusTransition(LeadStatus.APPOINTMENT_BOOKED, LeadStatus.CLOSED_WON)
    ).not.toThrow();
  });

  it('should allow idempotent self-transitions', () => {
    expect(() =>
      validateLeadStatusTransition(LeadStatus.QUALIFIED, LeadStatus.QUALIFIED)
    ).not.toThrow();
  });

  it('should reject invalid illegal jumps with IllegalStateTransitionError', () => {
    // Cannot jump directly from NEW to CLOSED_WON without qualification
    expect(() =>
      validateLeadStatusTransition(LeadStatus.NEW, LeadStatus.CLOSED_WON)
    ).toThrow(IllegalStateTransitionError);

    // Cannot jump from CLOSED_LOST directly to APPOINTMENT_BOOKED without re-activation
    expect(() =>
      validateLeadStatusTransition(LeadStatus.CLOSED_LOST, LeadStatus.APPOINTMENT_BOOKED)
    ).toThrow(IllegalStateTransitionError);

    // CLOSED_WON cannot be set back to NEW
    expect(() =>
      validateLeadStatusTransition(LeadStatus.CLOSED_WON, LeadStatus.NEW)
    ).toThrow(IllegalStateTransitionError);
  });

  it('should include allowed transitions in error message', () => {
    try {
      validateLeadStatusTransition(LeadStatus.NEW, LeadStatus.CLOSED_WON);
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(IllegalStateTransitionError);
      const error = err as IllegalStateTransitionError;
      expect(error.message).toContain('Illegal lead status transition from NEW to CLOSED_WON');
      expect(error.message).toContain('CONTACTED');
      expect(error.message).toContain('CLOSED_LOST');
    }
  });
});
