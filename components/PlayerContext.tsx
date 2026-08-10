"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getLocalPlayerId, setLocalPlayerId } from "@/lib/localPlayer";
import type { Player } from "@/lib/types";

type PlayerContextValue = {
  players: Player[];
  currentPlayer: Player | null;
  loading: boolean;
  refreshPlayers: () => Promise<void>;
  selectPlayer: (playerId: string) => void;
  createPlayer: (name: string, color: string) => Promise<Player>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshPlayers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("name", { ascending: true });
      if (!error && data) setPlayers(data as Player[]);
    } catch {
      // Backend injoignable (config manquante ou réseau) : on garde la liste actuelle.
    }
  }, []);

  useEffect(() => {
    setCurrentPlayerId(getLocalPlayerId());
    refreshPlayers().finally(() => setLoading(false));
  }, [refreshPlayers]);

  const selectPlayer = useCallback((playerId: string) => {
    setLocalPlayerId(playerId);
    setCurrentPlayerId(playerId);
  }, []);

  const createPlayer = useCallback(
    async (name: string, color: string) => {
      const { data, error } = await supabase
        .from("players")
        .insert({ name, color })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("Création du joueur impossible");
      await refreshPlayers();
      return data as Player;
    },
    [refreshPlayers]
  );

  const currentPlayer = useMemo(
    () => players.find((p) => p.id === currentPlayerId) ?? null,
    [players, currentPlayerId]
  );

  const value = useMemo(
    () => ({ players, currentPlayer, loading, refreshPlayers, selectPlayer, createPlayer }),
    [players, currentPlayer, loading, refreshPlayers, selectPlayer, createPlayer]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayers() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayers doit être utilisé dans un PlayerProvider");
  return ctx;
}
