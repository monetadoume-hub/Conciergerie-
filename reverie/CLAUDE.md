# Rêverie — résumé du projet

Application web en français qui trouve la destination de voyage idéale à partir
des envies de chaque voyageur (plage, châteaux, montagne…), du budget, du nombre
de personnes, du type de voyage (séjour ou road trip), des transports et des
hébergements acceptés.

Projet indépendant du logiciel de conciergerie (Next.js) situé à la racine du
dépôt : rien n'est partagé entre les deux.

Le propriétaire du projet débute en programmation : expliquer les changements
simplement, en français.

## Comment ça marche

- `server.js` : petit serveur Node.js (module `node:http`, sans framework).
  Il sert les fichiers de `public/` et expose `POST /api/destinations`.
- `recherche.js` : vérifie la demande envoyée par la page, écrit la consigne
  pour Claude (modèle `claude-opus-5-5`, sortie JSON imposée par un schéma) et
  renvoie 4 destinations.
- `public/index.html`, `public/style.css` : la page (design du prototype).
- `public/js/app.js` : logique de la page (choix des envies, paysage animé,
  affichage des cartes). Contient aussi un **catalogue hors ligne** de
  16 destinations utilisé quand la recherche sur mesure n'est pas disponible.
- `public/js/donnees.js` : listes partagées par la page et le serveur
  (envies, transports, hébergements, mois, limites).
- `prototype/reverie.html` : le prototype d'origine, gardé pour référence.

## Règles importantes

- **Jamais de clé secrète dans `public/`** : tout ce qui y est est visible par
  les visiteurs. La clé `ANTHROPIC_API_KEY` vit uniquement dans `.env`
  (ignoré par git) et n'est lue que par le serveur.
- La page n'envoie que des choix structurés ; c'est le serveur qui construit la
  consigne. Ne pas ajouter de route qui transmet un texte libre à Claude
  sans contrôle.
- Toute donnée affichée dans la page passe par `esc()` (protection contre
  l'injection de HTML).
- Sans clé, le site doit continuer de fonctionner avec le catalogue.

## Commandes

```bash
npm install     # une seule fois : installe les dépendances
npm start       # lance le site sur http://localhost:3000
npm run dev     # pareil, mais redémarre tout seul après chaque modification
```

Node.js 22.9 ou plus récent est nécessaire (`--env-file-if-exists`).
