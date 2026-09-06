# Cahier des charges — Logiciel de gestion de conciergerie (SaaS multi-clients)

## 1. Vision produit

Un logiciel SaaS destiné aux conciergeries de locations courte durée, permettant de :
- Centraliser les réservations issues d'Airbnb, Abritel/Vrbo et Booking
- Automatiser les communications avec les locataires
- Piloter le planning des ménages et du linge
- Générer des rapports financiers mensuels pour les propriétaires
- Proposer une marketplace de prestations additionnelles aux locataires (chef à domicile, courses avant arrivée, etc.)

Modèle de déploiement : **multi-tenant**. Chaque conciergerie cliente (appelée "agence" ci-dessous) a son propre espace, ses biens, ses propriétaires, son équipe et ses clients — totalement cloisonné des autres agences.

Trajectoire : usage perso (phase 1) → bêta avec 2-3 conciergeries partenaires (phase 2) → produit commercial vendu à des conciergeries (phase 3).

---

## 2. Analyse concurrentielle & différenciation

| Concurrent | Points forts | Limites / ouverture pour toi |
|---|---|---|
| Hostaway | API officielle Airbnb/Vrbo/Booking, très complet | Cher, pensé grosses structures, peu flexible sur le sur-mesure |
| Smoobu | Simple, prix accessible | Fonctions limitées (pas de marketplace de prestations, rapports propriétaires basiques) |
| Guesty | Très robuste, gros écosystème d'intégrations | Complexe à prendre en main, coûteux, orienté grands comptes |
| Lodgify | Bon pour site de réservation directe | Faible sur la gestion opérationnelle (ménage/linge) |
| Beds24 | Puissant, API ouverte | Interface datée, expérience utilisateur peu soignée |

