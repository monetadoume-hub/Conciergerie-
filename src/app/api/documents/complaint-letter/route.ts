import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderComplaintLetterPdf } from "@/lib/pdf/generate";
import type { ComplaintLetterData } from "@/lib/pdf/documents";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = (await request.json()) as ComplaintLetterData;

  if (!data.subject || !data.body || !data.recipientName) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const pdf = await renderComplaintLetterPdf(data);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="courrier.pdf"',
    },
  });
}
