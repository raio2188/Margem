# Margem ↗

Um planejador de carga de trabalho para quem precisa de uma semana possível. Defina tarefas, prazos e disponibilidade; a Margem distribui blocos de trabalho nos próximos cinco dias úteis e mostra o que não cabe. A reserva para imprevistos é uma restrição real do algoritmo.

## Executar

Requisitos: Node.js 22.13+ e npm. O Node 22 precisa suportar `--experimental-strip-types` (22.13 ou superior).

```sh
npm ci
npm run build
npm run db:local
npm run dev
```

Abra a URL impressa pelo servidor (normalmente http://localhost:5173). O ambiente de desenvolvimento oferece uma identidade local de teste pelo fluxo `/signin-with-chatgpt`. Em produção, Sites autentica o usuário. Não exponha o servidor de desenvolvimento à internet.

```sh
npm test
npm run typecheck
npm run test:api  # com npm run dev em execução
npm run format:check
```

`db:local` usa o controle de migrações do Wrangler; pode ser executado novamente sem reaplicar as migrações já registradas. Para evoluir o schema, edite `db/schema.ts`, rode `npm run db:generate`, inspecione o SQL, reconstrua e aplique as migrações pendentes. As migrações de produção são aplicadas pela publicação do Sites.

## O produto

- Visão de cinco dias úteis, com capacidade por dia, carga planejada e folga protegida.
- Criar, editar, concluir, reabrir e excluir tarefas; até 80 tarefas por conta.
- Estimativas em intervalos de 30 minutos e blocos de execução de até 90 minutos.
- Prazos e prioridades, três categorias visuais e indicação explícita de horas que não cabem.
- Exemplos identificados, remoção confirmada e estados vazios, carregamento e falhas recuperáveis.
- Persistência no servidor, isolada por usuário; alterações só aparecem como salvas após confirmação da API.
- Layout adaptável, navegação por teclado e diálogos com gerenciamento de foco.

## Arquitetura

```text
app/                         Rotas, layout e endpoint autenticado
  api/workspace/route.ts     HTTP, autorização e validação de entrada
components/planner/          Interface e formulários acessíveis
hooks/use-workspace.ts        Carregamento, salvamento e conflitos
lib/planner/                 Domínio puro: contratos, exemplos, algoritmo
  schedule.ts                Planejamento determinístico e testável
  model.ts                   Schemas Zod compartilhados e tipos
db/                         Repositório D1 e schema Drizzle
drizzle/                    Migrações versionadas
tests/                      Testes do algoritmo e contrato HTTP
```

React + TypeScript sobre Vinext/Vite, compatível com a estrutura App Router do Next.js. Radix/Shadcn fornece controles acessíveis; CSS próprio define a identidade visual. O servidor executa em Cloudflare Workers; Cloudflare D1 oferece SQLite persistente. A lógica do produto não depende de API de IA nem de credenciais externas.

O agregado de planejamento é pequeno e limitado: uma linha por usuário, com documento JSON validado e revisão numérica. Uma atualização usa `WHERE owner_id = ? AND revision = ?`, garantindo comparação e troca atômica. Um conflito retorna HTTP 409, preserva o formulário e pede atualização dos dados. Essa escolha evita sincronização complexa sem fingir suporte colaborativo. O repositório usa prepared statements; o schema é gerenciado exclusivamente por migrações.

A identidade vem dos headers autenticados do dispatcher Sites, nunca de campos enviados pelo formulário. A API verifica usuário, origem e conteúdo. A chave primária é o ID do usuário. O helper de identidade só deve ser usado atrás do dispatcher que garante esses headers; outro provedor exige adaptar a autenticação.

## Como funciona o algoritmo

1. Começa na data local do navegador e seleciona os próximos cinco dias úteis, incluindo hoje quando aplicável.
2. Para cada dia: `capacidade = floor(horas × 60 × (1 − margem/100) / 30) × 30`.
3. Ordena tarefas abertas por prazo, prioridade e ID, nessa ordem.
4. Aloca blocos de 30–90 minutos no dia elegível proporcionalmente menos ocupado. Empates favorecem a data mais próxima.
5. Nunca agenda após o prazo ou acima da capacidade. As horas restantes viram conflitos explícitos; a numeração dos blocos segue a ordem cronológica.

É uma heurística determinística, não um otimizador global. A distribuição representa carga diária, não reservas de horários específicos. O plano é derivado dos dados e não precisa ser persistido separadamente. Categorias são organização visual e não mudam a prioridade. A reserva efetiva pode ser maior que a porcentagem escolhida devido ao arredondamento.

## Verificação

Dez testes do domínio cobrem calendário, prioridades, reserva, tarefas vencidas, conclusão, alocação parcial, capacidade zero, validação, sequência cronológica e invariantes em 200 cenários gerados com semente fixa. O teste HTTP verifica autenticação, bloqueio de origem, validação, persistência e prevenção de sobrescrita por revisão desatualizada. Ele restaura seu estado inicial e se recusa a executar contra um domínio externo.

A ferramenta WebMCP `read_week_plan` é opcional e somente leitura. Usa o mesmo estado da interface, valida a entrada e funciona apenas em navegadores com suporte. A aplicação não depende dela.

## Limites e continuação

O escopo é intencional: sem recorrência, equipes, dependências entre tarefas, horários fixos ou progresso parcial por bloco. A capacidade de hoje deve refletir as horas ainda disponíveis. Concluir uma tarefa conclui todos os blocos. A data local é revista a cada minuto enquanto a página está aberta; não há histórico congelado de semanas.

Próximos passos: registrar progresso parcial sem perder estimativas, exportar blocos para calendário e adicionar testes de regressão visual em CI. Para colaboração em equipe, normalizar tarefas em tabelas próprias e adotar revisões por entidade antes de ampliar o limite atual.
