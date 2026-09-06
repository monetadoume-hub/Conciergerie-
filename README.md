# Conciergerie

Logiciel de gestion de conciergerie (SaaS multi-tenant) — voir [`CAHIER_DES_CHARGES.md`](./CAHIER_DES_CHARGES.md) pour la vision produit complète.

Cette base de code couvre la **Phase 1** du plan de développement (§11) : authentification, gestion des biens, synchronisation automatique des calendriers iCal, planning des ménages, guide digital du logement, emails automatiques, et l'**assistant IA du locataire** (§21) avec génération de documents PDF.

## Stack

Next.js (App Router) + Supabase (Postgres, Auth, Storage) + Resend, comme recommandé en §3.

## Mise en route

1. **Créer un projet Supabase** (région Europe, cf. §8 RGPD) puis exécuter les migrations dans l'éditeur SQL, dans l'ordre :
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_guest_guide.sql`
   - `supabase/migrations/0003_storage.sql`
   - `supabase/migrations/0004_ai_assistant.sql`
   - `supabase/migrations/0005_expenses.sql`
   - `supabase/migrations/0006_channel_routing.sql`
   - `supabase/migrations/0007_owner_portal.sql`
   - `supabase/migrations/0008_owner_message_notifications.sql`
   - `supabase/migrations/0009_damage_claims.sql`

   Ou via la CLI Supabase : `supabase db push`.

2. **Créer un compte Resend** et récupérer une clé API pour l'envoi d'emails transactionnels.

3. **Créer une clé API Anthropic** (console.anthropic.com) pour l'assistant IA du locataire.

4. **Copier `.env.example` vers `.env.local`** et renseigner :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API)
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
   - `ANTHROPIC_API_KEY`
   - `CRON_SECRET` (une valeur aléatoire, à renseigner aussi dans les paramètres du projet Vercel)

4. **Installer et lancer** :
   ```bash
   npm install
   npm run dev
   ```

5. Ouvrir `http://localhost:3000/signup` pour créer votre agence.

## Synchronisation iCal & emails automatiques

Deux routes API, protégées par `CRON_SECRET`, doivent être appelées périodiquement (voir `vercel.json`, qui configure les Cron Jobs Vercel automatiquement au déploiement) :

- `GET /api/cron/ical-sync` — interroge les flux iCal Airbnb/Abritel/Booking de chaque bien, dédoublonne par `ical_uid`, crée les tâches de ménage et déclenche les séquences de messages pour toute nouvelle réservation (§5.2).
- `GET /api/cron/send-messages` — envoie les emails programmés arrivés à échéance (§5.6).

