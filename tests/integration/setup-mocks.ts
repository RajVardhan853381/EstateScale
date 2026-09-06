// Need to add setup file to mock db for non-integration or actual integration setup if db isn't there
import { vi } from 'vitest';
vi.mock("next-auth", () => ({
  default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })
}));
