'use client';
import { useState } from 'react';
import { ConflictNotice } from './conflict-notice';
import { Trash2, Check, LoaderCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { taskSchema, categories, priorities, type Task } from '@/lib/planner/model';
export function TaskDialog({
  task,
  due,
  busy,
  conflict,
  onReload,
  onClose,
  onSave,
  onDelete,
  onComplete,
}: {
  task: Task | null;
  due: string;
  busy: boolean;
  conflict: boolean;
  onReload: () => void;
  onClose: () => void;
  onSave: (task: Task) => Promise<boolean>;
  onDelete: (task: Task) => void;
  onComplete: (task: Task) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<Task>(
    task ?? {
      id: crypto.randomUUID(),
      title: '',
      minutes: 60,
      due,
      priority: 'normal',
      category: 'focus',
      done: false,
    },
  );
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (conflict) return;
    const result = taskSchema.safeParse(draft);
    if (!result.success) {
      setError(
        'Preencha o título, uma data válida e uma duração de 30 minutos a 40 horas, em intervalos de 30 minutos.',
      );
      return;
    }
    setError('');
    if (await onSave(result.data)) onClose();
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="planner-dialog">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar tarefa' : 'O que precisa acontecer?'}</DialogTitle>
          <DialogDescription>
            Estime o trabalho. A Margem encontra espaço até o prazo.
          </DialogDescription>
        </DialogHeader>
        {conflict && <ConflictNotice onReload={onReload} />}
        <form onSubmit={submit} className="task-form">
          <label htmlFor="task-title">
            Nome da tarefa
            <input
              autoFocus
              id="task-title"
              maxLength={100}
              placeholder="Ex.: preparar proposta para o cliente"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
            />
          </label>
          <div className="form-pair">
            <label htmlFor="task-minutes">
              Tempo total (minutos)
              <input
                id="task-minutes"
                type="number"
                min={30}
                max={2400}
                step={30}
                value={draft.minutes}
                onChange={(e) => setDraft({ ...draft, minutes: Number(e.target.value) })}
                required
              />
            </label>
            <label htmlFor="task-due">
              Prazo
              <input
                id="task-due"
                type="date"
                value={draft.due}
                onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                required
              />
            </label>
          </div>
          <div className="form-pair">
            <div>
              <label id="category-label">Tipo de trabalho</label>
              <Select
                value={draft.category}
                onValueChange={(v) => setDraft({ ...draft, category: v as Task['category'] })}
              >
                <SelectTrigger aria-labelledby="category-label" className="field-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categories).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label id="priority-label">Prioridade</label>
              <Select
                value={draft.priority}
                onValueChange={(v) => setDraft({ ...draft, priority: v as Task['priority'] })}
              >
                <SelectTrigger aria-labelledby="priority-label" className="field-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorities).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="form-hint">
            Tarefas longas são divididas em blocos de até 90 minutos. O prazo tem precedência; a
            prioridade desempata.
          </p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="form-actions">
            {task && (
              <button
                type="button"
                className="icon-button danger"
                aria-label="Excluir tarefa"
                disabled={busy || conflict}
                onClick={() => onDelete(task)}
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              type="button"
              className="secondary"
              disabled={busy || conflict}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button className="primary" disabled={busy || conflict}>
              {busy && <LoaderCircle size={16} className="spin" />}Salvar tarefa
            </button>
          </div>
          {task && !task.done && (
            <button
              type="button"
              className="complete-task"
              disabled={busy || conflict}
              onClick={async () => {
                if (await onComplete(task)) onClose();
              }}
            >
              <Check size={17} /> Concluir tarefa inteira
            </button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
