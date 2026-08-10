"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayers } from "@/components/PlayerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { supabase } from "@/lib/supabase";

const TARGET_PRESETS = [3, 5, 7, 11, 21];

export default function NouvellePartiePage() {
  const { players, currentPlayer } = usePlayers();
  const router = useRouter();
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [targetPoints, setTargetPoints] = useState(7);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opponents = players.filter((p) => p.id !== currentPlayer?.id);

  const start = async () => {
    if (!currentPlayer || !opponentId) return;
    setCreating(true);
    setError(null);
    try {
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          player_a_id: currentPlayer.id,
          player_b_id: opponentId,
          target_points: targetPoints,
          stage_label: "Amical",
        })
        .select()
        .single();
      if (matchError || !match) throw matchError;

      const { error: gameError } = await supabase.from("games").insert({
        match_id: match.id,
        player1_id: currentPlayer.id,
        player2_id: opponentId,
      });
      if (gameError) throw gameError;

      router.push(`/parties/${match.id}`);
    } catch {
      setError("Impossible de créer la partie. Réessaie.");
      setCreating(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-10">
      <h1 className="text-2xl font-bold">Nouvelle partie</h1>
      <p className="mt-1 text-sm text-muted">
        {currentPlayer?.name} contre qui, et jusqu&apos;à combien de points ?
      </p>

      <div className="mt-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Adversaire</p>
        {opponents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
            Aucun autre joueur pour l&apos;instant. Crée d&apos;autres profils depuis l&apos;écran
            « Qui es-tu ? ».
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {opponents.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setOpponentId(p.id)}
                  className={`tap-target flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                    opponentId === p.id
                      ? "border-accent-gold bg-surface-elevated"
                      : "border-border bg-surface"
                  }`}
                >
                  <PlayerAvatar name={p.name} color={p.color} />
                  <span className="font-medium">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Match en combien de points
        </p>
        <div className="flex flex-wrap gap-2">
          {TARGET_PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => setTargetPoints(v)}
              className={`tap-target rounded-xl border px-4 py-2 font-mono font-semibold ${
                targetPoints === v
                  ? "border-accent-gold bg-surface-elevated text-accent-gold"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-accent-red">{error}</p>}

      <button
        onClick={start}
        disabled={!opponentId || creating}
        className="tap-target mt-8 rounded-2xl bg-accent-gold py-4 text-center text-lg font-bold text-background disabled:opacity-40"
      >
        {creating ? "Création…" : "C'est parti 🎲"}
      </button>
    </main>
  );
}
