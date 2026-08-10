"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePlayers } from "@/components/PlayerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { fetchAllGames } from "@/lib/queries";
import { computeEloRatings } from "@/lib/stats";

export default function Home() {
  const { players, currentPlayer, loading } = usePlayers();
  const router = useRouter();
  const [ranking, setRanking] = useState<{ id: string; rating: number }[]>([]);

  useEffect(() => {
    if (!loading && !currentPlayer) router.replace("/profil");
  }, [loading, currentPlayer, router]);

  useEffect(() => {
    fetchAllGames()
      .then((games) => {
        const ratings = computeEloRatings(games);
        const rows = [...ratings.entries()]
          .map(([id, rating]) => ({ id, rating }))
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 3);
        setRanking(rows);
      })
      .catch(() => {});
  }, []);

  if (loading || !currentPlayer) return null;

  return (
    <main className="flex flex-1 flex-col px-5 pt-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Salut</p>
          <h1 className="text-2xl font-bold">{currentPlayer.name} 👋</h1>
        </div>
        <Link href="/profil">
          <PlayerAvatar name={currentPlayer.name} color={currentPlayer.color} />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Link
          href="/parties/nouvelle"
          className="triangle-header tap-target flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 active:bg-surface-elevated"
        >
          <span className="text-3xl">🎲</span>
          <span className="mt-6 font-semibold">Nouvelle partie</span>
        </Link>
        <Link
          href="/competitions/nouvelle"
          className="tap-target flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 active:bg-surface-elevated"
        >
          <span className="text-3xl">🏆</span>
          <span className="mt-6 font-semibold">Créer une compète</span>
        </Link>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Top niveau</h2>
          <Link href="/joueurs" className="text-sm text-accent-gold">
            Tout voir
          </Link>
        </div>
        {ranking.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
            Pas encore de partie terminée. Lancez-en une pour voir apparaître le classement !
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ranking.map((row, i) => {
              const p = players.find((pl) => pl.id === row.id);
              if (!p) return null;
              return (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
                >
                  <span className="w-5 text-sm font-bold text-muted">{i + 1}</span>
                  <PlayerAvatar name={p.name} color={p.color} size={36} />
                  <span className="flex-1 font-medium">{p.name}</span>
                  <span className="font-mono text-sm text-accent-gold">
                    {Math.round(row.rating)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <Link
          href="/competitions"
          className="tap-target block rounded-2xl border border-border bg-surface px-4 py-3 text-center font-medium text-muted active:text-foreground"
        >
          Voir les compétitions en cours
        </Link>
      </div>
    </main>
  );
}
