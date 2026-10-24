import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#prototype');
  await expect(page.getByRole('heading', { name: /Your connections, in focus/i })).toBeVisible();
});

test('conversation creation, local message and reload persistence', async ({ page }) => {
  await page.getByRole('button', { name: /New conversation/i }).click();
  await page.getByRole('textbox', { name: /person or group name/i }).fill('QA Visitor');
  await page.getByRole('button', { name: /Save to my prototype/i }).click();
  await expect(page.getByText('QA Visitor', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: /Type a demonstration message/i }).fill('Automated QA hello');
  await page.getByRole('button', { name: /Send local demo message/i }).click();
  await expect(page.getByText('Automated QA hello', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /QA Visitor/i }).click();
  await expect(page.getByText('Automated QA hello', { exact: true })).toBeVisible();
});

test('tasks are interactive and persist after reload', async ({ page }) => {
  await page.locator('.nxp-nav-link').filter({ hasText: 'Flow' }).click({ force: true });
  await page.getByRole('button', { name: /Add a task/i }).click();
  await page.getByRole('textbox', { name: /What needs to be done/i }).fill('Verify sample task');
  await page.getByRole('button', { name: /Save to my prototype/i }).click();
  await expect(page.getByText('Verify sample task')).toBeVisible();
  await page.getByRole('button', { name: /Complete Verify sample task/i }).click();
  await expect(page.getByRole('button', { name: /Mark incomplete Verify sample task/i })).toBeVisible();
  await page.reload();
  await page.locator('.nxp-nav-link').filter({ hasText: 'Flow' }).click({ force: true });
  await expect(page.getByRole('button', { name: /Mark incomplete Verify sample task/i })).toBeVisible();
});

test('spaces join/leave and profile display preferences work', async ({ page }) => {
  await page.locator('.nxp-nav-link').filter({ hasText: 'Spaces' }).click({ force: true });
  const row = page.locator('.nxp-space').filter({ hasText: 'Community Projects' });
  await expect(row.getByRole('button', { name: 'Join' })).toBeVisible();
  await row.getByRole('button', { name: 'Join' }).click();
  await expect(row.getByRole('button', { name: 'Leave' })).toBeVisible();
  await page.locator('.nxp-nav-link').filter({ hasText: 'You' }).click({ force: true });
  await page.getByRole('switch', { name: 'Dark appearance' }).click();
  await expect(page.locator('.nxp')).toHaveClass(/nxp-dark/);
  await page.reload();
  await expect(page.locator('.nxp')).toHaveClass(/nxp-dark/);
});

test('personal and work sample data stay separate', async ({ page }) => {
  await expect(page.getByText('Family Circle', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Work', exact: true }).click();
  await expect(page.getByText('Product Team', { exact: true })).toBeVisible();
  await expect(page.getByText('Family Circle', { exact: true })).toHaveCount(0);
});

test('public login remains accessible without accounts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Sign in to your account/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Explore the new Nexus prototype/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Create an account/i })).toHaveAttribute('href', 'https://app.element.io/');
});
