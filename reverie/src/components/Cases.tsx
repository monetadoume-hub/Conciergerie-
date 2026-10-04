"use client";

import styles from "./Champs.module.css";

/** Choix multiple sous forme de pastilles (vraies cases à cocher, coche visible en plus de la couleur). */
export function Cases({
  legende,
  aide,
  options,
  valeurs,
  onChange,
}: {
  legende: string;
  aide?: string;
  options: readonly { id: string; nom: string }[];
  valeurs: readonly string[];
  onChange: (v: string[]) => void;
}) {
  function basculer(id: string) {
    onChange(valeurs.includes(id) ? valeurs.filter((v) => v !== id) : [...valeurs, id]);
  }
  return (
    <fieldset className={styles.groupe}>
      <legend className={styles.legende}>{legende}</legend>
      {aide && <p className={styles.aide}>{aide}</p>}
      <div className={styles.ligne}>
        {options.map((o) => {
          const coche = valeurs.includes(o.id);
          return (
            <label key={o.id} className={`${styles.pastille} ${coche ? styles.coche : ""}`}>
              <input type="checkbox" className="visuellement-cache" checked={coche} onChange={() => basculer(o.id)} />
              {coche && <span aria-hidden="true">✓ </span>}
              {o.nom}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Interrupteur oui / non, présenté comme une pastille. */
export function Interrupteur({
  libelle,
  valeur,
  onChange,
}: {
  libelle: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={`${styles.pastille} ${valeur ? styles.coche : ""}`}>
      <input type="checkbox" className="visuellement-cache" checked={valeur} onChange={(e) => onChange(e.target.checked)} />
      {valeur && <span aria-hidden="true">✓ </span>}
      {libelle}
    </label>
  );
}
