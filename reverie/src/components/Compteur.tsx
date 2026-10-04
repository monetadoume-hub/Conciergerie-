"use client";

import styles from "./Compteur.module.css";

/** Sélecteur de nombre avec boutons − / + (grandes zones tactiles). */
export function Compteur({
  libelle,
  valeur,
  min,
  max,
  onChange,
}: {
  libelle: string;
  valeur: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.compteur} role="group" aria-label={libelle}>
      <span className={styles.libelle}>{libelle}</span>
      <button
        type="button"
        className={styles.btn}
        aria-label={`${libelle} : un de moins`}
        disabled={valeur <= min}
        onClick={() => onChange(valeur - 1)}
      >
        −
      </button>
      <output className={styles.valeur} aria-live="polite">
        {valeur}
      </output>
      <button
        type="button"
        className={styles.btn}
        aria-label={`${libelle} : un de plus`}
        disabled={valeur >= max}
        onClick={() => onChange(valeur + 1)}
      >
        +
      </button>
    </div>
  );
}
