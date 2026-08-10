# Scoregame — Trictrac

Appli compagnon pour suivre les parties de Trictrac (Backgammon) entre amis/famille : doubles au dé (jouées, partielles, gâchées), cube de doublement, gammon/backgammon, compétitions (poule, poule + playoffs, élimination directe), et stats par joueur (rating façon Elo, indice de chance relatif au groupe, face-à-face, trophées).

## Configuration

1. Crée un projet [Supabase](https://supabase.com) (gratuit).
2. Dans l'éditeur SQL du projet, exécute [`supabase/schema.sql`](supabase/schema.sql) — crée les tables et active le temps réel.
3. Copie `.env.local.example` vers `.env.local` et renseigne :
   - `NEXT_PUBLIC_SUPABASE_URL` — URL du projet (`Project Settings → API`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clé publique `anon` (jamais la `service_role`)

## Développement

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Déploiement

Le repo inclut un [`render.yaml`](render.yaml) pour [Render](https://render.com) : Build Command `npm install && npm run build`, Start Command `npm start`. Ajoute les deux variables d'environnement ci-dessus dans les settings du service.

Une fois déployée, ouvre l'URL sur iPhone dans Safari → Partager → « Sur l'écran d'accueil » pour l'installer comme une app (PWA).

## Sécurité

Pas d'authentification : l'identité est un simple profil choisi localement (pas de mot de passe). Les policies RLS Supabase autorisent la clé `anon` en lecture/écriture complète — acceptable pour un usage privé entre proches, mais à garder en tête si l'URL venait à être partagée largement.
