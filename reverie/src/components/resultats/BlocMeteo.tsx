import type { MeteoProposition } from "@/moteur/types";
import { nomMois } from "@/lib/texte";
import { T } from "@/lib/textes";
import styles from "./resultats.module.css";

/** Pictogramme du temps dominant (avec texte pour les lecteurs d'écran). */
function picto(m: MeteoProposition): { icone: string; texte: string } {
  const c = m.climat;
  if (c.neige) return { icone: "❄️", texte: "neige" };
  if (c.pluieJ >= 12) return { icone: "🌧️", texte: "souvent pluvieux" };
  if (c.soleilH >= 8) return { icone: "☀️", texte: "ensoleillé" };
  return { icone: "⛅", texte: "variable" };
}

export function BlocMeteo({ meteo }: { meteo: MeteoProposition }) {
  const p = picto(meteo);
  const c = meteo.climat;
  return (
    <div className={styles.meteo}>
      <span className={styles.meteoIcone} role="img" aria-label={p.texte}>
        {p.icone}
      </span>
      <div>
        <p className={styles.meteoTemp}>
          {c.tMax}° <span>/ {c.tMin}°</span>
        </p>
        <p className={styles.meteoDetail}>
          {nomMois(c.mois)} · {c.soleilH} h de soleil/j · {c.pluieJ} j de pluie
          {c.neige ? " · neige" : ""}
        </p>
        <p className={styles.source}>{T.resultats.sourceMeteo(meteo.source, meteo.nature === "simulation")}</p>
      </div>
    </div>
  );
}
