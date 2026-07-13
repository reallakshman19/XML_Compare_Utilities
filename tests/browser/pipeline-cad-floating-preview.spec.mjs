import { expect, test } from '@playwright/test';

const FIXTURE = '/tests/browser/pipeline-cad-floating-preview-fixture.html';
const STORAGE_KEY = 'pipeline3dCadFloatingPreviewV1';

async function openCleanFixture(page) {
  await page.goto(FIXTURE);
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.floatingPreviewReady === '1');
  await page.locator('#open-preview').click();
  await expect(page.locator('[data-p3d-floating-preview="1"]')).toBeVisible();
}

async function state(page) {
  return page.evaluate(() => window.__floatingPreviewState());
}

test.describe('Pipeline CAD floating Table 2X / Table 3X preview', () => {
  test('CAD-F01 — preview is draggable, modeless and always above application overlays', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openCleanFixture(page);

    const panel = page.locator('[data-p3d-floating-preview="1"]');
    const head = panel.locator('[data-p3d-floating-preview-handle="1"]');
    const initial = await state(page);
    expect(initial.position).toBe('fixed');
    expect(initial.zIndex).toBeGreaterThan(1_000_000);
    expect(initial.resize).toBe('both');
    await expect(panel).toHaveAttribute('role', 'dialog');
    await expect(panel).toHaveAttribute('aria-modal', 'false');
    await expect(panel.locator('[data-p3d-floating-preview-hint]')).toContainText('Drag title bar');

    await page.locator('#underlying-action').click();
    expect((await state(page)).underlyingCount).toBe(1);

    const box = await head.boundingBox();
    if (!box) throw new Error('Floating preview title bar has no bounding box.');
    await page.mouse.move(box.x + 90, box.y + (box.height / 2));
    await page.mouse.down();
    await page.mouse.move(box.x - 70, box.y + 90, { steps: 8 });
    await page.mouse.up();

    const moved = await state(page);
    expect(moved.left).toBeLessThan(initial.left - 100);
    expect(moved.top).toBeGreaterThan(initial.top + 40);
    expect(moved.storage.left).toBeCloseTo(moved.left, 0);
    expect(moved.storage.top).toBeCloseTo(moved.top, 0);

    await head.focus();
    await page.keyboard.press('Shift+ArrowRight');
    const keyboardMoved = await state(page);
    expect(keyboardMoved.left).toBeCloseTo(moved.left + 32, 0);

    await panel.locator('[data-p3d-split="x-close"]').click();
    await expect(panel).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('CAD-F02 — resized geometry persists across reload and Reset Window restores defaults', async ({ page }) => {
    await openCleanFixture(page);
    const panel = page.locator('[data-p3d-floating-preview="1"]');

    await panel.evaluate((element) => {
      element.style.setProperty('left', '160px', 'important');
      element.style.setProperty('top', '120px', 'important');
      element.style.setProperty('width', '780px', 'important');
      element.style.setProperty('height', '520px', 'important');
    });
    await expect.poll(async () => (await state(page)).storage?.width).toBe(780);
    const resized = await state(page);
    expect(resized.storage.height).toBe(520);

    await page.reload();
    await page.waitForFunction(() => document.body.dataset.floatingPreviewReady === '1');
    await page.locator('#open-preview').click();
    const restored = await state(page);
    expect(restored.left).toBeCloseTo(160, 0);
    expect(restored.top).toBeCloseTo(120, 0);
    expect(restored.width).toBeCloseTo(780, 0);
    expect(restored.height).toBeCloseTo(520, 0);

    await page.locator('[data-p3d-floating-preview-reset]').click();
    const reset = await state(page);
    expect(reset.left).toBeGreaterThan(300);
    expect(reset.top).toBe(36);
    expect(reset.width).toBeGreaterThan(1000);
    expect(reset.height).toBe(820);
    expect(reset.storage.width).toBeCloseTo(reset.width, 0);
  });

  test('CAD-F03 — stale off-screen geometry is clamped into the current viewport', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(({ key }) => {
      localStorage.setItem(key, JSON.stringify({
        left: 5000,
        top: 4000,
        width: 3000,
        height: 2400,
      }));
    }, { key: STORAGE_KEY });
    await page.reload();
    await page.waitForFunction(() => document.body.dataset.floatingPreviewReady === '1');
    await page.locator('#open-preview').click();

    const clamped = await state(page);
    expect(clamped.left).toBeGreaterThanOrEqual(12);
    expect(clamped.top).toBeGreaterThanOrEqual(12);
    expect(clamped.left + clamped.width).toBeLessThanOrEqual(1428);
    expect(clamped.top + clamped.height).toBeLessThanOrEqual(1088);
    expect(clamped.storage.left).toBeCloseTo(clamped.left, 0);
    expect(clamped.storage.top).toBeCloseTo(clamped.top, 0);
  });
});
