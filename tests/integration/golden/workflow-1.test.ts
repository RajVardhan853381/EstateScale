import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publishDomainEvent } from '../../../src/lib/events/bus';
import { evaluateAutomationsForEvent } from '../../../src/lib/automations/engine';

vi.mock('../../../src/lib/automations/engine', () => ({
  evaluateAutomationsForEvent: vi.fn(),
}));

describe('Golden Workflow 1: Lead -> AI -> Journey -> Communication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sequentially trigger downstream workflows when an AI analysis completes', async () => {
    const mockLeadEvent = {
      eventId: 'evt-123',
      organizationId: 'org-1',
      leadId: 'lead-abc',
      type: 'AI_ANALYSIS_COMPLETED' as const,
      metadata: { score: 95 },
    };

    await publishDomainEvent(mockLeadEvent);

    // Ensure the intelligence event successfully reached the Journeys/Automations engine
    expect(evaluateAutomationsForEvent).toHaveBeenCalledTimes(1);
    expect(evaluateAutomationsForEvent).toHaveBeenCalledWith(mockLeadEvent);
  });
});
