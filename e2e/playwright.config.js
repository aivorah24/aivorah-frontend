// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname doesn't exist in ES modules (this file uses import/export),
// so we rebuild it from the file's own URL instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Snapshot the shared demo account before the run, put it back after.
     Runs once for the whole run, not once per worker - see the comments in
     tests/global-setup.js for why that matters when tests run in parallel. */
  globalSetup: './tests/global-setup.js',
  globalTeardown: './tests/global-teardown.js',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Every test must run in parallel with no dependency on another test's
     state (see tests/helpers/accounts.js's mutable-account convention) -
     CI runs fully parallel too, same as local. */
  workers: undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Where videos/traces/screenshots land - a plain folder you can open and
     watch, instead of digging through the default test-results/ layout. */
  outputDir: 'recordings',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. Overridable via
       BASE_URL so CI can point this at a deployed environment (e.g. the
       Vercel testing frontend) instead of a local dev server. */
    baseURL: process.env.BASE_URL || 'http://localhost:3006',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Record a video of every test run (kept for both passes and failures)
       so you can watch back what happened. */
    video: 'on',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Mic tests need fake-device launch args (below) - run only under
      // chromium-mic so they don't run twice.
      testIgnore: /ai-coach-mic\.spec\.js/,
    },

    // Separate project for the AI Coach mic tests only. Chromium's fake
    // media stream feeds the SAME fixture file into every getUserMedia()
    // call for the whole browser process, so it can't be scoped to one
    // test/page - it has to live in its own project instead, otherwise
    // every other test in the suite would "hear" this file too.
    //
    // channel: 'chrome' (real installed Google Chrome, not Playwright's
    // bundled Chromium) is required here - confirmed by a direct check:
    // AICoachScreen.tsx's mic feature uses the browser's built-in
    // SpeechRecognition/webkitSpeechRecognition, whose cloud recognition
    // endpoint needs a private Google API key that's only baked into
    // official Chrome builds. On bundled Chromium, recognition.start()
    // never fires onstart/onresult/onerror/onend at all (silently hangs);
    // on real Chrome it does. Needs Chrome installed on whatever machine
    // runs this project.
    {
      name: 'chromium-mic',
      testMatch: /ai-coach-mic\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        permissions: ['microphone'],
        launchOptions: {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            `--use-file-for-fake-audio-capture=${path.resolve(__dirname, 'tests/fixtures/audio/Recording-6.wav')}`,
          ],
        },
      },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npx serve -s ../dist -l 3006',
    url: 'http://localhost:3006',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