En développement local, on peut les déclencher manuellement :
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ical-sync
```

## Assistant IA du locataire (§21)

Le guide digital (`/guide/[token]`) inclut un champ « Besoin d'aide » où le locataire pose sa question. Le traitement (`/api/guest/ask`) :

1. Enregistre la question via la RPC `ask_guest_question` (aucun compte locataire).
2. Appelle Claude (`src/lib/ai/assistant.ts`) qui répond strictement à partir du guide du bien, ou décide d'escalader.
3. Écrit le résultat (`src/lib/ai/handle.ts`) : réponse envoyée directement, ou message d'attente + notification pour l'agence.

Deux niveaux de notification (table `notifications`, cloche en haut du tableau de bord, `NotificationBell.tsx`) :
- **normal** — rapport d'activité silencieux ou question à traiter sans urgence.
- **urgent** — alarme sonore dédiée (Web Audio, ne sonne que si l'onglet est ouvert) **et** email de secours immédiat aux admins de l'agence — voir la limite notée en §21.3 (pas encore de push mobile/SMS).

La page `/messages` liste tous les échanges et permet de reprendre la main sur une escalade.

## Documents PDF (§21.6)

`/documents` génère et envoie par email (Resend, pièce jointe PDF) le **rapport mensuel propriétaire** (calculé à partir des réservations et dépenses du mois, `src/lib/pdf/generate.ts`). `/documents/courrier` permet de rédiger un **courrier de réclamation/mise en demeure**, à télécharger en PDF ou envoyer par email — pour un envoi en recommandé électronique, déposez le PDF téléchargé sur le service de votre choix (AR24, Maileva...) ; ce n'est pas intégré nativement (roadmap phase 3, cf. §11).

## Canal de remise des messages locataire (§21.8)

`src/lib/messaging/channels.ts` route chaque envoi selon la plateforme d'origine de la réservation, mais retombe systématiquement sur l'email tant que l'agence n'a pas d'accès API partenaire Airbnb/Abritel/Booking (programme d'agrément officiel, pas une simple clé API — cf. §5.2/§11/§21.8). Le canal réellement utilisé est journalisé dans `scheduled_messages.channel_used`, jamais supposé égal à la plateforme d'origine.

## Dossier de réclamation (§22)

`/incidents` liste les incidents ; `/incidents/[id]` compile le dossier de réclamation : nature et date du dommage, photos (dont celles du compte-rendu de ménage lié automatiquement récupérées), devis/factures d'artisan avec calcul du coût total, statut de recouvrement. Le bouton « Télécharger le dossier » (`/api/documents/damage-claim`) génère le PDF complet, prêt à déposer manuellement sur le Centre de résolution Airbnb (ou équivalent Abritel/Booking) ou à transmettre à une assurance — **aucune plateforme n'expose d'API pour déposer une réclamation à sa place**, le logiciel s'arrête à la production du dossier (cf. §22.1).

## Espace propriétaire (§16)

Un propriétaire n'a pas de compte par défaut : depuis sa fiche (`/proprietaires/[id]`), l'agence l'invite (email Supabase Auth), ce qui crée son profil avec le rôle `owner`, isolé par RLS à ses propres biens/réservations/dépenses/incidents. Son espace (`/proprietaire`) est mobile-first et volontairement restreint : accueil (net du mois en direct), calendrier en lecture seule, rapports (mensuel en cours + historique téléchargeable), et un fil de messages avec l'agence — chaque message de l'agence part par deux canaux indépendants, l'espace réservé et un email.

## Structure du projet

```
/src/app/(dashboard)   → écrans agence : aujourd'hui, biens, propriétaires, réservations, ménages, incidents (+ dossier de réclamation), messages, documents
/src/app/proprietaire  → espace propriétaire, réservé au rôle `owner` (§16)
/src/app/guide/[token] → guide digital du logement + assistant IA, accessible sans compte (§14, §21)
/src/app/api/cron      → routes appelées par les jobs planifiés
/src/app/api/guest     → endpoint public consommé par le widget du guide digital
/src/app/api/documents → génération des PDF (rapport propriétaire, courrier)
/src/lib/ical          → parsing (node-ical) et synchronisation des calendriers
/src/lib/messaging     → modèles de messages, routage par canal, planification et envoi (Resend)
/src/lib/ai            → assistant IA (Anthropic) et traitement des messages locataires
/src/lib/pdf           → documents React-PDF (rapport propriétaire, courrier)
/src/lib/supabase      → clients Supabase (navigateur, serveur, admin/service role)
/supabase/migrations   → schéma SQL et policies RLS (isolation multi-tenant)
```

## Limites connues

- **iCal** (phase 1-2, §5.2) : le flux n'expose ni le prix ni les coordonnées du voyageur — `guest_email`/`guest_phone`/`price` restent à saisir manuellement sur la réservation tant qu'un connecteur tiers (Beds24, Rentals United) ou l'accès API officiel Airbnb/Vrbo n'est pas en place. Sans email connu, les messages programmés pour cette réservation passent en statut `failed` avec le motif explicite plutôt que d'échouer silencieusement.
- **Messagerie plateforme** (§21.8) : les séquences automatiques passent par email tant que l'agence n'a pas d'accès API partenaire Airbnb/Abritel/Booking — voir ci-dessus.
- **Alarme urgente** (§21.3) : le son ne se déclenche que si le tableau de bord est ouvert dans un onglet ; l'email de secours est le vrai filet de sécurité tant qu'il n'y a pas de push mobile/SMS (roadmap phase 3).
