import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Margem — sua semana, em um ritmo possível',
  description:
    'Planeje tarefas respeitando prazos e sua capacidade. Um planejador semanal com espaço para imprevistos.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
