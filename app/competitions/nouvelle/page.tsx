"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayers } from "@/components/PlayerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { supabase } from "@/lib/supabase";
import {
  generateKnockoutBracket,
  generateRoundRobinPairs,
  realPairings,
  stageLabelForRound,
} from "@/lib/competition";
import type { CompetitionFormat } from "@/lib/types";

const TARGET_PRESETS = [3, 5, 7, 11, 21];

const FORMATS: { value: CompetitionFormat; label: string; hint: string }[] = [
  { value: "round_robin", label: "Poule simple", hint: "Chacun affronte chacun, classement final" },
  {
    value: "round_robin_playoffs",
    label: "Poule + playoffs",
    hint: "Poule puis les meilleurs s'affrontent en élimination jusqu'à la finale",
  },
  { value: "knockout", label: "Élimination directe", hint: "Bracket à la Roland-Garros, une défaite = éliminé" },
];

export default function NouvelleCompetitionPage() {
  const { players } = usePlayers();
  const router = useRouter();

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<CompetitionFormat>("round_robin");
  const [targetPoints, setTargetPoints] = useState(7);
  const [playoffSize, setPlayoffSize] = useState(4);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const canSubmit = name.trim().length > 0 && selected.length >= 2;

  const submit = async () => {
    if (!canSubmit) return;
    setCreating(true);
    setError(null);
    try {
      const { data: competition, error: compError } = await supabase
        .from("competitions")
        .insert({
          name: name.trim(),
          format,
          default_target_points: targetPoints,
          playoff_size: playoffSize,
          status: "in_progress",
        })
        .select()
        .single();
      if (compError || !competition) throw compError;

      await supabase
        .from("competition_participants")
        .insert(selected.map((player_id) => ({ competition_id: competition.id, player_id })));

      const matchesToCreate: {
        competition_id: string;
        player_a_id: string;
        player_b_id: string;
        target_points: number;
        stage_label: string;
        round: number | null;
      }[] = [];

      if (format === "knockout") {
        const pairings = generateKnockoutBracket(selected);
        const size = 2 ** Math.ceil(Math.log2(Math.max(selected.length, 1)));
        for (const [a, b] of realPairings(pairings)) {
          matchesToCreate.push({
            competition_id: competition.id,
            player_a_id: a,
            player_b_id: b,
            target_points: targetPoints,
            stage_label: stageLabelForRound(size),
            round: 1,
          });
        }
      } else {
        for (const [a, b] of generateRoundRobinPairs(selected)) {
          matchesToCreate.push({
            competition_id: competition.id,
            player_a_id: a,
            player_b_id: b,
            target_points: targetPoints,
            stage_label: "Poule",
            round: null,
          });
        }
      }

      const { data: createdMatches, error: matchError } = await supabase
        .from("matches")
        .insert(matchesToCreate)
        .select();
      if (matchError || !createdMatches) throw matchError;

      await supabase.from("games").insert(
        createdMatches.map((m) => ({
          match_id: m.id,
          player1_id: m.player_a_id,
          player2_id: m.player_b_id,
        }))
      );

      router.push(`/competitions/${competition.id}`);
    } catch {
      setError("Impossible de créer la compétition. Réessaie.");
      setCreating(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-10">
      <h1 className="text-2xl font-bold">Nouvelle compétition</h1>

      <div className="mt-6">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
          Nom
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tournoi de l'été"
          className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-base outline-none focus:border-accent-gold"
        />
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Participants ({selected.length})
        </p>
        <ul className="flex flex-col gap-2">
          {players.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => toggle(p.id)}
                className={`tap-target flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                  selected.includes(p.id) ? "border-accent-gold bg-surface-elevated" : "border-border bg-surface"
                }`}
              >
                <PlayerAvatar name={p.name} color={p.color} size={36} />
                <span className="font-medium">{p.name}</span>
                {selected.includes(p.id) && <span className="ml-auto text-accent-gold">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Format</p>
        <div className="flex flex-col gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              className={`tap-target rounded-2xl border px-4 py-3 text-left ${
                format === f.value ? "border-accent-gold bg-surface-elevated" : "border-border bg-surface"
              }`}
            >
              <span className="block font-semibold">{f.label}</span>
              <span className="block text-xs text-muted">{f.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {format === "round_robin_playoffs" && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Nombre de qualifiés pour les playoffs
          </p>
          <div className="flex gap-2">
            {[2, 4].map((n) => (
              <button
                key={n}
                onClick={() => setPlayoffSize(n)}
                className={`tap-target rounded-xl border px-4 py-2 font-mono font-semibold ${
                  playoffSize === n
                    ? "border-accent-gold bg-surface-elevated text-accent-gold"
                    : "border-border bg-surface text-muted"
                }`}
              >
                Top {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Chaque match se joue en combien de points
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
        onClick={submit}
        disabled={!canSubmit || creating}
        className="tap-target mt-8 rounded-2xl bg-accent-gold py-4 text-center text-lg font-bold text-background disabled:opacity-40"
      >
        {creating ? "Création…" : "Lancer la compétition 🏆"}
      </button>
    </main>
  );
}
