import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const pattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-zA-Z0-9._/-]+\))?!?: .+/;
const messages = process.argv[2]
  ? [readFileSync(process.argv[2], 'utf8').split('\n')[0]]
  : execFileSync('git', ['log', '--format=%s', 'HEAD'], { encoding: 'utf8' }).trim().split('\n');
if (process.env.ASU_PR_TITLE) messages.push(process.env.ASU_PR_TITLE);
if (messages.some(message => !pattern.test(message))) {
  console.error('Conventional Commits required: type(scope): short description');
  process.exitCode = 1;
}
