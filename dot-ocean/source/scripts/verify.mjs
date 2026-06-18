import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/ocean-shots';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5173/dot-ocean/';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

const log = (...a) => console.log(...a);

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2000);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/01-tutorial.png` });
log('title:', await page.title());

// Step through the tutorial (4 steps).
for (let i = 0; i < 4; i++) {
  const btn = page.locator('.tutorial .btn-primary');
  if (await btn.count()) { await btn.click(); await page.waitForTimeout(250); }
}
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/02-main.png` });

const has = async (sel) => (await page.locator(sel).count()) > 0;
const gameOn = await page.locator('canvas.sea-canvas').isVisible().catch(() => false);
log('canvas visible:', gameOn, '| fallback:', await has('.sea-fallback'), '| radar-mini:', await has('.radar-mini'),
    '| scan-fab:', await has('.scan-fab'), '| loading gone:', !(await has('.loading-veil')));

// Drive discovery: roam + scan (only if the 3D game is running).
if (gameOn) {
  await page.locator('canvas.sea-canvas').click({ position: { x: 640, y: 410 } });
  const moves = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'];
  for (let i = 0; i < 20; i++) {
    await page.keyboard.down(moves[i % 4]); await page.waitForTimeout(220); await page.keyboard.up(moves[i % 4]);
    await page.keyboard.press('Space'); await page.waitForTimeout(220);
  }
}
const found = await page.locator('.found-chip b').textContent().catch(() => '?');
log('discovered after roaming:', found);

// Encyclopedia
await page.locator('.fnav-btn[aria-label="백과사전"]').click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/03-encyclopedia.png` });
log('ency: search box:', await has('.ency-search'), '| filter chips:', await page.locator('.chip').count(),
    '| count text:', (await page.locator('.ency-count').textContent().catch(() => '-')));

// Open first discovered card -> detail
const card = page.locator('.ency-card:not(.locked)').first();
if (await card.count()) {
  await card.click(); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/04-detail.png` });
  const body = await page.locator('.ency-detail').innerText().catch(() => '');
  log('detail has 학명:', body.includes('학명'), '| 촉각 난이도:', body.includes('촉각 난이도'),
      '| 생태:', body.includes('생태'), '| sr button:', await has('.sr-desc .btn-ghost'),
      '| dot-frame dots:', await page.locator('.ency-detail .dm-dot.up').count());
  await page.locator('.ency-detail .back-btn').click(); await page.waitForTimeout(300);
}
await page.keyboard.press('Escape'); await page.waitForTimeout(300);

// Quiz
await page.locator('.fnav-btn[aria-label="퀴즈"]').click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/05-quiz.png` });
const quizOpts = await page.locator('.quiz-opt').count();
const modeToggle = await page.locator('.quiz-mode button').count();
log('quiz: options:', quizOpts, '| mode buttons:', modeToggle, '| need-msg:', await has('.empty'));
if (modeToggle >= 2) {
  await page.locator('.quiz-mode button').nth(1).click(); // description mode
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/06-quiz-desc.png` });
  log('quiz desc clue shown:', await has('.quiz-clue'));
}
await page.keyboard.press('Escape'); await page.waitForTimeout(300);

// Settings + high contrast
await page.locator('.icon-btn[aria-label="설정"]').click();
await page.waitForTimeout(400);
const hcToggle = page.locator('.row-toggle', { hasText: '고대비' });
if (await hcToggle.count()) { await hcToggle.click(); await page.waitForTimeout(300); }
await page.screenshot({ path: `${OUT}/07-settings-hc.png` });
log('high-contrast applied:', await page.locator('.app.hc').count() > 0);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);

// Mobile viewport
await page.setViewportSize({ width: 390, height: 820 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/08-mobile.png` });

log('\nCONSOLE ERRORS:', errors.length);
for (const e of errors.slice(0, 20)) log('  -', e);

await browser.close();
log('\nScreenshots in', OUT);
