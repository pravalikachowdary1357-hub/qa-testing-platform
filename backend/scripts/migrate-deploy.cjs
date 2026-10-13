// Runs `prisma migrate deploy` with automatic retries.
// The pooled database sometimes times out on Prisma's advisory lock (P1002);
// a retry a few seconds later succeeds, so we do that instead of failing the build.
const { spawnSync } = require('node:child_process');

const MAX_ATTEMPTS = 5;
const WAIT_MS = 8000;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`[migrate] prisma migrate deploy (attempt ${attempt}/${MAX_ATTEMPTS})`);
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    shell: true,
  });
  if (result.status === 0) process.exit(0);
  if (attempt < MAX_ATTEMPTS) {
    console.log(`[migrate] failed, retrying in ${WAIT_MS / 1000}s...`);
    sleep(WAIT_MS);
  }
}
console.error('[migrate] giving up after repeated failures');
process.exit(1);
