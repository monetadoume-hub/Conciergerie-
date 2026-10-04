"use client";

import { HORIZON_JOURS, moisDisponibles, nuitsEntre, type Demande } from "@/lib/demande";
import { FLEX_JOURS, MODES_DATES } from "@/lib/options";
import { T } from "@/lib/textes";
import { Cases } from "./Cases";
import styles from "./Champs.module.css";
import { Choix } from "./Choix";
import { Compteur } from "./Compteur";

type Dates = Demande["dates"];
type Mode = Dates["mode"];

const nomMois = (m: string) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Sélecteur de dates à 4 modes. Affiché seulement côté navigateur (dernier écran du formulaire),
 * donc la date du jour est toujours celle du visiteur.
 */
export function SelecteurDates({ dates, onChange }: { dates: Dates; onChange: (d: Dates) => void }) {
  const maintenant = new Date();
  const aujourdhui = maintenant.toISOString().slice(0, 10);
  const horizon = new Date(maintenant.getTime() + HORIZON_JOURS * 86_400_000).toISOString().slice(0, 10);

  function changerMode(mode: Mode) {
    const avecDates = mode === "fixes" || mode === "flexibles";
    onChange({
      mode,
      aller: avecDates ? dates.aller : undefined,
      retour: avecDates ? dates.retour : undefined,
      flexJours: mode === "flexibles" ? (dates.flexJours ?? 2) : undefined,
      mois: mode === "mois" ? (dates.mois ?? []) : undefined,
      nuitsMin: dates.nuitsMin,
      nuitsMax: dates.nuitsMax,
    });
  }

  function changerDate(champ: "aller" | "retour", valeur: string) {
    const suivant = { ...dates, [champ]: valeur || undefined };
    if (suivant.aller && suivant.retour) {
      const n = nuitsEntre(suivant.aller, suivant.retour);
      if (n >= 1 && n <= 30) {
        suivant.nuitsMin = n;
        suivant.nuitsMax = n;
      }
    }
    onChange(suivant);
  }

  const avecDates = dates.mode === "fixes" || dates.mode === "flexibles";
  const nuitsCalculees = dates.aller && dates.retour ? nuitsEntre(dates.aller, dates.retour) : null;

  return (
    <div className={styles.dates}>
      <Choix
        legende={T.cadre.quand}
        options={MODES_DATES as { id: Mode; nom: string; aide: string }[]}
        valeur={dates.mode}
        onChange={changerMode}
      />

      {avecDates && (
        <div className={styles.deuxColonnes}>
          <label className={styles.champDate}>
            <span>{T.cadre.aller}</span>
            <input
              type="date"
              min={aujourdhui}
              max={horizon}
              value={dates.aller ?? ""}
              onChange={(e) => changerDate("aller", e.target.value)}
            />
          </label>
          <label className={styles.champDate}>
            <span>{T.cadre.retour}</span>
            <input
              type="date"
              min={dates.aller ?? aujourdhui}
              value={dates.retour ?? ""}
              onChange={(e) => changerDate("retour", e.target.value)}
            />
          </label>
        </div>
      )}

      {dates.mode === "flexibles" && (
        <Choix
          legende={T.cadre.flexibilite}
          compact
          options={FLEX_JOURS.map((n) => ({ id: n, nom: `± ${n} jour${n > 1 ? "s" : ""}` }))}
          valeur={dates.flexJours ?? 2}
          onChange={(flexJours) => onChange({ ...dates, flexJours })}
        />
      )}

      {dates.mode === "mois" && (
        <Cases
          legende={T.cadre.quelsMois}
          options={moisDisponibles(maintenant).map((m) => ({ id: m, nom: nomMois(m) }))}
          valeurs={dates.mois ?? []}
          onChange={(mois) => onChange({ ...dates, mois: [...mois].sort() })}
        />
      )}

      {dates.mode === "auMieux" && <p className={styles.aide}>{T.cadre.auMieuxExplication}</p>}

      {avecDates ? (
        <p className={styles.resume} aria-live="polite">
          {nuitsCalculees !== null && nuitsCalculees >= 1 ? T.cadre.nuitsCalculees(nuitsCalculees) : T.cadre.choisissezDates}
        </p>
      ) : (
        <fieldset className={styles.groupe}>
          <legend className={styles.legende}>{T.cadre.duree}</legend>
          <p className={styles.aide}>{T.cadre.dureeAide}</p>
          <Compteur
            libelle={T.cadre.auMoins}
            valeur={dates.nuitsMin}
            min={1}
            max={30}
            onChange={(n) => onChange({ ...dates, nuitsMin: n, nuitsMax: Math.max(n, dates.nuitsMax) })}
          />
          <Compteur
            libelle={T.cadre.auPlus}
            valeur={dates.nuitsMax}
            min={1}
            max={30}
            onChange={(n) => onChange({ ...dates, nuitsMax: n, nuitsMin: Math.min(n, dates.nuitsMin) })}
          />
        </fieldset>
      )}
    </div>
  );
}
