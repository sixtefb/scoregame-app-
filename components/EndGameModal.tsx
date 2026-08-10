"use client";

import { useState } from "react";
import type { GameResultType, Player } from "@/lib/types";
import { PlayerAvatar } from "@/components/PlayerAvatar";

const RESULT_TYPES: { value: GameResultType; label: string; multiplier: number }[] = [
  { value: "single", label: "Simple", multiplier: 1 },
  { value: "gammon", label: "Gammon", multiplier: 2 },
  { value: "backgammon", label: "Backgammon", multiplier: 3 },
];

export function EndGameModal({
  playerA,
  playerB,
  cubeValue,
  onConfirm,
  onClose,
}: {
  playerA: Player;
  playerB: Player;
  cubeValue: number;
  onConfirm: (winnerId: string, resultType: GameResultType, points: number) => void;
  onClose: () => void;
}) {
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [resultType, setResultType] = useState<GameResultType>("single");

  const multiplier = RESULT_TYPES.find((r) => r.value === resultType)!.multiplier;
  const points = cubeValue * multiplier;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h2 className="text-lg font-bold">Fin de la partie</h2>

        <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted">Qui gagne ?</p>
        <div className="grid grid-cols-2 gap-3">
          {[playerA, playerB].map((p) => (
            <button
              key={p.id}
              onClick={() => setWinnerId(p.id)}
              className={`tap-target flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 ${
                winnerId === p.id ? "border-accent-gold bg-surface-elevated" : "border-border bg-background"
              }`}
            >
              <PlayerAvatar name={p.name} color={p.color} />
              <span className="font-medium">{p.name}</span>
            </button>
          ))}
        </div>

        <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-muted">Type de victoire</p>
        <div className="grid grid-cols-3 gap-2">
          {RESULT_TYPES.map((r) => (
            <button
              key={r.value}
              onClick={() => setResultType(r.value)}
              className={`tap-target rounded-xl border px-2 py-3 text-sm font-semibold ${
                resultType === r.value
                  ? "border-accent-gold bg-surface-elevated text-accent-gold"
                  : "border-border bg-background text-muted"
              }`}
            >
              {r.label}
              <span className="block text-xs font-normal">×{r.multiplier}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
          <span className="text-sm text-muted">Cube × multiplicateur</span>
          <span className="font-mono text-lg font-bold text-accent-gold">
            {cubeValue} × {multiplier} = {points} pts
          </span>
        </div>

        <button
          onClick={() => winnerId && onConfirm(winnerId, resultType, points)}
          disabled={!winnerId}
          className="tap-target mt-5 w-full rounded-2xl bg-accent-gold py-4 text-center text-lg font-bold text-background disabled:opacity-40"
        >
          Valider
        </button>
        <button onClick={onClose} className="tap-target mt-3 w-full text-center text-sm text-muted">
          Annuler
        </button>
      </div>
    </div>
  );
}
