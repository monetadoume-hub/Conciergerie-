"use client";

import { useRef, useState } from "react";
import { Compteur } from "@/components/Compteur";
import { PastilleEnvie } from "@/components/PastilleEnvie";
import { Paysage } from "@/components/Paysage";
import { LONGUEUR_MAX_TEXTE, MAX_PROFILS, type Demande, type Voyageur } from "@/lib/demande";
import { FAMILLES_ENVIES } from "@/lib/envies";
import type { ResultatRecherche } from "@/lib/recherche/horsLigne";
import { T } from "@/lib/textes";
import { Resultats } from "./Resultats";
import styles from "./voyage.module.css";

const nouveauVoyageur = (n: number): Voyageur => ({ prenom: `Voyageur ${n}`, envies: {} });

export function Parcours() {
  const [adultes, setAdultes] = useState(2);
  const [enfants, setEnfants] = useState(0);
  const [voyageurs, setVoyageurs] = useState<Voyageur[]>([nouveauVoyageur(1)]);
  const [actif, setActif] = useState(0);
  const [nuits, setNuits] = useState(5);
  const [montant, setMontant] = useState(1500);
  const [par, setPar] = useState<"groupe" | "personne">("groupe");

  const [enCours, setEnCours] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [resultat, setResultat] = useState<ResultatRecherche | null>(null);
  const abandon = useRef<AbortController | null>(null);

  const personnes = adultes + enfants;
  const maxProfils = Math.min(MAX_PROFILS, personnes);
  const v = voyageurs[actif];

  function modifierVoyageur(maj: Partial<Voyageur>) {
    setVoyageurs((vs) => vs.map((x, i) => (i === actif ? { ...x, ...maj } : x)));
  }

  function ajouterProfil() {
    if (voyageurs.length >= maxProfils) return;
    setVoyageurs((vs) => [...vs, nouveauVoyageur(vs.length + 1)]);
    setActif(voyageurs.length);
  }

  function retirerProfil() {
    if (voyageurs.length <= 1) return;
    setVoyageurs((vs) => vs.filter((_, i) => i !== actif));
    setActif(0);
  }

  function changerPersonnes(a: number, e: number) {
    setAdultes(a);
    setEnfants(e);
    const max = Math.min(MAX_PROFILS, a + e);
    if (voyageurs.length > max) {
      setVoyageurs((vs) => vs.slice(0, max));
      setActif(0);
    }
  }

  async function chercher(ev: React.FormEvent) {
    ev.preventDefault();
    const demande: Demande = { voyageurs, adultes, enfants, nuits, budget: { montant, par } };
    const ctrl = new AbortController();
    abandon.current = ctrl;
    setEnCours(true);
    setErreurs([]);
    try {
      const rep = await fetch("/api/recherche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demande),
        signal: ctrl.signal,
      });
      const json = await rep.json();
      if (!rep.ok) setErreurs(json.erreurs ?? [T.erreurs.reseau]);
      else setResultat(json as ResultatRecherche);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErreurs([T.erreurs.reseau]);
    } finally {
      setEnCours(false);
      abandon.current = null;
    }
  }

  if (resultat) {
    return <Resultats resultat={resultat} onModifier={() => setResultat(null)} />;
  }

  if (enCours) {
    return (
      <div className={styles.attente} role="status">
        <div className={styles.attentePaysage}>
          <Paysage anime />
        </div>
        <p>{T.voyage.recherche}</p>
        <button type="button" className="bouton bouton-secondaire" onClick={() => abandon.current?.abort()}>
          {T.voyage.arreter}
        </button>
      </div>
    );
  }

  const autreMontant = par === "groupe" ? Math.round(montant / personnes) : montant * personnes;

  return (
    <form onSubmit={chercher} className={styles.formulaire}>
      <h1>{T.voyage.titre}</h1>

      <section className="carte">
        <h2 className="petit-titre">{T.voyage.groupe}</h2>
        <Compteur libelle={T.voyage.adultes} valeur={adultes} min={1} max={12} onChange={(a) => changerPersonnes(a, enfants)} />
        <Compteur libelle={T.voyage.enfants} valeur={enfants} min={0} max={10} onChange={(e) => changerPersonnes(adultes, e)} />
      </section>

      <section className="carte">
        <h2 className="petit-titre">{T.voyage.voyageurs}</h2>
        <div className={styles.onglets} role="tablist" aria-label={T.voyage.voyageurs}>
          {voyageurs.map((x, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === actif}
              className={`${styles.onglet} ${i === actif ? styles.ongletActif : ""}`}
              onClick={() => setActif(i)}
            >
              {x.prenom || "?"}
            </button>
          ))}
          {voyageurs.length < maxProfils && (
            <button type="button" className={styles.onglet} onClick={ajouterProfil} aria-label={T.voyage.ajouterProfil}>
              +
            </button>
          )}
        </div>

        <div role="tabpanel" className={styles.panneau}>
          <label className={styles.champ}>
            <span>{T.voyage.prenom}</span>
            <input value={v.prenom} maxLength={40} onChange={(e) => modifierVoyageur({ prenom: e.target.value })} required />
          </label>

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
                      modifierVoyageur({ envies });
                    }}
                  />
                ))}
              </div>
            </fieldset>
          ))}

          <label className={styles.champ}>
            <span>{T.voyage.reve}</span>
            <textarea
              rows={2}
              maxLength={LONGUEUR_MAX_TEXTE}
              placeholder={T.voyage.reveExemple}
              value={v.reve ?? ""}
              onChange={(e) => modifierVoyageur({ reve: e.target.value })}
            />
          </label>
          <label className={styles.champ}>
            <span>{T.voyage.refus}</span>
            <textarea
              rows={2}
              maxLength={LONGUEUR_MAX_TEXTE}
              placeholder={T.voyage.refusExemple}
              value={v.refusLibre ?? ""}
              onChange={(e) => modifierVoyageur({ refusLibre: e.target.value })}
            />
          </label>

          {voyageurs.length > 1 && (
            <button type="button" className={styles.lien} onClick={retirerProfil}>
              {T.voyage.retirerProfil}
            </button>
          )}
        </div>
      </section>

      <section className="carte">
        <h2 className="petit-titre">{T.voyage.cadre}</h2>
        <Compteur libelle={T.voyage.nuits} valeur={nuits} min={1} max={30} onChange={setNuits} />

        <label className={styles.champ}>
          <span>{T.voyage.budget} (€)</span>
          <input
            type="number"
            inputMode="numeric"
            min={50}
            max={100000}
            step={50}
            value={montant}
            onChange={(e) => setMontant(Math.round(Number(e.target.value) || 0))}
            required
          />
        </label>
        <div className={styles.choix} role="radiogroup" aria-label={T.voyage.budget}>
          {(["groupe", "personne"] as const).map((p) => (
            <label key={p} className={`${styles.option} ${par === p ? styles.optionActive : ""}`}>
              <input type="radio" name="par" value={p} checked={par === p} onChange={() => setPar(p)} />
              {p === "groupe" ? T.voyage.parGroupe : T.voyage.parPersonne}
            </label>
          ))}
        </div>
        <p className={styles.aide}>
          {par === "groupe" ? T.voyage.soitParPersonne(autreMontant) : T.voyage.soitPourGroupe(autreMontant)}
        </p>
      </section>

      {erreurs.length > 0 && (
        <div className={styles.erreurs} role="alert">
          <ul>
            {erreurs.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <button type="submit" className={`bouton ${styles.envoyer}`}>
        {T.voyage.chercher}
      </button>
    </form>
  );
}
