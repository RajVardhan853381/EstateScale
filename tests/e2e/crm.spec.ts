import { test, expect } from '@playwright/test';

test.describe('CRM E2E', () => {
  test('redirects to signin when unauthenticated', async ({ page }) => {
    await page.goto('/org/demo-org/leads');
    await expect(page).toHaveURL(/.*\/api\/auth\/signin.*/);
  });
});
