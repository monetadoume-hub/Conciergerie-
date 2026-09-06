# Conciergerie

Logiciel de gestion de conciergerie (SaaS multi-tenant) — voir [`CAHIER_DES_CHARGES.md`](./CAHIER_DES_CHARGES.md) pour la vision produit complète.

Cette base de code couvre la **Phase 1** du plan de développement (§11) : authentification, gestion des biens, synchronisation automatique des calendriers iCal, planning des ménages, guide digital du logement et emails automatiques.

## Stack

Next.js (App Router) + Supabase (Postgres, Auth, Storage) + Resend, comme recommandé en §3.

## Mise en route

1. **Créer un projet Supabase** (région Europe, cf. §8 RGPD) puis exécuter les migrations dans l'éditeur SQL, dans l'ordre :
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_guest_guide.sql`
   - `supabase/migrations/0003_storage.sql`

   Ou via la CLI Supabase : `supabase db push`.

2. **Créer un compte Resend** et récupérer une clé API pour l'envoi d'emails transactionnels.

3. **Copier `.env.example` vers `.env.local`** et renseigner :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API)
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
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

## Structure du projet

```
/src/app/(dashboard)   → écrans agence : aujourd'hui, biens, réservations, ménages, incidents
/src/app/guide/[token] → guide digital du logement, accessible sans compte (§14)
/src/app/api/cron      → routes appelées par les jobs planifiés
/src/lib/ical          → parsing (node-ical) et synchronisation des calendriers
/src/lib/messaging     → modèles de messages, planification et envoi (Resend)
/src/lib/supabase      → clients Supabase (navigateur, serveur, admin/service role)
/supabase/migrations   → schéma SQL et policies RLS (isolation multi-tenant)
```

## Limite connue (phase 1-2)

Les flux iCal n'exposent ni le prix ni les coordonnées du voyageur (§5.2) : `guest_email`/`guest_phone`/`price` restent à saisir manuellement sur la réservation tant qu'un connecteur tiers (Beds24, Rentals United) ou l'accès API officiel Airbnb/Vrbo n'est pas en place. Sans email connu, les messages programmés pour cette réservation passent en statut `failed` avec le motif explicite plutôt que d'échouer silencieusement.
