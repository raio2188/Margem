'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { workspaceSchema, type Snapshot, type Workspace } from '@/lib/planner/model';
import { z } from 'zod';
const snapshotSchema = z.object({
  data: workspaceSchema,
  revision: z.number().int().nonnegative(),
});
const apiError = (value: unknown) =>
  z.object({ error: z.string() }).safeParse(value).data?.error ??
  'Não foi possível conectar. Tente novamente.';
import { localDate } from '@/lib/planner/schedule';
export function useWorkspace() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const lock = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/workspace?today=${localDate()}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(apiError(result));
      setSnapshot(snapshotSchema.parse(result));
      setConflict(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(data: Workspace) {
    if (!snapshot || lock.current || conflict) return false;
    lock.current = true;
    setSaving(true);
    try {
      const response = await fetch('/api/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, revision: snapshot.revision }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setConflict(true);
        throw new Error(apiError(result));
      }
      setSnapshot(snapshotSchema.parse(result));
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar. Tente novamente.');
      return false;
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  return { data: snapshot?.data, loading, saving, error, conflict, load, save };
}
