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
await page.goto('http://localhost:3006/subject-syllabus?subject=English');
await page.waitForTimeout(4000);
const text = await page.locator('body').innerText().catch(() => '[err]');
console.log('PAGE TEXT:', text.slice(0, 1500));
await browser.close();
