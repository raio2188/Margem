'use client';
import { useEffect } from 'react';
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('planner.render', error);
  }, [error]);
  return (
    <main className="error-page">
      <h1>Vamos retomar de onde você parou.</h1>
      <p>Não foi possível abrir esta tela. As tarefas salvas continuam guardadas.</p>
      <button className="primary" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
