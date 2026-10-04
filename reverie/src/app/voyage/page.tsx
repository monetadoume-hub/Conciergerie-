import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Parcours } from "./Parcours";

export default function Voyage() {
  return (
    <main className="conteneur" style={{ paddingTop: 20, paddingBottom: 48 }}>
      <Link href="/" aria-label="Retour à l'accueil" style={{ textDecoration: "none" }}>
        <Logo taille={32} />
      </Link>
      <Parcours />
    </main>
  );
}
