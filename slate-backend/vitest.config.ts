import { defineConfig } from 'vitest/config';

/**
 * The source uses NodeNext ESM `.js` import specifiers (required by tsx/tsc at
 * runtime). Vite's resolver doesn't rewrite `.js` → `.ts` by default, so this
 * tiny pre-plugin maps relative `.js` imports onto their `.ts` sources for tests.
 */
export default defineConfig({
  plugins: [
    {
      name: 'resolve-js-to-ts',
      enforce: 'pre',
      async resolveId(source, importer) {
        if (importer && source.startsWith('.') && source.endsWith('.js')) {
          const ts = source.slice(0, -3) + '.ts';
          const resolved = await this.resolve(ts, importer, { skipSelf: true });
          if (resolved) return resolved;
        }
        return null;
      },
    },
  ],
  test: {
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
  },
});
