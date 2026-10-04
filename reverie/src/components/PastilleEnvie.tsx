"use client";

import type { EtatEnvie } from "@/lib/envies";
import { T } from "@/lib/textes";
import styles from "./PastilleEnvie.module.css";

/** Ordre du cycle : neutre → J'aime → Je n'aime pas → neutre. */
export function etatSuivant(etat: EtatEnvie | undefined): EtatEnvie | undefined {
  if (etat === undefined) return "aime";
  if (etat === "aime") return "naime_pas";
  return undefined;
}

export function PastilleEnvie({
  nom,
  etat,
  onChange,
}: {
  nom: string;
  etat: EtatEnvie | undefined;
  onChange: (etat: EtatEnvie | undefined) => void;
}) {
  const libelleEtat = etat ? T.etat[etat] : T.etat.neutre;
  return (
    <button
      type="button"
      className={`${styles.pastille} ${etat ? styles[etat] : ""}`}
      aria-label={`${nom} : ${libelleEtat}`}
      onClick={() => onChange(etatSuivant(etat))}
    >
      {etat === "aime" && <span aria-hidden="true">✓ </span>}
      {etat === "naime_pas" && <span aria-hidden="true">✕ </span>}
      <span className={styles.nom}>{nom}</span>
    </button>
  );
}
