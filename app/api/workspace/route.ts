import { getChatGPTUser } from '../../chatgpt-auth';
import { readWorkspace, writeWorkspace } from '../../../db/workspace';
import { workspaceSchema, dateSchema } from '../../../lib/planner/model';
import { initialWorkspace } from '../../../lib/planner/seed';
import { z } from 'zod';
const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return reply({ error: 'Entre na sua conta para abrir seu planejamento.' }, 401);
    const parsed = dateSchema.safeParse(new URL(request.url).searchParams.get('today'));
    if (!parsed.success) return reply({ error: 'Data inválida.' }, 400);
    return reply(await readWorkspace(user.userId, initialWorkspace(parsed.data)));
  } catch (error) {
    console.error('workspace.read', error);
    return reply({ error: 'Não foi possível carregar suas tarefas. Tente novamente.' }, 503);
  }
}
const updateSchema = z.object({ revision: z.number().int().nonnegative(), data: workspaceSchema });
export async function PUT(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return reply({ error: 'Sua sessão expirou. Entre novamente.' }, 401);
    if (request.headers.get('origin') !== new URL(request.url).origin)
      return reply({ error: 'Origem não permitida.' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json'))
      return reply({ error: 'Formato inválido.' }, 415);
    const body = await request.text();
    if (body.length > 100000)
      return reply({ error: 'O planejamento excedeu o limite de tamanho.' }, 413);
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return reply({ error: 'Conteúdo inválido.' }, 400);
    }
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success)
      return reply({ error: 'Revise os dados: até 80 tarefas, em blocos de 30 minutos.' }, 400);
    const { data, revision } = parsed.data;
    if (!(await writeWorkspace(user.userId, data, revision)))
      return reply(
        { error: 'O plano mudou em outra aba. Recarregue os dados antes de salvar novamente.' },
        409,
      );
    return reply({ data, revision: revision + 1 });
  } catch (error) {
    console.error('workspace.write', error);
    return reply(
      {
        error: 'Não foi possível salvar. Seus dados anteriores estão preservados. Tente novamente.',
      },
      503,
    );
  }
}
