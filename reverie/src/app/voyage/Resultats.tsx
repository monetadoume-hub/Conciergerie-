"use client";

import { CarteProposition } from "@/components/resultats/CarteProposition";
import { T } from "@/lib/textes";
import type { MetaRecherche, Proposition } from "@/moteur/types";
import styles from "./voyage.module.css";

export function Resultats({
  propositions,
  meta,
  lieuDepart,
  inclut,
  arretee,
  onModifier,
}: {
  propositions: Proposition[];
  meta: MetaRecherche | null;
  lieuDepart: string;
  inclut: string[];
  arretee: boolean;
  onModifier: () => void;
}) {
  // Recherche arrêtée (pas de méta) : on prend l'heure du dernier prix relevé.
  const genereLe = meta?.genereLe ?? propositions.flatMap((p) => p.formules.map((f) => f.total.observedAt)).sort().at(-1);
  const heure = genereLe ? new Date(genereLe).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "";
  const simulation = propositions.some((p) => p.donnees === "simulation");

  return (
    <div className={styles.formulaire}>
      <h1>{propositions.length > 0 ? T.resultats.titre(propositions.length) : T.resultats.aucun}</h1>

      {arretee && <p className={styles.avertissement}>{T.resultats.arretee}</p>}
      {simulation && (
        <p className={styles.avertissement} role="note">
          <span aria-hidden="true">🧪 </span>
          {T.resultats.simulation}
        </p>
      )}
      {meta && !meta.depart.reconnu && <p className={styles.avertissement}>{T.resultats.departInconnu(lieuDepart)}</p>}
      {meta && meta.fournisseursEnEchec.length > 0 && (
        <p className={styles.avertissement}>{T.resultats.partiel(meta.fournisseursEnEchec.join(", "))}</p>
      )}

      {meta && meta.compris.length > 0 && (
        <details className={`carte ${styles.encart}`}>
          <summary>{T.resultats.compris}</summary>
          <ul>
            {meta.compris.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </details>
      )}

      <ol className={styles.propositions}>
        {propositions.map((p) => (
          <li key={p.id}>
            <CarteProposition p={p} inclut={inclut} />
          </li>
        ))}
      </ol>

      {meta && meta.exclues.length > 0 && (
        <details className={`carte ${styles.encart}`}>
          <summary>{T.resultats.exclues(meta.exclues.length)}</summary>
          <ul>
            {meta.exclues.map((e, i) => (
              <li key={i}>
                <strong>{e.destination}</strong> : {e.raison}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className={styles.mention}>{T.resultats.mention(heure)}</p>

      <button type="button" className="bouton bouton-secondaire" onClick={onModifier}>
        {T.resultats.modifier}
      </button>
    </div>
  );
}
