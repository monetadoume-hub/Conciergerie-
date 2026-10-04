// Recherche dans le catalogue hors ligne, avec un score explicable.
// Chaque point gagné ou perdu est accompagné d'une phrase dans `pourquoi`.

import { CATALOGUE, type DestinationCatalogue } from "../catalogue";
import type { Demande } from "../demande";
import { NOMS_ENVIES } from "../envies";

/** Un enfant compte pour 70 % d'un adulte dans les estimations. */
export const COEF_ENFANT = 0.7;
export const NB_PROPOSITIONS = 4;

export interface PropositionHorsLigne {
  id: string;
  destination: string;
  pays: string;
  score: number;
  accroche: string;
  satisfaction: { prenom: string; envies: number; sur: number }[];
  reponses: { qui: string; envie: string; reponse: string }[];
  refusEvites: string[];
  compromis: string[];
  estimation: { total: number; devise: "EUR"; dansLeBudget: boolean };
  pourquoi: string[];
}

export interface ResultatRecherche {
  source: "catalogue_hors_ligne";
  genereLe: string;
  budgetTotal: number;
  propositions: PropositionHorsLigne[];
}

export function budgetTotal(d: Demande): number {
  const personnes = d.adultes + d.enfants;
  return d.budget.par === "groupe" ? d.budget.montant : d.budget.montant * personnes;
}

export function estimerCout(dest: DestinationCatalogue, d: Demande): number {
  const equivalentsAdultes = d.adultes + d.enfants * COEF_ENFANT;
  const parAdulte = dest.estimationNuitParAdulte * d.nuits + dest.estimationTransportParAdulte;
  return Math.round(parAdulte * equivalentsAdultes);
}

/** Évalue une destination, ou renvoie null si un refus touche une caractéristique dominante. */
export function evaluer(dest: DestinationCatalogue, d: Demande): PropositionHorsLigne | null {
  const pourquoi: string[] = [];
  const compromis: string[] = [];
  const refusEvites = new Set<string>();
  const reponses: PropositionHorsLigne["reponses"] = [];
  const satisfaction: PropositionHorsLigne["satisfaction"] = [];
  let penaliteRefus = 0;

  for (const v of d.voyageurs) {
    const aimes = Object.entries(v.envies).filter(([, e]) => e === "aime").map(([id]) => id);
    const refus = Object.entries(v.envies).filter(([, e]) => e === "naime_pas").map(([id]) => id);

    for (const r of refus) {
      if (dest.tagsForts.includes(r)) return null;
      if (dest.tags.includes(r)) {
        penaliteRefus += 15;
        compromis.push(`${v.prenom} n'aime pas « ${NOMS_ENVIES[r]} », présent ici.`);
      } else {
        refusEvites.add(NOMS_ENVIES[r]);
      }
    }

    const servies = aimes.filter((a) => dest.tags.includes(a));
    satisfaction.push({ prenom: v.prenom, envies: servies.length, sur: aimes.length });
    for (const a of servies) {
      reponses.push({ qui: v.prenom, envie: NOMS_ENVIES[a], reponse: dest.reponses[a] ?? "un point fort de la destination" });
    }
    for (const a of aimes.filter((x) => !dest.tags.includes(x))) {
      compromis.push(`${v.prenom} · « ${NOMS_ENVIES[a]} » n'est pas le point fort de cette destination.`);
    }
  }

  // Satisfaction moyenne : un voyageur sans envie cochée est considéré comme satisfait.
  const taux = satisfaction.map((s) => (s.sur === 0 ? 1 : s.envies / s.sur));
  const moyenne = taux.reduce((a, b) => a + b, 0) / taux.length;
  const pointsEnvies = Math.round(70 * moyenne);
  pourquoi.push(`Envies : ${pointsEnvies}/70 (satisfaction moyenne du groupe ${Math.round(moyenne * 100)} %).`);

  const total = estimerCout(dest, d);
  const budget = budgetTotal(d);
  const dansLeBudget = total <= budget;
  let pointsBudget = 30;
  if (!dansLeBudget) {
    const depassement = (total - budget) / budget;
    pointsBudget = Math.max(0, Math.round(30 * (1 - depassement * 2)));
    compromis.push(`Estimation au-dessus du budget de ${Math.round(depassement * 100)} %.`);
  }
  pourquoi.push(`Budget : ${pointsBudget}/30 (estimation ${total} € pour ${budget} € prévus).`);

  if (penaliteRefus > 0) pourquoi.push(`Refus partiellement présents : −${penaliteRefus}.`);

  const score = Math.max(0, Math.min(100, pointsEnvies + pointsBudget - penaliteRefus));

  return {
    id: dest.id,
    destination: dest.nom,
    pays: dest.pays,
    score,
    accroche: dest.accroche,
    satisfaction,
    reponses,
    refusEvites: [...refusEvites],
    compromis,
    estimation: { total, devise: "EUR", dansLeBudget },
    pourquoi,
  };
}

export function rechercherHorsLigne(d: Demande, maintenant = new Date()): ResultatRecherche {
  const classees = CATALOGUE.map((dest) => evaluer(dest, d))
    .filter((p): p is PropositionHorsLigne => p !== null)
    .sort((a, b) => b.score - a.score || a.estimation.total - b.estimation.total);

  // Diversité : au plus deux propositions dans le même pays.
  const retenues: PropositionHorsLigne[] = [];
  const parPays = new Map<string, number>();
  for (const p of classees) {
    if (retenues.length === NB_PROPOSITIONS) break;
    const n = parPays.get(p.pays) ?? 0;
    if (n >= 2) continue;
    parPays.set(p.pays, n + 1);
    retenues.push(p);
  }

  return {
    source: "catalogue_hors_ligne",
    genereLe: maintenant.toISOString(),
    budgetTotal: budgetTotal(d),
    propositions: retenues,
  };
}
