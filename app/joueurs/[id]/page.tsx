"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { usePlayers } from "@/components/PlayerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { DoublesBarChart } from "@/components/DoublesBarChart";
import { ChanceSkillScatter, type ScatterPoint } from "@/components/ChanceSkillScatter";
import { fetchAllDiceEvents, fetchAllGames, fetchCompetitions } from "@/lib/queries";
import { computeDiceStats, computeEloRatings, computeHeadToHead, computeLuckIndex } from "@/lib/stats";
import type { Competition, DiceEvent, Game } from "@/lib/types";

export default function JoueurDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { players } = usePlayers();
  const [games, setGames] = useState<Game[]>([]);
  const [diceEvents, setDiceEvents] = useState<DiceEvent[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    fetchAllGames().then(setGames);
    fetchAllDiceEvents().then(setDiceEvents);
    fetchCompetitions().then(setCompetitions);
  }, []);

  const player = players.find((p) => p.id === id);

  const ratings = useMemo(() => computeEloRatings(games), [games]);
  const diceStats = useMemo(() => computeDiceStats(games, diceEvents), [games, diceEvents]);
  const luckIndexMap = useMemo(() => computeLuckIndex(diceStats), [diceStats]);
  const headToHead = useMemo(() => (id ? computeHeadToHead(games, id) : new Map()), [games, id]);

  const myStats = id ? diceStats.get(id) : undefined;
  const myLuck = id ? luckIndexMap.get(id) : undefined;
  const myRating = id ? ratings.get(id) ?? 1500 : 1500;

  const wins = games.filter((g) => g.status === "completed" && g.winner_id === id).length;
  const losses = games.filter(
    (g) => g.status === "completed" && g.winner_id && g.winner_id !== id && (g.player1_id === id || g.player2_id === id)
  ).length;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;

  const trophies = competitions.filter((c) => c.status === "completed" && c.winner_id === id);

  const scatterPoints: ScatterPoint[] = players
    .filter((p) => (diceStats.get(p.id)?.gamesPlayed ?? 0) > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      luckIndex: luckIndexMap.get(p.id)?.luckIndex ?? 0,
      rating: ratings.get(p.id) ?? 1500,
      highlighted: p.id === id,
    }));

  if (!player) {
    return (
      <main className="flex flex-1 items-center justify-center px-5">
        <p className="text-sm text-muted">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-5 pt-8">
      <div className="flex items-center gap-3">
        <PlayerAvatar name={player.name} color={player.color} size={52} />
        <div>
          <h1 className="text-2xl font-bold">{player.name}</h1>
          <p className="text-sm text-muted">
            {myStats?.gamesPlayed ?? 0} parties {winRate !== null && `· ${winRate}% de victoires`}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatTile label="Niveau" value={Math.round(myRating).toString()} color="var(--accent-gold)" />
        <StatTile
          label="Chance"
          value={`${(myLuck?.luckIndex ?? 0) >= 0 ? "+" : ""}${Math.round(myLuck?.luckIndex ?? 0)}%`}
          color={(myLuck?.luckIndex ?? 0) >= 0 ? "var(--accent-green)" : "var(--accent-red)"}
        />
        <StatTile label="Trophées" value={trophies.length.toString()} color="var(--accent-blue)" />
      </div>

      <section className="mt-8">
        <h2 className="mb-2 font-semibold">Doubles obtenus ({myStats?.totalDoubles ?? 0})</h2>
        <DoublesBarChart doublesByValue={myStats?.doublesByValue ?? {}} />
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>✅ {myStats?.full ?? 0} jouées à fond</span>
          <span>⚠️ {myStats?.partial ?? 0} partielles</span>
          <span>🚫 {myStats?.wasted ?? 0} gâchées</span>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-semibold">Chance vs Niveau (groupe)</h2>
        <ChanceSkillScatter points={scatterPoints} />
      </section>

      {trophies.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 font-semibold">Trophées</h2>
          <ul className="flex flex-col gap-2">
            {trophies.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
                <span>🏆</span>
                <span className="font-medium">{c.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {headToHead.size > 0 && (
        <section className="mb-8 mt-8">
          <h2 className="mb-2 font-semibold">Face à face</h2>
          <ul className="flex flex-col gap-2">
            {[...headToHead.values()].map((h2h) => {
              const opp = players.find((p) => p.id === h2h.opponentId);
              if (!opp) return null;
              return (
                <li
                  key={h2h.opponentId}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
                >
                  <PlayerAvatar name={opp.name} color={opp.color} size={30} />
                  <span className="flex-1 font-medium">{opp.name}</span>
                  <span className="font-mono text-sm">
                    <span className="text-accent-green">{h2h.wins}</span>
                    {" – "}
                    <span className="text-accent-red">{h2h.losses}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 text-center">
      <p className="font-mono text-xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
