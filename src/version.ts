import { createRequire } from 'node:module';

/** The package name and version, read once from package.json so the CLI, User-Agent and package never disagree. */
const pkg = createRequire(import.meta.url)('../package.json') as { name: string; version: string };
export const name: string = pkg.name;
export const version: string = pkg.version;
