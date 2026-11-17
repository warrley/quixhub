// Lets `node --test` load the app's TypeScript modules the way the bundler
// does, with no test-runner dependency: resolves the `@/` path alias
// (tsconfig "paths" → src/) and extensionless relative imports to `.ts`
// files. Node itself strips the type syntax (--experimental-strip-types on
// Node 22.17; on by default from 22.18 / 23.6). JSX (.tsx) isn't supported,
// so tests should target plain .ts modules (src/lib, src/data).
import { statSync } from 'node:fs';
import { registerHooks } from 'node:module';

const SRC = new URL('../src/', import.meta.url);

function toTsFile(url) {
  for (const href of [url.href, `${url.href}.ts`]) {
    const candidate = new URL(href);
    if (statSync(candidate, { throwIfNoEntry: false })?.isFile()) return candidate.href;
  }
  return url.href;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(toTsFile(new URL(specifier.slice(2), SRC)), context);
    }
    const parent = context.parentURL;
    if (specifier.startsWith('.') && parent && !parent.includes('/node_modules/')) {
      return nextResolve(toTsFile(new URL(specifier, parent)), context);
    }
    return nextResolve(specifier, context);
  },
});
