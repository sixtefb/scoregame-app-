"use client";

import { useState } from "react";
import type { DiceOutcome } from "@/lib/types";

const OUTCOMES: { value: DiceOutcome; label: string; hint: string; emoji: string }[] = [
  { value: "full", label: "Jouée à fond", hint: "Les 4 déplacements du double ont pu être joués", emoji: "✅" },
  { value: "partial", label: "Partiellement bloquée", hint: "Seulement une partie du double a pu être jouée", emoji: "⚠️" },
  { value: "wasted", label: "Complètement gâchée", hint: "Impossible à jouer (case bloquée) — pure malchance", emoji: "🚫" },
];

export function DoubleModal({
  playerName,
  onConfirm,
  onClose,
}: {
  playerName: string;
  onConfirm: (diceValue: number, outcome: DiceOutcome) => void;
  onClose: () => void;
}) {
  const [diceValue, setDiceValue] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 px-0" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

        {diceValue === null ? (
          <>
            <h2 className="text-lg font-bold">Double de {playerName}</h2>
            <p className="mt-1 text-sm text-muted">Quelle valeur ?</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <button
                  key={v}
                  onClick={() => setDiceValue(v)}
                  className="tap-target aspect-square rounded-2xl border border-border bg-background text-2xl font-bold active:border-accent-gold active:text-accent-gold"
                >
                  {v}-{v}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold">
              Double {diceValue}-{diceValue} de {playerName}
            </h2>
            <p className="mt-1 text-sm text-muted">A-t-il pu être joué ?</p>
            <div className="mt-4 flex flex-col gap-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => onConfirm(diceValue, o.value)}
                  className="tap-target flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-left active:border-accent-gold"
                >
                  <span className="text-xl">{o.emoji}</span>
                  <span>
                    <span className="block font-semibold">{o.label}</span>
                    <span className="block text-xs text-muted">{o.hint}</span>
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setDiceValue(null)} className="tap-target mt-4 text-sm text-muted">
              ← Changer la valeur
            </button>
          </>
        )}

        <button onClick={onClose} className="tap-target mt-4 w-full text-center text-sm text-muted">
          Annuler
        </button>
      </div>
    </div>
  );
}
