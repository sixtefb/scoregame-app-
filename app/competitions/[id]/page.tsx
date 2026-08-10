"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { usePlayers } from "@/components/PlayerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  computeActivePlayersForRound,
  computeStandings,
  generateKnockoutBracket,
  qualifyForPlayoffs,
  realPairings,
  stageLabelForRound,
} from "@/lib/competition";
import type { Competition, Match, Player } from "@/lib/types";

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { players } = usePlayers();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: comp }, { data: parts }, { data: ms }] = await Promise.all([
        supabase.from("competitions").select("*").eq("id", id).single(),
        supabase.from("competition_participants").select("player_id").eq("competition_id", id),
        supabase.from("matches").select("*").eq("competition_id", id).order("created_at", { ascending: true }),
      ]);
      if (comp) setCompetition(comp as Competition);
      if (parts) setParticipantIds(parts.map((p) => p.player_id));
      if (ms) setMatches(ms as Match[]);
    } catch {
      // Backend injoignable : on garde l'état actuel.
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const participants = useMemo(
    () => players.filter((p) => participantIds.includes(p.id)),
    [players, participantIds]
  );

  const poolMatches = useMemo(() => matches.filter((m) => m.round === null), [matches]);
  const knockoutMatches = useMemo(() => matches.filter((m) => m.round !== null), [matches]);
  const matchesByRound = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of knockoutMatches) {
      const list = map.get(m.round as number) ?? [];
      list.push(m);
      map.set(m.round as number, list);
    }
    return map;
  }, [knockoutMatches]);

  const standings = useMemo(
    () => computeStandings(poolMatches, participantIds),
    [poolMatches, participantIds]
  );
  const poolComplete = poolMatches.length > 0 && poolMatches.every((m) => m.status === "completed");

  const knockoutBaseIds = useMemo(() => {
    if (!competition) return [];
    if (competition.format === "knockout") return participantIds;
    // round_robin_playoffs : la base du bracket = les joueurs du tour 1 des playoffs
    const round1 = matchesByRound.get(1) ?? [];
    return [...new Set(round1.flatMap((m) => [m.player_a_id, m.player_b_id]))];
  }, [competition, participantIds, matchesByRound]);

  const currentRound = knockoutMatches.length
    ? Math.max(...knockoutMatches.map((m) => m.round as number))
    : null;
  const currentRoundMatches = currentRound ? matchesByRound.get(currentRound) ?? [] : [];
  const currentRoundComplete =
    currentRoundMatches.length > 0 && currentRoundMatches.every((m) => m.status === "completed");

  const activePlayersNext = useMemo(() => {
    if (!currentRound || knockoutBaseIds.length === 0) return [];
    return computeActivePlayersForRound(currentRound + 1, knockoutBaseIds, matchesByRound);
  }, [currentRound, knockoutBaseIds, matchesByRound]);

  const champion =
    currentRoundComplete && activePlayersNext.length === 1
      ? participants.find((p) => p.id === activePlayersNext[0])
      : null;

  const launchPlayoffs = async () => {
    if (!competition) return;
    setBusy(true);
    const qualifiers = qualifyForPlayoffs(standings, competition.playoff_size);
    const pairings = realPairings(generateKnockoutBracket(qualifiers));
    const { data: created } = await supabase
      .from("matches")
      .insert(
        pairings.map(([a, b]) => ({
          competition_id: competition.id,
          player_a_id: a,
          player_b_id: b,
          target_points: competition.default_target_points,
          stage_label: stageLabelForRound(qualifiers.length),
          round: 1,
        }))
      )
      .select();
    if (created) {
      await supabase
        .from("games")
        .insert(created.map((m) => ({ match_id: m.id, player1_id: m.player_a_id, player2_id: m.player_b_id })));
    }
    await load();
    setBusy(false);
  };

  const nextRound = async () => {
    if (!competition || !currentRound) return;
    setBusy(true);
    const pairings = realPairings(generateKnockoutBracket(activePlayersNext));
    const { data: created } = await supabase
      .from("matches")
      .insert(
        pairings.map(([a, b]) => ({
          competition_id: competition.id,
          player_a_id: a,
          player_b_id: b,
          target_points: competition.default_target_points,
          stage_label: stageLabelForRound(activePlayersNext.length),
          round: (currentRound as number) + 1,
        }))
      )
      .select();
    if (created) {
      await supabase
        .from("games")
        .insert(created.map((m) => ({ match_id: m.id, player1_id: m.player_a_id, player2_id: m.player_b_id })));
    }
    await load();
    setBusy(false);
  };

  const closeCompetition = async () => {
    if (!competition) return;
    setBusy(true);
    const winnerId = champion?.id ?? standings[0]?.playerId ?? null;
    await supabase
      .from("competitions")
      .update({ status: "completed", winner_id: winnerId })
      .eq("id", competition.id);
    await load();
    setBusy(false);
  };

  if (!competition) {
    return (
      <main className="flex flex-1 items-center justify-center px-5">
        <p className="text-sm text-muted">Chargement…</p>
      </main>
    );
  }

  const showPool = competition.format !== "knockout";
  const roundNumbers = [...matchesByRound.keys()].sort((a, b) => a - b);

  return (
    <main className="flex flex-1 flex-col px-5 pt-8">
      <h1 className="text-2xl font-bold">{competition.name}</h1>

      {competition.status === "completed" && (
        <div className="mt-4 rounded-2xl border border-accent-gold bg-surface p-4 text-center">
          <span className="text-3xl">🏆</span>
          <p className="mt-1 font-bold">
            {champion?.name ?? players.find((p) => p.id === standings[0]?.playerId)?.name ?? "—"} — vainqueur
          </p>
        </div>
      )}

      {showPool && poolMatches.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-semibold">Classement de poule</h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Joueur</th>
                  <th className="px-3 py-2 text-center">V</th>
                  <th className="px-3 py-2 text-center">D</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => {
                  const p = players.find((pl) => pl.id === row.playerId);
                  if (!p) return null;
                  return (
                    <tr key={row.playerId} className="border-t border-border">
                      <td className="flex items-center gap-2 px-3 py-2">
                        <span className="w-4 text-xs text-muted">{i + 1}</span>
                        <PlayerAvatar name={p.name} color={p.color} size={26} />
                        {p.name}
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-accent-green">{row.matchWins}</td>
                      <td className="px-3 py-2 text-center font-mono text-accent-red">{row.matchLosses}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <MatchList matches={poolMatches} players={players} />

          {competition.format === "round_robin_playoffs" &&
            poolComplete &&
            knockoutMatches.length === 0 && (
              <button
                onClick={launchPlayoffs}
                disabled={busy}
                className="tap-target mt-4 w-full rounded-2xl bg-accent-gold py-3 font-bold text-background disabled:opacity-40"
              >
                Lancer les playoffs (top {competition.playoff_size}) 🚀
              </button>
            )}

          {competition.format === "round_robin" && poolComplete && competition.status !== "completed" && (
            <button
              onClick={closeCompetition}
              disabled={busy}
              className="tap-target mt-4 w-full rounded-2xl bg-accent-gold py-3 font-bold text-background disabled:opacity-40"
            >
              Clôturer la compétition 🏆
            </button>
          )}
        </section>
      )}

      {roundNumbers.map((round) => (
        <section key={round} className="mt-6">
          <h2 className="mb-2 font-semibold">{matchesByRound.get(round)![0].stage_label}</h2>
          <MatchList matches={matchesByRound.get(round)!} players={players} />
        </section>
      ))}

      {currentRound && currentRoundComplete && activePlayersNext.length > 1 && (
        <button
          onClick={nextRound}
          disabled={busy}
          className="tap-target mt-4 w-full rounded-2xl bg-accent-gold py-3 font-bold text-background disabled:opacity-40"
        >
          Générer le tour suivant ▶️
        </button>
      )}

      {champion && competition.status !== "completed" && (
        <button
          onClick={closeCompetition}
          disabled={busy}
          className="tap-target mt-4 w-full rounded-2xl bg-accent-gold py-3 font-bold text-background disabled:opacity-40"
        >
          Clôturer avec {champion.name} comme champion 🏆
        </button>
      )}

      <section className="mt-8 mb-6">
        <h2 className="mb-2 font-semibold">Participants</h2>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm"
            >
              <PlayerAvatar name={p.name} color={p.color} size={22} />
              {p.name}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}

function MatchList({ matches, players }: { matches: Match[]; players: Player[] }) {
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {matches.map((m) => (
        <li key={m.id}>
          <Link
            href={`/parties/${m.id}`}
            className="tap-target flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <span className="font-medium">
              {name(m.player_a_id)} <span className="text-muted">vs</span> {name(m.player_b_id)}
            </span>
            {m.status === "completed" ? (
              <span className="text-sm font-semibold text-accent-green">✓ {name(m.winner_id ?? "")}</span>
            ) : (
              <span className="text-sm text-accent-gold">En cours →</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
