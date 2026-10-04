"use client";

import { useId, useState } from "react";
import { HEBERGEMENTS, EQUIPEMENTS } from "@/lib/options";
import { T } from "@/lib/textes";
import { NOMS_FORMULES, type Formule, type NomFormule, type Poste, type Proposition } from "@/moteur/types";
import type { PriceQuote, TransportOffer } from "@/providers/types";
import { BlocMeteo } from "./BlocMeteo";
import styles from "./resultats.module.css";

const euros = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const dateHeure = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

const NOMS_EQUIPEMENTS = Object.fromEntries(EQUIPEMENTS.map((e) => [e.id, e.nom]));
const NOMS_HEBERGEMENTS = Object.fromEntries(HEBERGEMENTS.map((e) => [e.id, e.nom]));

const ICONES: Record<TransportOffer["mode"], string> = {
  avion: "✈️",
  train: "🚆",
  bus: "🚌",
  covoiturage: "🚗",
  ferry: "⛴️",
  voiture: "🚗",
  location: "🚙",
  velo: "🚲",
};

function Nature({ prix }: { prix: PriceQuote }) {
  return <span className={`${styles.nature} ${styles[prix.nature]}`}>{T.resultats.nature[prix.nature]}</span>;
}

function Budget({ f }: { f: Formule }) {
  const [cls, txt] = f.dansLeBudget
    ? [styles.ok, T.resultats.dansBudget]
    : f.dansLaMarge
      ? [styles.marge, T.resultats.dansMarge]
      : [styles.hors, T.resultats.horsBudget];
  return (
    <span className={`${styles.pastilleBudget} ${cls}`}>
      <span aria-hidden="true">{f.dansLaMarge ? "✓ " : "! "}</span>
      {txt}
    </span>
  );
}

