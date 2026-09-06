import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getHealth } from '../../../src/app/api/health/route';
import { GET as getReady } from '../../../src/app/api/ready/route';
import { prisma } from '../../../src/lib/prisma';
import Redis from 'ioredis';

vi.mock('ioredis');

describe('Phase 6C: Health & Readiness', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('/api/health returns ok', async () => {
        const response = await getHealth();
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toEqual({ status: 'ok' });
    });

    it('/api/ready returns ok when deps are healthy', async () => {
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ '?column?': 1 }]);
        vi.mocked(Redis).mockImplementation(() => ({
            ping: vi.fn().mockResolvedValue('PONG'),
            quit: vi.fn().mockResolvedValue('OK'),
        }) as any);
        process.env.REDIS_URL = 'redis://localhost:6379';

        const response = await getReady();
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toEqual({
            status: 'ok',
            dependencies: { database: 'up', redis: 'up' }
        });
    });

    it('/api/ready fails safely when Postgres is down', async () => {
        vi.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('Connection refused'));
        vi.mocked(Redis).mockImplementation(() => ({
            ping: vi.fn().mockResolvedValue('PONG'),
            quit: vi.fn().mockResolvedValue('OK'),
        }) as any);
        process.env.REDIS_URL = 'redis://localhost:6379';

        const response = await getReady();
        expect(response.status).toBe(503);
        const data = await response.json();
        expect(data).toEqual({
            status: 'error',
            dependencies: { database: 'down', redis: 'up' }
        });
    });

    it('/api/ready fails safely when Redis is down', async () => {
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ '?column?': 1 }]);
        vi.mocked(Redis).mockImplementation(() => ({
            ping: vi.fn().mockRejectedValue(new Error('Connection refused')),
            quit: vi.fn().mockResolvedValue('OK'),
        }) as any);
        process.env.REDIS_URL = 'redis://localhost:6379';

        const response = await getReady();
        expect(response.status).toBe(503);
        const data = await response.json();
        expect(data).toEqual({
            status: 'error',
            dependencies: { database: 'up', redis: 'down' }
        });
    });
});
