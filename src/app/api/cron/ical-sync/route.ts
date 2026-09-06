import { NextResponse } from "next/server";
import { syncAllProperties } from "@/lib/ical/sync";

export const maxDuration = 60;

// Called every 30-60 min by Vercel Cron (see vercel.json). Never invoked from
// the UI: polling happens strictly in the background so it never blocks the
// interface (cahier des charges §8, performance).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await syncAllProperties();
  return NextResponse.json({ synced_at: new Date().toISOString(), results });
}
