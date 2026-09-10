import { createRequire } from 'node:module';
/** The package name and version, read once from package.json so the CLI, User-Agent and package never disagree. */
const pkg = createRequire(import.meta.url)('../package.json');
export const name = pkg.name;
export const version = pkg.version;
//# sourceMappingURL=version.js.map