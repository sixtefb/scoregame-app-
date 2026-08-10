import type { Match, Player } from "./types";

/** Toutes les paires uniques d'une liste de joueurs (round robin classique). */
export function generateRoundRobinPairs(playerIds: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      pairs.push([playerIds[i], playerIds[j]]);
    }
  }
  return pairs;
}

export type StandingRow = {
  playerId: string;
  matchWins: number;
  matchLosses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
};

/** Classement d'une compétition à partir des matchs joués (terminés). */
export function computeStandings(matches: Match[], playerIds: string[]): StandingRow[] {
  const rows = new Map<string, StandingRow>(
    playerIds.map((id) => [
      id,
      { playerId: id, matchWins: 0, matchLosses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0 },
    ])
  );

  for (const match of matches) {
    if (match.status !== "completed" || !match.winner_id) continue;
    const a = rows.get(match.player_a_id);
    const b = rows.get(match.player_b_id);
    if (!a || !b) continue;

    if (match.winner_id === match.player_a_id) {
      a.matchWins += 1;
      b.matchLosses += 1;
    } else {
      b.matchWins += 1;
      a.matchLosses += 1;
    }
  }

  return [...rows.values()].sort((r1, r2) => {
    if (r2.matchWins !== r1.matchWins) return r2.matchWins - r1.matchWins;
    return r2.pointDiff - r1.pointDiff;
  });
}

/** Joueurs qualifiés pour les playoffs (top N du classement round robin). */
export function qualifyForPlayoffs(standings: StandingRow[], playoffSize: number): string[] {
  return standings.slice(0, playoffSize).map((r) => r.playerId);
}

export type BracketPairing = {
  playerAId: string | null;
  playerBId: string | null; // null = bye (playerA qualifié direct)
};

/**
 * Bracket à élimination directe, tête de série 1 vs dernier, 2 vs avant-dernier...
 * Complète avec des "byes" (qualification directe) si le nombre de joueurs
 * n'est pas une puissance de 2.
 */
export function generateKnockoutBracket(seededPlayerIds: string[]): BracketPairing[] {
  const size = 2 ** Math.ceil(Math.log2(Math.max(seededPlayerIds.length, 1)));
  const padded: (string | null)[] = [...seededPlayerIds];
  while (padded.length < size) padded.push(null);

  const pairings: BracketPairing[] = [];
  for (let i = 0; i < size / 2; i++) {
    pairings.push({ playerAId: padded[i], playerBId: padded[size - 1 - i] });
  }
  return pairings;
}

/** Paires réelles d'un bracket (les deux joueurs sont connus). */
export function realPairings(pairings: BracketPairing[]): [string, string][] {
  return pairings
    .filter((p): p is { playerAId: string; playerBId: string } => !!p.playerAId && !!p.playerBId)
    .map((p) => [p.playerAId, p.playerBId]);
}

/** Joueurs qualifiés d'office (bye) faute d'adversaire dans ce tour. */
export function byePlayers(pairings: BracketPairing[]): string[] {
  return pairings.filter((p) => p.playerAId && !p.playerBId).map((p) => p.playerAId as string);
}

/**
 * Reconstitue la liste des joueurs encore en lice au début d'un tour donné,
 * à partir des résultats stockés. Approche purement data-driven (pas de
 * dépendance à un ordre de seed) : un joueur actif au tour r-1 qui n'apparaît
 * dans aucun match du tour r-1 était "bye" et reste actif au tour r.
 */
export function computeActivePlayersForRound(
  targetRound: number,
  originalPlayerIds: string[],
  matchesByRound: Map<number, Match[]>
): string[] {
  let active = originalPlayerIds;
  for (let r = 1; r < targetRound; r++) {
    const roundMatches = matchesByRound.get(r) ?? [];
    const playedThisRound = new Set(roundMatches.flatMap((m) => [m.player_a_id, m.player_b_id]));
    const winners = roundMatches
      .filter((m) => m.status === "completed" && m.winner_id)
      .map((m) => m.winner_id as string);
    const byes = active.filter((id) => !playedThisRound.has(id));
    active = [...winners, ...byes];
  }
  return active;
}

export function stageLabelForRound(remainingPlayers: number): string {
  if (remainingPlayers <= 2) return "Finale";
  if (remainingPlayers <= 4) return "Demi-finale";
  if (remainingPlayers <= 8) return "Quart de finale";
  return `Tour à ${remainingPlayers}`;
}

export function playerName(players: Player[], id: string | null): string {
  if (!id) return "—";
  return players.find((p) => p.id === id)?.name ?? "Inconnu";
}
