"use client";

import type { Demande } from "@/lib/demande";
import { T } from "@/lib/textes";
import styles from "./Champs.module.css";
import { Choix } from "./Choix";

type Budget = Demande["budget"];

const euros = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

/** Curseur de budget, avec la conversion groupe ↔ par personne calculée en direct. */
export function CurseurBudget({
  budget,
  personnes,
  onChange,
}: {
  budget: Budget;
  personnes: number;
  onChange: (b: Budget) => void;
}) {
  const max = budget.par === "groupe" ? 30_000 : 10_000;
  const autre = budget.par === "groupe" ? Math.round(budget.montant / personnes) : budget.montant * personnes;

  function changerPar(par: Budget["par"]) {
    if (par === budget.par) return;
    // On garde le même budget réel en changeant d'unité.
    const montant = par === "personne" ? Math.round(budget.montant / personnes) : budget.montant * personnes;
    onChange({ ...budget, par, montant: Math.min(100_000, Math.max(50, montant)) });
  }

  return (
    <div className={styles.dates}>
      <Choix
        legende={T.cadre.budgetPour}
        compact
        options={[
          { id: "groupe" as const, nom: T.cadre.parGroupe },
          { id: "personne" as const, nom: T.cadre.parPersonne },
        ]}
        valeur={budget.par}
        onChange={changerPar}
      />
      <label className={styles.champDate}>
        <span>{T.cadre.montant}</span>
        <input
          type="range"
          min={50}
          max={max}
          step={50}
          value={Math.min(budget.montant, max)}
          onChange={(e) => onChange({ ...budget, montant: Number(e.target.value) })}
          aria-valuetext={euros(budget.montant)}
        />
      </label>
      <div className={styles.montant}>
        <input
          type="number"
          inputMode="numeric"
          min={50}
          max={100_000}
          step={50}
          aria-label={T.cadre.montantExact}
          value={budget.montant}
          onChange={(e) => onChange({ ...budget, montant: Math.round(Number(e.target.value) || 0) })}
        />
        <span>€ {budget.par === "groupe" ? T.cadre.parGroupe : T.cadre.parPersonne}</span>
      </div>
      <p className={styles.resume} aria-live="polite">
        {budget.par === "groupe" ? T.cadre.soitParPersonne(euros(autre)) : T.cadre.soitPourGroupe(euros(autre))}
      </p>
    </div>
  );
}
