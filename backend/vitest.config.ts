import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    globalSetup: ['./src/test/global-setup.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // Every test file shares one Postgres database — run them serially so
    // truncates in one file's beforeEach don't race another file's assertions.
    fileParallelism: false,
  },
});
