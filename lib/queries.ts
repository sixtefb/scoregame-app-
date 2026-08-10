import { supabase } from "./supabase";
import type { Competition, DiceEvent, Game, Match } from "./types";

/** Toutes ces requêtes renvoient [] plutôt que de lever une exception en cas
 * de souci réseau/backend — l'UI affiche alors simplement "pas de données"
 * au lieu de planter. */

export async function fetchAllGames(): Promise<Game[]> {
  try {
    const { data, error } = await supabase.from("games").select("*");
    if (error) return [];
    return (data ?? []) as Game[];
  } catch {
    return [];
  }
}

export async function fetchAllDiceEvents(): Promise<DiceEvent[]> {
  try {
    const { data, error } = await supabase.from("dice_events").select("*");
    if (error) return [];
    return (data ?? []) as DiceEvent[];
  } catch {
    return [];
  }
}

export async function fetchCompetitions(): Promise<Competition[]> {
  try {
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as Competition[];
  } catch {
    return [];
  }
}

export async function fetchMatchesForCompetition(competitionId: string): Promise<Match[]> {
  try {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("competition_id", competitionId)
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []) as Match[];
  } catch {
    return [];
  }
}
