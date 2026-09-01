// Ad-hoc local override to point the suite at a Vercel preview deployment
// instead of localhost:3006 (no local dev server available in this
// environment). Not part of the tracked config - delete after use.
import baseConfig from './playwright.config.js';

export default {
  ...baseConfig,
  use: {
    ...baseConfig.use,
    baseURL: process.env.PREVIEW_BASE_URL,
  },
};
