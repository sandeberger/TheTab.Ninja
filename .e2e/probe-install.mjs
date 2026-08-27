import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EXT_PATH = 'D:\\MCP\\TheTab.Ninja';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ttn-probe2-'));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  pipe: true,
  enableExtensions: true,
  userDataDir: tmp,
  args: ['--no-first-run', '--enable-unsafe-extension-debugging'],
});
console.log('version:', await browser.version());
try {
  const id = await browser.installExtension(EXT_PATH);
  console.log('installExtension OK, id =', id);
  await sleep(2000);
  console.log('targets:\n  ' + browser.targets().map((t) => `${t.type()} ${t.url()}`).join('\n  '));
} catch (e) {
  console.log('installExtension FAILED:', String(e));
}
await browser.close();
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
