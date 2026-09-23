import { LeadStatus } from '@prisma/client';

export class IllegalStateTransitionError extends Error {
  constructor(currentStatus: LeadStatus, nextStatus: LeadStatus, allowed: LeadStatus[]) {
    super(
      `Illegal lead status transition from ${currentStatus} to ${nextStatus}. Allowed target statuses: [${allowed.join(
        ', '
      )}]`
    );
    this.name = 'IllegalStateTransitionError';
  }
}

/**
 * Domain Invariant Matrix: Allowed state transitions for Real Estate Leads
 */
export const VALID_LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: [LeadStatus.CONTACTED, LeadStatus.CLOSED_LOST],
  CONTACTED: [LeadStatus.QUALIFIED, LeadStatus.FOLLOW_UP, LeadStatus.CLOSED_LOST],
  QUALIFIED: [LeadStatus.APPOINTMENT_BOOKED, LeadStatus.FOLLOW_UP, LeadStatus.CLOSED_LOST],
  FOLLOW_UP: [LeadStatus.QUALIFIED, LeadStatus.APPOINTMENT_BOOKED, LeadStatus.CLOSED_LOST],
  APPOINTMENT_BOOKED: [LeadStatus.CLOSED_WON, LeadStatus.CLOSED_LOST, LeadStatus.FOLLOW_UP],
  CLOSED_WON: [LeadStatus.FOLLOW_UP], // Past-client nurture / referral flow
  CLOSED_LOST: [LeadStatus.NEW], // Re-activation / re-engagement campaign
};

/**
 * Validates whether a proposed status transition satisfies domain business invariants.
 * Throws IllegalStateTransitionError if the transition is prohibited.
 */
export function validateLeadStatusTransition(currentStatus: LeadStatus, nextStatus: LeadStatus): void {
  // Idempotent self-transition is always permitted
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedTargets = VALID_LEAD_TRANSITIONS[currentStatus] || [];

  if (!allowedTargets.includes(nextStatus)) {
    throw new IllegalStateTransitionError(currentStatus, nextStatus, allowedTargets);
  }
}
