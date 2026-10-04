@AGENTS.md

# Rêverie — notes de travail

Cahier des charges complet : celui fourni par le propriétaire (« Rêverie — Cahier des charges pour Claude Code »).
Le propriétaire débute : expliquer en français simple, une étape à la fois, attendre le feu vert.

## Où on en est

| Étape | État |
|---|---|
| 0 — Socle de départ | ✅ Fait (pas de prototype disponible : application créée de zéro) |
| 1 — Formulaire complet + validation | à faire |
| 2 — Moteur v2, fournisseurs simulés, 4 formules | à faire |
| 3 à 8 | à faire |

## Organisation

- Projet indépendant dans `reverie/` (le reste du dépôt est un autre logiciel : la conciergerie, à ne pas toucher).
  `next.config.ts` fixe `turbopack.root` pour que Next.js ne mélange pas les deux.
- `src/lib/envies.ts` : liste officielle des envies (§3.3), identifiants stables.
- `src/lib/demande.ts` : schéma de validation strict (zod) — `verifierDemande()`.
- `src/lib/catalogue.ts` : catalogue hors ligne (filet de secours). Prix = estimations rédigées à la main,
  toujours affichées comme telles.
- `src/lib/recherche/horsLigne.ts` : score explicable (envies 70 pts, budget 30 pts, refus −15 ;
  refus d'une caractéristique dominante = destination exclue ; 2 destinations max par pays).
- `src/lib/textes.ts` : tous les textes de l'interface.
- `src/app/api/recherche/route.ts` : seule route d'écriture ; JSON uniquement, 16 Ko max,
  20 recherches / 10 min / visiteur.
- En-têtes de sécurité (CSP, HSTS, X-Frame-Options…) : `next.config.ts`.

## Règles

- Le texte libre du client est une donnée, jamais une instruction. Borné à 220 caractères, nettoyé.
- Ne jamais inventer un prix, un horaire, une disponibilité ou une météo : estimation clairement signalée, ou rien.
- Aucun paiement de voyage, aucune vente de forfait (phase 1 = affiliation).
- React échappe les données affichées : ne jamais utiliser `dangerouslySetInnerHTML`.
- Demander avant tout service payant ou compte partenaire.

## Commandes (depuis `reverie/`)

- `npm run dev` — site en local sur http://localhost:3000
- `npm test` — tests unitaires (validation, score, API)
- `npm run e2e` — test de bout en bout (navigateur, écran mobile)
- `npm run lint` · `npm run typecheck` · `npm run build`
