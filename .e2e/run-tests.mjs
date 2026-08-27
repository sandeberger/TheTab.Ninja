/**
 * E2E harness for TheTab.Ninja Chrome MV3 extension.
 * Verifies: board single-click open, canvas dblclick open, hot tab states,
 * canvas empty-state visibility/pointer-events, cluster-header dblclick launch.
 *
 * Run: node run-tests.mjs
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EXT_PATH = 'D:\\MCP\\TheTab.Ninja';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

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

// NOTE: branded Chrome >= 137 ignores --load-extension/--disable-extensions-except
// (verified empirically against Chrome 148: no extension target ever appears, and the
// DisableLoadExtensionCommandLineSwitch feature escape hatch is gone too). The working
// path is the CDP route: pipe transport + --enable-unsafe-extension-debugging +
// browser.installExtension() (puppeteer enableExtensions option).
async function launch(headless) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ttn-e2e-'));
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
  // CAUTION: do NOT also pass --disable-extensions-except: with command-line
  // extension loading ignored (Chrome >= 137) it just disables the
  // CDP-installed extension again.
  const installedId = await browser.installExtension(EXT_PATH);
  log(`installExtension -> ${installedId}`);
  return { browser, tmp, installedId };
}

// Run fn (which should trigger navigation) and report whether the page navigated.
async function watchNav(page, fn, timeout = 5000) {
  const nav = page
    .waitForNavigation({ timeout })
    .then(() => true)
    .catch(() => false);
  try {
    await fn();
  } catch (e) {
    // evaluate may die with "Execution context destroyed" when navigation succeeds
    if (!String(e).includes('context')) throw e;
  }
  const navigated = await nav;
  return { navigated, url: page.url() };
}

// Double-click strategies. 'A' = single CDP press/release pair with clickCount=2
// (canonical puppeteer double click). 'B' = faithful user sequence:
// down(1) up(1) down(2) up(2), which is what a physical mouse produces.
async function dblClickAt(page, x, y, strategy) {
  if (strategy === 'A') {
    await page.mouse.click(x, y, { clickCount: 2 });
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down({ clickCount: 1 });
    await page.mouse.up({ clickCount: 1 });
    await page.mouse.down({ clickCount: 2 });
    await page.mouse.up({ clickCount: 2 });
  }
}
let winningStrategy = 'A';

let browser, tmp;
try {
  // ---- Launch (headless first, headed fallback) -----------------------------
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

  // ---- Open bm.html (capture console from the very start) ------------------
  const bmPage = await browser.newPage();
  attachListeners(bmPage, 'bm');
  await bmPage.goto(BM_URL, { waitUntil: 'load', timeout: 20000 });
  await sleep(1200);
  log(`bm.html loaded: ${bmPage.url()}`);
  const startupErrors = consoleLog.filter((c) => c.type === 'pageerror' || c.type === 'error');
  log(`Startup console errors so far: ${startupErrors.length}`);
  startupErrors.forEach((e) => log(`  [startup ${e.type}] ${e.text}`));

  const globals = await bmPage.evaluate(() => ({
    bookmarkManagerData: typeof bookmarkManagerData,
    CanvasData: typeof CanvasData,
    CanvasView: typeof CanvasView,
    saveToLocalStorage: typeof saveToLocalStorage,
    renderCollections: typeof renderCollections,
    openBookmark: typeof openBookmark,
    isSafeUrl: typeof isSafeUrl,
    launchCollection: typeof launchCollection,
  }));
  log('Globals:', JSON.stringify(globals));

  // ---- Step 1: second tab at example.com ------------------------------------
  phase = 'step1-second-tab';
  const tab2 = await browser.newPage();
  attachListeners(tab2, 'tab2');
  await tab2.goto('https://example.com/', { waitUntil: 'load', timeout: 20000 });
  log(`Second tab open at ${tab2.url()} (stays open)`);
  await bmPage.bringToFront();

  // ---- Step 2: seed data -----------------------------------------------------
  phase = 'step2-seed';
  const seed = await bmPage.evaluate(() => {
    const colId = crypto.randomUUID();
    const bmId = crypto.randomUUID();
    bookmarkManagerData.collections.push({
      id: colId,
      name: 'E2E',
      isOpen: true,
      lastModified: Date.now(),
      deleted: false,
      position: 0,
      spaces: ['Everything'],
      bookmarks: [
        {
          id: bmId,
          title: 'Example',
          url: 'https://example.com/',
          description: '',
          icon: '',
          lastModified: Date.now(),
          deleted: false,
          position: 0,
          tags: [],
        },
      ],
    });
    saveToLocalStorage();
    renderCollections();
    return { colId, bmId, total: bookmarkManagerData.collections.length };
  });
  log(`Seeded collection ${seed.colId} bookmark ${seed.bmId} (collections=${seed.total})`);

  // ---- Step 3: TEST board-click ----------------------------------------------
  phase = 'test-board-click';
  const canvasActive = await bmPage.evaluate(() => CanvasView.isActive());
  log(`CanvasView.isActive() = ${canvasActive} (expect false: board view)`);
  const bmEl = await bmPage.evaluate(() => {
    const els = [...document.querySelectorAll('#collections .bookmark')];
    const el = els.find((e) => (e.textContent || '').includes('Example'));
    if (!el) {
      return {
        found: false,
        sample: [...document.querySelectorAll('#collections *')].slice(0, 5).map((n) => n.className),
      };
    }
    const title = el.querySelector('h3') || el;
    const r = title.getBoundingClientRect();
    return { found: true, x: r.left + r.width / 2, y: r.top + r.height / 2, cls: el.className };
  });
  log('Bookmark element lookup:', JSON.stringify(bmEl));
  if (!bmEl.found) {
    record('TEST board-click', false, 'bookmark .bookmark element with text "Example" not found in #collections');
  } else {
    const errsBefore = consoleLog.length;
    const res = await watchNav(bmPage, () => bmPage.mouse.click(bmEl.x, bmEl.y), 5000);
    const errs = consoleLog.slice(errsBefore).filter((c) => c.type === 'error' || c.type === 'pageerror');
    if (res.navigated && res.url.startsWith('https://example.com')) {
      record('TEST board-click', true, `single click navigated to ${res.url}`);
    } else {
      record(
        'TEST board-click',
        false,
        `no navigation (url=${res.url}); console during click: ${errs.map((e) => e.text).join(' | ') || 'none'}`
      );
    }
  }

  // back to bm.html
  await bmPage.goto(BM_URL, { waitUntil: 'load', timeout: 20000 });
  await sleep(1000);

  // ---- Step 4: TEST canvas dblclick -------------------------------------------
  phase = 'test-canvas-dblclick';
  await bmPage.evaluate(() => CanvasView.show());
  await sleep(1200);

  function nodeScreenPoint(dbg, rect, urlPart) {
    const { viewport, config } = dbg;
    const b = dbg.bounds.find((bb) => bb.nodes.some((n) => (n.url || '').includes(urlPart)));
    if (!b) return null;
    const i = b.nodes.findIndex((n) => (n.url || '').includes(urlPart));
    const nodeWidth = b.width - 2 * config.padding;
    const wx = b.x + config.padding + nodeWidth / 2;
    const wy =
      b.y + config.headerHeight + config.padding + i * (config.nodeHeight + config.nodeMargin) + config.nodeHeight / 2;
    return {
      x: wx * viewport.scale + viewport.x + rect.left,
      y: wy * viewport.scale + viewport.y + rect.top,
      world: { x: wx, y: wy },
      bounds: b,
      nodeIndex: i,
      nodeId: b.nodes[i].id,
    };
  }

  async function getDbg() {
    return bmPage.evaluate(() => {
      const c = document.querySelector('#canvasView canvas.cnv-canvas');
      const r = c ? c.getBoundingClientRect() : null;
      return {
        dbg: CanvasView.getDebugState(),
        rect: r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null,
      };
    });
  }

  let { dbg, rect } = await getDbg();
  log('getDebugState:', JSON.stringify(dbg));
  log('canvas rect:', JSON.stringify(rect));

  const cluster = dbg.bounds.find((b) => b.nodes.some((n) => (n.url || '').includes('example.com')));
  if (!dbg.active || !cluster || !rect) {
    record(
      'TEST canvas-dblclick',
      false,
      `precondition failed: active=${dbg.active} clusterFound=${!!cluster} canvasRect=${!!rect}`
    );
  } else {
    log(`E2E cluster bounds ok: ${cluster.nodes.length} node(s), state=${cluster.nodes[0].state}`);
    const pt = nodeScreenPoint(dbg, rect, 'example.com');
    log(`Node screen center: (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}) world=(${pt.world.x.toFixed(1)}, ${pt.world.y.toFixed(1)}) nodeId=${pt.nodeId}`);

    const errsBefore = consoleLog.length;
    const res = await watchNav(bmPage, () => dblClickAt(bmPage, pt.x, pt.y, 'A'), 5000);
    if (res.navigated && res.url.startsWith('https://example.com')) {
      record('TEST canvas-dblclick', true, `dblclick on node navigated to ${res.url}`);
      await bmPage.goto(BM_URL, { waitUntil: 'load', timeout: 20000 });
      await sleep(1000);
    } else {
      log('dblclick (strategy A: single CDP pair, clickCount=2) did NOT navigate. Drilling into the chain...');
      const errs = consoleLog.slice(errsBefore).filter((c) => c.type === 'error' || c.type === 'pageerror');
      log(`console during dblclick: ${errs.map((e) => e.text).join(' | ') || 'none'}`);

      // Instrument the canvas: record the full event ladder, stub openNode so
      // probe double-clicks do not navigate away mid-diagnosis.
      await bmPage.evaluate(() => {
        window.__e2e = { events: [], openNodeCalls: [] };
        const c = document.querySelector('#canvasView canvas.cnv-canvas');
        ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick'].forEach((t) =>
          c.addEventListener(t, (e) =>
            window.__e2e.events.push({ t, x: e.clientX, y: e.clientY, detail: e.detail, prevented: e.defaultPrevented })
          )
        );
        window.__e2eOrigOpenNode = CanvasData.openNode;
        CanvasData.openNode = (id) => { window.__e2e.openNodeCalls.push(id); };
      });
      async function probeStrategy(name, strat, beforeFn) {
        if (beforeFn) await bmPage.evaluate(beforeFn);
        await bmPage.evaluate(() => { window.__e2e.events = []; window.__e2e.openNodeCalls = []; });
        await dblClickAt(bmPage, pt.x, pt.y, strat);
        await sleep(250);
        const r = await bmPage.evaluate(() => window.__e2e);
        log(
          `probe ${name}: events=[${r.events.map((e) => `${e.t}(d${e.detail}${e.prevented ? ',prevented' : ''})`).join(' ')}]` +
          ` openNodeCalls=${JSON.stringify(r.openNodeCalls)}`
        );
        return r;
      }

      // (a) strategy A again, instrumented
      const pA = await probeStrategy('A  (1 pair, clickCount=2)', 'A');
      // (b) strategy B: faithful real-user sequence down1/up1/down2/up2
      const pB = await probeStrategy('B  (down1 up1 down2 up2)', 'B');
      // (c) strategy B with setPointerCapture disabled -> isolates capture suppression
      const pC = await probeStrategy('C  (B + setPointerCapture stubbed)', 'B', () => {
        const c = document.querySelector('#canvasView canvas.cnv-canvas');
        c.setPointerCapture = function () {};
      });

      // (d) recompute world hit from the page's own viewport to confirm in-bounds
      ({ dbg, rect } = await getDbg());
      const b2 = dbg.bounds.find((bb) => bb.nodes.some((n) => (n.url || '').includes('example.com')));
      const worldX = (pt.x - rect.left - dbg.viewport.x) / dbg.viewport.scale;
      const worldY = (pt.y - rect.top - dbg.viewport.y) / dbg.viewport.scale;
      const inCluster =
        b2 && worldX >= b2.x && worldX <= b2.x + b2.width && worldY >= b2.y && worldY <= b2.y + b2.height;
      log(`world recheck: (${worldX.toFixed(1)}, ${worldY.toFixed(1)}) inside cluster=${inCluster}`);

      // (e) static probes
      const probes = await bmPage.evaluate((u) => ({
        typeofOpenBookmark: typeof openBookmark,
        typeofIsSafeUrl: typeof isSafeUrl,
        isSafe: typeof isSafeUrl === 'function' ? isSafeUrl(u) : 'n/a',
        openInNewTab: bookmarkManagerData.openInNewTab,
        typeofOpenNode: typeof CanvasData.openNode,
      }), 'https://example.com/');
      log('static probes:', JSON.stringify(probes));

      // Restore the real openNode.
      await bmPage.evaluate(() => { CanvasData.openNode = window.__e2eOrigOpenNode; });

      // Decide: did ANY real input strategy drive the full chain?
      const working = pB.openNodeCalls.length ? 'B' : pC.openNodeCalls.length ? 'C' : pA.openNodeCalls.length ? 'A' : null;
      if (working === 'B' || working === 'A') {
        winningStrategy = working;
        // End-to-end re-verification with the real openNode in place.
        const res2 = await watchNav(bmPage, () => dblClickAt(bmPage, pt.x, pt.y, working === 'A' ? 'A' : 'B'), 5000);
        log(`re-run with strategy ${working}: navigated=${res2.navigated} url=${res2.url}`);
        if (res2.navigated && res2.url.startsWith('https://example.com')) {
          record(
            'TEST canvas-dblclick',
            true,
            `dblclick chain works end-to-end with a real double-press sequence (strategy ${working}); ` +
              `single CDP pair clickCount=2 did not synthesize dblclick in this Chrome (harness artifact, not an extension bug)`
          );
        } else {
          record(
            'TEST canvas-dblclick',
            false,
            `dblclick fires and openNode is called (strategy ${working}) but navigation does not happen -> ` +
              `openBookmark/navigation link broken; isSafe=${probes.isSafe} openInNewTab=${probes.openInNewTab}`
          );
        }
        if (bmPage.url().startsWith('https://example.com')) {
          await bmPage.goto(BM_URL, { waitUntil: 'load', timeout: 20000 });
          await sleep(1000);
        }
      } else {
        // No input strategy worked: identify the exact broken link.
        const resOpenNode = await watchNav(
          bmPage,
          () => bmPage.evaluate((id) => CanvasData.openNode(id), pt.nodeId),
          5000
        );
        log(`CanvasData.openNode('${pt.nodeId}') navigated=${resOpenNode.navigated} url=${resOpenNode.url}`);
        let resOpenBookmark = null;
        if (!resOpenNode.navigated) {
          resOpenBookmark = await watchNav(
            bmPage,
            () => bmPage.evaluate((c, b) => openBookmark(c, b), seed.colId, seed.bmId),
            5000
          );
          log(`openBookmark(col,bm) navigated=${resOpenBookmark.navigated} url=${resOpenBookmark.url}`);
        }
        const sawDbl = (p) => p.events.some((e) => e.t === 'dblclick');
        let broken;
        if (working === 'C') broken = 'setPointerCapture in onPointerDown suppresses dblclick synthesis: stubbing it out makes the chain work (strategy C)';
        else if (!sawDbl(pA) && !sawDbl(pB) && !sawDbl(pC)) {
          const sawClick = [pA, pB, pC].some((p) => p.events.some((e) => e.t === 'click'));
          broken = `dblclick event is never synthesized on the canvas (click fired: ${sawClick}); pointerdown/mousedown do arrive`;
        } else if (!inCluster) broken = 'dblclick fires but point is outside cluster bounds -> coordinates/hitTest mismatch';
        else if (resOpenNode.navigated) broken = 'dblclick fires inside the node rect but openNode is never called -> onDoubleClick/hitTest link broken (openNode itself works)';
        else if (probes.typeofOpenBookmark !== 'function') broken = `openBookmark missing (typeof=${probes.typeofOpenBookmark})`;
        else if (probes.isSafe === false) broken = `isSafeUrl('https://example.com/') returns false -> openBookmark blocks navigation`;
        else if (resOpenBookmark && resOpenBookmark.navigated) broken = 'openBookmark navigates directly but CanvasData.openNode does not -> openNode lookup/dispatch broken';
        else broken = 'openBookmark called directly also does not navigate -> navigation itself blocked';
        record('TEST canvas-dblclick', false, broken + `; console: ${errs.map((e) => e.text).join(' | ') || 'none'}`);
        if (bmPage.url().startsWith('https://example.com')) {
          await bmPage.goto(BM_URL, { waitUntil: 'load', timeout: 20000 });
          await sleep(1000);
        }
      }
    }
  }

  // ---- Step 5: TEST hot states --------------------------------------------------
  phase = 'test-hot-states';
  if (!bmPage.url().startsWith('chrome-extension://')) {
    await bmPage.goto(BM_URL, { waitUntil: 'load', timeout: 20000 });
    await sleep(1000);
  }
  const states = await bmPage.evaluate(async () => {
    await CanvasData.refreshTabStates();
    return CanvasData.getNodes().map((n) => ({ url: n.url, state: n.state }));
  });
  log('node states:', JSON.stringify(states));
  const exNode = states.find((n) => (n.url || '').includes('example.com'));
  if (exNode && exNode.state === 'hot') {
    record('TEST hot-states', true, `example.com node state='hot' with tab open`);
  } else {
    const tabProbe = await bmPage.evaluate(async () => {
      try {
        const tabs = await chrome.tabs.query({});
        return { ok: true, count: tabs.length, urls: tabs.map((t) => t.url) };
      } catch (e) {
        return { ok: false, err: String(e) };
      }
    });
    log('chrome.tabs.query probe:', JSON.stringify(tabProbe));
    let cause;
    if (!tabProbe.ok) cause = `chrome.tabs.query throws: ${tabProbe.err}`;
    else if (!tabProbe.urls.some((u) => (u || '').includes('example.com')))
      cause = `tabs.query sees ${tabProbe.count} tabs but none is example.com: ${JSON.stringify(tabProbe.urls)}`;
    else cause = `tab IS visible to tabs.query (${JSON.stringify(tabProbe.urls)}) but state='${exNode ? exNode.state : 'node missing'}' -> URL normalization mismatch in _normalizeUrl/_openTabUrls`;
    record('TEST hot-states', false, cause);
  }

  // ---- Step 6: TEST empty-state ---------------------------------------------------
  phase = 'test-empty-state';
  const emptyInfo = await bmPage.evaluate(() => {
    if (!CanvasView.isActive()) CanvasView.show();
    const el = document.querySelector('.cnv-empty');
    if (!el) return { found: false };
    const cs = getComputedStyle(el);
    return {
      found: true,
      hiddenAttr: el.hidden,
      display: cs.display,
      pointerEvents: cs.pointerEvents,
      clusters: CanvasData.getClusters().length,
    };
  });
  await sleep(400);
  log('empty-state probe:', JSON.stringify(emptyInfo));
  if (!emptyInfo.found) {
    record('TEST empty-state', false, '.cnv-empty element not found');
  } else {
    const hiddenOk = emptyInfo.clusters >= 1 && emptyInfo.display === 'none';
    const peOk = emptyInfo.pointerEvents === 'none';
    record(
      'TEST empty-state',
      hiddenOk && peOk,
      `clusters=${emptyInfo.clusters} hidden=${emptyInfo.hiddenAttr} display=${emptyInfo.display} (want none) pointer-events=${emptyInfo.pointerEvents} (want none)`
    );
  }

  // ---- Step 8 (early): screenshot ----------------------------------------------------
  phase = 'screenshot';
  await sleep(600);
  const shotPath = path.join('D:\\MCP\\TheTab.Ninja\\.e2e', 'canvas.png');
  await bmPage.screenshot({ path: shotPath });
  log(`Screenshot saved to ${shotPath}`);

  // ---- Step 7: TEST cluster-header dblclick -> launchCollection ----------------------
  phase = 'test-header-dblclick';
  ({ dbg, rect } = await getDbg());
  const b = dbg.bounds.find((bb) => bb.nodes.some((n) => (n.url || '').includes('example.com')));
  if (!dbg.active || !b) {
    record('TEST header-dblclick', null, 'skipped: canvas/cluster not available');
  } else {
    const hx = (b.x + b.width / 2) * dbg.viewport.scale + dbg.viewport.x + rect.left;
    const hy = (b.y + dbg.config.headerHeight / 2) * dbg.viewport.scale + dbg.viewport.y + rect.top;
    const before = await bmPage.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      let groups = [];
      try { groups = await chrome.tabGroups.query({}); } catch (e) {}
      return { tabs: tabs.length, groups: groups.length };
    });
    log(`header center (${hx.toFixed(1)}, ${hy.toFixed(1)}); before: ${JSON.stringify(before)}; strategy=${winningStrategy}`);
    await dblClickAt(bmPage, hx, hy, winningStrategy);
    await sleep(3500);
    const after = await bmPage.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      let groups = [];
      try { groups = await chrome.tabGroups.query({}); } catch (e) {}
      return { tabs: tabs.length, groups: groups.length, urls: tabs.map((t) => t.url) };
    });
    log(`after: ${JSON.stringify(after)}`);
    const pass = after.tabs > before.tabs || after.groups > before.groups;
    record(
      'TEST header-dblclick',
      pass,
      `tabs ${before.tabs}->${after.tabs}, groups ${before.groups}->${after.groups}`
    );
  }

  // ---- Summary ----------------------------------------------------------------------
  log('================== SUMMARY ==================');
  for (const r of results) {
    log(`${r.pass === null ? 'INFO' : r.pass ? 'PASS' : 'FAIL'}  ${r.name}: ${r.detail}`);
  }
  const allErrs = consoleLog.filter((c) => c.type === 'error' || c.type === 'pageerror');
  log(`---- All console errors/pageerrors (${allErrs.length}) ----`);
  allErrs.forEach((e) => log(`  [${e.phase}/${e.page}] ${e.type}: ${e.text}`));
} catch (err) {
  log('HARNESS ERROR:', err && err.stack ? err.stack : String(err));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  await sleep(700);
  if (tmp) { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} }
  log('Browser closed.');
}
