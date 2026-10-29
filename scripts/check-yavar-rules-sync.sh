#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node --input-type=module - "$ROOT" <<'NODE'
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.argv[2];
const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const fail = (reason) => {
  console.error(`FAIL: ${reason}; run scripts/sync-yavar-rules.sh`);
  process.exit(1);
};

// This checks copy synchronization only, not code compliance with the guidelines.
let localHash;
try {
  localHash = sha256(readFileSync(resolve(root, 'docs/YAVAR_UI_RULES.md')));
  const pin = readFileSync(resolve(root, 'docs/YAVAR_UI_RULES.md.sha256'), 'utf8');
  if (!/^[a-f0-9]{64}\n?$/.test(pin) || localHash !== pin.trim()) {
    fail('Yavar guidelines copy does not match its SHA-256 pin');
  }
} catch (error) {
  fail(`Cannot read Yavar guidelines copy or pin: ${error.message}`);
}

let upstream;
try {
  upstream = execFileSync('gh', [
    'api', 'repos/yavarb/litkit-app/contents/docs/YAVAR_UI_RULES.md?ref=main',
    '-H', 'Accept: application/vnd.github.raw',
  ], {
    timeout: 10_000,
    killSignal: 'SIGKILL',
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, GH_PROMPT_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch {
  console.log('NOTE: litkit-app origin/main is unreachable via gh (10s timeout); relying on the matching local SHA-256 pin.');
  process.exit(0);
}

if (sha256(upstream) !== localHash) {
  fail('Yavar guidelines copy differs from litkit-app origin/main');
}
console.log('PASS: Yavar guidelines copy matches its SHA-256 pin and litkit-app origin/main.');
NODE
