export type Player = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

export type CompetitionFormat = "round_robin" | "round_robin_playoffs" | "knockout";
export type CompetitionStatus = "setup" | "in_progress" | "completed";

export type Competition = {
  id: string;
  name: string;
  format: CompetitionFormat;
  default_target_points: number;
  playoff_size: number;
  status: CompetitionStatus;
  winner_id: string | null;
  created_at: string;
};

export type CompetitionParticipant = {
  competition_id: string;
  player_id: string;
};

export type MatchStatus = "in_progress" | "completed";

export type Match = {
  id: string;
  competition_id: string | null;
  player_a_id: string;
  player_b_id: string;
  target_points: number;
  stage_label: string;
  round: number | null;
  status: MatchStatus;
  winner_id: string | null;
  created_at: string;
  completed_at: string | null;
};

export type GameResultType = "single" | "gammon" | "backgammon";
export type GameStatus = "in_progress" | "completed";

export type Game = {
  id: string;
  match_id: string;
  player1_id: string;
  player2_id: string;
  winner_id: string | null;
  cube_value: number;
  result_type: GameResultType;
  points_awarded: number;
  status: GameStatus;
  started_at: string;
  ended_at: string | null;
};

export type DiceOutcome = "full" | "partial" | "wasted";

export type DiceEvent = {
  id: string;
  game_id: string;
  player_id: string;
  dice_value: number;
  outcome: DiceOutcome;
  created_at: string;
};
