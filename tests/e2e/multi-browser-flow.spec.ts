import { test, expect } from '@playwright/test';

test.describe('LinguaConnect E2E Multi-Browser & RLS Isolation Verification', () => {
  test('verifies +18 registration, public profile privacy, real-time chat, WebRTC call across two browsers, and RLS isolation', async ({
    browser,
  }) => {
    // Create two isolated browser contexts representing two distinct adult users on different browsers
    const contextElena = await browser.newContext();
    const contextLiam = await browser.newContext();
    const contextIntruder = await browser.newContext();

    const pageElena = await contextElena.newPage();
    const pageLiam = await contextLiam.newPage();
    const pageIntruder = await contextIntruder.newPage();

    // 1. Verify +18 Registration rejects underage user
    await pageIntruder.goto('http://localhost:3000/register');
    await pageIntruder.fill('#reg-display', 'Menor Test');
    await pageIntruder.fill('#reg-username', 'menor_test');
    await pageIntruder.fill('#reg-email', 'menor@example.test');
    await pageIntruder.fill('#reg-password', 'Secret1234!');
    await pageIntruder.fill('#reg-birth', '2015-05-10'); // Under 18
    await pageIntruder.locator('button[type="submit"]').click();
    await expect(pageIntruder.getByTestId('register-error')).toContainText('18 años');

    // 2. Login Elena (Browser A) and Liam (Browser B)
    await pageElena.goto('http://localhost:3000/login');
    await pageElena.getByRole('button', { name: /Elena \(Admin\)/i }).click();
    await expect(pageElena).toHaveURL(/\/dashboard/);

    await pageLiam.goto('http://localhost:3000/login');
    await pageLiam.getByRole('button', { name: /Liam \(Usuario\)/i }).click();
    await expect(pageLiam).toHaveURL(/\/dashboard/);

    // 3. Verify Public Profile NEVER leaks email or birth_date, and suppresses ads on reported user (Kenji)
    await pageElena.goto('http://localhost:3000/u/kenji_tokyo_demo');
    await expect(pageElena.getByTestId('public-profile-card')).toBeVisible();
    const profileHtml = await pageElena.content();
    expect(profileHtml).not.toContain('kenji.demo@linguaconnect.test');
    expect(profileHtml).not.toContain('1994-02-14');
    // Kenji has a pending moderation report ('rep-demo-1'), so ads must be automatically suppressed!
    await expect(pageElena.getByTestId('ad-suppressed-moderation')).toBeVisible();

    // 4. Verify Negative RLS on Chat: Claire (non-participant) cannot access Elena & Liam's private chat
    await pageIntruder.goto('http://localhost:3000/messages/conv-demo-elena-liam');
    await expect(pageIntruder.getByTestId('rls-chat-denied')).toBeVisible();

    // 5. Verify Authorized Chat & WebRTC Call Launch by Elena
    await pageElena.goto('http://localhost:3000/messages/conv-demo-elena-liam');
    await expect(pageElena.getByText('Ayer fui a una exposición').first()).toBeVisible();

    await pageElena.getByRole('button', { name: /Videollamada/i }).click();
    await expect(pageElena).toHaveURL(/\/call\/call-/);
    await expect(pageElena.getByTestId('call-status-badge')).toContainText(/ringing/i);

    // End the call and verify completion state
    await pageElena.getByTestId('end-call-button').click();
    await expect(pageElena.getByTestId('call-status-badge')).toContainText(/ended/i);

    // 6. Verify RBAC on /admin: Liam (user role) is denied, Elena (admin role) is allowed
    await pageLiam.goto('http://localhost:3000/admin');
    await expect(pageLiam.getByTestId('admin-access-denied')).toBeVisible();

    await pageElena.goto('http://localhost:3000/admin');
    await expect(pageElena.getByText(/Administración, Moderación y Métricas/i)).toBeVisible();

    await contextElena.close();
    await contextLiam.close();
    await contextIntruder.close();
  });
});
