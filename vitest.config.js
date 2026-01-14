// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    // This tells Vitest to NEVER look at your Playwright tests
    exclude: [
      '**/node_modules/**', 
      '**/tests/e2e/**', 
      '**/dist/**'
    ],
  },
});