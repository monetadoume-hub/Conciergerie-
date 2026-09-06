import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeWelcomeBooklet, renderWelcomeBookletPdf } from "@/lib/pdf/generate";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId");
  if (!propertyId) return NextResponse.json({ error: "Paramètre manquant" }, { status: 400 });

  try {
    // RLS on `properties` scopes this to the caller's own agency (staff) or
    // their own property (owner) — any other id yields no rows.
    const booklet = await computeWelcomeBooklet(propertyId);
    const pdf = await renderWelcomeBookletPdf(booklet);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="livret-accueil.pdf"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Impossible de générer le livret" }, { status: 404 });
  }
}
