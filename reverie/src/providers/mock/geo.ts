// Géocodage et itinéraires simulés. Remplacés par OpenStreetMap à l'étape 4.

import { VILLES } from "@/donnees/villes";
import { normaliser } from "@/lib/texte";
import type { GeoProvider, ModeRoute } from "../types";
import { distanceKm } from "../outils";
import { OPTIONS_PAR_DEFAUT, patienter, type OptionsSimulation } from "./commun";

const VITESSE_KMH: Record<ModeRoute, number> = { voiture: 80, velo: 15, pied: 4.5 };
/** Les routes font des détours : distance réelle ≈ 1,3 × vol d'oiseau. */
const DETOUR = 1.3;

export function creerGeoSimule(opts: OptionsSimulation = OPTIONS_PAR_DEFAUT): GeoProvider {
  const nom = "Simulation Rêverie — géographie";
  return {
    nom,
    async geocode(texte) {
      await patienter(opts, `geo${texte}`);
      const t = ` ${normaliser(texte)} `;
      return VILLES.filter((v) => t.includes(` ${normaliser(v.nom)} `)).map((v) => ({
        nom: v.nom,
        lat: v.lat,
        lon: v.lon,
        pays: v.pays,
      }));
    },
    async route(de, vers, mode) {
      await patienter(opts, `route${de.nom}${vers.nom}${mode}`);
      const km = distanceKm(de, vers) * DETOUR;
      return { mode, distanceKm: Math.round(km), dureeMin: Math.round((km / VITESSE_KMH[mode]) * 60), source: nom };
    },
  };
}
