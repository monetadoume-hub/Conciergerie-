// Validation stricte de la demande envoyée par le navigateur.
// Tout ce qui n'est pas prévu ici est refusé (schéma « strict »).
// Étape 0 : sous-ensemble du type `Demande` du cahier des charges (§6) ; l'étape 1 l'étendra.

import { z } from "zod";
import { IDS_ENVIES } from "./envies";

export const LONGUEUR_MAX_TEXTE = 220;
export const MAX_PROFILS = 6;

// Texte libre : une simple donnée. On retire les caractères de contrôle et on borne la longueur.
const texteLibre = z
  .string()
  .max(LONGUEUR_MAX_TEXTE)
  .transform((t) => t.replace(/[\u0000-\u001F\u007F]/g, " ").trim())
  .optional();

const envieId = z.enum(IDS_ENVIES as [string, ...string[]]);

export const schemaVoyageur = z.strictObject({
  prenom: z.string().trim().min(1).max(40),
  envies: z.partialRecord(envieId, z.enum(["aime", "naime_pas"])),
  reve: texteLibre,
  refusLibre: texteLibre,
});

export const schemaDemande = z
  .strictObject({
    voyageurs: z.array(schemaVoyageur).min(1).max(MAX_PROFILS),
    adultes: z.number().int().min(1).max(12),
    enfants: z.number().int().min(0).max(10),
    nuits: z.number().int().min(1).max(30),
    budget: z.strictObject({
      montant: z.number().int().min(50).max(100_000),
      par: z.enum(["groupe", "personne"]),
    }),
  })
  .refine((d) => d.voyageurs.length <= d.adultes + d.enfants, {
    message: "Il y a plus de profils que de voyageurs.",
    path: ["voyageurs"],
  });

export type Demande = z.infer<typeof schemaDemande>;
export type Voyageur = z.infer<typeof schemaVoyageur>;

export type ResultatVerification =
  | { ok: true; demande: Demande }
  | { ok: false; erreurs: string[] };

export function verifierDemande(brut: unknown): ResultatVerification {
  const r = schemaDemande.safeParse(brut);
  if (r.success) return { ok: true, demande: r.data };
  return {
    ok: false,
    erreurs: r.error.issues.map((i) => `${i.path.join(".") || "demande"} : ${i.message}`),
  };
}
