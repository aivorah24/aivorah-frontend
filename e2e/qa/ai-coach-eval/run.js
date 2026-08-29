// AI Coach response-quality eval - standalone, NOT part of the Playwright
// E2E suite, but still UI-driven, not an API shortcut (per CLAUDE.md: never
// substitute a persona's own action with a direct API call, and never use
// an API response as the thing being judged). This logs in as a real
// student account and reads the AI Coach's actual rendered reply from the
// page, the same way a student would see it - it does NOT call /ask or
// /ask/stream directly.
//
// What it does:
//   1. Opens the real app, logs in as each case's dedicated student
//      account (grade/curriculum come from THAT account's own profile -
//      the UI has no grade picker, so "representative grades" means
//      representative accounts, see cases.js).
//   2. Types the question into the real chat input, clicks the real Send
//      button, waits for the real "Aivorah is thinking..." state to clear.
//   3. Reads the reply text straight off the rendered page.
//   4. Sends that real question+answer pair to an LLM judge (NVIDIA NIM)
//      scored against the rubric in judge.js.
//
// Run:  node qa/ai-coach-eval/run.js
// Needs: NVIDIA_NIM_API_KEY in .env, the app server running at baseURL
// below, and sessions already harvested (tests/global-setup.js - run the
// Playwright suite at least once so .auth/<account>.json exists).

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';
import { CASES } from './cases.js';
import { judgeAnswer, RUBRIC } from './judge.js';
import { applySession, statePath } from '../../tests/helpers/auth.js';
import { dismissAnnouncementIfPresent } from '../../tests/helpers/dismissAnnouncement.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3006';
const JUDGE_MODEL = process.env.NVIDIA_EVAL_MODEL || 'nvidia/llama-3.3-nemotron-super-49b-v1';

async function askViaRealUI(browser, testCase) {
  const context = await browser.newContext({ storageState: statePath(testCase.account) });
  await applySession(context, testCase.account);
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL + '/');
    await page.waitForSelector('text=/Good (morning|afternoon|evening),/', { timeout: 15000 });
    await dismissAnnouncementIfPresent(page);
    await page.getByText('Ask anything', { exact: true }).first().click();
    await page.waitForSelector('text=/Ask me anything about your .+ curriculum/', { timeout: 15000 });

    // Count existing "Aivorah" reply labels before sending, so we can find
    // the NEW one after - same one-name-per-reply structure the E2E specs
    // read off this screen.
    const before = await page.getByText('Aivorah', { exact: true }).count();

    await page.getByPlaceholder('Message Aivorah...').fill(testCase.question);
    await page.getByRole('button', { name: 'Send message' }).click();

    await page.waitForFunction(
      (expectedCount) =>
        Array.from(document.querySelectorAll('div[dir="auto"]')).filter((el) => el.textContent === 'Aivorah')
          .length >= expectedCount,
      before + 1,
      { timeout: 60000 },
    );
    // Let streaming finish - thinking indicator gone AND text stopped changing.
    await page
      .getByText('Aivorah is thinking...')
      .waitFor({ state: 'hidden', timeout: 60000 })
      .catch(() => {}); // may already be hidden by the time streaming finishes fast

    const replyLocator = page
      .getByText('Aivorah', { exact: true })
      .last()
      .locator('xpath=../following-sibling::div[1]');
    const answer = (await replyLocator.innerText().catch(() => '')).trim();
    return answer;
  } finally {
    await context.close();
  }
}

async function main() {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    console.error(
      'NVIDIA_NIM_API_KEY is not set (.env) - needed to run the LLM judge. Add it and re-run.',
    );
    process.exit(1);
  }

  const browser = await chromium.launch();
  const results = [];
  try {
    for (const testCase of CASES) {
      process.stdout.write(`${testCase.id} (${testCase.account}) ... `);
      try {
        const answer = await askViaRealUI(browser, testCase);
        const scores = await judgeAnswer({
          apiKey,
          model: JUDGE_MODEL,
          grade: testCase.grade,
          curriculum: testCase.curriculum,
          question: testCase.question,
          answer,
        });
        results.push({ ...testCase, answer, scores });
        const avg = (RUBRIC.reduce((sum, k) => sum + scores[k], 0) / RUBRIC.length).toFixed(1);
        console.log(`avg ${avg}/5`);
      } catch (err) {
        results.push({ ...testCase, error: err.message });
        console.log(`FAILED (${err.message})`);
      }
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.resolve(__dirname, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log('\n--- Summary ---');
  for (const r of results) {
    if (r.error) {
      console.log(`${r.id}: ERROR - ${r.error}`);
      continue;
    }
    const low = RUBRIC.filter((k) => r.scores[k] <= 2);
    const flag = low.length ? ` LOW: ${low.join(', ')}` : '';
    console.log(
      `${r.id} (${r.grade}, ${r.curriculum}):${flag}${r.scores.notes !== 'none' ? ` - ${r.scores.notes}` : ''}`,
    );
  }
  console.log(`\nFull report: ${reportPath}`);
}

main();
