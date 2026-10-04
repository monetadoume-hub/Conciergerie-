// Étape 2 du pipeline : comprendre les envies et les textes libres.
// Version sans IA : un lexique de mots-clés. Le texte du client reste une DONNÉE : on n'y cherche
// que des mots connus, on n'exécute jamais ce qu'il dit. Remplaçable plus tard par un appel à Claude
// qui renverra le même objet `Criteres`.

import type { Demande } from "@/lib/demande";
import { NOMS_ENVIES } from "@/lib/envies";
import { normaliser } from "@/lib/texte";

export interface CriteresVoyageur {
  prenom: string;
  avatar?: string;
  /** Envie → poids (1 = cochée, 0,5 = déduite du texte). */
  envies: Map<string, number>;
  refus: Set<string>;
}

export interface Criteres {
  voyageurs: CriteresVoyageur[];
  /** Modes acceptés (identifiants du formulaire) après les refus exprimés dans le texte. */
  modes: Set<string>;
  dureeMaxH?: number;
  correspondancesMax?: number;
  nuit: boolean;
  basCarbone: boolean;
  eviterFoule: boolean;
  eviterPluie: boolean;
  /** Types d'hébergement rêvés (ex. « dormir dans une cabane perchée »). */
  hebergementsReves: string[];
  /** Ce que Rêverie a compris des textes, pour l'afficher au client. */
  compris: string[];
}

/** Débuts de mots → envie. Les accents et majuscules sont retirés avant comparaison. */
const LEXIQUE_ENVIES: [string, string][] = [
  ["plage", "plage"],
  ["sable", "plage"],
  ["mer", "mer_iles"],
  ["ile", "mer_iles"],
  ["ocean", "mer_iles"],
  ["montagne", "montagne"],
  ["sommet", "montagne"],
  ["lac", "lacs"],
  ["foret", "foret"],
  ["arbre", "foret"],
  ["campagne", "campagne"],
  ["desert", "desert"],
  ["dune", "desert"],
  ["volcan", "volcans"],
  ["soleil", "soleil"],
  ["chaleur", "chaleur"],
  ["chaud", "chaleur"],
  ["canicule", "chaleur"],
  ["neige", "neige"],
  ["froid", "fraicheur"],
  ["fraicheur", "fraicheur"],
  ["chateau", "chateaux"],
  ["musee", "musees"],
  ["histoire", "musees"],
  ["village", "villages"],
  ["architecture", "architecture"],
  ["festival", "festivals"],
  ["concert", "festivals"],
  ["shopping", "shopping"],
  ["boutique", "shopping"],
  ["vie nocturne", "vie_nocturne"],
  ["boite", "vie_nocturne"],
  ["soiree", "fete"],
  ["fete", "fete"],
  ["street art", "street_art"],
  ["graffiti", "street_art"],
  ["gastronomi", "gastronomie"],
  ["restaurant", "gastronomie"],
  ["vin", "vins"],
  ["degustation", "vins"],
  ["cours de cuisine", "cours_cuisine"],
  ["tortue", "plongee"],
  ["poisson", "plongee"],
  ["corail", "plongee"],
  ["plong", "plongee"],
  ["snorkel", "plongee"],
  ["randonn", "randonnee"],
  ["trek", "randonnee"],
  ["trekking", "randonnee"],
  ["velo", "velo"],
  ["kayak", "nautique"],
  ["surf", "nautique"],
  ["surfer", "nautique"],
  ["voile", "nautique"],
  ["ski", "ski"],
  ["skier", "ski"],
  ["escalad", "escalade"],
  ["grimp", "escalade"],
  ["golf", "golf"],
  ["peche", "peche"],
  ["spa", "detente"],
  ["massage", "detente"],
  ["hammam", "detente"],
  ["repos", "detente"],
  ["aventure", "aventure"],
  ["insolite", "insolite"],
  ["cabane", "insolite"],
  ["yourte", "insolite"],
  ["bulle", "insolite"],
  ["romanti", "romantique"],
  ["amoureux", "romantique"],
  ["calme", "calme"],
  ["tranquill", "calme"],
  ["silence", "calme"],
  ["animaux", "animaux"],
  ["zoo", "animaux"],
  ["baleine", "animaux"],
  ["dauphin", "animaux"],
  ["parc d attraction", "parcs_attractions"],
  ["manege", "parcs_attractions"],
];

/** Hébergements rêvés (les plus précis d'abord). */
const LEXIQUE_HEBERGEMENTS: [string, string][] = [
  ["cabane perchee", "cabane_perchee"],
  ["cabane dans les arbres", "cabane_perchee"],
  ["cabane", "cabane"],
  ["yourte", "yourte"],
  ["tipi", "tipi"],
  ["bulle", "bulle"],
  ["roulotte", "roulotte"],
  ["peniche", "peniche"],
  ["refuge", "refuge"],
  ["glamping", "glamping"],
];

/** Mots de transport → modes du formulaire à retirer en cas de refus. */
const LEXIQUE_MODES: [string, string[]][] = [
  ["avion", ["avion"]],
  ["vol", ["avion"]],
  ["train", ["train"]],
  ["autocar", ["bus"]],
  ["bus", ["bus"]],
  ["covoiturage", ["covoiturage"]],
  ["bateau", ["ferry"]],
  ["ferry", ["ferry"]],
  ["voiture", ["ma_voiture", "location", "van"]],
  ["conduire", ["ma_voiture", "location", "van"]],
];

