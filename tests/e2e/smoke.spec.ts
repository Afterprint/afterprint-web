import {test, expect} from '@playwright/test';

test('landing page loads', async ({page}) => {
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(400);
});

test('login page shows the Freighter connect button', async ({page}) => {
  await page.goto('/login');
  await expect(page.locator('#connect-freighter-btn')).toBeVisible();
});

test('API health endpoint reports ok', async ({request}) => {
  const apiBase = process.env.RENDER_API_URL;
  test.skip(!apiBase, 'RENDER_API_URL not set');
  const response = await request.get(`${apiBase}/v1/health`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe('ok');
});

test('AI internal health endpoint responds', async ({request}) => {
  const aiBase = process.env.RENDER_AI_URL;
  test.skip(!aiBase, 'RENDER_AI_URL not set');
  // Internal service — every route requires the shared service token, so an
  // unauthenticated request correctly gets 401. That still proves it's alive.
  const response = await request.get(`${aiBase}/internal/v1/health`);
  expect(response.status()).toBe(401);
});
