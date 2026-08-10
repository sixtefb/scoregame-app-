"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayers } from "@/components/PlayerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";

const PALETTE = [
  "#f5b942",
  "#e2574c",
  "#35c48d",
  "#4f8ff5",
  "#a55eea",
  "#26c6da",
  "#ff6f91",
  "#ff9f43",
];

export default function ProfilPage() {
  const { players, currentPlayer, loading, selectPlayer, createPlayer } = usePlayers();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (id: string) => {
    selectPlayer(id);
    router.push("/");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const player = await createPlayer(name.trim(), color);
      choose(player.id);
    } catch {
      setError("Impossible de créer le profil. Vérifie la connexion et réessaie.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-14">
      <h1 className="text-2xl font-bold">Qui es-tu ?</h1>
      <p className="mt-1 text-sm text-muted">
        {currentPlayer ? `Connecté en tant que ${currentPlayer.name}.` : "Choisis ton profil pour commencer."}
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-muted">Chargement…</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {players.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => choose(p.id)}
                className="tap-target flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-colors active:bg-surface-elevated"
              >
                <PlayerAvatar name={p.name} color={p.color} />
                <span className="font-medium">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="tap-target mt-6 rounded-2xl border border-dashed border-border px-4 py-3 text-center font-medium text-muted transition-colors active:border-accent-gold active:text-accent-gold"
        >
          + Nouveau joueur
        </button>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
              Prénom
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fred"
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent-gold"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
              Couleur
            </label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-9 w-9 rounded-full tap-target"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? "3px solid var(--foreground)" : "none",
                    outlineOffset: 2,
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-accent-red">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="tap-target flex-1 rounded-xl border border-border py-3 font-medium text-muted"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="tap-target flex-1 rounded-xl bg-accent-gold py-3 font-semibold text-background disabled:opacity-50"
            >
              {saving ? "…" : "Créer"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
