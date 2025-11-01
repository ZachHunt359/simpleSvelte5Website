import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/lib/__tests__/publish-utils.spec.ts'],
    environment: 'jsdom',
    globals: true,
  },
});
