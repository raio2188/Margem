import { z } from 'zod';
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    'Data inválida',
  );
export const taskSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1, 'Dê um nome à tarefa.').max(100),
  minutes: z.number().int().min(30).max(2400).multipleOf(30),
  due: dateSchema,
  priority: z.enum(['high', 'normal', 'low']),
  category: z.enum(['focus', 'routine', 'personal']),
  done: z.boolean(),
});
export const settingsSchema = z.object({
  hours: z.array(z.number().min(0).max(8).multipleOf(0.5)).length(5),
  buffer: z.number().int().min(0).max(50).multipleOf(5),
});
export const workspaceSchema = z.object({
  tasks: z
    .array(taskSchema)
    .max(80)
    .refine((tasks) => new Set(tasks.map((t) => t.id)).size === tasks.length, 'IDs duplicados'),
  settings: settingsSchema,
  examples: z.boolean(),
});
export type Task = z.infer<typeof taskSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Snapshot = { data: Workspace; revision: number };
export const categories = { focus: 'Foco', routine: 'Rotina', personal: 'Pessoal' };
export const priorities = { high: 'Alta', normal: 'Normal', low: 'Baixa' };
export const weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
export function minutesLabel(n: number) {
  return n < 60 ? `${n}min` : `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}min` : ''}`;
}
