// Le serveur de Rêverie.
// 1. Il envoie les fichiers du site (dossier public/) au navigateur.
// 2. Il répond à POST /api/destinations en interrogeant Claude avec la clé
//    secrète, qui reste ici, côté serveur.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleConfiguree,
  verifierDemande,
  chercherDestinations,
  DemandeInvalide,
  RechercheEchouee,
} from "./recherche.js";

const PORT = Number(process.env.PORT) || 3000;
const DOSSIER_PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
const TAILLE_MAX_DEMANDE = 20_000; // octets
const RECHERCHES_PAR_MINUTE = 5; // par adresse IP

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const ENTETES_SECURITE = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
  ].join("; "),
};

function envoyerJson(res, statut, donnees) {
  res.writeHead(statut, { "Content-Type": "application/json; charset=utf-8", ...ENTETES_SECURITE });
  res.end(JSON.stringify(donnees));
}

/* ---------- Limite simple : quelques recherches par minute et par IP ---------- */
const historique = new Map();
function tropDeRecherches(ip) {
  const maintenant = Date.now();
  const recentes = (historique.get(ip) || []).filter((t) => maintenant - t < 60_000);
  if (recentes.length >= RECHERCHES_PAR_MINUTE) {
    historique.set(ip, recentes);
    return true;
  }
  recentes.push(maintenant);
  historique.set(ip, recentes);
  return false;
}

/* ---------- Lecture du corps de la requête ---------- */
function lireCorps(req) {
  return new Promise((resolve, reject) => {
    let taille = 0;
    const morceaux = [];
    req.on("data", (m) => {
      taille += m.length;
      if (taille > TAILLE_MAX_DEMANDE) {
        reject(new DemandeInvalide("trop_gros"));
        req.destroy();
        return;
      }
      morceaux.push(m);
    });
    req.on("end", () => resolve(Buffer.concat(morceaux).toString("utf8")));
    req.on("error", reject);
  });
}

/* ---------- Route API ---------- */
async function routeDestinations(req, res) {
  if (!cleConfiguree()) return envoyerJson(res, 503, { code: "no_key" });
  if (tropDeRecherches(req.socket.remoteAddress)) return envoyerJson(res, 429, { code: "rate_limited" });

  let demande;
  try {
    demande = verifierDemande(JSON.parse(await lireCorps(req)));
  } catch {
    return envoyerJson(res, 400, { code: "invalid_request" });
  }

  // Si le visiteur clique sur « Arrêter », on annule aussi l'appel à Claude.
  const annulation = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) annulation.abort();
  });

  try {
    const resultat = await chercherDestinations(demande, annulation.signal);
    envoyerJson(res, 200, resultat);
  } catch (err) {
    if (annulation.signal.aborted) return;
    if (err instanceof RechercheEchouee) {
      if (err.code === "bad_key") console.error("⚠️  La clé ANTHROPIC_API_KEY est refusée : vérifiez votre fichier .env");
      const statut = err.code === "rate_limited" ? 429 : 502;
      return envoyerJson(res, statut, { code: err.code });
    }
    console.error("Erreur pendant la recherche :", err);
    envoyerJson(res, 502, { code: "server_error" });
  }
}

/* ---------- Fichiers du site ---------- */
async function fichierStatique(req, res) {
  const url = new URL(req.url, "http://localhost");
  let chemin = decodeURIComponent(url.pathname);
  if (chemin.endsWith("/")) chemin += "index.html";
  const complet = path.join(DOSSIER_PUBLIC, path.normalize(chemin));
  // Empêche de lire des fichiers en dehors du dossier public/.
  if (!complet.startsWith(DOSSIER_PUBLIC + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  try {
    const contenu = await readFile(complet);
    const type = TYPES[path.extname(complet)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, ...ENTETES_SECURITE });
    res.end(contenu);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Page introuvable");
  }
}

const serveur = http.createServer(async (req, res) => {
  try {
    if (req.url === "/api/destinations") {
      if (req.method !== "POST") return envoyerJson(res, 405, { code: "method" });
      return await routeDestinations(req, res);
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      return res.end();
    }
    await fichierStatique(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) envoyerJson(res, 500, { code: "server_error" });
    else res.end();
  }
});

serveur.listen(PORT, () => {
  console.log(`\n✨ Rêverie est lancée : ouvrez http://localhost:${PORT} dans votre navigateur.`);
  if (!cleConfiguree()) {
    console.log("ℹ️  Pas de clé ANTHROPIC_API_KEY : le site marche avec le catalogue intégré.");
    console.log("   Pour la recherche sur mesure, copiez .env.example en .env et ajoutez votre clé.");
  }
  console.log("   Pour arrêter le serveur : Ctrl + C\n");
});
