// Activités vendues (simulées) et lieux à visiter librement, tirés de la base interne.

import { destinationParId } from "@/donnees/destinations";
import type { ActivityOffer, ActivityProvider, Poi, PoiProvider } from "../types";
import { coefTarifAge, entre } from "../outils";
import { moisDe, OPTIONS_PAR_DEFAUT, patienter, prix, type OptionsSimulation } from "./commun";

export function creerActivitesSimulees(opts: OptionsSimulation = OPTIONS_PAR_DEFAUT): ActivityProvider {
  const nom = "Simulation Rêverie — activités";
  return {
    nom,
    async search(q): Promise<ActivityOffer[]> {
      await patienter(opts, `act${q.destinationId}${q.date}`);
      const dest = destinationParId(q.destinationId);
      if (!dest) return [];
      const mois = moisDe(q.date);
      return dest.activites
        .filter((a) => a.prix > 0 && (!a.mois || a.mois.includes(mois)))
        .map((a) => {
          // Les enfants trop jeunes ne participent pas (et ne paient pas).
          const enfants = q.passagers.agesEnfants.filter((age) => age >= (a.ageMin ?? 0));
          const participants = q.passagers.adultes + enfants.reduce((t, age) => t + coefTarifAge(age), 0);
          return {
            id: a.id,
            nom: a.nom,
            envies: a.envies,
            dureeH: a.dureeH,
            insolite: !!a.insolite,
            ageMin: a.ageMin ?? 0,
            prix: prix(a.prix * participants * entre(`${a.id}${q.date}`, 0.9, 1.1), nom, opts),
          };
        });
    },
  };
}

export function creerLieuxSimules(opts: OptionsSimulation = OPTIONS_PAR_DEFAUT): PoiProvider {
  const nom = "Simulation Rêverie — lieux à visiter";
  return {
    nom,
    async attractions(destinationId): Promise<Poi[]> {
      await patienter(opts, `poi${destinationId}`);
      const dest = destinationParId(destinationId);
      if (!dest) return [];
      return dest.activites
        .filter((a) => a.prix === 0)
        .map((a) => ({ id: a.id, nom: a.nom, envies: a.envies, insolite: !!a.insolite, source: nom }));
    },
  };
}
