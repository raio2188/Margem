'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Layers,
  Plus,
  Leaf,
  SlidersHorizontal,
  Check,
  ArrowUpRight,
  Info,
  CloudCheck,
  LoaderCircle,
  TriangleAlert,
  Pencil,
  Clock3,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/hooks/use-workspace';
import { ConflictNotice } from './conflict-notice';
import { TaskDialog } from './task-dialog';
import { SettingsDialog } from './settings-dialog';
import { schedule, localDate, businessDays } from '@/lib/planner/schedule';
import {
  categories,
  priorities,
  minutesLabel,
  weekdays,
  type Task,
  type Workspace,
} from '@/lib/planner/model';
const tones = { focus: 'tone-0', routine: 'tone-1', personal: 'tone-2' };
function shortDate(value: string) {
  return new Date(`${value}T12:00:00`)
    .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
    .replace('.', '');
}
export default function Planner() {
  const { data, loading, saving, error, conflict, load, save } = useWorkspace();
  const [today, setToday] = useState('');
  const [editor, setEditor] = useState<Task | null | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [explain, setExplain] = useState(false);
  const [confirm, setConfirm] = useState<Task | 'examples' | null>(null);
  useEffect(() => {
    setToday(localDate());
    const id = setInterval(() => setToday(localDate()), 60000);
    return () => clearInterval(id);
  }, []);
  const plan = useMemo(
    () => (data && today ? schedule(data.tasks, data.settings, today) : null),
    [data, today],
  );
  const busy = saving || conflict;
  const active = data?.tasks.filter((t) => !t.done) ?? [];
  const completed = data?.tasks.filter((t) => t.done) ?? [];
  async function update(next: Workspace, message: string) {
    const success = await save(next);
    if (success) toast.success(message);
    return success;
  }
  async function saveTask(task: Task) {
    if (!data) return false;
    return update(
      {
        ...data,
        tasks: data.tasks.some((t) => t.id === task.id)
          ? data.tasks.map((t) => (t.id === task.id ? task : t))
          : [...data.tasks, task],
      },
      'Tarefa salva. Seu plano já foi atualizado.',
    );
  }
  async function toggle(task: Task) {
    if (!data) return false;
    return update(
      { ...data, tasks: data.tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)) },
      task.done ? 'Tarefa reaberta e redistribuída.' : 'Tarefa concluída. Um pouco mais de espaço.',
    );
  }
  async function remove() {
    if (!data || !confirm) return;
    const tasks =
      confirm === 'examples'
        ? data.tasks.filter((t) => !t.id.startsWith('example-'))
        : data.tasks.filter((t) => t.id !== confirm.id);
    if (
      await update(
        { ...data, tasks, examples: confirm === 'examples' ? false : data.examples },
        'Planejamento atualizado.',
      )
    ) {
      setConfirm(null);
      setEditor(undefined);
    }
  }
  useEffect(() => {
    if (!plan) return;
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: Tool, options: { signal: AbortSignal }) => Promise<void> | void;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'read_week_plan',
            description:
              'Lê a distribuição atual de trabalho e os conflitos de prazo. Não altera tarefas.',
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input) {
              if (
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Use um objeto vazio.');
              return { days: plan.days, conflicts: plan.conflicts, tasks: data?.tasks };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [plan, data]);
  return (
    <main className="shell">
      <a className="skip-link" href="#plan">
        Ir para o planejamento
      </a>
      <aside className="rail">
        <a className="brand" href="#" aria-label="Margem, início">
          m<span>↗</span>
        </a>
        <a
          className="rail-link active"
          href="#plan"
          aria-label="Plano da semana"
          title="Plano da semana"
        >
          <CalendarDays size={21} />
        </a>
        <a
          className="rail-link"
          href="#tasks"
          aria-label="Todas as tarefas"
          title="Todas as tarefas"
        >
          <Layers size={21} />
        </a>
        <button
          className="rail-link rail-help"
          onClick={() => setExplain(true)}
          aria-label="Como o planejamento funciona"
          title="Como funciona"
        >
          <Info size={21} />
        </button>
        <div className="rail-bottom" aria-hidden="true">
          M
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <strong>
            margem<span className="brand-dot">.</span>
          </strong>
          <span>Seu trabalho, em um ritmo possível.</span>
          <small className="save-status" role="status">
            {saving ? (
              <>
                <LoaderCircle size={15} className="spin" /> Salvando…
              </>
            ) : data ? (
              <>
                <CloudCheck size={16} /> Salvo na sua conta
              </>
            ) : (
              'ESPAÇO PESSOAL'
            )}
          </small>
        </header>
        <section className="heading">
          <div>
            <div className="eyebrow">MENOS CORRERIA. MAIS INTENÇÃO.</div>
            <h1>Uma semana que cabe.</h1>
            <p>Organize o essencial. Deixe espaço para a vida acontecer.</p>
          </div>
          <button
            className="primary"
            onClick={() => setEditor(null)}
            disabled={!data || busy || data.tasks.length >= 80}
          >
            <Plus size={18} /> Nova tarefa
          </button>
        </section>
        {error && (
          <div className="error-banner" role="alert">
            <TriangleAlert size={20} />
            <div>
              <strong>Seu plano está guardado.</strong>
              <p>{error}</p>
            </div>
            <button className="secondary" onClick={() => void load()}>
              Tentar novamente
            </button>
          </div>
        )}
        {conflict && (
          <div className="error-banner" role="alert">
            <TriangleAlert size={20} />
            <p>
              Outra aba alterou seu plano. Atualize os dados para continuar. O formulário aberto
              será preservado.
            </p>
            <button className="secondary" onClick={() => void load()}>
              Atualizar dados
            </button>
          </div>
        )}
        {(!data || !plan) && loading && (
          <div aria-label="Carregando planejamento" role="status">
            <Skeleton className="h-40 w-full rounded-xl mb-8" />
            <div className="week-grid">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </div>
          </div>
        )}
        {data && plan && (
          <>
            <div className="overview">
              <div>
                <span>TRABALHO PLANEJADO</span>
                <strong>
                  {Math.floor(plan.planned / 60)}
                  <span>h</span>
                  {plan.planned % 60 > 0 && (
                    <>
                      {plan.planned % 60}
                      <span>min</span>
                    </>
                  )}
                </strong>
                <p>
                  {active.length} {active.length === 1 ? 'tarefa para tirar' : 'tarefas para tirar'}{' '}
                  do papel
                </p>
              </div>
              <div>
                <span>ESPAÇO PRESERVADO</span>
                <strong>
                  {Math.floor(plan.reserved / 60)}
                  <span>h</span>
                  {plan.reserved % 60 > 0 && (
                    <>
                      {plan.reserved % 60}
                      <span>min</span>
                    </>
                  )}
                </strong>
                <p>Margem de {data.settings.buffer}% + ajuste dos blocos</p>
              </div>
              <div className="overview-note">
                <Leaf size={23} />
                <h3>
                  {plan.conflicts.length
                    ? 'Tudo bem ajustar a rota.'
                    : 'Produtividade com respiro.'}
                </h3>
                <p>
                  {plan.conflicts.length
                    ? `${plan.conflicts.length} tarefa(s) precisam de um novo prazo ou mais espaço.`
                    : `${minutesLabel(plan.capacity - plan.planned)} ainda livres, além da sua margem.`}
                </p>
              </div>
            </div>
            <section id="plan" className="plan-section">
              <div className="section-bar">
                <div>
                  <h2>
                    <CalendarDays size={20} /> Seu plano da semana
                  </h2>
                  <p className="date-range">
                    {shortDate(plan.days[0].date)} — {shortDate(plan.days[4].date)}{' '}
                    <span>· Próximos 5 dias úteis</span>
                  </p>
                </div>
                <button className="secondary" onClick={() => setSettingsOpen(true)} disabled={busy}>
                  <SlidersHorizontal size={16} /> Ajustar capacidade
                </button>
              </div>
              <div className="plan-legend">
                <div>
                  <span className="legend-focus">Foco</span>
                  <span className="legend-routine">Rotina</span>
                  <span className="legend-personal">Pessoal</span>
                </div>
                <button onClick={() => setExplain(true)}>
                  Como esse plano foi montado <Info size={14} />
                </button>
              </div>
              <div className="week-grid">
                {plan.days.map((day) => (
                  <div className={`day ${day.date === today ? 'is-today' : ''}`} key={day.date}>
                    <div className="day-label">
                      <span>
                        {weekdays[day.weekday]}
                        {day.date === today && <em>hoje</em>}
                      </span>
                      <b>{day.date.slice(-2)}</b>
                    </div>
                    <div className="day-capacity">
                      <span>
                        {minutesLabel(day.used)} <span>/ {minutesLabel(day.capacity)}</span>
                      </span>
                      <Clock3 size={12} />
                    </div>
                    <div
                      className="day-track"
                      aria-label={`${minutesLabel(day.used)} de ${minutesLabel(day.capacity)} disponíveis`}
                    >
                      <i
                        style={{ width: `${day.capacity ? (day.used / day.capacity) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="sessions">
                      {day.sessions.map((session, i) => {
                        const task = data.tasks.find((t) => t.id === session.taskId)!;
                        return (
                          <button
                            disabled={busy}
                            key={`${session.taskId}-${i}`}
                            className={`task-card ${tones[task.category]}`}
                            onClick={() => setEditor(task)}
                            aria-label={`Editar ${task.title}, bloco ${session.part} de ${session.totalParts}, ${minutesLabel(session.minutes)}`}
                          >
                            <small>
                              {categories[task.category]} · {minutesLabel(session.minutes)}
                            </small>
                            <h3>{task.title}</h3>
                            <span>
                              {session.totalParts > 1
                                ? `Bloco ${session.part}/${session.totalParts}`
                                : 'Bloco único'}
                              <ArrowUpRight size={13} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {day.capacity - day.used > 0 ? (
                      <div className="breathing">
                        <Leaf size={15} />
                        <div>
                          {minutesLabel(day.capacity - day.used)} de espaço livre
                          <span>Um pouco de respiro.</span>
                        </div>
                      </div>
                    ) : day.capacity === 0 ? (
                      <div className="breathing">Dia sem disponibilidade.</div>
                    ) : (
                      <div className="day-full">
                        <Check size={13} /> Capacidade preenchida
                      </div>
                    )}
                    <div className="reserved-label">
                      {minutesLabel(day.reserved)} de margem preservada
                    </div>
                  </div>
                ))}
              </div>
              {plan.conflicts.length > 0 && (
                <div className="conflict-panel">
                  <div className="conflict-heading">
                    <TriangleAlert size={19} />
                    <div>
                      <h3>O que ainda não cabe</h3>
                      <p>
                        Estas horas não foram agendadas. Ajuste o prazo, a estimativa ou a
                        capacidade.
                      </p>
                    </div>
                  </div>
                  {plan.conflicts.map((c) => {
                    const task = data.tasks.find((t) => t.id === c.taskId)!;
                    return (
                      <button
                        className="conflict-item"
                        key={c.taskId}
                        onClick={() => setEditor(task)}
                        disabled={busy}
                      >
                        <span>
                          {task.title}
                          <small>
                            {c.reason === 'overdue'
                              ? 'Prazo anterior ao primeiro dia disponível'
                              : `Sem espaço até ${shortDate(task.due)}`}
                          </small>
                        </span>
                        <b>{minutesLabel(c.remaining)} pendentes</b>
                        <ArrowUpRight size={17} />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
            <section id="tasks" className="inventory">
              <div className="section-bar">
                <h2>
                  <Layers size={20} /> Suas tarefas <span className="count">{active.length}</span>
                </h2>
                <span className="inventory-hint">
                  Conclua a tarefa quando terminar todos os blocos.
                </span>
              </div>
              {data.examples && (
                <div className="example-notice">
                  <span>Um plano de exemplo para você explorar.</span>
                  <button onClick={() => setConfirm('examples')} disabled={busy}>
                    Limpar exemplos <ArrowUpRight size={13} />
                  </button>
                </div>
              )}
              {active.length === 0 && (
                <Empty className="empty-state">
                  <EmptyHeader>
                    <Leaf size={28} />
                    <EmptyTitle>
                      {completed.length
                        ? 'Tudo feito. Aproveite a margem.'
                        : 'Sua semana começa com uma tarefa.'}
                    </EmptyTitle>
                    <EmptyDescription>
                      {completed.length
                        ? 'As tarefas concluídas ficam logo abaixo.'
                        : 'Adicione algo que precisa acontecer. A distribuição é por nossa conta.'}
                    </EmptyDescription>
                  </EmptyHeader>
                  <button className="secondary" disabled={busy} onClick={() => setEditor(null)}>
                    <Plus size={17} /> Adicionar tarefa
                  </button>
                </Empty>
              )}
              <div className="task-list">
                {active.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    busy={busy}
                    onToggle={() => void toggle(task)}
                    onEdit={() => setEditor(task)}
                    conflict={plan.conflicts.some((c) => c.taskId === task.id)}
                  />
                ))}
              </div>
              {completed.length > 0 && (
                <details className="completed-list">
                  <summary>
                    <Check size={16} /> Concluídas ({completed.length})
                  </summary>
                  {completed.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      busy={busy}
                      onToggle={() => void toggle(task)}
                      onEdit={() => setEditor(task)}
                    />
                  ))}
                </details>
              )}
            </section>
            <footer className="app-footer">
              <span>Planejar também é escolher o que fica para depois.</span>
              <span>
                MARGEM <span>↗</span>
              </span>
            </footer>
          </>
        )}
      </div>
      {editor !== undefined && data && (
        <TaskDialog
          key={editor?.id ?? 'new'}
          task={editor}
          due={businessDays(today || localDate())[4]}
          busy={saving}
          conflict={conflict}
          onReload={() => void load()}
          onClose={() => setEditor(undefined)}
          onSave={saveTask}
          onDelete={setConfirm}
          onComplete={toggle}
        />
      )}
      {settingsOpen && data && (
        <SettingsDialog
          settings={data.settings}
          busy={saving}
          conflict={conflict}
          onReload={() => void load()}
          onClose={() => setSettingsOpen(false)}
          onSave={(settings) =>
            update({ ...data, settings }, 'Capacidade ajustada. Seu plano foi recalculado.')
          }
        />
      )}
      <Dialog open={explain} onOpenChange={setExplain}>
        <DialogContent className="planner-dialog">
          <DialogHeader>
            <DialogTitle>Um plano possível, explicado.</DialogTitle>
            <DialogDescription>Sem mágica, sem agenda superlotada.</DialogDescription>
          </DialogHeader>
          <ol className="explanation">
            <li>
              <strong>Primeiro, o que vence antes.</strong>
              <p>
                Ordenamos por prazo. Se dois prazos forem iguais, a tarefa com maior prioridade vem
                primeiro.
              </p>
            </li>
            <li>
              <strong>Trabalho dividido em partes.</strong>
              <p>
                Distribuímos blocos de 30 a 90 minutos no dia proporcionalmente mais livre, sempre
                antes do prazo.
              </p>
            </li>
            <li>
              <strong>Sua margem é protegida.</strong>
              <p>
                Reservamos a porcentagem escolhida e arredondamos a capacidade para baixo em blocos
                de 30 minutos. Horas que não cabem aparecem como pendências.
              </p>
            </li>
          </ol>
          <p className="form-hint">
            O plano cobre os próximos 5 dias úteis, a partir de hoje. É uma sugestão de carga
            diária, sem horários fixos. Ao concluir uma tarefa, todos os seus blocos saem do plano.
          </p>
          <button className="primary" onClick={() => setExplain(false)}>
            Entendi
          </button>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !saving) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'examples' ? 'Começar com o seu próprio plano?' : 'Excluir esta tarefa?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'examples'
                ? 'As tarefas de exemplo serão removidas. Tarefas que você criou serão mantidas.'
                : `“${confirm && typeof confirm !== 'string' ? confirm.title : ''}” será removida do planejamento. Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {conflict && <ConflictNotice onReload={() => void load()} />}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <button className="primary danger-button" disabled={busy} onClick={() => void remove()}>
              {saving ? 'Removendo…' : 'Confirmar remoção'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster position="bottom-right" richColors closeButton />
    </main>
  );
}
function TaskRow({
  task,
  busy,
  onToggle,
  onEdit,
  conflict = false,
}: {
  task: Task;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  conflict?: boolean;
}) {
  return (
    <div className={`task-row ${task.done ? 'done' : ''}`}>
      <Checkbox
        checked={task.done}
        disabled={busy}
        onCheckedChange={onToggle}
        aria-label={`${task.done ? 'Reabrir' : 'Concluir'} ${task.title}`}
      />
      <button className="task-title-button" onClick={onEdit} disabled={busy}>
        <strong>{task.title}</strong>
        <span className="mobile-task-meta">
          {minutesLabel(task.minutes)} · {shortDate(task.due)}
        </span>
      </button>
      <span className={`category-tag ${tones[task.category]}`}>{categories[task.category]}</span>
      <span className="task-estimate">{minutesLabel(task.minutes)}</span>
      <span className={`task-due ${conflict ? 'at-risk' : ''}`}>
        {conflict && <TriangleAlert size={13} />} {shortDate(task.due)}
      </span>
      <span className={`priority priority-${task.priority}`}>{priorities[task.priority]}</span>
      <button
        className="icon-button edit-button"
        onClick={onEdit}
        disabled={busy}
        aria-label={`Editar ${task.title}`}
      >
        <Pencil size={15} />
      </button>
    </div>
  );
}
