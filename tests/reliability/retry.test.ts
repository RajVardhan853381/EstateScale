import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../src/lib/reliability/retry';

describe('Retry Logic', () => {
  it('should retry on failure and eventually succeed', async () => {
    let attempts = 0;
    const action = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Temp fail');
      return 'success';
    });

    // Fast base delay for testing
    const result = await withRetry(action, 3, 10);
    expect(result).toBe('success');
    expect(action).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries are exhausted', async () => {
    const action = vi.fn().mockRejectedValue(new Error('Perma fail'));
    await expect(withRetry(action, 2, 10)).rejects.toThrow('Perma fail');
    expect(action).toHaveBeenCalledTimes(2);
  });
});
