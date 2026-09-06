import { createAdminClient } from "@/lib/supabase/admin";
import { getAssistantDecision } from "@/lib/ai/assistant";
import { sendEmail } from "@/lib/messaging/resend";
import type { GuidebookContent } from "@/types/database";

/**
 * Runs the AI assistant on one freshly-created guest_messages row and writes
 * back the outcome (cahier des charges §21.2): auto-answer, normal escalation,
 * or urgent escalation with an immediate backup email (§21.3) — the AI never
 * commits the agency to anything in the two escalation cases.
 */
export async function handleGuestMessage(messageId: string) {
  const admin = createAdminClient();

  const { data: message } = await admin.from("guest_messages").select("*").eq("id", messageId).single();
  if (!message) return;

  const [{ data: property }, { data: agency }, { data: history }] = await Promise.all([
    admin.from("properties").select("name, guidebook_content").eq("id", message.property_id).single(),
    admin.from("agencies").select("name").eq("id", message.agency_id).single(),
    admin
      .from("guest_messages")
      .select("guest_question, final_response, created_at")
      .eq("booking_id", message.booking_id)
      .neq("id", messageId)
      .order("created_at", { ascending: true }),
  ]);

  if (!property || !agency) return;

  const decision = await getAssistantDecision(message.guest_question, {
    propertyName: property.name,
    agencyName: agency.name,
    guidebookContent: property.guidebook_content as GuidebookContent,
    conversationHistory: (history ?? []).map((h) => ({
      question: h.guest_question,
      answer: h.final_response,
    })),
  });

  const now = new Date().toISOString();

  if (!decision.needsEscalation && decision.answer) {
    await admin
      .from("guest_messages")
      .update({
        ai_draft_response: decision.answer,
        final_response: decision.answer,
        status: "auto_repondu",
        answered_at: now,
      })
      .eq("id", messageId);

    await admin.from("notifications").insert({
      agency_id: message.agency_id,
      type: "ai_rapport",
      severity: "normal",
      title: `Question répondue automatiquement — ${property.name}`,
      body: `« ${message.guest_question} » → ${decision.answer}`,
      related_guest_message_id: messageId,
    });
    return;
  }

  const isUrgent = decision.urgency === "urgent";
  const holding =
    decision.holdingMessage ?? "Merci pour votre message, nous revenons vers vous rapidement.";

  await admin
    .from("guest_messages")
    .update({
      ai_draft_response: decision.answer,
      final_response: holding,
      status: isUrgent ? "escalade_urgente" : "escalade",
      escalation_reason: decision.escalationReason,
      answered_at: now,
    })
    .eq("id", messageId);

  await admin.from("notifications").insert({
    agency_id: message.agency_id,
    type: "ai_escalade",
    severity: isUrgent ? "urgent" : "normal",
    title: isUrgent
      ? `🚨 Urgent — ${property.name}`
      : `À traiter — ${property.name}`,
    body: `« ${message.guest_question} »\nMotif : ${decision.escalationReason ?? "non précisé"}`,
    related_guest_message_id: messageId,
  });

  if (isUrgent) {
    await sendUrgentEscalationEmail({
      agencyId: message.agency_id,
      propertyName: property.name,
      question: message.guest_question,
      reason: decision.escalationReason,
    });
  }
}

async function sendUrgentEscalationEmail(params: {
  agencyId: string;
  propertyName: string;
  question: string;
  reason: string | null;
}) {
  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("users")
    .select("email")
    .eq("agency_id", params.agencyId)
    .eq("role", "admin");

  if (!admins?.length) return;

  const text = [
    `Un locataire de ${params.propertyName} signale un problème nécessitant votre intervention immédiate.`,
    "",
    `Question : ${params.question}`,
    `Motif d'escalade : ${params.reason ?? "non précisé"}`,
    "",
    "Ouvrez la file de messages de l'application pour répondre.",
  ].join("\n");

  await Promise.all(
    admins.map((a) =>
      sendEmail({ to: a.email, subject: `🚨 Urgent — ${params.propertyName}`, text }).catch(() => null)
    )
  );
}
