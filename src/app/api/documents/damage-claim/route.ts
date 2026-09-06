import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeDamageClaimDossier, renderDamageClaimDossierPdf } from "@/lib/pdf/generate";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const incidentId = searchParams.get("incidentId");
  if (!incidentId) return NextResponse.json({ error: "Paramètre manquant" }, { status: 400 });

  try {
    // RLS on `incidents` (admin/staff only, 0007_owner_portal.sql) scopes this
    // to the caller's own agency — another agency's incident id yields nothing.
    const dossier = await computeDamageClaimDossier(incidentId);
    const pdf = await renderDamageClaimDossierPdf(dossier);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="dossier-reclamation.pdf"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Impossible de générer le dossier" }, { status: 404 });
  }
}
