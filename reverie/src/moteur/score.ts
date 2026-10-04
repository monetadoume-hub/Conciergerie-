// Étape 9 du pipeline : un score sur 100, explicable ligne par ligne.
//   Envies du groupe   45 pts  (satisfaction moyenne des voyageurs, envies météo comprises)
//   Météo              15 pts  (à la période retenue)
//   Budget             20 pts  (formule de référence)
//   Trajet             10 pts  (durée porte à porte)
//   Diversité          10 pts  (attribués lors du choix final des 4 destinations)
//   Pénalités               (refus secondaires présents, foule si on veut l'éviter)

import type { Destination } from "@/donnees/destinations";
import { NOMS_ENVIES } from "@/lib/envies";
import type { Climate } from "@/providers/types";
import type { Criteres } from "./comprehension";
import { envieMeteoSatisfaite, estEnvieMeteo, saisonConvient, type EvaluationMeteo } from "./meteo";
import type { DetailScore, Formule } from "./types";

export const POINTS = { envies: 45, meteo: 15, budget: 20, trajet: 10, diversite: 10 } as const;
export const PENALITE_REFUS = 10;
export const PENALITE_FOULE = 8;

export interface SatisfactionVoyageur {
  prenom: string;
  avatar?: string;
  servies: string[];
  manquees: string[];
  /** Entre 0 et 1, pondéré (une envie cochée compte double d'une envie déduite du texte). */
  taux: number;
}

/**
 * Une envie est servie par la destination (étiquette ou activité) à condition que la saison s'y prête,
 * ou par la météo du mois pour les envies météo.
 */
export function envieServie(e: string, dest: Destination, climat: Climate, enviesActivites: Set<string>): boolean {
  if (estEnvieMeteo(e)) return !!envieMeteoSatisfaite(e, climat, dest);
  return (dest.tags.includes(e) || enviesActivites.has(e)) && saisonConvient(e, climat);
}

export function satisfaction(dest: Destination, c: Criteres, climat: Climate, enviesActivites: Set<string>): SatisfactionVoyageur[] {
  return c.voyageurs.map((v) => {
    const servies: string[] = [];
    const manquees: string[] = [];
    let total = 0;
    let ok = 0;
    for (const [e, poids] of v.envies) {
      total += poids;
      if (envieServie(e, dest, climat, enviesActivites)) {
        ok += poids;
        servies.push(e);
      } else manquees.push(e);
    }
    return { prenom: v.prenom, avatar: v.avatar, servies, manquees, taux: total === 0 ? 1 : ok / total };
  });
}

/** Refus secondaires présents dans la destination (les refus dominants l'ont déjà exclue). */
export function refusPresents(dest: Destination, c: Criteres): { prenom: string; envie: string }[] {
  const res: { prenom: string; envie: string }[] = [];
  for (const v of c.voyageurs) {
    for (const r of v.refus) {
      if (!estEnvieMeteo(r) && dest.tags.includes(r)) res.push({ prenom: v.prenom, envie: r });
    }
  }
  return res;
}

export interface EntreesScore {
  satisfaction: SatisfactionVoyageur[];
  meteo: EvaluationMeteo;
  reference: Formule;
  budget: number;
  plafond: number;
  /** Trajet le plus court (minutes, aller). 0 = non calculé. */
  trajetMin: number;
  refus: { prenom: string; envie: string }[];
  foule: boolean;
}

export function calculerScore(e: EntreesScore): { detail: DetailScore; score: number; pourquoi: string[] } {
  const pourquoi: string[] = [];

  const moyenne = e.satisfaction.reduce((t, s) => t + s.taux, 0) / Math.max(1, e.satisfaction.length);
  const envies = Math.round(POINTS.envies * moyenne);
  pourquoi.push(`Envies du groupe : ${envies}/${POINTS.envies} (satisfaction moyenne ${Math.round(moyenne * 100)} %).`);

  const meteo = Math.round(POINTS.meteo * e.meteo.score);
  pourquoi.push(`Météo à la période : ${meteo}/${POINTS.meteo}${e.meteo.explications.length ? ` (${e.meteo.explications.join(" ; ")})` : ""}.`);

  const t = e.reference.totalBudget;
  let budget: number;
  if (t <= e.budget) budget = POINTS.budget;
  else if (t <= e.plafond) budget = 15;
  else budget = Math.max(0, Math.round(10 * (1 - ((t - e.plafond) / e.budget) * 2)));
  pourquoi.push(
    `Budget : ${budget}/${POINTS.budget} (formule « ${libelleFormule(e.reference.nom)} » : ${t} € pour ${Math.round(e.budget)} € prévus).`,
  );

  let trajet: number = POINTS.trajet;
  if (e.trajetMin > 0) {
    // Plein score jusqu'à 3 h, zéro à partir de 12 h.
    trajet = Math.round(POINTS.trajet * Math.min(1, Math.max(0, (720 - e.trajetMin) / (720 - 180))));
    pourquoi.push(`Trajet : ${trajet}/${POINTS.trajet} (${Math.floor(e.trajetMin / 60)} h ${String(e.trajetMin % 60).padStart(2, "0")} porte à porte).`);
  } else {
    pourquoi.push(`Trajet : ${trajet}/${POINTS.trajet} (durée non calculée).`);
  }

  let penalites = 0;
  for (const r of e.refus) {
    penalites += PENALITE_REFUS;
    pourquoi.push(`${r.prenom} n'aime pas « ${NOMS_ENVIES[r.envie]} », présent ici : −${PENALITE_REFUS}.`);
  }
  for (const r of e.meteo.refusTouches) {
    penalites += PENALITE_REFUS;
    pourquoi.push(`${r.replace(/« (\w+) »/, (_, id) => `« ${NOMS_ENVIES[id] ?? id} »`)} (météo) : −${PENALITE_REFUS}.`);
  }
  if (e.foule) {
    penalites += PENALITE_FOULE;
    pourquoi.push(`Forte affluence à cette période alors que vous voulez éviter la foule : −${PENALITE_FOULE}.`);
  }

  const detail: DetailScore = { envies, meteo, budget, trajet, diversite: 0, penalites };
  return { detail, score: scoreTotal(detail), pourquoi };
}

export const scoreTotal = (d: DetailScore) =>
  Math.max(0, Math.min(100, d.envies + d.meteo + d.budget + d.trajet + d.diversite - d.penalites));

export const libelleFormule = (n: string) =>
  ({ economique: "Économique", equilibree: "Équilibrée", confort: "Confort", insolite: "Insolite" })[n] ?? n;
