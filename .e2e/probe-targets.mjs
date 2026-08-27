import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EXT_PATH = 'D:\\MCP\\TheTab.Ninja';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const extraArgs = process.argv.slice(2);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ttn-probe-'));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  ignoreDefaultArgs: ['--disable-extensions'],
  userDataDir: tmp,
  args: [
    `--disable-extensions-except=${EXT_PATH}`,
    `--load-extension=${EXT_PATH}`,
    '--no-first-run',
    ...extraArgs,
  ],
});
console.log('version:', await browser.version());
for (let i = 0; i < 10; i++) {
  await sleep(1000);
  const ts = browser.targets().map((t) => `${t.type()} ${t.url()}`);
  console.log(`t+${i + 1}s targets:\n  ` + ts.join('\n  '));
  if (ts.some((t) => t.includes('chrome-extension://'))) break;
}
await browser.close();
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
