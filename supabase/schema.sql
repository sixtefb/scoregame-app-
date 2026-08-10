-- Scoregame — schema Supabase (Trictrac / Backgammon)
-- A executer une fois dans l'editeur SQL de votre projet Supabase.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Joueurs
-- ---------------------------------------------------------------------------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#f5b942',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Competitions (sessions/tournois)
-- ---------------------------------------------------------------------------
create table if not exists competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  format text not null default 'round_robin'
    check (format in ('round_robin', 'round_robin_playoffs', 'knockout')),
  default_target_points int not null default 7,
  playoff_size int not null default 4,
  status text not null default 'setup'
    check (status in ('setup', 'in_progress', 'completed')),
  winner_id uuid references players(id),
  created_at timestamptz not null default now()
);

create table if not exists competition_participants (
  competition_id uuid not null references competitions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  primary key (competition_id, player_id)
);

-- ---------------------------------------------------------------------------
-- Matchs (une rencontre entre 2 joueurs, jusqu'a un score cible en points)
-- ---------------------------------------------------------------------------
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references competitions(id) on delete cascade,
  player_a_id uuid not null references players(id),
  player_b_id uuid not null references players(id),
  target_points int not null default 7,
  stage_label text not null default 'Amical',
  round int,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  winner_id uuid references players(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists matches_competition_id_idx on matches(competition_id);

-- ---------------------------------------------------------------------------
-- Parties (une partie individuelle au sein d'un match, avec cube et resultat)
-- ---------------------------------------------------------------------------
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player1_id uuid not null references players(id),
  player2_id uuid not null references players(id),
  winner_id uuid references players(id),
  cube_value int not null default 1,
  result_type text not null default 'single'
    check (result_type in ('single', 'gammon', 'backgammon')),
  points_awarded int not null default 1,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists games_match_id_idx on games(match_id);

-- ---------------------------------------------------------------------------
-- Evenements de des (doubles obtenus pendant une partie)
-- ---------------------------------------------------------------------------
create table if not exists dice_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id),
  dice_value int not null check (dice_value between 1 and 6),
  outcome text not null check (outcome in ('full', 'partial', 'wasted')),
  created_at timestamptz not null default now()
);

create index if not exists dice_events_game_id_idx on dice_events(game_id);
create index if not exists dice_events_player_id_idx on dice_events(player_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Pas d'authentification (appli privee entre proches, identite = choix de
-- profil local). On ouvre l'acces complet via la cle publique (anon).
-- ATTENTION : quiconque possede l'URL + la cle anon peut lire/ecrire toutes
-- les donnees. Compromis assume pour la simplicite v1.
-- ---------------------------------------------------------------------------
alter table players enable row level security;
alter table competitions enable row level security;
alter table competition_participants enable row level security;
alter table matches enable row level security;
alter table games enable row level security;
alter table dice_events enable row level security;

create policy "anon full access" on players for all using (true) with check (true);
create policy "anon full access" on competitions for all using (true) with check (true);
create policy "anon full access" on competition_participants for all using (true) with check (true);
create policy "anon full access" on matches for all using (true) with check (true);
create policy "anon full access" on games for all using (true) with check (true);
create policy "anon full access" on dice_events for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Realtime : necessaire pour la synchro multi-appareils sur une partie live
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table dice_events;
alter publication supabase_realtime add table matches;
