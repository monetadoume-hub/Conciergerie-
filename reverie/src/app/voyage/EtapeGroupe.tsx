"use client";

import { Cases, Interrupteur } from "@/components/Cases";
import { Compteur } from "@/components/Compteur";
import { changerPersonnes, nouveauVoyageur } from "@/lib/brouillon";
import { AGE_MAX_ENFANT, MAX_PROFILS, type Demande, type Voyageur } from "@/lib/demande";
import { ACCESSIBILITE, AVATARS, LANGUES, REGIMES } from "@/lib/options";
import { T } from "@/lib/textes";
import styles from "./voyage.module.css";

export function EtapeGroupe({ d, maj }: { d: Demande; maj: (d: Demande) => void }) {
  const maxProfils = Math.min(MAX_PROFILS, d.adultes + d.enfants);

  const majVoyageur = (i: number, v: Partial<Voyageur>) =>
    maj({ ...d, voyageurs: d.voyageurs.map((x, j) => (j === i ? { ...x, ...v } : x)) });

  return (
    <>
      <h1>{T.groupe.titre}</h1>

      <section className="carte">
        <Compteur libelle={T.groupe.adultes} valeur={d.adultes} min={1} max={12} onChange={(a) => maj(changerPersonnes(d, a, d.enfants))} />
        <Compteur libelle={T.groupe.enfants} valeur={d.enfants} min={0} max={10} onChange={(e) => maj(changerPersonnes(d, d.adultes, e))} />
        {d.enfants > 0 && (
          <div className={styles.ages}>
            <p className={styles.aide}>{T.groupe.agesAide}</p>
            {d.agesEnfants.map((age, i) => (
              <label key={i} className={styles.ligneAge}>
                <span>{T.groupe.ageEnfant(i + 1)}</span>
                <select
                  value={age}
                  onChange={(e) => maj({ ...d, agesEnfants: d.agesEnfants.map((a, j) => (j === i ? Number(e.target.value) : a)) })}
                >
                  {Array.from({ length: AGE_MAX_ENFANT + 1 }, (_, n) => (
                    <option key={n} value={n}>
                      {T.groupe.ans(n)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="carte">
        <h2 className="petit-titre">{T.groupe.profils}</h2>
        <p className={styles.aide}>{T.groupe.profilsAide(MAX_PROFILS)}</p>
        <ul className={styles.profils}>
          {d.voyageurs.map((v, i) => (
            <li key={i} className={styles.profil}>
              <label className={styles.champ}>
                <span>
                  {T.groupe.prenom} {d.voyageurs.length > 1 ? i + 1 : ""}
                </span>
                <input value={v.prenom} maxLength={40} onChange={(e) => majVoyageur(i, { prenom: e.target.value })} />
              </label>
              <fieldset className={styles.avatars}>
                <legend className="visuellement-cache">{T.groupe.avatar}</legend>
                {AVATARS.map((a) => (
                  <label key={a} className={`${styles.avatar} ${v.avatar === a ? styles.avatarActif : ""}`}>
                    <input
                      type="radio"
                      name={`avatar-${i}`}
                      className="visuellement-cache"
                      checked={v.avatar === a}
                      onChange={() => majVoyageur(i, { avatar: a })}
                      aria-label={T.groupe.avatarDe(v.prenom, a)}
                    />
                    <span aria-hidden="true">{a}</span>
                  </label>
                ))}
              </fieldset>
              {d.voyageurs.length > 1 && (
                <button
                  type="button"
                  className={styles.lien}
                  onClick={() => maj({ ...d, voyageurs: d.voyageurs.filter((_, j) => j !== i) })}
                >
                  {T.groupe.retirerProfil(v.prenom)}
                </button>
              )}
            </li>
          ))}
        </ul>
        {d.voyageurs.length < maxProfils && (
          <button
            type="button"
            className="bouton bouton-secondaire"
            onClick={() => maj({ ...d, voyageurs: [...d.voyageurs, nouveauVoyageur(d.voyageurs.length + 1)] })}
          >
            + {T.groupe.ajouterProfil}
          </button>
        )}
      </section>

      <section className="carte">
        <h2 className="petit-titre">{T.groupe.options}</h2>
        <div>
          <Interrupteur
            libelle={T.groupe.animal}
            valeur={d.groupe.animal}
            onChange={(animal) => maj({ ...d, groupe: { ...d.groupe, animal } })}
          />
        </div>
        <Cases
          legende={T.groupe.accessibilite}
          options={ACCESSIBILITE}
          valeurs={d.groupe.accessibilite}
          onChange={(accessibilite) => maj({ ...d, groupe: { ...d.groupe, accessibilite } })}
        />
        <Cases
          legende={T.groupe.regime}
          options={REGIMES}
          valeurs={d.groupe.regime}
          onChange={(regime) => maj({ ...d, groupe: { ...d.groupe, regime } })}
        />
        <Cases
          legende={T.groupe.langues}
          options={LANGUES}
          valeurs={d.groupe.langues}
          onChange={(langues) => maj({ ...d, groupe: { ...d.groupe, langues } })}
        />
      </section>
    </>
  );
}
