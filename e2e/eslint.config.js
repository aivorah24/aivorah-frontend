// ESLint config for this test suite. Uses Playwright's own recommended
// rules (catches things like a missing `await` on a page action, which is
// a very common and hard-to-notice bug in Playwright tests).
import playwright from 'eslint-plugin-playwright';

export default [
  {
    files: ['tests/**/*.js'],
    ...playwright.configs['flat/recommended'],
  },
];
