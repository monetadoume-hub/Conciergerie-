// Étape 10 du pipeline : rédiger les textes à partir des SEULES données calculées.
// Version sans IA (modèles de phrases). Plus tard, Claude pourra reformuler, mais toujours à partir
// de ces mêmes données : jamais de prix, d'horaire ou de météo inventés.

import type { Destination } from "@/donnees/destinations";
import { NOMS_ENVIES } from "@/lib/envies";
import { nomMois } from "@/lib/texte";
import type { Climate } from "@/providers/types";
import type { Criteres } from "./comprehension";
import { envieMeteoSatisfaite, ENVIES_SAISONNIERES, estEnvieMeteo } from "./meteo";
import type { SatisfactionVoyageur } from "./score";
import type { Activite } from "./types";

/** Réponse concrète à une envie : la base, une activité, ou la météo du mois. */
export function reponseA(envie: string, dest: Destination, climat: Climate, activites: Activite[]): string {
  if (estEnvieMeteo(envie)) {
    switch (envie) {
      case "soleil":
        return `${climat.soleilH} h de soleil par jour en ${nomMois(climat.mois)}`;
      case "chaleur":
      case "douceur":
      case "fraicheur":
        return `${climat.tMax} °C l'après-midi en ${nomMois(climat.mois)}`;
      case "neige":
      case "ski":
        return dest.reponses[envie] ?? `Neige présente en ${nomMois(climat.mois)}`;
    }
  }
  if (envie === "insolite" && !dest.reponses.insolite) {
    const a = activites.find((x) => x.insolite);
    return a ? a.nom.replace(/ \(dès \d+ ans\)$/, "") : "Hébergement insolite : voir la formule Insolite";
  }
  const act = activites.find((a) => a.envies.includes(envie));
  return dest.reponses[envie] ?? act?.nom.replace(/ \(dès \d+ ans\)$/, "") ?? "présent sur place";
}

export function reponses(sat: SatisfactionVoyageur[], dest: Destination, climat: Climate, activites: Activite[]) {
  return sat.flatMap((s) => s.servies.map((e) => ({ qui: s.prenom, envie: NOMS_ENVIES[e], reponse: reponseA(e, dest, climat, activites) })));
}

/** Accroche honnête : le meilleur de la destination, puis le compromis principal s'il y en a un. */
export function accroche(dest: Destination, sat: SatisfactionVoyageur[], dansLaMarge: boolean): string {
  const deçus = sat.filter((s) => s.manquees.length > 0);
  let suite: string;
  if (deçus.length === 0) suite = sat.length > 1 ? "Chacun y trouve ce qu'il cherche." : "Tout ce que vous cherchez est là.";
  else {
    const d = deçus[0];
    suite = `Seul bémol : ${d.prenom} n'y trouvera pas « ${NOMS_ENVIES[d.manquees[0]]} »${deçus.length > 1 || d.manquees.length > 1 ? ", entre autres" : ""}.`;
  }
  if (!dansLaMarge) suite += " Et le budget sera dépassé.";
  return `${dest.accroche} ${suite}`;
}

export function compromis(
  sat: SatisfactionVoyageur[],
  refus: { prenom: string; envie: string }[],
  refusMeteo: string[],
  dest: Destination,
): string[] {
  const res: string[] = [];
  for (const s of sat) {
    for (const e of s.manquees) {
      if (estEnvieMeteo(e)) res.push(`${s.prenom} · « ${NOMS_ENVIES[e]} » n'est pas garanti à cette période.`);
      else if (ENVIES_SAISONNIERES[e] && dest.tags.includes(e)) res.push(`${s.prenom} · « ${NOMS_ENVIES[e]} » : l'eau est encore fraîche à cette période.`);
      else res.push(`${s.prenom} · « ${NOMS_ENVIES[e]} » n'est pas le point fort de cette destination.`);
    }
  }
  for (const r of refus) res.push(`${r.prenom} n'aime pas « ${NOMS_ENVIES[r.envie]} », qu'on trouve aussi ici.`);
  for (const r of refusMeteo) res.push(`${r.replace(/« (\w+) »/, (_, id) => `« ${NOMS_ENVIES[id] ?? id} »`)}, or c'est le cas à cette période.`);
  return res;
}

/** Ce que la proposition évite, refus par refus. */
export function refusEvites(dest: Destination, c: Criteres, climat: Climate, affluence: number, mois: number): string[] {
  const res = new Set<string>();
  for (const v of c.voyageurs) {
    for (const r of v.refus) {
      if (estEnvieMeteo(r)) {
        if (!envieMeteoSatisfaite(r, climat, dest)) res.add(`${NOMS_ENVIES[r]} : pas en ${nomMois(mois)}`);
      } else if (!dest.tags.includes(r)) res.add(NOMS_ENVIES[r]);
    }
  }
  if (c.eviterFoule && affluence < 3) res.add(`La foule : ${nomMois(mois)} est une période ${affluence === 1 ? "calme" : "raisonnable"}`);
  if (c.eviterPluie && climat.pluieJ <= 6) res.add(`La pluie : ${climat.pluieJ} jours de pluie en moyenne en ${nomMois(mois)}`);
  return [...res];
}
