# Rêverie ✨

Dites vos envies, Rêverie trouve l'endroit.

## Lancer Rêverie sur votre ordinateur (pas à pas)

1. **Installer Node.js** (une seule fois) : téléchargez la version « LTS » sur
   <https://nodejs.org> et installez-la comme n'importe quel logiciel.
2. **Récupérer le projet** : sur la page GitHub du dépôt, bouton vert
   « Code » → « Download ZIP », puis décompressez le fichier.
3. **Ouvrir un terminal dans le dossier `reverie`** :
   - Windows : ouvrez le dossier `reverie`, cliquez dans la barre d'adresse,
     tapez `cmd` puis Entrée.
   - Mac : clic droit sur le dossier `reverie` → « Nouveau terminal au dossier ».
4. **Installer les dépendances** (une seule fois) : tapez `npm install` puis Entrée.
5. **Démarrer** : tapez `npm start` puis Entrée.
6. Ouvrez <http://localhost:3000> dans votre navigateur. 🎉
7. Pour arrêter : revenez dans le terminal et appuyez sur `Ctrl + C`.

## Activer la recherche sur mesure (facultatif)

Sans clé, Rêverie propose des voyages issus de son catalogue intégré.
Pour des propositions sur mesure écrites par Claude :

1. Créez une clé API sur <https://platform.claude.com> (rubrique « API Keys »).
2. Dans le dossier `reverie`, copiez le fichier `.env.example` et nommez la
   copie `.env`.
3. Ouvrez `.env` avec un éditeur de texte et collez votre clé après
   `ANTHROPIC_API_KEY=`.
4. Relancez `npm start`.

🔒 La clé reste sur votre ordinateur, dans `.env`. Elle n'est jamais envoyée au
navigateur ni sur GitHub. Ne la collez jamais dans les fichiers du dossier
`public/`.