const MOTS_FOULE = ["foule", "monde", "touriste", "bonde", "affluence", "masse"];
const MOTS_NEGATION = ["pas", "sans", "eviter", "evitez", "jamais", "aucun", "aucune", "ni", "non", "deteste"];

/** Découpe un texte normalisé en propositions (virgules, points, « et », « mais »). */
const propositions = (texte: string) =>
  texte
    .split(/[,.;!?\n]| et | mais | ou /)
    .map((p) => normaliser(p))
    .filter(Boolean);

/** Vrai si `cle` (début de mot, éventuellement plusieurs mots) apparaît dans la proposition. */
function contient(proposition: string, cle: string): boolean {
  const mots = proposition.split(" ");
  const cleMots = cle.split(" ");
  for (let i = 0; i + cleMots.length <= mots.length; i++) {
    const ok = cleMots.every((c, j) => (j === cleMots.length - 1 ? mots[i + j].startsWith(c) : mots[i + j] === c));
    if (ok) {
      // « vol » ne doit pas reconnaître « volcan », ni « mer » « merci » : on exige un mot assez proche.
      const dernier = mots[i + cleMots.length - 1];
      const c = cleMots[cleMots.length - 1];
      if (c.length <= 4 && dernier.length > c.length + 1) continue;
      return true;
    }
  }
  return false;
}

const estNegative = (p: string) => p.split(" ").some((m) => MOTS_NEGATION.includes(m));

export function comprendre(d: Demande): Criteres {
  const modes = new Set(d.transports.modes);
  const compris: string[] = [];
  let dureeMaxH = d.transports.dureeMaxH;
  let correspondancesMax = d.transports.correspondancesMax;
  let eviterFoule = false;
  let eviterPluie = false;
  const hebergementsReves = new Set<string>();

  const voyageurs: CriteresVoyageur[] = d.voyageurs.map((v) => {
    const envies = new Map<string, number>();
    const refus = new Set<string>();
    for (const [id, etat] of Object.entries(v.envies)) {
      if (etat === "aime") envies.set(id, 1);
      else refus.add(id);
    }

    const analyser = (texte: string | undefined, toutEstRefus: boolean) => {
      for (const p of propositions(texte ?? "")) {
        const refusClause = toutEstRefus || estNegative(p);

        for (const [cle, envie] of LEXIQUE_ENVIES) {
          if (!contient(p, cle)) continue;
          if (refusClause) {
            if (!refus.has(envie) && !envies.has(envie)) {
              refus.add(envie);
              compris.push(`${v.prenom} · « ${cle} » → on évite « ${NOMS_ENVIES[envie]} »`);
            }
          } else if (!envies.has(envie) && !refus.has(envie)) {
            envies.set(envie, 0.5);
            compris.push(`${v.prenom} · « ${cle} » → envie « ${NOMS_ENVIES[envie]} »`);
          }
        }

        if (!refusClause) {
          const heb = LEXIQUE_HEBERGEMENTS.find(([cle]) => contient(p, cle));
          if (heb && !hebergementsReves.has(heb[1])) {
            hebergementsReves.add(heb[1]);
            compris.push(`${v.prenom} · « ${heb[0]} » → on cherche ce type d'hébergement`);
          }
          continue;
        }

        if (MOTS_FOULE.some((m) => contient(p, m)) && !eviterFoule) {
          eviterFoule = true;
          compris.push(`${v.prenom} · « pas de foule » → on privilégie les périodes et lieux calmes`);
        }
        if (contient(p, "pluie") && !eviterPluie) {
          eviterPluie = true;
          compris.push(`${v.prenom} · « pluie » → on privilégie les périodes sèches`);
        }
        const heures = p.match(/(\d{1,2}) ?h(eures?)?\b/);
        if (heures) {
          const h = Number(heures[1]);
          if (h >= 1 && (dureeMaxH === undefined || h < dureeMaxH)) {
            dureeMaxH = h;
            compris.push(`${v.prenom} · « ${heures[0]} » → trajet de ${h} h au maximum`);
          }
        }
        if (contient(p, "correspondance") || contient(p, "escale")) {
          if (correspondancesMax === undefined || correspondancesMax > 0) {
            correspondancesMax = 0;
            compris.push(`${v.prenom} · « ${contient(p, "escale") ? "escale" : "correspondance"} » → trajets directs uniquement`);
          }
        }
        for (const [cle, ids] of LEXIQUE_MODES) {
          if (!contient(p, cle)) continue;
          const retires = ids.filter((m) => modes.delete(m));
          if (retires.length > 0) compris.push(`${v.prenom} · « ${cle} » → on n'utilise pas ce moyen de transport`);
        }
      }
    };

    analyser(v.reve, false);
    analyser(v.refusLibre, true);
    return { prenom: v.prenom, avatar: v.avatar, envies, refus };
  });

  return {
    voyageurs,
    modes,
    dureeMaxH,
    correspondancesMax,
    nuit: d.transports.nuit,
    basCarbone: d.transports.basCarbone,
    eviterFoule,
    eviterPluie,
    hebergementsReves: [...hebergementsReves],
    compris,
  };
}

/** Toutes les envies du groupe (union), avec le poids maximum. */
export function enviesDuGroupe(c: Criteres): Map<string, number> {
  const res = new Map<string, number>();
  for (const v of c.voyageurs) for (const [e, p] of v.envies) res.set(e, Math.max(res.get(e) ?? 0, p));
  return res;
}
