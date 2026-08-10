"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePlayers } from "@/components/PlayerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { fetchAllDiceEvents, fetchAllGames } from "@/lib/queries";
import { computeDiceStats, computeEloRatings, computeLuckIndex } from "@/lib/stats";

export default function JoueursPage() {
  const { players } = usePlayers();
  const [rows, setRows] = useState<
    { id: string; rating: number; gamesPlayed: number; luckIndex: number }[] | null
  >(null);

  useEffect(() => {
    Promise.all([fetchAllGames(), fetchAllDiceEvents()]).then(([games, events]) => {
      const ratings = computeEloRatings(games);
      const dice = computeDiceStats(games, events);
      const luck = computeLuckIndex(dice);
      const result = players.map((p) => ({
        id: p.id,
        rating: ratings.get(p.id) ?? 1500,
        gamesPlayed: dice.get(p.id)?.gamesPlayed ?? 0,
        luckIndex: luck.get(p.id)?.luckIndex ?? 0,
      }));
      result.sort((a, b) => b.rating - a.rating);
      setRows(result);
    });
  }, [players]);

  return (
    <main className="flex flex-1 flex-col px-5 pt-10">
      <h1 className="text-2xl font-bold">Joueurs</h1>
      <p className="mt-1 text-sm text-muted">Niveau (Elo) et indice de chance relatif au groupe.</p>

      {rows === null ? (
        <p className="mt-8 text-sm text-muted">Chargement…</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {rows.map((row, i) => {
            const p = players.find((pl) => pl.id === row.id);
            if (!p) return null;
            return (
              <li key={row.id}>
                <Link
                  href={`/joueurs/${row.id}`}
                  className="tap-target flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
                >
                  <span className="w-5 text-sm font-bold text-muted">{i + 1}</span>
                  <PlayerAvatar name={p.name} color={p.color} size={38} />
                  <span className="flex-1">
                    <span className="block font-medium">{p.name}</span>
                    <span className="block text-xs text-muted">{row.gamesPlayed} parties</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono font-bold text-accent-gold">
                      {Math.round(row.rating)}
                    </span>
                    <span
                      className={`block text-xs ${row.luckIndex >= 0 ? "text-accent-green" : "text-accent-red"}`}
                    >
                      {row.luckIndex >= 0 ? "+" : ""}
                      {Math.round(row.luckIndex)}% chance
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