function DetailFormule({ f, inclut }: { f: Formule; inclut: string[] }) {
  return (
    <div className={styles.formule}>
      <div className={styles.totalLigne}>
        <div>
          <p className={styles.total}>{euros(f.total.amount)}</p>
          {f.totalBudget !== f.total.amount && <p className={styles.petit}>{T.resultats.compteBudget(euros(f.totalBudget))}</p>}
        </div>
        <Budget f={f} />
      </div>

      <h4 className={styles.sousTitre}>{T.resultats.trajet}</h4>
      <ol className={styles.segments}>
        {f.trajet.segments.map((s) => (
          <li key={s.id}>
            <span aria-hidden="true">{ICONES[s.mode]} </span>
            {s.resume}
            <span className={styles.petit}>
              {" "}
              · {Math.floor(s.dureeMin / 60)} h {String(s.dureeMin % 60).padStart(2, "0")}
              {s.correspondances > 0 ? ` · ${T.resultats.correspondances(s.correspondances)}` : ""}
            </span>
          </li>
        ))}
        {f.trajet.segments.length === 0 && <li>{f.trajet.resume}</li>}
        {f.trajet.location && (
          <li>
            <span aria-hidden="true">{f.trajet.location.type === "velo" ? "🚲" : "🚙"} </span>
            {f.trajet.location.description} ({f.trajet.location.jours} j)
          </li>
        )}
      </ol>
      <p className={styles.chiffres}>
        <span>
          {T.resultats.portePorte} : <strong>{f.dureePorteAPorte}</strong>
        </span>
        <span>{T.resultats.correspondances(f.trajet.correspondances)}</span>
        <span>
          {T.resultats.co2} : <strong>{f.co2Kg} kg</strong>
        </span>
      </p>

      <h4 className={styles.sousTitre}>{T.resultats.hebergement}</h4>
      <ul className={styles.liste}>
        {f.sejours.map((s, i) => (
          <li key={i}>
            <strong>{s.hebergement.nom}</strong>
            {s.hebergement.etoiles ? ` ${"★".repeat(s.hebergement.etoiles)}` : ""} — {s.lieu}, {T.resultats.nuits(s.nuits)}
            {s.hebergement.note > 0 && <span className={styles.petit}> · {T.resultats.note(s.hebergement.note)}</span>}
            {s.hebergement.type !== "estimation" && NOMS_HEBERGEMENTS[s.hebergement.type] && (
              <span className={styles.petit}> · {NOMS_HEBERGEMENTS[s.hebergement.type]}</span>
            )}
            {s.equipementsOk.length > 0 && (
              <span className={styles.petit}> · ✓ {s.equipementsOk.map((e) => NOMS_EQUIPEMENTS[e]).join(", ")}</span>
            )}
            {s.equipementsManquants.length > 0 && (
              <span className={styles.petit}>
                {" "}
                · {T.resultats.manque} {s.equipementsManquants.map((e) => NOMS_EQUIPEMENTS[e]).join(", ")}
              </span>
            )}
          </li>
        ))}
      </ul>

      {f.activites.length > 0 && (
        <>
          <h4 className={styles.sousTitre}>{T.resultats.activites}</h4>
          <ul className={styles.liste}>
            {f.activites.map((a) => (
              <li key={a.id}>
                {a.insolite && <span aria-hidden="true">✨ </span>}
                {a.nom} — {a.prix ? euros(a.prix.amount) : T.resultats.gratuit}
                <span className={styles.petit}>{T.resultats.pour(a.pourQui)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <details className={styles.details}>
        <summary>{T.resultats.detail}</summary>
        <table className={styles.tableau}>
          <tbody>
            {(Object.entries(f.detail) as [Poste, PriceQuote][]).map(([poste, q]) => (
              <tr key={poste}>
                <th scope="row">
                  {T.resultats.postes[poste]}
                  {!inclut.includes(poste) && <span className={styles.petit}> ({T.resultats.horsBudgetPoste})</span>}
                </th>
                <td>
                  {euros(q.amount)} <Nature prix={q} />
                  <span className={styles.source}>{T.resultats.releve(dateHeure(q.observedAt), q.provider)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      {f.notes.length > 0 && (
        <ul className={styles.notes}>
          {f.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CarteProposition({ p, inclut }: { p: Proposition; inclut: string[] }) {
  const [formule, setFormule] = useState<NomFormule>("equilibree");
  const id = useId();
  const f = p.formules.find((x) => x.nom === formule) ?? p.formules[0];

  return (
    <article className={`carte ${styles.carte}`} aria-labelledby={`${id}-titre`}>
      <header className={styles.entete}>
        <div>
          <h2 id={`${id}-titre`}>{p.destination}</h2>
          <p className={styles.pays}>
            {p.pays} · {p.periode.libelle}
          </p>
        </div>
        <span className={styles.score} role="img" aria-label={T.resultats.sur100(p.score)}>
          {p.score}
        </span>
      </header>

      <p>{p.accroche}</p>

      <ul className={styles.jauges} aria-label="Envies satisfaites par voyageur">
        {p.satisfaction.map((s) => (
          <li key={s.prenom} className={s.envies === s.sur ? styles.jaugePleine : ""}>
            {s.avatar && <span aria-hidden="true">{s.avatar} </span>}
            {s.prenom} : {s.envies} envie{s.envies > 1 ? "s" : ""} sur {s.sur}
          </li>
        ))}
      </ul>

      <BlocMeteo meteo={p.meteo} />

      <h3 className="petit-titre">{T.resultats.formules}</h3>
      <div className={styles.onglets} role="tablist" aria-label={T.resultats.formules}>
        {NOMS_FORMULES.map((n) => {
          const fx = p.formules.find((x) => x.nom === n)!;
          return (
            <button
              key={n}
              type="button"
              role="tab"
              id={`${id}-${n}`}
              aria-selected={formule === n}
              aria-controls={`${id}-panneau`}
              className={`${styles.onglet} ${formule === n ? styles.ongletActif : ""}`}
              onClick={() => setFormule(n)}
            >
              <span>{T.resultats.nomsFormules[n]}</span>
              <span className={styles.ongletPrix}>
                {euros(fx.totalBudget)}
                {!fx.dansLaMarge && <span aria-label={T.resultats.horsBudget}> !</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${id}-panneau`} aria-labelledby={`${id}-${formule}`}>
        <DetailFormule f={f} inclut={inclut} />
      </div>

      {p.etapes && p.etapes.length > 1 && (
        <>
          <h3 className="petit-titre">{T.resultats.etapes}</h3>
          <ol className={styles.frise}>
            {p.etapes.map((e) => (
              <li key={e.lieu}>
                {e.depuisPrecedente && (
                  <span className={styles.petit}>
                    {e.depuisPrecedente.mode === "velo" ? "🚲" : "🚗"} {e.depuisPrecedente.distanceKm} km ·{" "}
                    {Math.floor(e.depuisPrecedente.dureeMin / 60)} h {String(e.depuisPrecedente.dureeMin % 60).padStart(2, "0")}
                  </span>
                )}
                <strong>{e.lieu}</strong> · {T.resultats.nuits(e.nuits)}
              </li>
            ))}
          </ol>
        </>
      )}

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
          <ul className={styles.liste}>
            {p.refusEvites.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
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

      <details className={styles.details}>
        <summary>{T.resultats.pourquoi}</summary>
        <ul className={styles.liste}>
          {p.pourquoi.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}
