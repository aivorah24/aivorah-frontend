import { chromium } from '@playwright/test';
import fs from 'fs';

const extras = JSON.parse(fs.readFileSync('.auth/student-q.extra.json', 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: '.auth/student-q.json', baseURL: 'http://localhost:3006' });
await context.addInitScript(([dbName, storeName, rows, session]) => {
  for (const [key, value] of session) sessionStorage.setItem(key, value);
  const open = indexedDB.open(dbName);
  open.onupgradeneeded = () => {
    if (!open.result.objectStoreNames.contains(storeName)) open.result.createObjectStore(storeName, { keyPath: 'fbase_key' });
  };
  open.onsuccess = () => {
    try {
      const store = open.result.transaction(storeName, 'readwrite').objectStore(storeName);
      for (const row of rows) store.put(row);
    } catch {}
  };
}, ['firebaseLocalStorageDb', 'firebaseLocalStorage', extras.firebaseRows, extras.sessionStorage]);

const page = await context.newPage();
const params = new URLSearchParams({
  subject: 'English', curriculum: 'CBSE', grade: 'Grade 6',
  chapterTitle: 'Fables and Folk Tales', chapterIndex: '0', topicIndex: '17',
});
await page.goto(`http://localhost:3006/lesson?${params.toString()}`);
await page.waitForTimeout(4000);
console.log('=== LEARN TAB (default) ===');
console.log((await page.locator('body').innerText()).slice(0, 2500));

await page.getByText('Listen', { exact: true }).first().click();
await page.waitForTimeout(2000);
console.log('=== LISTEN TAB ===');
console.log((await page.locator('body').innerText()).slice(0, 2000));

await browser.close();
