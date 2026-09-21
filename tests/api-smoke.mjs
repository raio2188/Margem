// Integration contract against the local Sites development server only.
// The smoke test restores its baseline and uses compare-and-swap on every write.
import assert from 'node:assert/strict';
const origin = process.env.TEST_ORIGIN ?? 'http://localhost:5173';
assert.ok(
  ['localhost', '127.0.0.1'].includes(new URL(origin).hostname),
  'Only a local development server is allowed',
);
const headers = {
  Cookie: '__sites_local_auth=1',
  Origin: origin,
  'Content-Type': 'application/json',
};
async function read() {
  const r = await fetch(`${origin}/api/workspace?today=2026-09-21`, { headers });
  assert.equal(r.status, 200);
  return r.json();
}
async function put(body, extra = {}) {
  return fetch(`${origin}/api/workspace`, {
    method: 'PUT',
    headers: { ...headers, ...extra },
    body: JSON.stringify(body),
  });
}
const baseline = await read();
let current = baseline;
try {
  assert.equal((await fetch(`${origin}/api/workspace?today=2026-09-21`)).status, 401);
  assert.equal((await put(current, { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal(
    (await put({ ...current, data: { ...current.data, tasks: [{ id: 'invalid' }] } })).status,
    400,
  );
  const edited = {
    ...baseline.data,
    settings: { ...baseline.data.settings, buffer: baseline.data.settings.buffer === 25 ? 20 : 25 },
  };
  const write = await put({ ...baseline, data: edited });
  assert.equal(write.status, 200);
  current = await write.json();
  assert.deepEqual((await read()).data, edited);
  assert.equal((await put(baseline)).status, 409);
  console.log(
    'PASS: authentication, origin check, validation, durable write/read and stale revision rejection',
  );
} finally {
  if (current.revision !== baseline.revision) {
    const restored = await put({ revision: current.revision, data: baseline.data });
    assert.equal(restored.status, 200, 'Concurrent change detected; baseline was not overwritten');
  }
}
