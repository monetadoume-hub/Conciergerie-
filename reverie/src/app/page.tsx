import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Paysage } from "@/components/Paysage";
import { T } from "@/lib/textes";
import styles from "./accueil.module.css";

export default function Accueil() {
  return (
    <main className={styles.accueil}>
      <header className="conteneur">
        <Logo />
      </header>

      <section className={`conteneur ${styles.texte}`}>
        <h1 className={styles.titre}>
          {T.accueil.titre}
          <br />
          <span className={`manuscrit ${styles.manuscrit}`}>{T.accueil.titreManuscrit}</span>
        </h1>
        <p className={styles.sousTitre}>{T.accueil.sousTitre}</p>
        <Link href="/voyage" className="bouton">
          {T.accueil.bouton}
        </Link>
      </section>

      <div className={styles.paysage}>
        <Paysage />
      </div>

      <footer className={`conteneur ${styles.pied}`}>{T.signature}</footer>
    </main>
  );
}
