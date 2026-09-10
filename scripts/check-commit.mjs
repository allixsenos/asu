import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const pattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-zA-Z0-9._/-]+\))?!?: .+/;
const subjects = range => execFileSync('git', ['log', '--format=%s', ...range], { encoding: 'utf8' }).split('\n').filter(Boolean);

// Check the commits this branch adds on top of main, not the whole history. On main itself, or when
// origin/main is unknown, check the newest commit only. A commit-msg hook passes the message file instead.
function branchSubjects() {
  try {
    const added = subjects(['origin/main..HEAD']);
    if (added.length) return added;
  } catch { /* No origin/main here. Fall through to the newest commit. */ }
  return subjects(['-1', 'HEAD']);
}
const messages = process.argv[2] ? [readFileSync(process.argv[2], 'utf8').split('\n')[0]] : branchSubjects();
if (process.env.ASU_PR_TITLE) messages.push(process.env.ASU_PR_TITLE);
const bad = messages.filter(message => !pattern.test(message));
if (bad.length) {
  console.error('Conventional Commits required: type(scope): short description');
  for (const message of bad) console.error(`  not conventional: ${message}`);
  process.exitCode = 1;
}