**Axes de différenciation à viser pour "le meilleur logiciel du marché" :**
1. **Marketplace de prestations intégrée nativement** (chef à domicile, courses, etc.) — quasi aucun concurrent ne le propose en natif, c'est un vrai levier de revenu additionnel pour les conciergeries clientes.
2. **Expérience locataire soignée** : guide digital du logement, communication WhatsApp en plus de l'email, page de bienvenue personnalisée.
3. **Gestion opérationnelle terrain premium** : ménage, linge, incidents/maintenance, remontée photo par l'agent de ménage — souvent le point faible des outils existants.
4. **Rapports propriétaires exemplaires** : clairs, automatiques, avec possibilité de marque blanche (logo de l'agence).
5. **Tarification plus simple et plus juste** que les gros acteurs, pensée pour les petites/moyennes conciergeries (2 à 30 biens) mal servies par Hostaway/Guesty.

---

## 3. Stack technique recommandée

| Brique | Choix recommandé | Pourquoi |
|---|---|---|
| Frontend + backend | Next.js (React, App Router) | Un seul framework full-stack, bien maîtrisé par Claude Code |
| Base de données | PostgreSQL (via Supabase) | Row Level Security native = isolation multi-tenant fiable |
| Authentification | Supabase Auth | Gère rôles, invitations, sessions, sans tout recoder |
| Stockage fichiers | Supabase Storage | Photos des biens, PDF des rapports, photos d'incidents |
| Emails transactionnels | Resend ou Postmark | Fiable, simple à automatiser (confirmations, rapports, séquences) |
| Messagerie WhatsApp | API WhatsApp Business (via Twilio ou 360dialog) | Canal préféré des locataires en France, taux d'ouverture bien supérieur à l'email |
| Tâches planifiées (cron) | Trigger.dev ou Vercel Cron / Supabase Edge Functions (pg_cron) | Nécessaire pour le polling iCal automatique et l'envoi des emails/WhatsApp programmés |
| Paiements | Stripe | Abonnement des agences clientes + paiement des prestations additionnelles par les locataires |
| Parsing iCal | librairie `node-ical` | Standard, gère les flux Airbnb/Abritel/Booking |
| Génération PDF | `react-pdf` ou service type PDFMonkey | Rapports mensuels propriétaires en marque blanche |

---

## 4. Modèle de données complet

```
Agency (agence conciergerie)
├── id, name, plan, commission_rate_default, branding (logo/couleurs), whatsapp_number

User
├── id, agency_id, email, role [admin | staff | cleaner]

Owner (propriétaire)
├── id, agency_id, name, email, phone, commission_rate

Property (bien)
├── id, agency_id, owner_id, name, address, photos[]
├── ical_urls: { airbnb, abritel, booking }
├── access_code (serrure connectée), guidebook_content (guide digital du logement)

Booking (réservation)
├── id, property_id, source [airbnb|abritel|booking|direct]
├── ical_uid (clé de dédoublonnage), guest_name, guest_email, guest_phone
├── checkin, checkout, price, deposit_amount, status

CleaningTask (ménage)
├── id, property_id, booking_id, scheduled_date
├── assigned_to (user cleaner), status, linen_checklist, photos_after[]

LinenInventory (linge)
├── id, property_id, item_type, quantity, par_level

Incident (maintenance/réclamation)
├── id, property_id, booking_id, reported_by, description, photos[], status, priority

Expense (dépense)
├── id, property_id, category, amount, date, receipt_url

Invoice (facture)
├── id, agency_id, owner_id OR guest_id, amount, status, pdf_url

MessageTemplate (modèle de message)
├── id, agency_id, trigger [booking_confirmed|before_checkin|after_checkout|custom]
├── channel [email|whatsapp|sms], subject, body

ScheduledMessage
├── id, booking_id, template_id, send_at, status [pending|sent|failed]

Service (prestation additionnelle)
├── id, agency_id, name, description, price

ServiceBooking (réservation de prestation)
├── id, booking_id, service_id, requested_date, status

OwnerReport (rapport mensuel)
├── id, owner_id, month, revenue, expenses, net_amount, pdf_url

Review (avis)
├── id, property_id, source, rating, comment, auto_response_sent
```

---

## 5. Modules fonctionnels

### 5.1 Biens
CRUD des logements, photos, adresse, propriétaire associé, liens iCal des 3 plateformes, code d'accès/serrure connectée, guide digital du logement (wifi, équipements, recommandations locales).

### 5.2 Réservations & synchronisation calendrier — **point critique**
- Un job planifié (cron) interroge automatiquement chaque URL iCal toutes les 30-60 min (pas d'import manuel).
- Déduplication via `ical_uid` : une réservation déjà connue n'est jamais recréée, seulement mise à jour si les dates changent.
- Dès qu'une nouvelle réservation est détectée → création automatique de la tâche de ménage associée et déclenchement de la séquence d'emails/WhatsApp.
- Limite à connaître dès le départ : le flux iCal ne contient ni le prix ni les coordonnées du voyageur (contrairement à une vraie API). Pour la phase 1-2, on saisit ces infos manuellement à l'arrivée de la réservation ou on utilise un connecteur tiers (Beds24, Rentals United) qui expose ces données via API si le budget le permet.
- Roadmap phase 3 : candidater aux programmes partenaires officiels Airbnb et Vrbo/Abritel pour un accès API complet (délai de plusieurs mois, volumes minimums).

### 5.3 Ménages & linge
Planning visuel (type calendrier), assignation aux agents de ménage, checklist de linge par bien avec seuils de réapprovisionnement, statut de la tâche (à faire / en cours / terminé), photos après ménage pour validation qualité à distance.

### 5.4 Incidents & maintenance
Signalement d'un problème (par le locataire, l'agent de ménage ou le propriétaire) avec photo, priorité, suivi jusqu'à résolution — évite les pertes d'information par SMS/appel non tracés.

### 5.5 Rapport financier & rapport mensuel propriétaires
Calcul automatique : revenus bruts, commission agence, frais de ménage, dépenses diverses (maintenance), net versé au propriétaire. Génération PDF en marque blanche (logo de l'agence) envoyée automatiquement chaque mois par email.

### 5.6 Communication locataire (email + WhatsApp)
Séquences déclenchées par événement : confirmation de réservation, instructions d'arrivée (J-3), message de bienvenue (jour J) avec guide digital et code d'accès, demande d'avis (J+1 après le départ). Modèles personnalisables par agence, sur les deux canaux.

### 5.7 Accès propriétaires
Espace dédié en lecture seule : calendrier de leur(s) bien(s), rapports mensuels, revenus, incidents signalés sur leur bien.

### 5.8 Marketplace de prestations additionnelles
Catalogue de services (chef à domicile, courses avant arrivée, ménage supplémentaire, location de matériel bébé...) proposé au locataire via un lien envoyé avant son séjour, avec réservation et paiement en ligne (Stripe). Commission pour l'agence sur chaque prestation vendue — nouvelle source de revenu.

Deux origines possibles pour une prestation, à distinguer clairement dans le modèle :
- **Prestations agence** — génériques, disponibles sur tous les biens (`property_id` vide).
- **Prestations propriétaire** — propres à un bien précis (panier découverte, service local personnalisé), créées par le propriétaire depuis son portail, mais soumises à validation de l'agence avant publication (contrôle qualité et faisabilité logistique).

Distinct des prestations payantes : les **attentions offertes** par le propriétaire (bouteille de vin, mot de bienvenue) ne passent jamais par la marketplace — le locataire ne voit aucun prix. Elles deviennent une ligne automatique dans la checklist de ménage précédant l'arrivée, et leur coût s'ajoute aux charges récurrentes du propriétaire, visible dans son rapport mensuel.

### 5.9 Gestion des avis
Centralisation des avis Airbnb/Abritel/Booking, suggestion de réponse automatique (générée puis validée par l'agence avant publication) pour ne jamais laisser un avis sans réponse.

### 5.10 Comptabilité, utilisateurs, paramètres
Modules de support : export comptable, gestion des utilisateurs et de leurs droits, paramétrage de la marque (logo, couleurs, domaine personnalisé pour les grandes agences).

---

## 6. Personas & parcours utilisateurs clés

**Gérant de conciergerie (Admin agence)** — Se connecte chaque matin pour voir les arrivées/départs du jour, valider les tâches de ménage, vérifier les rapports du mois. Besoin numéro un : tout voir en un coup d'œil sans naviguer dans 10 écrans.

**Agent de ménage (Cleaner)** — Utilise l'appli principalement sur mobile : liste de ses tâches du jour, checklist de linge, upload de photos en fin de ménage. Besoin numéro un : simplicité extrême, zéro friction sur mobile.

**Propriétaire (Owner)** — Se connecte une fois par mois pour consulter son rapport et vérifier le calendrier de son bien. Besoin numéro un : confiance et clarté financière, pas de fonctionnalité superflue.

**Locataire (Guest)** — Reçoit un lien avant son arrivée : instructions, guide du logement, marketplace de prestations. Ne crée jamais de compte. Besoin numéro un : rapidité et clarté sur mobile, sans téléchargement d'appli.

---

## 7. Rôles & permissions (multi-tenant)

| Rôle | Accès |
|---|---|
| Admin agence | Tout sur son agence uniquement |
| Staff agence | Réservations, ménages, messages, incidents — pas de facturation |
| Agent de ménage | Uniquement ses tâches assignées (vue mobile simplifiée) |
| Propriétaire | Lecture seule sur ses biens |
| Locataire | Aucun compte — accès via lien unique (page de bienvenue + marketplace) |

---

## 8. Exigences non-fonctionnelles

- **RGPD** : les données des locataires (nom, email, téléphone) sont des données personnelles — hébergement en UE (Supabase région Europe), politique de conservation limitée dans le temps, export/suppression sur demande.
- **Sécurité** : isolation stricte entre agences (Row Level Security PostgreSQL testée explicitement), chiffrement des liens iCal et codes d'accès, authentification à deux facteurs pour les comptes admin.
- **Performance** : le polling iCal ne doit jamais bloquer l'interface — toujours en tâche de fond asynchrone.
- **Disponibilité** : viser 99,5% de disponibilité dès la phase bêta commerciale (hébergement géré, pas d'auto-hébergement fragile).
- **Accessibilité mobile** : l'espace agent de ménage et la page locataire doivent être pensés mobile-first en priorité.

---

## 9. Modèle économique (vente aux conciergeries)

Un prix fixe unique sans abonnement n'est pas viable : le logiciel génère des coûts continus (hébergement, envoi d'emails/WhatsApp, frais de transaction Stripe, support) qui ne s'arrêtent jamais — aucun acteur du marché (Smoobu, Lodgify, Hostaway) ne vend en prix fixe, tous fonctionnent en abonnement au bien géré. Repères de marché : Smoobu à partir de 15-29 €/mois pour 1 bien, Lodgify à partir de 16 $/mois + commission sur réservations directes, Hostaway sur devis à partir d'environ 100 $/bien/mois (positionnement haut de gamme).

Modèle recommandé, à mi-chemin entre l'envie initiale d'un prix simple et la nécessité d'un revenu récurrent :
1. **Frais de mise en place unique** (de l'ordre de 25-30 €) — accompagnement à l'import des calendriers et à la configuration initiale.
2. **Abonnement mensuel au bien géré, dégressif par palier** — moins cher à l'unité pour les grands portefeuilles, positionné sous Smoobu/Hostaway pour capter les petites/moyennes conciergeries.
3. **Commission sur la marketplace de prestations** en revenu complémentaire, qui permet de rester compétitif sur le prix de l'abonnement pur.

| Formule | Cible | Tarification indicative |
|---|---|---|
| Starter | 1 à 5 biens | Abonnement mensuel bas, prix par bien dégressif dès le 2e bien |
| Pro | 6 à 30 biens | Abonnement + marque blanche sur les rapports |
| Agence+ | 30+ biens | Tarif sur devis, domaine personnalisé, support prioritaire |

Revenu additionnel : commission sur les transactions de la marketplace de prestations (le logiciel prend un pourcentage à chaque prestation vendue, en plus de l'abonnement).

---

## 10. Plan de test / QA avant la bêta

1. Test de la synchro iCal sur au moins 3 biens réels pendant 2 semaines avant la bêta — vérifier zéro doublon et zéro réservation manquée.
2. Test des séquences d'emails/WhatsApp de bout en bout avec de vrais locataires (toi-même en phase 1).
3. Test de l'isolation multi-tenant avant d'inviter les 2-3 conciergeries partenaires (s'assurer qu'une agence ne peut jamais voir les données d'une autre).
4. Test mobile complet du parcours agent de ménage (le module le plus utilisé au quotidien).

---

## 11. Plan de développement par phases

**Phase 1 — MVP usage perso (1 agence, 1 utilisateur)**
Biens, réservations, sync iCal automatique, ménages/linge, emails programmés, rapport mensuel basique, guide digital du logement.

**Phase 2 — Bêta (toi + 2-3 conciergeries partenaires)**
Passage au vrai multi-tenant (isolation par agence), gestion des rôles, onboarding d'une nouvelle agence, espace propriétaire, incidents/maintenance, WhatsApp, gestion des avis.

**Phase 3 — Produit commercial**
Facturation par abonnement (Stripe), marketplace de prestations avec paiement, site public de réservation directe, marque blanche complète, candidature aux API officielles Airbnb/Vrbo.

---

## 12. Pour démarrer avec Claude Code

Un compte Stripe existe déjà — activer Stripe Connect dessus (ou créer une entité Stripe séparée dédiée à ce logiciel pour ne pas mélanger les flux financiers avec d'autres activités), puis récupérer les clés API (mode test pour le développement) à fournir à Claude Code en variables d'environnement.

Prompt de départ suggéré à donner à Claude Code :

> Construis une application Next.js + Supabase de gestion de conciergerie multi-tenant, en suivant le modèle de données et les modules décrits dans ce document. Commence par la Phase 1 : authentification, gestion des biens, synchronisation automatique des calendriers iCal (polling toutes les 30 min via un job planifié, déduplication par ical_uid), planning des ménages, guide digital du logement, et emails automatiques via Resend.

Structure de projet suggérée :
```
/app          → pages Next.js (dashboard, biens, réservations, ménages, incidents...)
/lib/ical     → logique de parsing et polling iCal
/lib/messaging → templates et déclenchement des séquences email/WhatsApp
/supabase     → schéma SQL, policies RLS, migrations
```

---

## 13. Design & expérience utilisateur

Direction : inspirée d'Apple non pas dans l'apparence (icônes, couleurs) mais dans trois principes appliqués concrètement :

- **Hiérarchie claire par rôle** : chaque profil (admin, agent de ménage, propriétaire) ouvre l'appli sur une seule question répondue immédiatement — "qu'est-ce qui compte aujourd'hui ?" — jamais un tableau de bord surchargé.
- **Le moins de friction possible sur l'action la plus fréquente** : pour l'agent de ménage, cocher une tâche et envoyer une photo doit se faire en 2 gestes maximum, sans naviguer dans un menu.
- **Animations discrètes**, jamais décoratives — elles servent à donner une sensation de fluidité et de qualité, pas à impressionner.

### Priorités produit issues du vécu terrain

**1. La communication locataire doit être anticipée, pas gérée en réactif.**
Le point de stress numéro un identifié n'est pas le manque de canal, c'est le volume de questions répétitives (arrivée, wifi, équipements) qui remontent en direct. Priorité MVP : un **guide digital du logement très soigné**, envoyé automatiquement avant l'arrivée, pensé pour répondre à 80% des questions avant qu'elles soient posées. Ce qui reste (retard, urgence) doit arriver dans **une seule file d'attente unifiée** côté agence — jamais dispersé entre email, SMS et WhatsApp.

**2. L'espace agent de ménage doit remplacer entièrement le téléphone/SMS.**
Le vécu terrain (agence sans aucun outil, tout au téléphone) confirme que ce module n'est pas secondaire — c'est un des cœurs du produit, à concevoir mobile-first en priorité absolue :
- Planning du jour en temps réel, mis à jour automatiquement dès qu'une réservation change
- Une tâche = un écran unique : checklist de linge, cases à cocher, photo de fin de ménage
- Un bouton "signaler un problème" toujours visible, jamais enfoui dans un menu
- Zéro appel ou SMS nécessaire pour transmettre une info de planning

---

## 14. Guide digital du logement — structure de contenu

Envoyé automatiquement au locataire après confirmation de réservation (lien unique, pas d'appli à télécharger). Sections, dans l'ordre :

1. **Accès** — code de la porte/serrure connectée, parking, étage, digicode
2. **Wifi** — réseau et mot de passe
3. **Équipements** — mode d'emploi des appareils qui posent le plus de questions (lave-linge, chauffage/clim, TV, machine à café)
4. **Autour de vous** — recommandations locales sélectionnées par l'agence ou le propriétaire (restaurants, transports, pharmacie)
5. **Besoin d'aide** — toujours en dernier, mise en évidence visuelle discrète (jamais en premier réflexe) : un seul point de contact vers la file d'attente unifiée de l'agence

Objectif mesurable : réduire le volume de questions directes reçues par l'hôte pendant le séjour (arrivée, wifi, équipements) en les anticipant dans le guide.

---

## 15. Espace agent de ménage — écrans précis

**Écran 1 — planning du jour**
Liste des ménages du jour uniquement, triée par urgence (heure d'arrivée du prochain locataire). Chaque ligne affiche : nom du bien, heure de départ du locataire précédent, heure d'arrivée du suivant. Les tâches terminées restent visibles mais grisées et barrées (sentiment d'accomplissement, traçabilité). Mise à jour en temps réel dès qu'une réservation change côté agence — jamais besoin d'un appel pour transmettre un changement de planning.

**Écran 2 — détail d'une tâche**
Une tâche = un écran unique, sans sous-menu :
- En-tête : nom du bien, heure limite (avant prochaine arrivée), compte à rebours
- Checklist à cocher (draps, salle de bain, cuisine, sols...) — personnalisable par bien
- Linge nécessaire affiché automatiquement selon le type de logement (nombre de draps, serviettes) — connecté à l'inventaire linge
- Bouton "photo de fin de ménage" — preuve qualité, consultable par l'agence à distance
- Bouton "signaler un problème" — toujours visible, jamais enfoui — ouvre le module Incident avec photo et description

Principe directeur : zéro appel téléphonique ou SMS ne doit être nécessaire à un agent de ménage pour connaître son planning, ses instructions, ou signaler un problème.

---

## 16. Parcours propriétaire — portail restreint

Le propriétaire n'a jamais accès à l'espace opérationnel de l'agence. Un compte séparé, en isolation stricte : il ne voit que le ou les biens dont il est propriétaire (déjà garanti par le modèle multi-tenant, appliqué ici au niveau du bien et non de l'agence).

### Écrans

**Écran d'accueil** — pour un seul bien : mini-tableau de bord direct (net du mois en cours calculé en temps réel, pas seulement en fin de mois ; taux d'occupation ; prochaine arrivée). Pour plusieurs biens : liste de cartes cliquables, une par bien. Accès rapide à trois entrées seulement : Calendrier, Rapports mensuels, Messages.

**Calendrier** — vue en direct des réservations et blocages de son ou ses biens, lecture seule, jamais de modification possible côté propriétaire.

**Rapports mensuels** — historique des rapports passés (PDF téléchargeables) et suivi du mois en cours mis à jour en direct, pas en attente de la fin du mois.

**Messages** — fil de discussion unique avec l'agence par bien, remonté en évidence (badge) dès qu'il y a du nouveau. Les incidents de dégradation apparaissent comme des cartes structurées dans ce fil (pas seulement du texte libre), avec photo, coût de réparation et statut de recouvrement.

### Workflow dégradation & recouvrement de frais

1. Un incident est signalé (par l'agent de ménage ou le locataire) → module Incident déjà existant.
2. L'agence évalue si une intervention extérieure est nécessaire (artisan, entreprise de réparation) et enregistre le coût.
3. L'agence désigne la source de recouvrement : caution du locataire, assurance habitation/PNO, ou à défaut agence/propriétaire.
4. Le statut de recouvrement est suivi explicitement (en attente → réclamé → récupéré, ou perdu si non recouvrable) et visible à la fois dans le fil de messages du propriétaire et dans son rapport mensuel — jamais deux chiffres différents entre les deux écrans.
5. Tant que le statut n'est pas "récupéré", le rapport mensuel du propriétaire distingue clairement les frais avancés en attente de remboursement du résultat net définitif, pour ne jamais lui laisser croire à une perte qui sera in fine compensée.

### Extension du modèle de données

```
Incident (complété)
├── ... (champs existants : property_id, booking_id, reported_by, description, photos[], status, priority)
├── repair_needed (bool), repair_company, repair_cost
├── recovery_source [caution_locataire | assurance | agence | proprietaire]
├── recovery_status [en_attente | reclame | recupere | perdu]

OwnerMessage (fil propriétaire ↔ agence)
├── id, agency_id, owner_id, property_id, sender [owner|agency]
├── body, incident_id (optionnel, pour lier un message à un incident), attachments[], created_at, read_status
```

### Écran portail propriétaire — mes attentions
Nouvel écran dans le portail propriétaire (section 16) : liste à deux groupes, "offertes par vous" (bascule simple, coût estimé) et "proposées à la vente" (statut de validation par l'agence visible). Bouton unique "ajouter une attention" pour créer l'un ou l'autre type.

### Extension du modèle de données

```
Service (complété)
├── ... (champs existants : agency_id, name, description, price)
├── property_id (vide = service agence générique ; renseigné = propre à ce bien)
├── created_by [agency | owner]
├── status [en_attente_validation | actif | refuse]

OwnerAmenity (attention offerte, non facturée)
├── id, property_id, name, description, cost_estimate, active
→ génère une ligne de checklist automatique sur la CleaningTask précédant chaque arrivée,
   et une Expense récurrente imputée au propriétaire dans son rapport mensuel.
```

---

## 17. Marketplace côté locataire — parcours et écrans

Accessible depuis le guide digital du logement (section 14), jamais comme une appli séparée. Deux écrans :

**Écran 1 — catalogue**
Liste des prestations disponibles pour ce bien précis : prestations agence génériques (chef à domicile, courses avant arrivée, ménage supplémentaire) et prestations propres au bien créées par le propriétaire, distinguées par un badge discret "une attention du propriétaire" en couleur accent — jamais présentées comme un rayon de supermarché.

**Écran 2 — détail et réservation**
Sélection d'une date si la prestation le nécessite (chef à domicile), récapitulatif du prix (prix de la prestation + frais de service si applicable), paiement en ligne (Stripe) en un seul geste.

### Routage de la prestation après achat

Chaque `ServiceBooking` déclenche une action différente selon le type de prestation :
- **Courses avant arrivée / panier découverte** → ajoutée automatiquement à la checklist de la `CleaningTask` précédant l'arrivée (l'agent de ménage dépose les achats en même temps que le ménage).
- **Chef à domicile** → notification à un prestataire externe partenaire, avec confirmation du créneau.
- **Ménage supplémentaire en cours de séjour** → crée une `CleaningTask` additionnelle, hors planning habituel.

### Extension du modèle de données

```
ServiceBooking (complété)
├── ... (champs existants : booking_id, service_id, requested_date, status)
├── fulfillment_type [interne_menage | prestataire_externe]
├── fulfillment_status [a_faire | confirme | termine]

Service (complété, suite section 5.8)
├── ... 
├── commission_rate (surcharge possible ; par défaut différent selon created_by : 
│   commission agence standard pour les prestations agence, taux réduit pour les
│   prestations propriétaire pour l'inciter à en proposer)
```

---

## 18. Prestataires partenaires externes

Les prestations comme le chef à domicile reposent sur de vraies personnes indépendantes (chefs, futurs autres métiers) — elles méritent leur propre entité plutôt qu'un simple champ texte dans une prestation.

### Fonctionnement
- Chaque prestataire est enregistré avec son statut (auto-entrepreneur/société), une preuve d'assurance responsabilité civile professionnelle, et pour un chef, une attestation d'hygiène/HACCP à jour.
- Un prestataire est rattaché à une ou plusieurs prestations (`Service`) de la marketplace, avec ses disponibilités propres.
- L'agence valide un prestataire avant sa mise en ligne (statut `en_attente` → `actif`), au même titre qu'une prestation créée par un propriétaire (section 5.8).
- Départ en phase 1-2 : un petit nombre de prestataires pilotes (démarrage recommandé avec 1-2 avant élargissement du réseau), gérés manuellement par l'agence. Un espace self-service pour que le prestataire gère lui-même ses disponibilités est une évolution possible en phase 3, pas un prérequis du MVP.

### Extension du modèle de données

```
Provider (prestataire externe)
├── id, agency_id, type [chef | autre], name, contact
├── status [en_attente | actif | inactif]
├── legal_status (auto-entrepreneur/société), insurance_verified (bool), hygiene_cert_verified (bool)
├── commission_rate

Service (complété, suite section 5.8 et 17)
├── ...
├── provider_id (optionnel — renseigné quand la prestation est assurée par un prestataire externe)
```

---

## 19. Sécurité et protection des données (RGPD)

### Catégories de données traitées
- Données locataires : nom, email, téléphone — données personnelles au sens RGPD, durée de conservation limitée.
- Données propriétaires : revenus, rapports, et à terme coordonnées bancaires si le logiciel automatise les versements.
- Données prestataires : attestations d'assurance, certificats d'hygiène.
- Photos : ménage, incidents.
- Données de paiement : jamais stockées directement — entièrement déléguées à Stripe (conformité PCI-DSS hors périmètre du logiciel).

### Mesures techniques
- Chiffrement en transit (HTTPS/TLS partout) et au repos (chiffrement natif de la base de données via Supabase).
- Isolation stricte multi-tenant via Row Level Security PostgreSQL — à tester explicitement avant toute mise en production, jamais supposée fonctionner par défaut.
- Secrets (clés API Stripe, tokens WhatsApp, liens iCal) exclusivement en variables d'environnement sécurisées, jamais en clair dans le code.
- Authentification à deux facteurs obligatoire pour les comptes admin agence.
- Contrôle d'accès par rôle, principe du moindre privilège (voir section 7).
- Vérification de signature sur tous les webhooks entrants (Stripe, WhatsApp) pour empêcher l'injection de fausses données.

### Mesures organisationnelles (RGPD)
- Registre des traitements, même simplifié, dès la phase bêta commerciale.
- Contrats de sous-traitance (DPA) avec chaque prestataire technique manipulant des données (Supabase, Stripe, Resend, API WhatsApp) — privilégier un hébergement en UE.
- Politique de conservation : suppression ou anonymisation des données locataires après une durée définie, au-delà des obligations légales de conservation comptable.
- Droits des personnes : export et suppression des données sur demande (droit d'accès, droit à l'effacement).
- Mentions légales et politique de confidentialité accessibles sur le site public et le guide digital du logement.
- Journal d'audit sur les actions sensibles (accès aux données financières, modification d'un rapport propriétaire).
- Plan de réponse à incident de sécurité, même basique, avant toute commercialisation.

### Point de vigilance — versements aux propriétaires
Si le logiciel automatise à terme le versement des fonds nets aux propriétaires, privilégier **Stripe Connect** (qui gère lui-même les comptes bénéficiaires et leurs coordonnées bancaires) plutôt que de stocker et manipuler des IBAN en interne.

---

## 20. Génération de contrats propriétaires — données sensibles renforcées

Le mandat de gestion entre l'agence et le propriétaire est généré directement depuis l'application, à partir des données du propriétaire et du bien (nom, adresse, taux de commission, coordonnées bancaires pour le versement des fonds).

### Mesures de protection spécifiques
- **Chiffrement au niveau du champ** pour l'IBAN — clé de chiffrement distincte du chiffrement général de la base de données.
- **Masquage systématique** dans toute l'interface (seuls les 4 derniers chiffres visibles) ; toute révélation complète est une action explicite, journalisée (qui, quand).
- **Accès restreint** : seul le rôle admin agence peut consulter/saisir un IBAN ou générer un contrat — jamais le staff opérationnel.
- **Signature électronique** via un prestataire certifié eIDAS (ex. Yousign) plutôt qu'un système interne — garantit la validité juridique et déporte une partie de la charge de sécurité.
- **Durée de conservation distincte** de celle des données locataires : les documents contractuels/comptables suivent les obligations légales de conservation (plus longues), à traiter séparément dans la politique de rétention.

### Extension du modèle de données

```
Owner (complété, section 4)
├── ...
├── iban (chiffré au niveau du champ, masqué par défaut dans l'interface)

Contract (mandat de gestion)
├── id, agency_id, owner_id, property_id
├── commission_rate, status [brouillon | envoye | signe]
├── pdf_url (stockage chiffré), signature_provider_ref, signed_at
```

---

## 21. Assistant IA — secrétaire virtuel du locataire

### 21.1 Principe

Un assistant conversationnel répond automatiquement aux questions des locataires posées depuis le guide digital du logement (canal "Besoin d'aide", §14), en s'appuyant exclusivement sur le contenu de ce guide (accès, wifi, équipements, recommandations) et l'historique de la conversation en cours. L'objectif est de décharger l'agence des questions répétitives déjà identifiées comme le point de stress numéro un (§13), tout en gardant systématiquement un filet de sécurité humain pour tout ce qui dépasse ses compétences.

L'assistant n'est jamais un canal supplémentaire à surveiller : il s'insère dans la file d'attente unifiée déjà prévue (§13, §14) plutôt que de la dupliquer.

### 21.2 Fonctionnement — trois issues possibles

Le locataire pose sa question via un champ texte sur la page du guide (pas de compte, pas d'appli, cf. §6). L'assistant analyse la question à la lumière du contexte du bien et de la conversation précédente, puis choisit l'une de ces trois issues :

1. **Réponse directe** — l'information est disponible et sans ambiguïté dans le guide → réponse envoyée immédiatement au locataire ; l'échange est consigné comme un simple **rapport d'activité** pour l'agence (notification silencieuse, sans alarme, consultable dans la file de messages).
2. **Escalade normale** — la question sort du périmètre de l'assistant (négociation, réclamation, désaccord, information réellement absente du guide) → un message d'attente est envoyé au locataire ("nous revenons vers vous rapidement"), une notification "à traiter" est créée pour l'agence, sans caractère d'urgence.
3. **Escalade urgente** — la question signale un problème majeur (sécurité, panne critique, sinistre, urgence médicale, comportement suspect, accès impossible au logement) → notification urgente immédiate (voir 21.3), sans qu'aucun engagement ne soit pris au nom de l'agence.

Dans les deux cas d'escalade, l'assistant ne laisse jamais le locataire sans réponse : il accuse toujours réception, mais ne tranche jamais à la place de l'agence.

### 21.3 Notifications & alarme dédiée

Deux niveaux de sévérité, à l'image d'un·e secrétaire qui filtre les appels :

- **Normal** — rapport d'activité silencieux, regroupé dans une cloche de notification du tableau de bord (§13, hiérarchie claire par rôle : ne jamais interrompre pour une information qui peut attendre).
- **Urgent** — un son d'alarme distinct est joué tant que l'agence a l'application ouverte (motif sonore propre à ce type d'alerte, différent de toute autre notification de l'outil), accompagné d'un email de secours envoyé immédiatement : le son seul ne suffit pas puisqu'il ne peut se déclencher que si l'onglet est effectivement ouvert.

**Limite connue et roadmap** : sans notification push mobile ou SMS, une urgence survenant pendant que l'agence n'a ni l'application ouverte ni ses emails sous les yeux peut être manquée plus longtemps qu'avec un vrai standard téléphonique. L'ajout d'un canal push mobile/SMS (Twilio, cf. §3) pour ne jamais dépendre d'un onglet ouvert est une évolution phase 3, pas un prérequis du MVP.

### 21.4 Garde-fous

- L'assistant ne prend **jamais** d'engagement financier (remboursement, geste commercial, exception au règlement) ni de décision sur un litige — ces cas sont systématiquement escaladés, jamais tranchés automatiquement.
- Chaque échange est journalisé (question posée, brouillon de réponse généré par l'IA, réponse effectivement envoyée, statut) : traçabilité complète et matière première pour améliorer les guides digitaux (une question récurrente non couverte signale un guide à enrichir, cf. §14 objectif mesurable).
- Une réponse escaladée peut toujours être éditée par l'agence avant envoi : le brouillon de l'IA est une proposition, jamais un envoi automatique dans les cas d'escalade.

### 21.5 Modèle de données

```
GuestMessage (fil de messages locataire ↔ assistant/agence)
├── id, agency_id, property_id, booking_id
├── channel [widget | email | whatsapp] (email/whatsapp : phase 2-3, cf. §3)
├── guest_question text
├── ai_draft_response text, ai_confidence numeric
├── final_response text (réponse effectivement envoyée, éditable par l'agence)
├── status [auto_repondu | en_attente_validation | escalade | escalade_urgente | resolu]
├── escalation_reason text
├── created_at, answered_at

Notification
├── id, agency_id, type [ai_rapport | ai_escalade | incident]
├── severity [normal | urgent]
├── title, body, related_guest_message_id, related_incident_id
├── read_at, created_at
```

### 21.6 Courriers PDF générés par l'assistant

- **Rapport mensuel propriétaire** (déjà prévu §5.5) : génération PDF en marque blanche à partir des réservations, dépenses et commission du mois, envoyable par email en un clic depuis l'application.
- **Courrier de réclamation / gestion de litige** : à partir d'un incident (§5.4, §16) ou d'une demande escaladée, l'assistant peut proposer un brouillon de courrier (dégradation, réclamation locataire, mise en demeure) que l'agence relit et corrige avant export en PDF avec l'en-tête de l'agence — jamais d'envoi automatique d'un courrier à portée juridique.
- Le PDF généré est le point de sortie unique de ces deux usages : il peut être envoyé par email directement depuis l'application, ou téléchargé pour être déposé sur un service de lettre recommandée électronique (AR24, Maileva...) lorsqu'une valeur juridique probante est nécessaire. L'intégration native à un opérateur de LRE est une évolution phase 3, pas un prérequis du MVP (cf. §11) : le logiciel s'arrête à la production du PDF, l'envoi recommandé reste une action manuelle de l'agence auprès du prestataire de son choix.

### 21.7 Sécurité & RGPD

- Les échanges avec l'assistant contiennent des données locataires (§19) : mêmes règles de conservation et de suppression sur demande que le reste des données locataires.
- Le contexte envoyé au modèle ne contient que les données strictement nécessaires à la question posée (contenu du guide du bien concerné, question, historique du fil) — jamais les IBAN, contrats ou données d'autres locataires/biens.
- Tout contenu généré par l'IA (réponse ou courrier) reste attribuable et journalisé : qui (assistant ou agence) a écrit quoi, et quand, avant tout envoi.

