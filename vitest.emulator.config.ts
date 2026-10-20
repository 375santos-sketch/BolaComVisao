import { defineConfig } from 'vitest/config';

// Integration tests against the Firebase emulators (Firestore + Auth), using the real firestore.rules.
// Run with: npm run test:emulator  (requires Java; starts the emulators through firebase-tools)
export default defineConfig({
  test: {
    include: ['src/__emulator__/**/*.emulator.ts'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false
  }
});
