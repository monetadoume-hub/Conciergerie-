import { verifierDemande } from "@/lib/demande";
import { creerLimiteur } from "@/lib/limiteur";
import { rechercher } from "@/moteur";
import type { Evenement } from "@/moteur/types";
import { journal } from "@/providers/outils";
import { fournisseursActifs } from "@/providers/registre";

const TAILLE_MAX_OCTETS = 16_000;
const limiteur = creerLimiteur(20, 10 * 60 * 1000); // 20 recherches / 10 min / visiteur

function visiteur(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnu";
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ erreurs: ["Format attendu : JSON."] }, { status: 415 });
  }
  if (!limiteur.autoriser(visiteur(request))) {
    return Response.json(
      { erreurs: ["Trop de recherches d'affilée. Réessayez dans quelques minutes."] },
      { status: 429 },
    );
  }

  const texte = await request.text();
  if (texte.length > TAILLE_MAX_OCTETS) {
    return Response.json({ erreurs: ["Demande trop volumineuse."] }, { status: 413 });
  }

  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return Response.json({ erreurs: ["JSON invalide."] }, { status: 400 });
  }

  const verification = verifierDemande(brut);
  if (!verification.ok) {
    return Response.json({ erreurs: verification.erreurs, champs: verification.champs }, { status: 400 });
  }

  // Réponse en flux : une ligne JSON par événement (étape, proposition, fin), dès qu'il est prêt.
  const encodeur = new TextEncoder();
  const flux = new ReadableStream<Uint8Array>({
    async start(controleur) {
      const envoyer = (e: Evenement | { type: "erreur"; erreurs: string[] }) => {
        try {
          controleur.enqueue(encodeur.encode(`${JSON.stringify(e)}\n`));
        } catch {
          // Le visiteur est parti (bouton « Arrêter ») : on ignore.
        }
      };
      try {
        await rechercher(verification.demande, {
          fournisseurs: fournisseursActifs(),
          emettre: envoyer,
          signal: request.signal,
        });
      } catch (e) {
        journal("erreur", "recherche en échec", { erreur: String(e) });
        envoyer({ type: "erreur", erreurs: ["La recherche a rencontré un problème. Réessayez dans un instant."] });
      } finally {
        try {
          controleur.close();
        } catch {
          // déjà fermé
        }
      }
    },
  });

  return new Response(flux, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
