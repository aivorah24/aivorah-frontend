export default {
  testDir: '.',
  testMatch: 'local-onboarding-retest.spec.js',
  timeout: 30000,
  use: { baseURL: 'http://localhost:8081', headless: true },
};
