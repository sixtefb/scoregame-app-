"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { usePlayers } from "@/components/PlayerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { DoubleModal } from "@/components/DoubleModal";
import { EndGameModal } from "@/components/EndGameModal";
import type { DiceEvent, DiceOutcome, Game, GameResultType, Match, Player } from "@/lib/types";

const CUBE_MAX = 64;

export default function LiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { players } = usePlayers();

  const [match, setMatch] = useState<Match | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [diceEvents, setDiceEvents] = useState<DiceEvent[]>([]);
  const [doubleFor, setDoubleFor] = useState<Player | null>(null);
  const [showEndGame, setShowEndGame] = useState(false);

  const loadMatch = useCallback(async () => {
    try {
      const { data } = await supabase.from("matches").select("*").eq("id", matchId).single();
      if (data) setMatch(data as Match);
    } catch {
      // Backend injoignable : on garde l'état actuel.
    }
  }, [matchId]);

  const loadGames = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("games")
        .select("*")
        .eq("match_id", matchId)
        .order("started_at", { ascending: true });
      if (data) setGames(data as Game[]);
    } catch {
      // Backend injoignable : on garde l'état actuel.
    }
  }, [matchId]);

  useEffect(() => {
    loadMatch();
    loadGames();
  }, [loadMatch, loadGames]);

  const currentGame = useMemo(() => games.find((g) => g.status === "in_progress") ?? null, [games]);
  const completedGames = useMemo(() => games.filter((g) => g.status === "completed"), [games]);

  const loadDiceEvents = useCallback(async (gameId: string) => {
    try {
      const { data } = await supabase
        .from("dice_events")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false });
      if (data) setDiceEvents(data as DiceEvent[]);
    } catch {
      // Backend injoignable : on garde l'état actuel.
    }
  }, []);

  useEffect(() => {
    if (currentGame) loadDiceEvents(currentGame.id);
    else setDiceEvents([]);
  }, [currentGame, loadDiceEvents]);

  // Synchro temps réel multi-appareils
  useEffect(() => {
    const channel = supabase
      .channel(`match-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => {
        loadGames();
        loadMatch();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dice_events" }, () => {
        if (currentGame) loadDiceEvents(currentGame.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, currentGame?.id]);

  const playerA = players.find((p) => p.id === match?.player_a_id);
  const playerB = players.find((p) => p.id === match?.player_b_id);

  const pointsFor = (playerId: string | undefined) =>
    completedGames
      .filter((g) => g.winner_id === playerId)
      .reduce((sum, g) => sum + g.points_awarded, 0);

  const scoreA = pointsFor(playerA?.id);
  const scoreB = pointsFor(playerB?.id);

  const confirmDouble = async (diceValue: number, outcome: DiceOutcome) => {
    if (!currentGame || !doubleFor) return;
    await supabase.from("dice_events").insert({
      game_id: currentGame.id,
      player_id: doubleFor.id,
      dice_value: diceValue,
      outcome,
    });
    setDoubleFor(null);
    loadDiceEvents(currentGame.id);
  };

  const bumpCube = async () => {
    if (!currentGame || currentGame.cube_value >= CUBE_MAX) return;
    await supabase
      .from("games")
      .update({ cube_value: currentGame.cube_value * 2 })
      .eq("id", currentGame.id);
    loadGames();
  };

  const confirmEndGame = async (winnerId: string, resultType: GameResultType, points: number) => {
    if (!currentGame || !match || !playerA || !playerB) return;

    await supabase
      .from("games")
      .update({
        winner_id: winnerId,
        result_type: resultType,
        points_awarded: points,
        status: "completed",
        ended_at: new Date().toISOString(),
      })
      .eq("id", currentGame.id);

    const newScoreA = scoreA + (winnerId === playerA.id ? points : 0);
    const newScoreB = scoreB + (winnerId === playerB.id ? points : 0);
    const matchWinnerId =
      newScoreA >= match.target_points ? playerA.id : newScoreB >= match.target_points ? playerB.id : null;

    if (matchWinnerId) {
      await supabase
        .from("matches")
        .update({ status: "completed", winner_id: matchWinnerId, completed_at: new Date().toISOString() })
        .eq("id", match.id);
    } else {
      await supabase.from("games").insert({
        match_id: match.id,
        player1_id: match.player_a_id,
        player2_id: match.player_b_id,
      });
    }

    setShowEndGame(false);
    loadGames();
    loadMatch();
  };

  if (!match || !playerA || !playerB) {
    return (
      <main className="flex flex-1 items-center justify-center px-5">
        <p className="text-sm text-muted">Chargement de la partie…</p>
      </main>
    );
  }

  if (match.status === "completed") {
    const winner = match.winner_id === playerA.id ? playerA : playerB;
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <span className="text-5xl">🏆</span>
        <h1 className="mt-4 text-2xl font-bold">{winner.name} remporte le match !</h1>
        <p className="mt-1 text-muted">
          {scoreA} – {scoreB} en {completedGames.length} partie{completedGames.length > 1 ? "s" : ""}
        </p>
        <Link
          href="/"
          className="tap-target mt-8 rounded-2xl bg-accent-gold px-6 py-3 font-bold text-background"
        >
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-5 pt-8">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{match.stage_label}</span>
        <span>Match en {match.target_points} pts</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {[
          { p: playerA, score: scoreA },
          { p: playerB, score: scoreB },
        ].map(({ p, score }) => (
          <div key={p.id} className="rounded-2xl border border-border bg-surface p-4 text-center">
            <PlayerAvatar name={p.name} color={p.color} size={40} />
            <p className="mt-2 font-semibold">{p.name}</p>
            <p className="font-mono text-3xl font-bold" style={{ color: p.color }}>
              {score}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={bumpCube}
        className="tap-target mt-4 flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 font-mono text-lg font-bold text-accent-gold active:border-accent-gold"
      >
        Cube : ×{currentGame?.cube_value ?? 1}
        {currentGame && currentGame.cube_value < CUBE_MAX && (
          <span className="text-xs font-normal text-muted">(toucher pour doubler)</span>
        )}
      </button>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {[playerA, playerB].map((p) => (
          <button
            key={p.id}
            onClick={() => setDoubleFor(p)}
            className="tap-target flex flex-col items-center gap-1 rounded-2xl border-2 py-6 font-bold"
            style={{ borderColor: p.color, color: p.color }}
          >
            <span className="text-2xl">🎲</span>
            Double !<span className="text-xs font-normal text-muted">{p.name}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowEndGame(true)}
        className="tap-target mt-5 rounded-2xl bg-accent-gold py-4 text-center text-lg font-bold text-background"
      >
        Terminer la partie
      </button>

      <div className="mt-6 flex-1">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Doubles de cette partie
        </p>
        {diceEvents.length === 0 ? (
          <p className="text-sm text-muted">Aucun double pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {diceEvents.map((e) => {
              const p = e.player_id === playerA.id ? playerA : playerB;
              const outcomeLabel =
                e.outcome === "full" ? "jouée à fond ✅" : e.outcome === "partial" ? "partielle ⚠️" : "gâchée 🚫";
              return (
                <li key={e.id} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-sm">
                  <span>
                    <strong style={{ color: p.color }}>{p.name}</strong> — double {e.dice_value}-{e.dice_value}
                  </span>
                  <span className="text-muted">{outcomeLabel}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {doubleFor && (
        <DoubleModal
          playerName={doubleFor.name}
          onConfirm={confirmDouble}
          onClose={() => setDoubleFor(null)}
        />
      )}
      {showEndGame && currentGame && (
        <EndGameModal
          playerA={playerA}
          playerB={playerB}
          cubeValue={currentGame.cube_value}
          onConfirm={confirmEndGame}
          onClose={() => setShowEndGame(false)}
        />
      )}
    </main>
  );
}
