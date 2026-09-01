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
  topicId: 'fc984310-76b6-4f88-96a3-c3aaf17e7d44', topicName: 'Role of Sage in the Story',
});
await page.goto(`http://localhost:3006/lesson?${params.toString()}`);
await page.waitForTimeout(4000);
const t = await page.locator('body').innerText();
console.log('LENGTH:', t.length);
console.log(t.slice(1200, 3500));
await browser.close();
