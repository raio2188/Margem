import type { Workspace } from './model';
import { businessDays } from './schedule';
export function initialWorkspace(today: string): Workspace {
  const d = businessDays(today);
  return {
    examples: true,
    settings: { hours: [5, 5, 5, 5, 4], buffer: 20 },
    tasks: [
      {
        id: 'example-1',
        title: 'Desenhar proposta do projeto',
        minutes: 180,
        due: d[1],
        priority: 'high',
        category: 'focus',
        done: false,
      },
      {
        id: 'example-2',
        title: 'Revisar apresentação',
        minutes: 120,
        due: d[2],
        priority: 'normal',
        category: 'focus',
        done: false,
      },
      {
        id: 'example-3',
        title: 'Organizar referências',
        minutes: 90,
        due: d[3],
        priority: 'low',
        category: 'routine',
        done: false,
      },
      {
        id: 'example-4',
        title: 'Colocar as finanças em dia',
        minutes: 60,
        due: d[2],
        priority: 'normal',
        category: 'personal',
        done: false,
      },
      {
        id: 'example-5',
        title: 'Desenvolver primeira versão',
        minutes: 300,
        due: d[4],
        priority: 'high',
        category: 'focus',
        done: false,
      },
      {
        id: 'example-6',
        title: 'Revisar a semana e próximos passos',
        minutes: 60,
        due: d[4],
        priority: 'low',
        category: 'routine',
        done: false,
      },
    ],
  };
}
