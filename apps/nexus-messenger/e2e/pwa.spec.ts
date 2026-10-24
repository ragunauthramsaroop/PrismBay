import { expect, test } from '@playwright/test';

test('manifest and service worker ship with the production build', async ({ page }) => {
  await page.goto('/#prototype');
  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  const data = await manifest.json();
  expect(data.name).toBe('Nexus Messenger');
  expect(data.icons).toHaveLength(2);
  const icon = await page.request.get('/icons/nexus-192.png');
  expect(icon.ok()).toBeTruthy();
  expect(icon.headers()['content-type']).toContain('image/png');
  const sw = await page.request.get('/sw.js');
  expect(sw.ok()).toBeTruthy();
  const script = await sw.text();
  expect(script).toContain('nexus-public-shell-');
  expect(script).toContain('url.origin !== self.location.origin');
  expect(script).toContain("if (!CACHEABLE.has(url.pathname)) return;");
});

test('offline mode loads cached public shell but never presents remote messages as delivered', async ({ page, context }) => {
  await page.goto('/#prototype');
  await expect(page.getByRole('heading', { name: /Your connections, in focus/i })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Your connections, in focus/i })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Your connections, in focus/i })).toBeVisible();
  await expect(page.getByText(/No network message was sent/i)).toHaveCount(0);
  await context.setOffline(false);
});
