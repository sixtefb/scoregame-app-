"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { computeHeadToHead, type DiceStats, type LuckEntry } from "@/lib/stats";
import type { Game, Player } from "@/lib/types";

export function PlayerCompare({
  players,
  games,
  ratings,
  diceStats,
  luckIndexMap,
}: {
  players: Player[];
  games: Game[];
  ratings: Map<string, number>;
  diceStats: Map<string, DiceStats>;
  luckIndexMap: Map<string, LuckEntry>;
}) {
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");

  useEffect(() => {
    if (players.length >= 2 && (!aId || !bId)) {
      setAId(players[0].id);
      setBId(players[1].id);
    }
  }, [players, aId, bId]);

  const playerA = players.find((p) => p.id === aId);
  const playerB = players.find((p) => p.id === bId);

  const winRate = (id: string) => {
    const wins = games.filter((g) => g.status === "completed" && g.winner_id === id).length;
    const losses = games.filter(
      (g) => g.status === "completed" && g.winner_id && g.winner_id !== id && (g.player1_id === id || g.player2_id === id)
    ).length;
    return wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
  };

  const h2h = useMemo(() => {
    if (!aId || !bId) return null;
    return computeHeadToHead(games, aId).get(bId) ?? { opponentId: bId, wins: 0, losses: 0 };
  }, [games, aId, bId]);

  if (players.length < 2) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
        Il faut au moins 2 joueurs pour comparer.
      </p>
    );
  }

  const ratingA = ratings.get(aId) ?? 1500;
  const ratingB = ratings.get(bId) ?? 1500;
  const luckA = luckIndexMap.get(aId)?.luckIndex ?? 0;
  const luckB = luckIndexMap.get(bId)?.luckIndex ?? 0;
  const doublesA = diceStats.get(aId)?.doublesPerGame ?? 0;
  const doublesB = diceStats.get(bId)?.doublesPerGame ?? 0;
  const winRateA = winRate(aId);
  const winRateB = winRate(bId);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="grid grid-cols-2 gap-3">
        <select
          value={aId}
          onChange={(e) => setAId(e.target.value)}
          className="rounded-xl border border-border bg-background px-2 py-2 text-sm"
        >
          {players.map((p) => (
            <option key={p.id} value={p.id} disabled={p.id === bId}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={bId}
          onChange={(e) => setBId(e.target.value)}
          className="rounded-xl border border-border bg-background px-2 py-2 text-sm"
        >
          {players.map((p) => (
            <option key={p.id} value={p.id} disabled={p.id === aId}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {playerA && playerB && (
        <>
          <div className="mt-4 flex items-center justify-center gap-4">
            <PlayerAvatar name={playerA.name} color={playerA.color} size={36} />
            <span className="text-xs text-muted">vs</span>
            <PlayerAvatar name={playerB.name} color={playerB.color} size={36} />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <CompareRow label="Niveau (Elo)" a={Math.round(ratingA)} b={Math.round(ratingB)} higherWins />
            <CompareRow
              label="Chance"
              a={`${luckA >= 0 ? "+" : ""}${Math.round(luckA)}%`}
              b={`${luckB >= 0 ? "+" : ""}${Math.round(luckB)}%`}
              aRaw={luckA}
              bRaw={luckB}
              higherWins
            />
            <CompareRow label="Doubles / partie" a={doublesA.toFixed(1)} b={doublesB.toFixed(1)} aRaw={doublesA} bRaw={doublesB} higherWins />
            <CompareRow
              label="Victoires"
              a={winRateA !== null ? `${winRateA}%` : "—"}
              b={winRateB !== null ? `${winRateB}%` : "—"}
              aRaw={winRateA ?? 0}
              bRaw={winRateB ?? 0}
              higherWins
            />
          </div>

          {h2h && (h2h.wins > 0 || h2h.losses > 0) && (
            <div className="mt-4 rounded-xl bg-background px-3 py-2 text-center text-sm">
              Face à face :{" "}
              <span className="font-mono font-bold text-accent-green">{h2h.wins}</span>
              {" – "}
              <span className="font-mono font-bold text-accent-red">{h2h.losses}</span>{" "}
              <span className="text-muted">pour {playerA.name}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CompareRow({
  label,
  a,
  b,
  aRaw,
  bRaw,
  higherWins,
}: {
  label: string;
  a: string | number;
  b: string | number;
  aRaw?: number;
  bRaw?: number;
  higherWins: boolean;
}) {
  const va = aRaw ?? (typeof a === "number" ? a : NaN);
  const vb = bRaw ?? (typeof b === "number" ? b : NaN);
  const aWins = !Number.isNaN(va) && !Number.isNaN(vb) && (higherWins ? va > vb : va < vb);
  const bWins = !Number.isNaN(va) && !Number.isNaN(vb) && (higherWins ? vb > va : vb < va);

  return (
    <div className="flex items-center justify-between rounded-xl bg-background px-3 py-2 text-sm">
      <span className={`w-16 font-mono font-bold ${aWins ? "text-accent-gold" : "text-muted"}`}>{a}</span>
      <span className="text-xs text-muted">{label}</span>
      <span className={`w-16 text-right font-mono font-bold ${bWins ? "text-accent-gold" : "text-muted"}`}>
        {b}
      </span>
    </div>
  );
}
