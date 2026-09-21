import type { Task, Settings } from './model';
export type Session = { taskId: string; minutes: number; part: number; totalParts: number };
export type PlanDay = {
  date: string;
  weekday: number;
  capacity: number;
  reserved: number;
  used: number;
  sessions: Session[];
};
export type Conflict = { taskId: string; remaining: number; reason: 'overdue' | 'capacity' };
// Dates are calendar days, never UTC instants supplied by the browser.
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function businessDays(start: string): string[] {
  const cursor = new Date(`${start}T12:00:00`);
  const result: string[] = [];
  while (result.length < 5) {
    if (cursor.getDay() > 0 && cursor.getDay() < 6) result.push(localDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}
/** Earliest due date first; priority breaks ties. Place 30–90 minute sessions in
 * the least occupied eligible day. Capacity and deadlines are hard constraints.
 * This deterministic heuristic does not claim globally optimal packing. */
export function schedule(tasks: Task[], settings: Settings, start: string) {
  const days: PlanDay[] = businessDays(start).map((date) => {
    const weekday = new Date(`${date}T12:00:00`).getDay() - 1;
    const raw = settings.hours[weekday] * 60;
    const capacity = Math.floor((raw * (1 - settings.buffer / 100)) / 30) * 30;
    return { date, weekday, capacity, reserved: raw - capacity, used: 0, sessions: [] };
  });
  const conflicts: Conflict[] = [];
  const priority = { high: 0, normal: 1, low: 2 };
  const ordered = tasks
    .filter((t) => !t.done)
    .slice()
    .sort(
      (a, b) =>
        a.due.localeCompare(b.due) ||
        priority[a.priority] - priority[b.priority] ||
        a.id.localeCompare(b.id),
    );
  for (const task of ordered) {
    let remaining = task.minutes;
    const assigned: Session[] = [];
    while (remaining > 0) {
      const eligible = days
        .filter((d) => d.date <= task.due && d.capacity - d.used >= 30)
        .sort((a, b) => a.used / a.capacity - b.used / b.capacity || a.date.localeCompare(b.date));
      const day = eligible[0];
      if (!day) break;
      const minutes = Math.min(90, remaining, day.capacity - day.used);
      const session = { taskId: task.id, minutes, part: assigned.length + 1, totalParts: 0 };
      day.sessions.push(session);
      assigned.push(session);
      day.used += minutes;
      remaining -= minutes;
    }
    const chronological = days.flatMap((d) => d.sessions).filter((s) => s.taskId === task.id);
    chronological.forEach((s, index) => {
      s.part = index + 1;
      s.totalParts = chronological.length;
    });
    if (remaining)
      conflicts.push({
        taskId: task.id,
        remaining,
        reason: task.due < days[0].date ? 'overdue' : 'capacity',
      });
  }
  return {
    days,
    conflicts,
    planned: days.reduce((s, d) => s + d.used, 0),
    capacity: days.reduce((s, d) => s + d.capacity, 0),
    reserved: days.reduce((s, d) => s + d.reserved, 0),
  };
}
