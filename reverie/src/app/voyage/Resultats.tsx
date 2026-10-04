"use client";

import type { ResultatRecherche } from "@/lib/recherche/horsLigne";
import { T } from "@/lib/textes";
import styles from "./voyage.module.css";

const formatEuros = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function Resultats({ resultat, onModifier }: { resultat: ResultatRecherche; onModifier: () => void }) {
  const heure = new Date(resultat.genereLe).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  const { propositions } = resultat;

  return (
    <div className={styles.formulaire}>
      <h1>{propositions.length > 0 ? T.resultats.titre(propositions.length) : T.resultats.aucun}</h1>

      <ol className={styles.propositions}>
        {propositions.map((p) => (
          <li key={p.id} className={`carte ${styles.proposition}`}>
            <div className={styles.entete}>
              <div>
                <h2>{p.destination}</h2>
                <p className={styles.pays}>{p.pays}</p>
              </div>
              <span className={styles.score} aria-label={`Score ${p.score} sur 100`}>
                {p.score}
              </span>
            </div>
            <p>{p.accroche}</p>

            <ul className={styles.jauges}>
              {p.satisfaction.map((s) => (
                <li key={s.prenom}>
                  {s.prenom} : {s.envies} envie{s.envies > 1 ? "s" : ""} sur {s.sur}
                </li>
              ))}
            </ul>

            <p className={p.estimation.dansLaMarge ? styles.budgetOk : styles.budgetKo}>
              {p.estimation.dansLeBudget
                ? T.resultats.dansBudget
                : p.estimation.dansLaMarge
                  ? T.resultats.dansMarge
                  : T.resultats.horsBudget}{" "}
              · {T.resultats.estimation(p.estimation.nuits)} : {formatEuros(p.estimation.total)}
            </p>

            {p.reponses.length > 0 && (
              <>
                <h3 className="petit-titre">{T.resultats.reponses}</h3>
                <ul className={styles.liste}>
                  {p.reponses.map((r, i) => (
                    <li key={i}>
                      <strong>{r.qui}</strong> · {r.envie} → {r.reponse}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {p.refusEvites.length > 0 && (
              <>
                <h3 className="petit-titre">{T.resultats.refusEvites}</h3>
                <p>{p.refusEvites.join(" · ")}</p>
              </>
            )}

            {p.compromis.length > 0 && (
              <>
                <h3 className="petit-titre">{T.resultats.compromis}</h3>
                <ul className={styles.liste}>
                  {p.compromis.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </>
            )}

            <details>
              <summary>{T.resultats.pourquoi}</summary>
              <ul className={styles.liste}>
                {p.pourquoi.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ol>

      <p className={styles.mention}>{T.resultats.mention(heure)}</p>

      <button type="button" className="bouton bouton-secondaire" onClick={onModifier}>
        {T.resultats.modifier}
      </button>
    </div>
  );
}
