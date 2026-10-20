// Local-only: serves dist via vite preview on 127.0.0.1 and captures screenshots + real-browser axe.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const axeSrc = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const base = 'http://127.0.0.1:4173/';
const b = await chromium.launch();
const out = {};
for (const [size, vp] of [['desktop', { width: 1280, height: 720 }], ['mobile', { width: 390, height: 640 }]]) {
  const p = await b.newPage({ viewport: vp });
  await p.goto(`${base}?size=${size}`); await p.evaluate(() => document.fonts.ready); await p.waitForLoadState('networkidle');
  await p.screenshot({ path: `../shots/${size}-default.png`, fullPage: true });
  const info = await p.evaluate(() => {
    const m = document.querySelector('.pc__media'), cs = getComputedStyle(m), r = m.getBoundingClientRect();
    const name = getComputedStyle(document.querySelector('.pc__name'));
    const btn = document.querySelector('.pc__cart').getBoundingClientRect();
    return { html: [document.documentElement.lang, document.documentElement.dir], media: [r.width, r.height],
      radii: [cs.borderStartStartRadius, cs.borderStartEndRadius, cs.borderEndStartRadius, cs.borderEndEndRadius],
      font: name.fontFamily, nameSize: name.fontSize, saleColor: getComputedStyle(document.querySelector('.pc__now--sale')).color,
      oldDeco: getComputedStyle(document.querySelector('.pc__old')).textDecorationLine, cartBtn: [btn.width, btn.height],
      fontLoaded: document.fonts.check('500 16px Vazirmatn') };
  });
  // hover on the sale card link
  const link = p.locator('.pc__link').nth(1);
  const nameBefore = await p.locator('.pc__name').nth(1).evaluate(e => getComputedStyle(e).cssText || getComputedStyle(e).color + getComputedStyle(e).fontSize);
  await link.hover(); await p.waitForTimeout(300);
  info.hoverOverlayOpacity = await p.locator('.pc__overlay').nth(1).evaluate(e => getComputedStyle(e).opacity);
  info.nameUnchangedOnHover = nameBefore === await p.locator('.pc__name').nth(1).evaluate(e => getComputedStyle(e).cssText || getComputedStyle(e).color + getComputedStyle(e).fontSize);
  await p.locator('.pc').nth(1).screenshot({ path: `../shots/${size}-sale-hover.png` });
  await p.mouse.move(0, 0); await p.waitForTimeout(300);
  // keyboard focus
  await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
  await p.waitForTimeout(300);
  info.focused = await p.evaluate(() => document.activeElement.className);
  info.focusOverlayOpacity = await p.locator('.pc__overlay').nth(1).evaluate(e => getComputedStyle(e).opacity);
  await p.locator('.pc').nth(1).screenshot({ path: `../shots/${size}-sale-focus-visible.png` });
  await p.addScriptTag({ content: axeSrc });
  const ax = await p.evaluate(async () => (await window.axe.run(document)).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length })));
  info.axeViolations = ax;
  out[size] = info; await p.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
