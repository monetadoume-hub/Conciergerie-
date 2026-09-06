import { createAdminClient } from "@/lib/supabase/admin";
import { fetchIcalEvents, PLATFORM_SOURCES } from "@/lib/ical/parse";
import { scheduleBookingMessages } from "@/lib/messaging/scheduler";
import type { Property } from "@/types/database";

export interface SyncResult {
  property_id: string;
  source: string;
  created: number;
  updated: number;
  cancelled: number;
  error?: string;
}

/**
 * Polls every configured iCal feed for a single property, upserts bookings
 * deduplicated by `ical_uid` (never re-created, only updated when dates
 * move), marks previously-seen bookings absent from the feed as cancelled,
 * and — for genuinely new bookings — creates the cleaning task and message
 * sequence automatically (cahier des charges §5.2).
 */
export async function syncPropertyCalendars(property: Property): Promise<SyncResult[]> {
  const admin = createAdminClient();
  const results: SyncResult[] = [];

  for (const { field, source } of PLATFORM_SOURCES) {
    const url = property[field];
    if (!url) continue;

    const result: SyncResult = { property_id: property.id, source, created: 0, updated: 0, cancelled: 0 };

    try {
      const events = await fetchIcalEvents(url);
      const seenUids = new Set(events.map((e) => e.ical_uid));

      const { data: existingBookings } = await admin
        .from("bookings")
        .select("id, ical_uid, checkin, checkout, status")
        .eq("property_id", property.id)
        .eq("source", source)
        .not("ical_uid", "is", null);

      const existingByUid = new Map((existingBookings ?? []).map((b) => [b.ical_uid as string, b]));

      for (const event of events) {
        const existing = existingByUid.get(event.ical_uid);

        if (!existing) {
          const { data: inserted, error } = await admin
            .from("bookings")
            .insert({
              agency_id: property.agency_id,
              property_id: property.id,
              source,
              ical_uid: event.ical_uid,
              checkin: event.checkin,
              checkout: event.checkout,
              status: "confirmed",
            })
            .select("*")
            .single();

          if (error) throw error;
          result.created += 1;

          await onNewBooking(property, inserted);
          continue;
        }

        if (existing.checkin !== event.checkin || existing.checkout !== event.checkout || existing.status !== "confirmed") {
          await admin
            .from("bookings")
            .update({ checkin: event.checkin, checkout: event.checkout, status: "confirmed", updated_at: new Date().toISOString() })
            .eq("id", existing.id);

          await admin
            .from("cleaning_tasks")
            .update({ scheduled_date: event.checkout })
            .eq("booking_id", existing.id);

          result.updated += 1;
        }
      }

      // Anything previously confirmed for this property/source that no longer
      // appears in the feed has been cancelled or removed upstream.
      for (const existing of existingBookings ?? []) {
        if (existing.status === "confirmed" && !seenUids.has(existing.ical_uid as string)) {
          await admin.from("bookings").update({ status: "cancelled" }).eq("id", existing.id);
          await admin
            .from("scheduled_messages")
            .update({ status: "cancelled" })
            .eq("booking_id", existing.id)
            .eq("status", "pending");
          result.cancelled += 1;
        }
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : "Erreur inconnue";
    }

    results.push(result);
  }

  return results;
}

export async function syncAllProperties(): Promise<SyncResult[]> {
  const admin = createAdminClient();
  const { data: properties, error } = await admin.from("properties").select("*");

  if (error || !properties) return [];

  const allResults: SyncResult[] = [];
  for (const property of properties as Property[]) {
    const results = await syncPropertyCalendars(property);
    allResults.push(...results);
  }
  return allResults;
}

async function onNewBooking(
  property: Property,
  booking: { id: string; checkout: string }
) {
  const admin = createAdminClient();

  const { data: linen } = await admin
    .from("linen_inventory")
    .select("item_type, par_level")
    .eq("property_id", property.id);

  await admin.from("cleaning_tasks").insert({
    agency_id: property.agency_id,
    property_id: property.id,
    booking_id: booking.id,
    scheduled_date: booking.checkout,
    status: "todo",
    linen_checklist: (linen ?? []).map((l) => ({ item_type: l.item_type, quantity: l.par_level })),
    extra_checklist_items: property.cleaning_checklist ?? [],
  });

  await scheduleBookingMessages(booking.id);
}
