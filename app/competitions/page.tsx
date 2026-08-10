"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCompetitions } from "@/lib/queries";
import type { Competition } from "@/lib/types";

const STATUS_LABEL: Record<Competition["status"], string> = {
  setup: "En préparation",
  in_progress: "En cours",
  completed: "Terminée",
};

const FORMAT_LABEL: Record<Competition["format"], string> = {
  round_robin: "Poule simple",
  round_robin_playoffs: "Poule + playoffs",
  knockout: "Élimination directe",
};

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[] | null>(null);

  useEffect(() => {
    fetchCompetitions()
      .then(setCompetitions)
      .catch(() => setCompetitions([]));
  }, []);

  return (
    <main className="flex flex-1 flex-col px-5 pt-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compétitions</h1>
        <Link
          href="/competitions/nouvelle"
          className="tap-target rounded-xl bg-accent-gold px-3 py-2 text-sm font-bold text-background"
        >
          + Créer
        </Link>
      </div>

      {competitions === null ? (
        <p className="mt-8 text-sm text-muted">Chargement…</p>
      ) : competitions.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
          Aucune compétition pour l&apos;instant. Créez-en une pour organiser un tournoi jusqu&apos;à la
          finale.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {competitions.map((c) => (
            <li key={c.id}>
              <Link
                href={`/competitions/${c.id}`}
                className="tap-target flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <span>
                  <span className="block font-semibold">{c.name}</span>
                  <span className="block text-xs text-muted">{FORMAT_LABEL[c.format]}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    c.status === "completed"
                      ? "bg-accent-green/20 text-accent-green"
                      : "bg-accent-gold/20 text-accent-gold"
                  }`}
                >
                  {STATUS_LABEL[c.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
