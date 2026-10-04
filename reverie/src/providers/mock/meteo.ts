// Météo simulée : normales tirées de la base interne. Remplacée par Open-Meteo à l'étape 3.

import type { Climate, Forecast, WeatherProvider } from "../types";
import { entre } from "../outils";
import { destinationProche, OPTIONS_PAR_DEFAUT, patienter, type OptionsSimulation } from "./commun";

export function creerMeteoSimulee(opts: OptionsSimulation = OPTIONS_PAR_DEFAUT): WeatherProvider {
  const nom = "Simulation Rêverie — météo";
  return {
    nom,
    async climate(lat, lon, mois): Promise<Climate | null> {
      await patienter(opts, `climat${lat}${lon}${mois}`);
      const d = destinationProche({ lat, lon });
      if (!d) return null;
      const i = mois - 1;
      return {
        mois,
        tMax: d.climat.tMax[i],
        tMin: d.climat.tMin[i],
        soleilH: d.climat.soleilH[i],
        pluieJ: d.climat.pluieJ[i],
        neige: d.climat.neige.includes(mois),
        source: nom,
        nature: "simulation",
      };
    },
    async forecast(lat, lon, du, au): Promise<Forecast[]> {
      await patienter(opts, `prev${lat}${lon}${du}`);
      const d = destinationProche({ lat, lon });
      if (!d) return [];
      const res: Forecast[] = [];
      for (let t = Date.parse(du); t <= Date.parse(au); t += 86_400_000) {
        const date = new Date(t).toISOString().slice(0, 10);
        const i = Number(date.slice(5, 7)) - 1;
        const g = `${d.id}${date}`;
        const pluie = entre(`${g}p`, 0, 1) < d.climat.pluieJ[i] / 30;
        res.push({
          date,
          tMax: Math.round(d.climat.tMax[i] + entre(`${g}t`, -3, 3)),
          tMin: Math.round(d.climat.tMin[i] + entre(`${g}m`, -2, 2)),
          pluieMm: pluie ? Math.round(entre(`${g}r`, 1, 15)) : 0,
          neigeCm: d.climat.neige.includes(i + 1) ? Math.round(entre(`${g}n`, 0, 20)) : 0,
          source: nom,
          nature: "simulation",
        });
      }
      return res;
    },
  };
}
