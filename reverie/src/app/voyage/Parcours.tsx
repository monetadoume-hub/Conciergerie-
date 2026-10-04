"use client";

import { useRef, useState } from "react";
import { Paysage } from "@/components/Paysage";
import { demandeParDefaut, ECRANS, erreursDeLEcran, type Ecran } from "@/lib/brouillon";
import { verifierDemande, type Demande } from "@/lib/demande";
import type { ResultatRecherche } from "@/lib/recherche/horsLigne";
import { T } from "@/lib/textes";
import { EtapeCadre } from "./EtapeCadre";
import { EtapeEnvies } from "./EtapeEnvies";
import { EtapeGroupe } from "./EtapeGroupe";
import { Resultats } from "./Resultats";
import styles from "./voyage.module.css";

export function Parcours() {
  const [d, setD] = useState<Demande>(demandeParDefaut);
  const [ecran, setEcran] = useState<Ecran>("groupe");
  const [enCours, setEnCours] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [resultat, setResultat] = useState<ResultatRecherche | null>(null);
  const abandon = useRef<AbortController | null>(null);
  const zoneErreurs = useRef<HTMLDivElement>(null);

  const index = ECRANS.indexOf(ecran);
  const dernier = index === ECRANS.length - 1;

  function aller(e: Ecran) {
    setErreurs([]);
    setEcran(e);
    window.scrollTo({ top: 0 });
  }

  /** Vérifie l'écran en cours avec les mêmes règles que le serveur. */
  function erreursEcranCourant(): string[] {
    const v = verifierDemande(d);
    if (v.ok) return [];
    // Sur le dernier écran, toute erreur restante est montrée.
    return dernier ? v.erreurs : erreursDeLEcran(v.champs, ecran, v.erreurs);
  }

  function signaler(liste: string[]) {
    setErreurs(liste);
    requestAnimationFrame(() => zoneErreurs.current?.focus());
  }

  async function valider(ev: React.FormEvent) {
    ev.preventDefault();
    const locales = erreursEcranCourant();
    if (locales.length > 0) return signaler(locales);
    if (!dernier) return aller(ECRANS[index + 1]);

    const ctrl = new AbortController();
    abandon.current = ctrl;
    setEnCours(true);
    setErreurs([]);
    try {
      const rep = await fetch("/api/recherche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
        signal: ctrl.signal,
      });
      const json = await rep.json();
      if (!rep.ok) signaler(json.erreurs ?? [T.erreurs.reseau]);
      else {
        setResultat(json as ResultatRecherche);
        window.scrollTo({ top: 0 });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") signaler([T.erreurs.reseau]);
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
        <p>{T.parcours.recherche}</p>
        <button type="button" className="bouton bouton-secondaire" onClick={() => abandon.current?.abort()}>
          {T.parcours.arreter}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={valider} className={styles.formulaire} noValidate>
      <nav aria-label={T.parcours.progression(index + 1, ECRANS.length, T.parcours.etapes[index])}>
        <ol className={styles.progression}>
          {T.parcours.etapes.map((nom, i) => (
            <li key={nom} className={i <= index ? styles.etapeFaite : ""} aria-current={i === index ? "step" : undefined}>
              {i < index ? (
                <button type="button" className={styles.etapeLien} onClick={() => aller(ECRANS[i])}>
                  {nom}
                </button>
              ) : (
                <span>{nom}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {ecran === "groupe" && <EtapeGroupe d={d} maj={setD} />}
      {ecran === "envies" && <EtapeEnvies d={d} maj={setD} />}
      {ecran === "cadre" && <EtapeCadre d={d} maj={setD} />}

      {erreurs.length > 0 && (
        <div className={styles.erreurs} role="alert" tabIndex={-1} ref={zoneErreurs}>
          <p>{T.parcours.aCorriger}</p>
          <ul>
            {erreurs.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.navigation}>
        {index > 0 && (
          <button type="button" className="bouton bouton-secondaire" onClick={() => aller(ECRANS[index - 1])}>
            {T.parcours.precedent}
          </button>
        )}
        <button type="submit" className="bouton">
          {dernier ? T.parcours.chercher : T.parcours.suivant}
        </button>
      </div>
    </form>
  );
}
