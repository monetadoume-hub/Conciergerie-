import { verifierDemande } from "@/lib/demande";
import { creerLimiteur } from "@/lib/limiteur";
import { rechercherHorsLigne } from "@/lib/recherche/horsLigne";

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
    return Response.json({ erreurs: verification.erreurs }, { status: 400 });
  }

  // Étape 0 : seul le catalogue hors ligne répond. Les fournisseurs arrivent à l'étape 2.
  return Response.json(rechercherHorsLigne(verification.demande), {
    headers: { "Cache-Control": "no-store" },
  });
}
