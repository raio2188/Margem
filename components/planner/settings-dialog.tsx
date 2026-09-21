'use client';
import { useState } from 'react';
import { ConflictNotice } from './conflict-notice';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { weekdays, type Settings } from '@/lib/planner/model';
export function SettingsDialog({
  settings,
  busy,
  conflict,
  onReload,
  onClose,
  onSave,
}: {
  settings: Settings;
  busy: boolean;
  conflict: boolean;
  onReload: () => void;
  onClose: () => void;
  onSave: (s: Settings) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(settings);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="planner-dialog">
        <DialogHeader>
          <DialogTitle>Qual é o seu ritmo?</DialogTitle>
          <DialogDescription>
            Defina horas disponíveis, sem contar reuniões ou compromissos fixos.
          </DialogDescription>
        </DialogHeader>
        {conflict && <ConflictNotice onReload={onReload} />}
        <div className="capacity-fields">
          {weekdays.map((day, i) => (
            <div className="capacity-row" key={day}>
              <label id={`hours-${i}`}>{day}</label>
              <Slider
                aria-labelledby={`hours-${i}`}
                ref={(node) => {
                  node
                    ?.querySelector('[role="slider"]')
                    ?.setAttribute('aria-label', `${day}, horas disponíveis`);
                }}
                min={0}
                max={8}
                step={0.5}
                value={[draft.hours[i]]}
                onValueChange={(v) =>
                  setDraft({ ...draft, hours: draft.hours.map((h, j) => (i === j ? v[0] : h)) })
                }
              />
              <output>{draft.hours[i].toLocaleString('pt-BR')}h</output>
            </div>
          ))}
        </div>
        <div className="buffer-field">
          <div>
            <label id="buffer-label">Margem para imprevistos</label>
            <strong>{draft.buffer}%</strong>
          </div>
          <Slider
            aria-labelledby="buffer-label"
            ref={(node) => {
              node
                ?.querySelector('[role="slider"]')
                ?.setAttribute('aria-label', 'Margem para imprevistos');
            }}
            min={0}
            max={50}
            step={5}
            value={[draft.buffer]}
            onValueChange={(v) => setDraft({ ...draft, buffer: v[0] })}
          />
          <p>
            Esse tempo fica protegido. Os blocos são arredondados para baixo em intervalos de 30
            minutos, preservando uma folga extra.
          </p>
        </div>
        <div className="form-actions">
          <button className="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            className="primary"
            disabled={busy || conflict}
            onClick={async () => {
              if (await onSave(draft)) onClose();
            }}
          >
            {busy ? 'Salvando…' : 'Aplicar ao plano'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
