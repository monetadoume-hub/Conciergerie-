"use client";

import { useId } from "react";
import styles from "./Champs.module.css";

/** Choix unique sous forme de grandes cartes (vrais boutons radio : clavier et lecteurs d'écran). */
export function Choix<T extends string | number>({
  legende,
  options,
  valeur,
  onChange,
  compact = false,
}: {
  legende: string;
  options: readonly { id: T; nom: string; aide?: string }[];
  valeur: T;
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  const nom = useId();
  return (
    <fieldset className={styles.groupe}>
      <legend className={styles.legende}>{legende}</legend>
      <div className={compact ? styles.ligne : styles.grille}>
        {options.map((o) => (
          <label key={String(o.id)} className={`${styles.carteChoix} ${valeur === o.id ? styles.coche : ""}`}>
            <input
              type="radio"
              name={nom}
              className="visuellement-cache"
              checked={valeur === o.id}
              onChange={() => onChange(o.id)}
            />
            <span className={styles.nomChoix}>
              {valeur === o.id && <span aria-hidden="true">● </span>}
              {o.nom}
            </span>
            {o.aide && <span className={styles.aideChoix}>{o.aide}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
