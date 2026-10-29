#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node --input-type=module - "$ROOT" "$@" <<'NODE'
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [root, checkout, ...extra] = process.argv.slice(2);
if (extra.length) {
  console.error('Usage: scripts/sync-yavar-rules.sh [litkit-app-checkout]');
  process.exit(1);
}

const source = resolve(checkout ?? resolve(root, '../litkit-app'), 'docs/YAVAR_UI_RULES.md');
try {
  // An explicit checkout must exist; never silently replace it with upstream main.
  const content = checkout !== undefined || existsSync(source)
    ? readFileSync(source)
    : execFileSync('gh', [
        'api', 'repos/yavarb/litkit-app/contents/docs/YAVAR_UI_RULES.md?ref=main',
        '-H', 'Accept: application/vnd.github.raw',
      ], {
        timeout: 10_000,
        killSignal: 'SIGKILL',
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, GH_PROMPT_DISABLED: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
  if (!content.length) throw new Error('The source guidelines file is empty');
  const hash = createHash('sha256').update(content).digest('hex');
  mkdirSync(resolve(root, 'docs'), { recursive: true });
  writeFileSync(resolve(root, 'docs/YAVAR_UI_RULES.md'), content);
  writeFileSync(resolve(root, 'docs/YAVAR_UI_RULES.md.sha256'), `${hash}\n`);
  console.log(`Synced Yavar's UI/product guidelines (${hash}).`);
} catch (error) {
  console.error(`Could not sync Yavar's UI/product guidelines: ${error.message}`);
  process.exit(1);
}
NODE
