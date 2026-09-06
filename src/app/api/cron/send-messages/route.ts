import { NextResponse } from "next/server";
import { processDueMessages } from "@/lib/messaging/scheduler";

export const maxDuration = 30;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await processDueMessages();
  return NextResponse.json({ processed_at: new Date().toISOString(), results });
}
