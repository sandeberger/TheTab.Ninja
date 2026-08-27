/**
 * E2E test for the NEW canvas feature: space hubs with golden-angle spiral layout.
 * Verifies: hub presence/memberCounts, NO cluster-card overlaps (global AABB),
 * no card covering a hub (circle-vs-AABB), varying card heights, hub drag
 * persistence (space.canvasPos), hub dblclick -> selectSpace, Spaces toggle.
 *
 * Launch machinery copied from run-tests.mjs (DO NOT modify extension sources).
 * Run: node spaces-layout-test.mjs
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ttn-e2e-spaces-'));
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

// Faithful user double-press: down(1) up(1) down(2) up(2). A single CDP
// press/release pair with clickCount=2 does NOT synthesize dblclick in this
// Chrome (established empirically by run-tests.mjs).
async function dblPress(page, x, y) {
  await page.mouse.move(x, y);
  await page.mouse.down({ clickCount: 1 });
  await page.mouse.up({ clickCount: 1 });
  await page.mouse.down({ clickCount: 2 });
  await page.mouse.up({ clickCount: 2 });
}

// ---- Geometry helpers (test-side reimplementation, margin 0 = strict) ------
function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}
// Circle (hub center hx,hy radius r) vs AABB: nearest-point distance >= r passes.
function hubCovered(hub, rect) {
  const nx = Math.max(rect.x, Math.min(hub.x, rect.x + rect.width));
  const ny = Math.max(rect.y, Math.min(hub.y, rect.y + rect.height));
  const dx = hub.x - nx;
  const dy = hub.y - ny;
  return Math.sqrt(dx * dx + dy * dy) < hub.r;
}
const fmtRect = (r) => `${r.id}[x=${r.x.toFixed(1)},y=${r.y.toFixed(1)},w=${r.width.toFixed(1)},h=${r.height.toFixed(1)}]`;
const fmtHub = (h) => `${h.name}(x=${h.x.toFixed(1)},y=${h.y.toFixed(1)},r=${h.r})`;

let browser, tmp;
try {
  // ---- Step 1: launch + open bm.html ---------------------------------------
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
  const startupErrors = consoleLog.filter((c) => c.type === 'pageerror' || c.type === 'error');
  record('STEP1 launch+load', true,
    `bm.html loaded (${bmPage.url()}); startup console errors: ${startupErrors.length}` +
    (startupErrors.length ? ' :: ' + startupErrors.map((e) => e.text).join(' | ') : ''));

  // ---- Step 2: seed 3 spaces (Work/Play/+Everything) and 8 collections ------
  phase = 'step2-seed';
  const seed = await bmPage.evaluate(() => {
    const now = Date.now();
    // A fresh profile auto-creates one default collection on first run; clear
    // it so hub memberCounts and bounds counts are deterministic (8 seeded).
    const preexisting = bookmarkManagerData.collections.map((c) => c.name);
    bookmarkManagerData.collections.length = 0;
    bookmarkManagerData.spaces.push(
      { name: 'Work', deleted: false, lastModified: now },
      { name: 'Play', deleted: false, lastModified: now }
    );
    // Wildly varying bookmark counts -> very different card heights.
    const defs = [
      { name: 'W1', spaces: ['Everything', 'Work'], n: 0 },
      { name: 'W2', spaces: ['Everything', 'Work'], n: 1 },
      { name: 'W3', spaces: ['Everything', 'Work'], n: 2 },
      { name: 'P1', spaces: ['Everything', 'Play'], n: 5 },
      { name: 'P2', spaces: ['Everything', 'Play'], n: 9 },
      { name: 'P3', spaces: ['Everything', 'Play'], n: 14 },
      { name: 'E1', spaces: ['Everything'], n: 3 },
      { name: 'E2', spaces: ['Everything'], n: 7 },
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
        deleted: false, position: i, spaces: d.spaces, bookmarks,
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
  record('STEP2 seed', seed.collections === 8 && seed.spaces.includes('Work') && seed.spaces.includes('Play'),
    `collections=${seed.collections} spaces=${JSON.stringify(seed.spaces)} bookmarkCounts=${JSON.stringify(seed.counts)}` +
    ` (cleared preexisting default: ${JSON.stringify(seed.preexisting)})`);

  // ---- Step 3: activate canvas, read debug state -----------------------------
  phase = 'step3-canvas';
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

  let { dbg: state, rect } = await getState();
  record('STEP3 canvas-active', state.active === true && state.bounds.length === 8,
    `active=${state.active} bounds=${state.bounds.length} hubs=${state.hubs.length} showSpaces=${state.showSpaces} ` +
    `viewport=${JSON.stringify(state.viewport)}`);

  // ---- Step 4a: hubs Work/Play/Everything with memberCounts 3/3/2 ------------
  phase = 'step4-asserts';
  const hubByName = Object.fromEntries(state.hubs.map((h) => [h.name, h]));
  const expectCounts = { Work: 3, Play: 3, Everything: 2 };
  const hubProblems = [];
  if (state.showSpaces !== true) hubProblems.push(`showSpaces=${state.showSpaces} (want true)`);
  for (const [name, n] of Object.entries(expectCounts)) {
    if (!hubByName[name]) hubProblems.push(`hub '${name}' missing`);
    else if (hubByName[name].memberCount !== n)
      hubProblems.push(`hub '${name}' memberCount=${hubByName[name].memberCount} (want ${n})`);
  }
  record('STEP4a hubs', hubProblems.length === 0,
    hubProblems.length ? hubProblems.join('; ')
      : `showSpaces=true, hubs: ${state.hubs.map((h) => `${h.name}@(${h.x.toFixed(0)},${h.y.toFixed(0)}) r=${h.r} members=${h.memberCount}`).join(', ')}`);

  // ---- Step 4b: NO overlaps among cluster cards (global pairwise AABB) -------
  const overlaps = [];
  for (let i = 0; i < state.bounds.length; i++) {
    for (let j = i + 1; j < state.bounds.length; j++) {
      if (rectsOverlap(state.bounds[i], state.bounds[j])) {
        overlaps.push(`${fmtRect(state.bounds[i])} <-> ${fmtRect(state.bounds[j])}`);
      }
    }
  }
  record('STEP4b no-overlaps', overlaps.length === 0,
    overlaps.length === 0
      ? `0 overlapping pairs among ${state.bounds.length} cards (${state.bounds.length * (state.bounds.length - 1) / 2} pairs tested)`
      : `${overlaps.length} VIOLATING PAIR(S): ${overlaps.join(' ;; ')}`);

  // ---- Step 4c: no card covers a hub (circle vs AABB) -------------------------
  const hubHits = [];
  for (const hub of state.hubs) {
    for (const r of state.bounds) {
      if (hubCovered(hub, r)) hubHits.push(`${fmtHub(hub)} covered by ${fmtRect(r)}`);
    }
  }
  record('STEP4c no-hub-coverage', hubHits.length === 0,
    hubHits.length === 0
      ? `${state.hubs.length} hubs x ${state.bounds.length} cards: nearest-point distance >= r for all`
      : `${hubHits.length} VIOLATION(S): ${hubHits.join(' ;; ')}`);

  // ---- Step 4d: heights actually vary (>200px spread) -------------------------
  const heights = state.bounds.map((b) => b.height);
  const minH = Math.min(...heights), maxH = Math.max(...heights);
  record('STEP4d height-spread', maxH - minH > 200,
    `card heights min=${minH.toFixed(0)} max=${maxH.toFixed(0)} spread=${(maxH - minH).toFixed(0)}px (want >200)`);

  // ---- Step 8 (run early, before the drag mutates layout): fit + screenshot --
  phase = 'step8-screenshot';
  await bmPage.evaluate(() => document.querySelector('.cnv-zoom-fit').click());
  await sleep(800);
  const shotPath = path.join('D:\\MCP\\TheTab.Ninja\\.e2e', 'spaces-canvas.png');
  await bmPage.screenshot({ path: shotPath });
  record('STEP8 screenshot', true, `pristine fitted layout saved to ${shotPath} (taken before drag test)`);

  // ---- Step 5: drag the 'Work' hub +300/+200 screen px, verify persistence ---
  phase = 'step5-drag';
  ({ dbg: state, rect } = await getState());
  const work0 = state.hubs.find((h) => h.name === 'Work');
  if (!work0 || !rect) {
    record('STEP5 hub-drag-persist', false, `precondition failed: workHub=${!!work0} rect=${!!rect}`);
  } else {
    const sx = work0.x * state.viewport.scale + state.viewport.x + rect.left;
    const sy = work0.y * state.viewport.scale + state.viewport.y + rect.top;
    const tx = sx + 300, ty = sy + 200;
    log(`Dragging Work hub: screen (${sx.toFixed(1)},${sy.toFixed(1)}) -> (${tx.toFixed(1)},${ty.toFixed(1)}) world=(${work0.x.toFixed(1)},${work0.y.toFixed(1)}) scale=${state.viewport.scale.toFixed(3)}`);
    await bmPage.mouse.move(sx, sy);
    await bmPage.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await bmPage.mouse.move(sx + (300 * i) / 12, sy + (200 * i) / 12);
      await sleep(20);
    }
    await bmPage.mouse.up();
    await sleep(500);
    const { dbg: after } = await getState();
    const work1 = after.hubs.find((h) => h.name === 'Work');
    const persisted = await bmPage.evaluate(() => {
      const s = bookmarkManagerData.spaces.find((s) => typeof s === 'object' && s.name === 'Work');
      return s ? s.canvasPos : null;
    });
    const expDX = 300 / state.viewport.scale, expDY = 200 / state.viewport.scale;
    const movedOK = work1 && Math.abs(work1.x - work0.x - expDX) < 30 && Math.abs(work1.y - work0.y - expDY) < 30;
    const persistOK = persisted && work1 && Math.abs(persisted.x - work1.x) < 2 && Math.abs(persisted.y - work1.y) < 2;
    record('STEP5 hub-drag-persist', !!(movedOK && persistOK),
      `world (${work0.x.toFixed(1)},${work0.y.toFixed(1)}) -> (${work1 ? work1.x.toFixed(1) : '?'},${work1 ? work1.y.toFixed(1) : '?'}) ` +
      `expected delta ~(${expDX.toFixed(1)},${expDY.toFixed(1)}); persisted spaces['Work'].canvasPos=${JSON.stringify(persisted)} ` +
      `(movedOK=${movedOK} persistOK=${persistOK})`);
  }

  // ---- Step 6: dbl-press the 'Play' hub -> currentSpace 'Play', 3 bounds ------
  phase = 'step6-dblclick-hub';
  await bmPage.evaluate(() => document.querySelector('.cnv-zoom-fit').click()); // re-fit so Play hub is on-screen
  await sleep(800);
  ({ dbg: state, rect } = await getState());
  const play = state.hubs.find((h) => h.name === 'Play');
  if (!play || !rect) {
    record('STEP6 hub-dblclick', false, `precondition failed: playHub=${!!play} rect=${!!rect}`);
  } else {
    const px = play.x * state.viewport.scale + state.viewport.x + rect.left;
    const py = play.y * state.viewport.scale + state.viewport.y + rect.top;
    log(`Dbl-pressing Play hub at screen (${px.toFixed(1)},${py.toFixed(1)})`);
    await dblPress(bmPage, px, py);
    await sleep(900);
    const cur = await bmPage.evaluate(() => bookmarkManagerData.currentSpace);
    const { dbg: playState } = await getState();
    const ok = cur === 'Play' && playState.bounds.length === 3;
    record('STEP6 hub-dblclick', ok,
      `currentSpace='${cur}' (want 'Play'); canvas bounds=${playState.bounds.length} (want 3); ` +
      `hubs now: ${playState.hubs.map((h) => `${h.name}:${h.memberCount}`).join(',')}`);
    await bmPage.evaluate(() => selectSpace('Everything'));
    await sleep(900);
    const restored = await bmPage.evaluate(() => bookmarkManagerData.currentSpace);
    log(`Restored currentSpace='${restored}'`);
  }

  // ---- Step 7: '◉ Spaces' toolbar toggle off/on -------------------------------
  phase = 'step7-toggle';
  await bmPage.evaluate(() => document.querySelector('.cnv-toolbar .cnv-btn-ghost').click());
  await sleep(900);
  const { dbg: offState } = await getState();
  const offOK = offState.showSpaces === false && offState.hubs.length === 0 && offState.bounds.length === 8;
  // Toggle back on.
  await bmPage.evaluate(() => document.querySelector('.cnv-toolbar .cnv-btn-ghost').click());
  await sleep(900);
  const { dbg: onState } = await getState();
  const onOK = onState.showSpaces === true && onState.hubs.length === 3;
  record('STEP7 spaces-toggle', offOK && onOK,
    `OFF: showSpaces=${offState.showSpaces} hubs=${offState.hubs.length} bounds=${offState.bounds.length} (want false/0/8, row flow); ` +
    `ON again: showSpaces=${onState.showSpaces} hubs=${onState.hubs.length} (want true/3)`);

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
  // ---- Step 9: kill the browser -------------------------------------------------
  if (browser) await browser.close().catch(() => {});
  await sleep(700);
  if (tmp) { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} }
  log('Browser closed.');
}
