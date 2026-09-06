import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeOwnerMonthlyReport, renderOwnerReportPdf } from "@/lib/pdf/generate";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ownerId = searchParams.get("ownerId");
  const month = searchParams.get("month");

  if (!ownerId || !month) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  try {
    // RLS on `owners`/`properties`/`bookings` scopes this to the caller's own
    // agency — an owner id from another agency simply yields no rows.
    const report = await computeOwnerMonthlyReport(ownerId, month);
    const pdf = await renderOwnerReportPdf(report);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rapport-${month}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Impossible de générer le rapport" }, { status: 404 });
  }
}
