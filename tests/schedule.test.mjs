import test from 'node:test';
import assert from 'node:assert/strict';
import { schedule, businessDays } from '../lib/planner/schedule.ts';
import { workspaceSchema } from '../lib/planner/model.ts';
const settings = { hours: [5, 5, 5, 5, 5], buffer: 20 };
const task = (id, minutes = 60, due = '2026-09-25', priority = 'normal') => ({
  id,
  title: id,
  minutes,
  due,
  priority,
  category: 'focus',
  done: false,
});
const start = '2026-09-21';
test('weekend rolls forward; a midweek horizon crosses months', () => {
  assert.deepEqual(businessDays('2026-09-26'), [
    '2026-09-28',
    '2026-09-29',
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
  ]);
});
test('capacity reserves buffer and rounds down to whole slots', () => {
  const p = schedule([], { hours: [5, 5, 5, 5, 4], buffer: 20 }, start);
  assert.equal(p.capacity, 1140);
  assert.equal(p.reserved, 300);
});
test('earlier deadlines win over priority; equal deadlines use priority', () => {
  const s = { hours: [1, 0, 0, 0, 0], buffer: 0 };
  const p = schedule(
    [
      task('low', 60, start, 'low'),
      task('later', 60, '2026-09-22', 'high'),
      task('high', 60, start, 'high'),
    ],
    s,
    start,
  );
  assert.equal(p.days[0].sessions[0].taskId, 'high');
  assert.equal(p.conflicts.length, 2);
});
test('overdue tasks are surfaced without illegal allocation', () => {
  const p = schedule([task('old', 90, '2026-09-20')], settings, start);
  assert.equal(p.planned, 0);
  assert.deepEqual(p.conflicts, [{ taskId: 'old', remaining: 90, reason: 'overdue' }]);
});
test('completed tasks consume no capacity and produce no conflicts', () => {
  const p = schedule([{ ...task('done', 2400, start), done: true }], settings, start);
  assert.equal(p.planned, 0);
  assert.equal(p.conflicts.length, 0);
});
test('partial placement records exactly the unallocated remainder', () => {
  const p = schedule([task('large', 300, start)], settings, start);
  assert.equal(p.planned, 240);
  assert.equal(p.conflicts[0].remaining, 60);
  assert.deepEqual(
    p.days[0].sessions.map((x) => x.minutes),
    [90, 90, 60],
  );
});
test('zero capacity terminates and accounts for all work', () => {
  const p = schedule([task('a', 2400)], { hours: [0, 0, 0, 0, 0], buffer: 50 }, start);
  assert.equal(p.planned, 0);
  assert.equal(p.conflicts[0].remaining, 2400);
});
test('determinism and invariants over 200 varied workspaces', () => {
  let seed = 431;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let run = 0; run < 200; run++) {
    const s = {
      hours: Array.from({ length: 5 }, () => Math.floor(random() * 17) / 2),
      buffer: Math.floor(random() * 11) * 5,
    };
    const tasks = Array.from({ length: 20 }, (_, i) =>
      task(
        String(i),
        30 * (1 + Math.floor(random() * 40)),
        `2026-09-${20 + Math.floor(random() * 7)}`,
        ['high', 'normal', 'low'][Math.floor(random() * 3)],
      ),
    );
    const p = schedule(tasks, s, start);
    assert.deepEqual(p, schedule([...tasks].reverse(), s, start));
    for (const d of p.days) {
      assert.ok(d.used <= d.capacity);
      assert.ok(d.used >= 0);
      for (const block of d.sessions) {
        assert.ok(block.minutes >= 30 && block.minutes <= 90);
        assert.equal(block.minutes % 30, 0);
        assert.ok(d.date <= tasks.find((t) => t.id === block.taskId).due);
      }
    }
    for (const t of tasks) {
      const allocated = p.days
        .flatMap((d) => d.sessions)
        .filter((b) => b.taskId === t.id)
        .reduce((n, b) => n + b.minutes, 0);
      assert.equal(
        allocated + (p.conflicts.find((c) => c.taskId === t.id)?.remaining ?? 0),
        t.minutes,
      );
    }
  }
});
test('input validation rejects impossible dates, duplicate IDs and fractional slots', () => {
  const data = { examples: false, settings, tasks: [task('a')] };
  assert.ok(workspaceSchema.safeParse(data).success);
  assert.ok(!workspaceSchema.safeParse({ ...data, tasks: [task('a', 45)] }).success);
  assert.ok(!workspaceSchema.safeParse({ ...data, tasks: [task('a'), task('a')] }).success);
  assert.ok(!workspaceSchema.safeParse({ ...data, tasks: [task('a', 60, '2026-02-31')] }).success);
});
test('block numbering follows the calendar, not allocation order', () => {
  const p = schedule([task('early', 180, '2026-09-22'), task('later', 300)], settings, start);
  const parts = p.days
    .flatMap((d) => d.sessions)
    .filter((b) => b.taskId === 'later')
    .map((b) => b.part);
  assert.deepEqual(
    parts,
    parts.map((_, i) => i + 1),
  );
});
