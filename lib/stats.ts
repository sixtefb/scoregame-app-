import type { DiceEvent, Game } from "./types";

const STARTING_ELO = 1500;
const BASE_K = 16;

/**
 * Rating façon Elo, indépendant de la chance au dé : rejoue toutes les
 * parties terminées dans l'ordre chronologique. Le K-factor est augmenté
 * pour les parties à forts enjeux (cube élevé, gammon/backgammon) puisque
 * gagner une partie à 8 points en dit plus qu'une partie à 1 point.
 */
export function computeEloRatings(games: Game[]): Map<string, number> {
  const ratings = new Map<string, number>();
  const rating = (id: string) => ratings.get(id) ?? STARTING_ELO;

  const completed = games
    .filter((g) => g.status === "completed" && g.winner_id)
    .slice()
    .sort((a, b) => (a.ended_at ?? a.started_at).localeCompare(b.ended_at ?? b.started_at));

  for (const game of completed) {
    const { player1_id, player2_id, winner_id, points_awarded } = game;
    if (!winner_id) continue;
    const loserId = winner_id === player1_id ? player2_id : player1_id;

    const rWinner = rating(winner_id);
    const rLoser = rating(loserId);

    const expectedWinner = 1 / (1 + 10 ** ((rLoser - rWinner) / 400));
    const k = BASE_K * (1 + Math.log2(Math.max(points_awarded, 1)));

    ratings.set(winner_id, rWinner + k * (1 - expectedWinner));
    ratings.set(loserId, rLoser + k * (0 - (1 - expectedWinner)));
  }

  return ratings;
}

export type DiceStats = {
  playerId: string;
  gamesPlayed: number;
  totalDoubles: number;
  doublesByValue: Record<number, number>;
  full: number;
  partial: number;
  wasted: number;
  wastedRate: number; // 0..1, part des doubles pas (ou mal) joués
  doublesPerGame: number;
};

/**
 * Stats de dés par joueur. On ne logue que les doubles obtenus (pas tous
 * les lancers), donc `doublesPerGame` est un indice RELATIF à comparer
 * entre joueurs du groupe, pas une probabilité théorique absolue.
 */
export function computeDiceStats(
  games: Game[],
  diceEvents: DiceEvent[]
): Map<string, DiceStats> {
  const stats = new Map<string, DiceStats>();

  const ensure = (playerId: string): DiceStats => {
    let s = stats.get(playerId);
    if (!s) {
      s = {
        playerId,
        gamesPlayed: 0,
        totalDoubles: 0,
        doublesByValue: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        full: 0,
        partial: 0,
        wasted: 0,
        wastedRate: 0,
        doublesPerGame: 0,
      };
      stats.set(playerId, s);
    }
    return s;
  };

  for (const game of games) {
    if (game.status !== "completed") continue;
    ensure(game.player1_id).gamesPlayed += 1;
    ensure(game.player2_id).gamesPlayed += 1;
  }

  for (const event of diceEvents) {
    const s = ensure(event.player_id);
    s.totalDoubles += 1;
    s.doublesByValue[event.dice_value] = (s.doublesByValue[event.dice_value] ?? 0) + 1;
    s[event.outcome] += 1;
  }

  for (const s of stats.values()) {
    s.wastedRate = s.totalDoubles > 0 ? (s.wasted + s.partial * 0.5) / s.totalDoubles : 0;
    s.doublesPerGame = s.gamesPlayed > 0 ? s.totalDoubles / s.gamesPlayed : 0;
  }

  return stats;
}

export type LuckEntry = {
  playerId: string;
  doublesPerGame: number;
  luckIndex: number; // % d'écart à la moyenne du groupe (0 = dans la moyenne)
};

/**
 * Indice de chance RELATIF au groupe : à combien de doubles par partie
 * un joueur est-il par rapport à la moyenne de ses adversaires habituels ?
 */
export function computeLuckIndex(diceStats: Map<string, DiceStats>): Map<string, LuckEntry> {
  const eligible = [...diceStats.values()].filter((s) => s.gamesPlayed > 0);
  const groupAvg =
    eligible.reduce((sum, s) => sum + s.doublesPerGame, 0) / (eligible.length || 1);

  const result = new Map<string, LuckEntry>();
  for (const s of eligible) {
    const luckIndex = groupAvg > 0 ? ((s.doublesPerGame - groupAvg) / groupAvg) * 100 : 0;
    result.set(s.playerId, {
      playerId: s.playerId,
      doublesPerGame: s.doublesPerGame,
      luckIndex,
    });
  }
  return result;
}

export type HeadToHead = {
  opponentId: string;
  wins: number;
  losses: number;
};

export function computeHeadToHead(games: Game[], playerId: string): Map<string, HeadToHead> {
  const result = new Map<string, HeadToHead>();
  for (const game of games) {
    if (game.status !== "completed" || !game.winner_id) continue;
    if (game.player1_id !== playerId && game.player2_id !== playerId) continue;
    const opponentId = game.player1_id === playerId ? game.player2_id : game.player1_id;
    let h2h = result.get(opponentId);
    if (!h2h) {
      h2h = { opponentId, wins: 0, losses: 0 };
      result.set(opponentId, h2h);
    }
    if (game.winner_id === playerId) h2h.wins += 1;
    else h2h.losses += 1;
  }
  return result;
}
