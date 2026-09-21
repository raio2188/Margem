import { env } from 'cloudflare:workers';
import { workspaceSchema, type Workspace, type Snapshot } from '../lib/planner/model';
function database() {
  if (!env.DB) throw new Error('Database unavailable');
  return env.DB;
}
export async function readWorkspace(owner: string, initial: Workspace): Promise<Snapshot> {
  const db = database();
  await db
    .prepare(
      'INSERT INTO workspaces (owner_id, data, revision, updated_at) VALUES (?, ?, 0, ?) ON CONFLICT(owner_id) DO NOTHING',
    )
    .bind(owner, JSON.stringify(initial), new Date().toISOString())
    .run();
  const row = await db
    .prepare('SELECT data, revision FROM workspaces WHERE owner_id = ?')
    .bind(owner)
    .first<{ data: string; revision: number }>();
  if (!row) throw new Error('Workspace unavailable');
  return { data: workspaceSchema.parse(JSON.parse(row.data)), revision: row.revision };
}
export async function writeWorkspace(
  owner: string,
  data: Workspace,
  revision: number,
): Promise<boolean> {
  const result = await database()
    .prepare(
      'UPDATE workspaces SET data = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND revision = ?',
    )
    .bind(JSON.stringify(data), new Date().toISOString(), owner, revision)
    .run();
  return result.meta.changes === 1;
}
