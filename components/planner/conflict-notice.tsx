'use client';
export function ConflictNotice({ onReload }: { onReload: () => void }) {
  return (
    <div className="form-hint" role="alert">
      <p>Seu plano mudou em outra aba. Atualize os dados; o que você digitou aqui será mantido.</p>
      <button type="button" className="secondary" style={{ marginTop: 10 }} onClick={onReload}>
        Atualizar dados
      </button>
    </div>
  );
}
