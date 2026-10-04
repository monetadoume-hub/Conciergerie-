"use client";

import { useState } from "react";
import { PastilleEnvie } from "@/components/PastilleEnvie";
import { LONGUEUR_MAX_TEXTE, type Demande, type Voyageur } from "@/lib/demande";
import { FAMILLES_ENVIES } from "@/lib/envies";
import { T } from "@/lib/textes";
import styles from "./voyage.module.css";

export function EtapeEnvies({ d, maj }: { d: Demande; maj: (d: Demande) => void }) {
  const [actif, setActif] = useState(0);
  const i = Math.min(actif, d.voyageurs.length - 1);
  const v = d.voyageurs[i];

  const majVoyageur = (m: Partial<Voyageur>) =>
    maj({ ...d, voyageurs: d.voyageurs.map((x, j) => (j === i ? { ...x, ...m } : x)) });

  const etats = Object.values(v.envies);
  const nbAime = etats.filter((e) => e === "aime").length;

  return (
    <>
      <h1>{T.voyage.titre}</h1>

      {d.voyageurs.length > 1 && (
        <div className={styles.onglets} role="tablist" aria-label={T.voyage.voyageurs}>
          {d.voyageurs.map((x, j) => (
            <button
              key={j}
              type="button"
              role="tab"
              aria-selected={j === i}
              className={`${styles.onglet} ${j === i ? styles.ongletActif : ""}`}
              onClick={() => setActif(j)}
            >
              <span aria-hidden="true">{x.avatar} </span>
              {x.prenom || "?"}
            </button>
          ))}
        </div>
      )}

      <section className="carte" role={d.voyageurs.length > 1 ? "tabpanel" : undefined}>
        <p className={styles.resumeEnvies}>
          <span aria-hidden="true">{v.avatar} </span>
          <strong>{v.prenom}</strong> · {T.voyage.resumeEnvies(nbAime, etats.length - nbAime)}
        </p>
        <p className={styles.aide}>{T.voyage.aideEnvies}</p>
        {FAMILLES_ENVIES.map((f) => (
          <fieldset key={f.id} className={styles.famille}>
            <legend>{f.nom}</legend>
            <div className={styles.pastilles}>
              {f.envies.map((e) => (
                <PastilleEnvie
                  key={e.id}
                  nom={e.nom}
                  etat={v.envies[e.id]}
                  onChange={(etat) => {
                    const envies = { ...v.envies };
                    if (etat) envies[e.id] = etat;
                    else delete envies[e.id];
                    majVoyageur({ envies });
                  }}
                />
              ))}
            </div>
          </fieldset>
        ))}

        <TexteLibre
          libelle={T.voyage.reve}
          exemple={T.voyage.reveExemple}
          valeur={v.reve ?? ""}
          onChange={(reve) => majVoyageur({ reve })}
        />
        <TexteLibre
          libelle={T.voyage.refus}
          exemple={T.voyage.refusExemple}
          valeur={v.refusLibre ?? ""}
          onChange={(refusLibre) => majVoyageur({ refusLibre })}
        />
      </section>
    </>
  );
}

function TexteLibre({
  libelle,
  exemple,
  valeur,
  onChange,
}: {
  libelle: string;
  exemple: string;
  valeur: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className={styles.champ}>
      <span>{libelle}</span>
      <textarea rows={2} maxLength={LONGUEUR_MAX_TEXTE} placeholder={exemple} value={valeur} onChange={(e) => onChange(e.target.value)} />
      <small className={styles.aide}>{T.voyage.caracteresRestants(LONGUEUR_MAX_TEXTE - valeur.length)}</small>
    </label>
  );
}
