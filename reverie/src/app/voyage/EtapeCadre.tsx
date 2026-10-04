"use client";

import { Cases, Interrupteur } from "@/components/Cases";
import { Choix } from "@/components/Choix";
import { CurseurBudget } from "@/components/CurseurBudget";
import { SelecteurDates } from "@/components/SelecteurDates";
import type { Demande } from "@/lib/demande";
import { DEPASSEMENTS, EQUIPEMENTS, HEBERGEMENTS, POSTES_BUDGET, RYTHMES, TRANSPORTS, TYPES_VOYAGE } from "@/lib/options";
import { T } from "@/lib/textes";
import styles from "./voyage.module.css";

const DUREES_MAX = [2, 3, 4, 5, 6, 8, 10, 12, 24];
const CORRESPONDANCES = [0, 1, 2, 3];

/** Liste déroulante dont la première valeur signifie « pas de contrainte » (undefined). */
function Selection({
  libelle,
  valeur,
  options,
  vide,
  format,
  onChange,
}: {
  libelle: string;
  valeur: number | undefined;
  options: number[];
  vide: string;
  format: (n: number) => string;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className={styles.ligneAge}>
      <span>{libelle}</span>
      <select value={valeur ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}>
        <option value="">{vide}</option>
        {options.map((n) => (
          <option key={n} value={n}>
            {format(n)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function EtapeCadre({ d, maj }: { d: Demande; maj: (d: Demande) => void }) {
  const avecEtoiles = d.hebergements.types.includes("hotel") || d.hebergements.types.includes("resort");
  const etoiles = (n: number) => "★".repeat(n);

  return (
    <>
      <h1>{T.cadre.titre}</h1>

      <section className="carte">
        <Choix
          legende={T.cadre.type}
          options={TYPES_VOYAGE as { id: Demande["type"]; nom: string; aide: string }[]}
          valeur={d.type}
          onChange={(type) => maj({ ...d, type })}
        />
      </section>

      <section className="carte">
        <h2 className="petit-titre">{T.cadre.depart}</h2>
        <label className={styles.champ}>
          <span>{T.cadre.lieu}</span>
          <input
            value={d.depart.lieu}
            maxLength={120}
            placeholder={T.cadre.lieuExemple}
            autoComplete="address-level2"
            onChange={(e) => maj({ ...d, depart: { ...d.depart, lieu: e.target.value } })}
          />
        </label>
        <label className={styles.champ}>
          <span>{T.cadre.rayon(d.depart.rayonKm)}</span>
          <input
            type="range"
            className={styles.curseur}
            min={0}
            max={200}
            step={10}
            value={d.depart.rayonKm}
            onChange={(e) => maj({ ...d, depart: { ...d.depart, rayonKm: Number(e.target.value) } })}
          />
        </label>
      </section>

      <section className="carte">
        <SelecteurDates dates={d.dates} onChange={(dates) => maj({ ...d, dates })} />
      </section>

      <section className="carte">
        <h2 className="petit-titre">{T.cadre.budget}</h2>
        <CurseurBudget budget={d.budget} personnes={d.adultes + d.enfants} onChange={(budget) => maj({ ...d, budget })} />
        <Choix
          legende={T.cadre.depassement}
          compact
          options={DEPASSEMENTS.map((n) => ({ id: n, nom: n === 0 ? T.cadre.strict : `+${n} %` }))}
          valeur={d.budget.depassement}
          onChange={(depassement) => maj({ ...d, budget: { ...d.budget, depassement } })}
        />
        <Cases
          legende={T.cadre.inclut}
          options={POSTES_BUDGET}
          valeurs={d.budget.inclut}
          onChange={(inclut) => maj({ ...d, budget: { ...d.budget, inclut: inclut as Demande["budget"]["inclut"] } })}
        />
      </section>

      <section className="carte">
        <Cases
          legende={T.cadre.transports}
          aide={T.cadre.transportsAide}
          options={TRANSPORTS}
          valeurs={d.transports.modes}
          onChange={(modes) => maj({ ...d, transports: { ...d.transports, modes: modes as Demande["transports"]["modes"] } })}
        />
        <fieldset className={styles.famille}>
          <legend>{T.cadre.preferencesTrajet}</legend>
          <div className={styles.preferences}>
            <Selection
              libelle={T.cadre.dureeMax}
              valeur={d.transports.dureeMaxH}
              options={DUREES_MAX}
              vide={T.cadre.sansLimite}
              format={T.cadre.heures}
              onChange={(dureeMaxH) => maj({ ...d, transports: { ...d.transports, dureeMaxH } })}
            />
            <Selection
              libelle={T.cadre.correspondancesMax}
              valeur={d.transports.correspondancesMax}
              options={CORRESPONDANCES}
              vide={T.cadre.sansLimite}
              format={String}
              onChange={(correspondancesMax) => maj({ ...d, transports: { ...d.transports, correspondancesMax } })}
            />
            <div className={styles.pastilles}>
              <Interrupteur
                libelle={T.cadre.nuit}
                valeur={d.transports.nuit}
                onChange={(nuit) => maj({ ...d, transports: { ...d.transports, nuit } })}
              />
              <Interrupteur
                libelle={T.cadre.basCarbone}
                valeur={d.transports.basCarbone}
                onChange={(basCarbone) => maj({ ...d, transports: { ...d.transports, basCarbone } })}
              />
            </div>
          </div>
        </fieldset>
      </section>

      <section className="carte">
        <Cases
          legende={T.cadre.hebergements}
          options={HEBERGEMENTS}
          valeurs={d.hebergements.types}
          onChange={(types) => {
            const garde = types.includes("hotel") || types.includes("resort");
            maj({
              ...d,
              hebergements: {
                ...d.hebergements,
                types: types as Demande["hebergements"]["types"],
                // Sans hôtel ni resort, les étoiles n'ont plus de sens.
                etoilesMin: garde ? d.hebergements.etoilesMin : undefined,
                etoilesMax: garde ? d.hebergements.etoilesMax : undefined,
              },
            });
          }}
        />
        {avecEtoiles && (
          <fieldset className={styles.famille}>
            <legend>{T.cadre.etoiles}</legend>
            <div className={styles.preferences}>
              <Selection
                libelle={T.cadre.etoilesMin}
                valeur={d.hebergements.etoilesMin}
                options={[1, 2, 3, 4, 5]}
                vide={T.cadre.sansLimite}
                format={etoiles}
                onChange={(etoilesMin) => maj({ ...d, hebergements: { ...d.hebergements, etoilesMin } })}
              />
              <Selection
                libelle={T.cadre.etoilesMax}
                valeur={d.hebergements.etoilesMax}
                options={[1, 2, 3, 4, 5]}
                vide={T.cadre.sansLimite}
                format={etoiles}
                onChange={(etoilesMax) => maj({ ...d, hebergements: { ...d.hebergements, etoilesMax } })}
              />
            </div>
          </fieldset>
        )}
        <Cases
          legende={T.cadre.equipements}
          options={EQUIPEMENTS}
          valeurs={d.hebergements.equipements}
          onChange={(equipements) =>
            maj({ ...d, hebergements: { ...d.hebergements, equipements: equipements as Demande["hebergements"]["equipements"] } })
          }
        />
      </section>

      <section className="carte">
        <Choix
          legende={T.cadre.rythme}
          options={RYTHMES as { id: Demande["rythme"]; nom: string; aide: string }[]}
          valeur={d.rythme}
          onChange={(rythme) => maj({ ...d, rythme })}
        />
      </section>
    </>
  );
}
