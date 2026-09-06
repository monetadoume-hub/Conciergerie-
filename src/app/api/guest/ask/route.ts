import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { handleGuestMessage } from "@/lib/ai/handle";

export const maxDuration = 30;

// Public, unauthenticated endpoint backing the guide digital's "poser une
// question" widget (§21.2). The guest never gets an account — the guide_token
// from their URL is the only credential, checked inside ask_guest_question
// (SECURITY DEFINER RPC, anon-only EXECUTE grant, same pattern as
// get_guest_guide in 0002_guest_guide.sql).
export async function POST(request: Request) {
  const { guide_token, question } = await request.json();

  if (typeof guide_token !== "string" || typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: messageId, error } = await supabase.rpc("ask_guest_question", {
    p_guide_token: guide_token,
    p_question: question.trim().slice(0, 2000),
  });

  if (error || !messageId) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }

  // Answering synchronously keeps the guest's experience a simple back-and-forth
  // chat rather than requiring them to poll or refresh (§6, "rapidité et clarté
  // sur mobile"). The Anthropic call is the only slow step, a few seconds at most.
  await handleGuestMessage(messageId);

  const { data: status } = await supabase
    .rpc("get_guest_message_status", { p_guide_token: guide_token, p_message_id: messageId })
    .single<{ status: string; final_response: string | null }>();

  return NextResponse.json({
    status: status?.status ?? "en_attente_validation",
    response: status?.final_response ?? "Merci pour votre message, nous revenons vers vous rapidement.",
  });
}
