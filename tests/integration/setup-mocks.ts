import { vi } from "vitest";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    redirect: vi.fn(),
    notFound: vi.fn(),
}));
