import { createRequire } from 'node:module';
/** The package version, read once from package.json so the CLI, User-Agent and package never disagree. */
export const version = createRequire(import.meta.url)('../package.json').version;
//# sourceMappingURL=version.js.map