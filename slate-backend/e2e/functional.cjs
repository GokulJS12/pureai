/*
 * SLATE end-to-end functional test — drives the real UI in Chromium against a
 * running backend and verifies every feature (auth, all 13 screens, notes,
 * tasks, journal, chat rule-engine, twin, life boards, settings, behavior,
 * calendar, catalog) plus persistence across reload.
 *
 * Requires Playwright + a running server:
 *   npm run start &                              # API on :8787 (serves the UI)
 *   npx --yes playwright@1.56 install chromium   # one-time, if needed
 *   SLATE_BASE=http://localhost:8787 node e2e/functional.cjs
 */
const { chromium } = require('playwright');

const results = [];
function check(name, cond, detail) { results.push({ name, ok: !!cond, detail: detail || '' }); }
async function tryDo(fn) { try { await fn(); return true; } catch (e) { return false; } }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  page.setDefaultTimeout(8000); page.setDefaultNavigationTimeout(25000);
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  const BASE = process.env.SLATE_BASE || 'http://localhost:8787';
  const email = 'func' + Date.now() + '@slate.local';
  const state = () => page.evaluate(() => window.SlateAPI.state());
  const dismissBoot = async () => { await tryDo(async () => { await page.waitForTimeout(300); await page.mouse.click(20, 20); }); };
  const nav = async (label) => { await page.click(`nav button:has-text("${label}")`); await page.waitForTimeout(450); };

  await page.goto(`${BASE}/SLATE.dc.html`, { waitUntil: 'domcontentloaded' });

  // 1. AUTH
  await page.waitForSelector('text=Welcome back', { timeout: 8000 });
  await page.click('text=Create your space');
  await page.fill('input[placeholder="you@example.com"]', email);
  await page.fill('input[placeholder="Password"]', 'secret');
  await page.click('button:has-text("Create account")');
  await page.waitForFunction(() => !document.body.innerText.includes('Welcome back'), { timeout: 8000 });
  await dismissBoot();
  await page.waitForTimeout(800);
  let s = await state();
  check('AUTH: signup + hydrate seeded data', s && s.notes.length === 3 && s.twin.name === 'Maya', `notes=${s&&s.notes.length}`);

  // 2. NAVIGATION
  const screens = ['Home','Chat','Notes','Journal','Tasks','Calendar','Twin','Behavior','Practice','Life Choices','Library','Stories','Settings'];
  const navFail = [];
  for (const sc of screens) {
    const clicked = await tryDo(() => nav(sc));
    const label = clicked ? await page.$(`[data-screen-label="${sc}"]`) : null;
    if (!label) navFail.push(sc);
  }
  check('NAV: all 13 screens render', navFail.length === 0, navFail.length ? 'failed:'+navFail.join(',') : '13/13');

  // 3. NOTES
  await nav('Notes');
  await tryDo(() => page.click('div[data-screen-label="Notes"] button:has(svg path[d="M12 5v14M5 12h14"])')); // "+" new note
  await page.waitForTimeout(500);
  await tryDo(() => page.fill('input[placeholder="Untitled note"]', 'Functional Test Note'));
  await tryDo(() => page.fill('textarea[placeholder="Start writing…"]', 'body text here'));
  await page.waitForTimeout(300);
  await tryDo(() => page.click('button:has-text("Pin")'));
  await page.waitForTimeout(900);
  s = await state();
  let fn = s.notes.find(n => n.title === 'Functional Test Note');
  check('NOTES: create + edit body', fn && fn.body.includes('body text'), fn ? 'ok' : 'missing');
  check('NOTES: pin', fn && fn.pinned === true, fn ? ('pinned='+fn.pinned) : 'missing');

  // 4. TASKS — add, then toggle via row containing the title
  await nav('Tasks');
  await tryDo(() => page.fill('input[placeholder="Add a gentle intention for today…"]', 'Functional test task'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  s = await state();
  check('TASKS: add task', s.tasks.some(t => t.title === 'Functional test task'), 'count='+s.tasks.length);
  // toggle: click the first checkbox in the Tasks screen, assert done-count changes
  const beforeDone = (await state()).tasks.filter(t => t.done).length;
  await tryDo(() => page.locator('div[data-screen-label="Tasks"] button').nth(0).click());
  await page.waitForTimeout(1000);
  const afterDone = (await state()).tasks.filter(t => t.done).length;
  check('TASKS: toggle done', afterDone !== beforeDone, `before=${beforeDone} after=${afterDone}`);

  // 5. JOURNAL
  await nav('Journal');
  await tryDo(() => page.fill('textarea[placeholder="Write freely. No one else will read this."]', 'A calm functional journal entry.'));
  await tryDo(() => page.click('button:has-text("Save entry")'));
  await page.waitForTimeout(900);
  s = await state();
  check('JOURNAL: save entry', s.journal.some(j => j.body.includes('functional journal')), 'count='+s.journal.length);

  // 6. CHAT
  await nav('Chat');
  const chatSel = 'input[placeholder*="mind"]';
  await tryDo(() => page.fill(chatSel, 'I feel anxious about everything'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2200);
  let body = (await page.innerText('body')).replace(/\s+/g, ' ');
  check('CHAT: anxious -> calm-set reply (server)', /slow breath|carrying a lot|okay to feel|heaviest/.test(body));
  await tryDo(() => page.fill(chatSel, 'thank you so much'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2200);
  body = (await page.innerText('body')).replace(/\s+/g, ' ');
  check('CHAT: thanks -> gratitude reply (server)', /whenever you want to think out loud/.test(body));
  s = await state();
  check('CHAT: messages persisted', s.chat.length >= 7, 'count='+s.chat.length);

  // 7. TWIN
  await nav('Twin');
  await tryDo(() => page.fill('input[placeholder="Add interest…"]', 'Astronomy'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  s = await state();
  check('TWIN: add interest', s.twin.interests.includes('Astronomy'), s.twin.interests.join('|'));

  // 8. LIFE
  await nav('Life Choices');
  await tryDo(() => page.click('div[data-screen-label="Life Choices"] button:has-text("Health")'));
  await page.waitForTimeout(400);
  await tryDo(() => page.fill('input[placeholder="Add a reason for…"]', 'more energy daily'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  s = await state();
  check('LIFE: select category + add pro', s.life.health && s.life.health.pros.includes('more energy daily'), JSON.stringify(s.life.health && s.life.health.pros));

  // 9. SETTINGS
  await nav('Settings');
  await tryDo(() => page.click('div[data-screen-label="Settings"] button:has-text("Rain")'));
  await page.waitForTimeout(800);
  s = await state();
  check('SETTINGS: set ambient', s.ambient === 'rain', 'ambient='+s.ambient);

  // 10. BEHAVIOR
  const behaviorApi = await page.evaluate(() => window.SlateAPI.behavior());
  check('BEHAVIOR: derived 4 cards', behaviorApi && behaviorApi.empty === false && behaviorApi.cards.length === 4,
    behaviorApi ? behaviorApi.cards.map(c=>c.label+':'+c.pct).join(' ') : 'none');

  // 11. CALENDAR
  const cal = await page.evaluate(() => window.SlateAPI.calendar());
  check('CALENDAR: month grid', cal && cal.weeks && cal.weeks.length >= 4, cal ? cal.monthLabel : 'none');

  // 12. CATALOG
  const cat = await page.evaluate(() => window.SlateAPI.catalog());
  check('CATALOG: static sections', cat && cat.libraryItems && cat.stories && cat.practiceModes, cat ? Object.keys(cat).join(',') : 'none');

  // 13. PERSISTENCE
  await page.reload({ waitUntil: 'domcontentloaded' });
  await dismissBoot();
  await page.waitForTimeout(1500);
  const s2 = await state();
  check('PERSIST: note survives reload', s2.notes.some(n => n.title === 'Functional Test Note'));
  check('PERSIST: interest survives reload', s2.twin.interests.includes('Astronomy'));
  check('PERSIST: ambient survives reload', s2.ambient === 'rain');

  check('NO page errors during run', pageErrors.length === 0, pageErrors.slice(0,3).join(' | '));

  await browser.close();

  let pass = 0;
  console.log('\n==================== FUNCTIONAL TEST RESULTS ====================');
  for (const r of results) { console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '   ['+r.detail+']' : ''}`); if (r.ok) pass++; }
  console.log('----------------------------------------------------------------');
  console.log(`${pass}/${results.length} checks passed`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('TEST CRASHED:', e.message); process.exit(2); });
