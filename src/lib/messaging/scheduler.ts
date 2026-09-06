import { addDays, setHours, setMinutes, setSeconds, subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/messaging/resend";
import { renderTemplate } from "@/lib/messaging/templates";
import type { MessageTrigger } from "@/types/database";

function atHour(date: Date, hour: number): Date {
  return setSeconds(setMinutes(setHours(date, hour), 0), 0);
}

function computeSendAt(trigger: MessageTrigger, checkin: Date, checkout: Date): Date | null {
  switch (trigger) {
    case "booking_confirmed":
      return new Date();
    case "before_checkin":
      return atHour(subDays(checkin, 3), 10);
    case "welcome_day":
      return atHour(checkin, 15);
    case "after_checkout":
      return atHour(addDays(checkout, 1), 10);
    default:
      return null; // "custom" templates are triggered manually, not scheduled automatically
  }
}

/**
 * Creates the scheduled_messages rows for a freshly-detected booking, one per
 * active template configured by the agency (cahier des charges §5.6). Safe to
 * call more than once for the same booking — already-scheduled trigger/
 * template pairs are skipped.
 */
export async function scheduleBookingMessages(bookingId: string) {
  const admin = createAdminClient();

  const { data: booking } = await admin.from("bookings").select("*").eq("id", bookingId).single();
  if (!booking) return;

  const { data: templates } = await admin
    .from("message_templates")
    .select("*")
    .eq("agency_id", booking.agency_id)
    .eq("active", true);

  if (!templates?.length) return;

  const { data: existing } = await admin
    .from("scheduled_messages")
    .select("template_id")
    .eq("booking_id", bookingId);

  const alreadyScheduled = new Set((existing ?? []).map((s) => s.template_id));

  const checkin = new Date(`${booking.checkin}T00:00:00Z`);
  const checkout = new Date(`${booking.checkout}T00:00:00Z`);

  const rows = templates
    .filter((template) => !alreadyScheduled.has(template.id))
    .map((template) => {
      const sendAt = computeSendAt(template.trigger, checkin, checkout);
      if (!sendAt) return null;
      return {
        agency_id: booking.agency_id,
        booking_id: booking.id,
        template_id: template.id,
        send_at: sendAt.toISOString(),
        status: "pending" as const,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length > 0) {
    await admin.from("scheduled_messages").insert(rows);
  }
}

/**
 * Sends every scheduled message whose send_at has passed. Meant to be polled
 * by /api/cron/send-messages every few minutes.
 */
export async function processDueMessages() {
  const admin = createAdminClient();

  const { data: due } = await admin
    .from("scheduled_messages")
    .select("*, bookings(*), message_templates(*)")
    .eq("status", "pending")
    .lte("send_at", new Date().toISOString())
    .limit(50);

  const results: { id: string; status: "sent" | "failed" | "skipped" }[] = [];

  for (const message of due ?? []) {
    const booking = message.bookings as Record<string, unknown> | null;
    const template = message.message_templates as Record<string, unknown> | null;

    if (!booking || !template) {
      await admin.from("scheduled_messages").update({ status: "failed", error: "Réservation ou modèle introuvable" }).eq("id", message.id);
      results.push({ id: message.id, status: "failed" });
      continue;
    }

    if (template.channel !== "email") {
      // WhatsApp/SMS providers are wired up in a later phase (§3); leave the
      // row pending rather than silently dropping it.
      continue;
    }

    const guestEmail = booking.guest_email as string | null;
    if (!guestEmail) {
      await admin
        .from("scheduled_messages")
        .update({ status: "failed", error: "Aucun email locataire connu (limite du flux iCal, cf. §5.2)" })
        .eq("id", message.id);
      results.push({ id: message.id, status: "skipped" });
      continue;
    }

    const { data: property } = await admin
      .from("properties")
      .select("name")
      .eq("id", booking.property_id as string)
      .single();
    const { data: agency } = await admin
      .from("agencies")
      .select("name")
      .eq("id", message.agency_id as string)
      .single();

    const vars = {
      guest_name: (booking.guest_name as string | null) ?? "",
      property_name: property?.name ?? "",
      checkin: booking.checkin as string,
      checkout: booking.checkout as string,
      guide_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/guide/${booking.guide_token}`,
      agency_name: agency?.name ?? "",
    };

    try {
      await sendEmail({
        to: guestEmail,
        subject: renderTemplate((template.subject as string | null) ?? "", vars),
        text: renderTemplate(template.body as string, vars),
      });
      await admin.from("scheduled_messages").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", message.id);
      results.push({ id: message.id, status: "sent" });
    } catch (err) {
      await admin
        .from("scheduled_messages")
        .update({ status: "failed", error: err instanceof Error ? err.message : "Erreur d'envoi" })
        .eq("id", message.id);
      results.push({ id: message.id, status: "failed" });
    }
  }

  return results;
}
