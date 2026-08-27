/**
 * E2E test for the canvas pin/unpin feature.
 * Verifies: dragging a cluster card pins it (collection.canvasPos = {x,y}),
 * a clean click on the header pin glyph unpins it (canvasPos === false, the
 * explicit sync-safe sentinel — NOT undefined), the card re-enters the auto
 * spiral layout with zero overlaps, a click elsewhere in the header does NOT
 * toggle the pin, and false -> {x,y} re-pin works.
 *
 * Launch machinery copied from spaces-layout-test.mjs (DO NOT modify
 * extension sources). Run: node pin-test.mjs
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EXT_PATH = 'D:\\MCP\\TheTab.Ninja';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const t0 = Date.now();
function log(...a) {
  console.log(`[${String(((Date.now() - t0) / 1000).toFixed(1)).padStart(6)}s]`, ...a);
}

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  log(`==== ${name}: ${pass === null ? 'INFO' : pass ? 'PASS' : 'FAIL'} — ${detail}`);
}

const consoleLog = []; // {phase, type, text}
let phase = 'startup';

function attachListeners(page, label) {
  page.on('console', (msg) => {
    consoleLog.push({ phase, page: label, type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    consoleLog.push({ phase, page: label, type: 'pageerror', text: String(err) });
  });
  page.on('dialog', (d) => {
    log(`[dialog on ${label}] ${d.type()}: ${d.message()} -> accepting`);
    d.accept().catch(() => {});
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function findExtensionId(browser, ms = 15000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const target = browser
      .targets()
      .find(
        (t) =>
          (t.type() === 'service_worker' || t.type() === 'background_page') &&
          t.url().startsWith('chrome-extension://')
      );
    if (target) return new URL(target.url()).host;
    await sleep(300);
  }
  return null;
}

// Branded Chrome >= 137 ignores --load-extension; the working path is the CDP
// route: pipe transport + --enable-unsafe-extension-debugging +
// browser.installExtension() (puppeteer enableExtensions option).
async function launch(headless) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ttn-e2e-pin-'));
  log(`Launching Chrome (headless=${headless}) with profile ${tmp}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless,
    pipe: true,
    enableExtensions: true,
    userDataDir: tmp,
    args: [
      '--enable-unsafe-extension-debugging',
      '--no-first-run',
      '--window-size=1450,980',
    ],
    defaultViewport: { width: 1366, height: 900 },
  });
  const installedId = await browser.installExtension(EXT_PATH);
  log(`installExtension -> ${installedId}`);
  return { browser, tmp, installedId };
}

// ---- Geometry helpers (copied from spaces-layout-test.mjs, margin 0) -------
function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}
const fmtRect = (r) => `${r.id.slice(0, 8)}[x=${r.x.toFixed(1)},y=${r.y.toFixed(1)},w=${r.width.toFixed(1)},h=${r.height.toFixed(1)}]`;
const fmtPos = (b) => `(${b.x.toFixed(1)},${b.y.toFixed(1)})`;

let browser, tmp;
try {
  // ---- Step 1: launch, open bm.html, seed ----------------------------------
  let extId = null;
  let installedId = null;
  ({ browser, tmp, installedId } = await launch(true));
  extId = (await findExtensionId(browser)) || installedId;
  if (!extId) {
    log('Extension service worker not found in headless mode; retrying headed.');
    await browser.close().catch(() => {});
    ({ browser, tmp, installedId } = await launch(false));
    extId = (await findExtensionId(browser)) || installedId;
  }
  if (!extId) throw new Error('Could not find extension service worker target.');
  log(`Extension ID: ${extId}`);
  const BM_URL = `chrome-extension://${extId}/bm.html`;

  const bmPage = await browser.newPage();
  attachListeners(bmPage, 'bm');
  await bmPage.goto(BM_URL, { waitUntil: 'load', timeout: 20000 });
  await sleep(1200);

  phase = 'step1-seed';
  const seed = await bmPage.evaluate(() => {
    const now = Date.now();
    // A fresh profile auto-creates the default 'Kodar.Ninja' collection on
    // first run; clear it so we have exactly the 4 seeded collections.
    const preexisting = bookmarkManagerData.collections.map((c) => c.name);
    bookmarkManagerData.collections.length = 0;
    bookmarkManagerData.spaces.push({ name: 'Work', deleted: false, lastModified: now });
    const defs = [
      { name: 'Alpha', n: 2 },
      { name: 'Bravo', n: 3 },
      { name: 'Charlie', n: 5 },
      { name: 'Delta', n: 6 },
    ];
    defs.forEach((d, i) => {
      const bookmarks = [];
      for (let j = 0; j < d.n; j++) {
        bookmarks.push({
          id: crypto.randomUUID(), title: 'B' + j, url: 'https://example.com/' + j,
          description: '', icon: '', lastModified: now, deleted: false, position: j, tags: [],
        });
      }
      bookmarkManagerData.collections.push({
        id: crypto.randomUUID(), name: d.name, isOpen: true, lastModified: now,
        deleted: false, position: i, spaces: ['Everything', 'Work'], bookmarks,
      });
    });
    saveToLocalStorage();
    renderCollections();
    return {
      collections: bookmarkManagerData.collections.length,
      spaces: bookmarkManagerData.spaces.map((s) => (typeof s === 'string' ? s : s.name)),
      counts: defs.map((d) => d.n),
      preexisting,
    };
  });
  const startupErrors = consoleLog.filter((c) => c.type === 'pageerror' || c.type === 'error');
  record('STEP1 launch+seed', seed.collections === 4 && seed.spaces.includes('Work'),
    `bm.html loaded; seeded collections=${seed.collections} bookmarkCounts=${JSON.stringify(seed.counts)} ` +
    `spaces=${JSON.stringify(seed.spaces)} (cleared default: ${JSON.stringify(seed.preexisting)}); ` +
    `startup console errors: ${startupErrors.length}` +
    (startupErrors.length ? ' :: ' + startupErrors.map((e) => e.text).join(' | ') : ''));

  // ---- Step 2: canvas active, all 4 cards auto-placed (no canvasPos) --------
  phase = 'step2-canvas';
  await bmPage.evaluate(() => CanvasView.show());
  await sleep(1500);

  async function getState() {
    return bmPage.evaluate(() => {
      const c = document.querySelector('#canvasView canvas.cnv-canvas');
      const r = c ? c.getBoundingClientRect() : null;
      return {
        dbg: CanvasView.getDebugState(),
        rect: r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null,
      };
    });
  }
  // World -> screen for a point, using a fresh state snapshot.
  const toScreen = (st, wx, wy) => ({
    x: wx * st.dbg.viewport.scale + st.dbg.viewport.x + st.rect.left,
    y: wy * st.dbg.viewport.scale + st.dbg.viewport.y + st.rect.top,
  });
  async function zoomFit() {
    await bmPage.evaluate(() => document.querySelector('.cnv-zoom-fit').click());
    await sleep(800);
  }
  // Real drag: down, >5px incremental movement, up.
  async function dragBy(sx, sy, dx, dy) {
    await bmPage.mouse.move(sx, sy);
    await bmPage.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await bmPage.mouse.move(sx + (dx * i) / 12, sy + (dy * i) / 12);
      await sleep(20);
    }
    await bmPage.mouse.up();
    await sleep(600);
  }
  // Clean click: down/up with zero movement (wasActualDrag stays false).
  async function cleanClick(sx, sy) {
    await bmPage.mouse.move(sx, sy);
    await bmPage.mouse.down();
    await bmPage.mouse.up();
    await sleep(600);
  }
  // Sync-safe sentinel probe: distinguishes false / undefined / object.
  const probePos = (id) => bmPage.evaluate((cid) => {
    const c = bookmarkManagerData.collections.find((x) => x.id === cid);
    return {
      isFalse: c.canvasPos === false,
      isUndefined: c.canvasPos === undefined,
      isXYObject: !!(c.canvasPos && typeof c.canvasPos === 'object' &&
                     typeof c.canvasPos.x === 'number' && typeof c.canvasPos.y === 'number'),
      repr: c.canvasPos === undefined ? 'undefined' : JSON.stringify(c.canvasPos),
    };
  }, id);

  let st = await getState();
  const headerH = st.dbg.config.headerHeight; // 36
  const allUndef = await bmPage.evaluate(() =>
    bookmarkManagerData.collections.every((c) => c.canvasPos === undefined));
  record('STEP2 canvas-auto-layout',
    st.dbg.active === true && st.dbg.bounds.length === 4 && allUndef === true,
    `active=${st.dbg.active} bounds=${st.dbg.bounds.length} (want 4) headerHeight=${headerH} ` +
    `all canvasPos===undefined: ${allUndef}; cards: ${st.dbg.bounds.map((b) => `${b.id.slice(0, 8)}@${fmtPos(b)}`).join(' ')}`);

  // The card under test: FIRST card in debug-state bounds order.
  const cardId = st.dbg.bounds[0].id;
  const cardName = await bmPage.evaluate(
    (cid) => bookmarkManagerData.collections.find((x) => x.id === cid).name, cardId);
  log(`Card under test: '${cardName}' (${cardId})`);

  // ---- Step 3: PIN — drag the first card's header +250/+150 screen px -------
  phase = 'step3-pin-drag';
  const b0 = st.dbg.bounds[0];
  // Grab the header at the title side (pin zone does not exist yet anyway).
  const grab0 = toScreen(st, b0.x + 40, b0.y + headerH / 2);
  log(`Dragging header of '${cardName}' from screen (${grab0.x.toFixed(1)},${grab0.y.toFixed(1)}) by (+250,+150), scale=${st.dbg.viewport.scale.toFixed(3)}`);
  await dragBy(grab0.x, grab0.y, 250, 150);

  const pinned = await probePos(cardId);
  let stAfterPin = await getState();
  const b1 = stAfterPin.dbg.bounds.find((b) => b.id === cardId);
  const expDX = 250 / st.dbg.viewport.scale, expDY = 150 / st.dbg.viewport.scale;
  const movedOK = b1 && Math.abs(b1.x - b0.x - expDX) < 30 && Math.abs(b1.y - b0.y - expDY) < 30;
  record('STEP3 pin-by-drag', pinned.isXYObject && movedOK,
    `canvasPos=${pinned.repr} (isXYObject=${pinned.isXYObject}); bounds ${fmtPos(b0)} -> ${b1 ? fmtPos(b1) : '?'} ` +
    `expected delta ~(${expDX.toFixed(1)},${expDY.toFixed(1)}) (movedOK=${movedOK})`);

  // ---- Step 4: UNPIN — clean click on the 📌 glyph ---------------------------
  phase = 'step4-unpin';
  await zoomFit(); // make sure the dragged card (and its pin) is on-screen
  st = await getState();
  const bPinned = st.dbg.bounds.find((b) => b.id === cardId);
  // worldPin = (bounds.x + bounds.width - 42, bounds.y + headerHeight/2)
  const pinScr = toScreen(st, bPinned.x + bPinned.width - 42, bPinned.y + headerH / 2);
  log(`Clean-clicking pin of '${cardName}' at screen (${pinScr.x.toFixed(1)},${pinScr.y.toFixed(1)}) ` +
      `(world ${(bPinned.x + bPinned.width - 42).toFixed(1)},${(bPinned.y + headerH / 2).toFixed(1)}, scale=${st.dbg.viewport.scale.toFixed(3)})`);
  await cleanClick(pinScr.x, pinScr.y);

  // 4a: canvasPos === false (the sync-safe sentinel), NOT undefined/object.
  const unpinned = await probePos(cardId);
  record('STEP4a unpin-sentinel',
    unpinned.isFalse && !unpinned.isUndefined && !unpinned.isXYObject,
    `canvasPos=${unpinned.repr} (===false: ${unpinned.isFalse}, ===undefined: ${unpinned.isUndefined}, xyObject: ${unpinned.isXYObject})`);

  // 4b: card re-entered auto layout (position changed) + zero overlaps (AABB).
  st = await getState();
  const bAuto = st.dbg.bounds.find((b) => b.id === cardId);
  const repositioned = bAuto &&
    (Math.abs(bAuto.x - bPinned.x) > 5 || Math.abs(bAuto.y - bPinned.y) > 5);
  const overlaps = [];
  for (let i = 0; i < st.dbg.bounds.length; i++) {
    for (let j = i + 1; j < st.dbg.bounds.length; j++) {
      if (rectsOverlap(st.dbg.bounds[i], st.dbg.bounds[j])) {
        overlaps.push(`${fmtRect(st.dbg.bounds[i])} <-> ${fmtRect(st.dbg.bounds[j])}`);
      }
    }
  }
  record('STEP4b auto-relayout+no-overlaps', !!repositioned && overlaps.length === 0,
    `pinned pos ${fmtPos(bPinned)} -> auto pos ${bAuto ? fmtPos(bAuto) : '?'} (repositioned=${!!repositioned}); ` +
    (overlaps.length === 0
      ? `0 overlapping pairs among ${st.dbg.bounds.length} cards (${st.dbg.bounds.length * (st.dbg.bounds.length - 1) / 2} pairs tested)`
      : `${overlaps.length} VIOLATING PAIR(S): ${overlaps.join(' ;; ')}`));

  // ---- Step 5: NO-FALSE-POSITIVE — clean click on the TITLE side -------------
  phase = 'step5-title-click';
  await zoomFit();
  st = await getState();
  const bBefore = st.dbg.bounds.find((b) => b.id === cardId);
  const titleScr = toScreen(st, bBefore.x + 40, bBefore.y + headerH / 2);
  log(`Clean-clicking TITLE side of '${cardName}' at screen (${titleScr.x.toFixed(1)},${titleScr.y.toFixed(1)})`);
  await cleanClick(titleScr.x, titleScr.y);
  const stillFalse = await probePos(cardId);
  const stTitle = await getState();
  const bTitle = stTitle.dbg.bounds.find((b) => b.id === cardId);
  const unmoved = bTitle && Math.abs(bTitle.x - bBefore.x) < 1 && Math.abs(bTitle.y - bBefore.y) < 1;
  record('STEP5 title-click-no-toggle',
    stillFalse.isFalse && !stillFalse.isXYObject && !!unmoved,
    `canvasPos=${stillFalse.repr} (still ===false: ${stillFalse.isFalse}); ` +
    `card pos ${fmtPos(bBefore)} -> ${bTitle ? fmtPos(bTitle) : '?'} (unmoved=${unmoved}, click selects only, no state change)`);

  // ---- Step 6: RE-PIN — drag the same card again (false -> {x,y}) -------------
  phase = 'step6-repin';
  st = await getState();
  const bRe = st.dbg.bounds.find((b) => b.id === cardId);
  const grab1 = toScreen(st, bRe.x + 40, bRe.y + headerH / 2);
  log(`Re-dragging header of '${cardName}' from screen (${grab1.x.toFixed(1)},${grab1.y.toFixed(1)}) by (+200,+130)`);
  await dragBy(grab1.x, grab1.y, 200, 130);
  const repinned = await probePos(cardId);
  const stRe = await getState();
  const bRe2 = stRe.dbg.bounds.find((b) => b.id === cardId);
  record('STEP6 re-pin', repinned.isXYObject && !repinned.isFalse,
    `canvasPos=${repinned.repr} (false -> xyObject transition: ${repinned.isXYObject}); ` +
    `bounds ${fmtPos(bRe)} -> ${bRe2 ? fmtPos(bRe2) : '?'}`);

  // ---- Step 7: screenshot while pinned (zoom Fit first) -----------------------
  phase = 'step7-screenshot';
  await zoomFit();
  const shotPath = path.join('D:\\MCP\\TheTab.Ninja\\.e2e', 'pin-canvas.png');
  await bmPage.screenshot({ path: shotPath });
  record('STEP7 screenshot', true,
    `fitted layout with '${cardName}' pinned (📌 glyph in its header) saved to ${shotPath}`);

  // ---- Summary -----------------------------------------------------------------
  log('================== SUMMARY ==================');
  for (const r of results) {
    log(`${r.pass === null ? 'INFO' : r.pass ? 'PASS' : 'FAIL'}  ${r.name}: ${r.detail}`);
  }
  const allErrs = consoleLog.filter((c) => c.type === 'error' || c.type === 'pageerror');
  log(`---- All console errors/pageerrors (${allErrs.length}) ----`);
  allErrs.forEach((e) => log(`  [${e.phase}/${e.page}] ${e.type}: ${e.text}`));
  if (results.some((r) => r.pass === false)) process.exitCode = 1;
} catch (err) {
  log('HARNESS ERROR:', err && err.stack ? err.stack : String(err));
  process.exitCode = 1;
} finally {
  // ---- Step 8: kill the browser -------------------------------------------------
  if (browser) await browser.close().catch(() => {});
  await sleep(700);
  if (tmp) { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} }
  log('Browser closed.');
}
