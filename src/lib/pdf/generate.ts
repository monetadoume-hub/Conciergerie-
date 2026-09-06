import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  ComplaintLetterDocument,
  OwnerReportDocument,
  type ComplaintLetterData,
  type OwnerReportData,
} from "@/lib/pdf/documents";
import { DamageClaimDossierDocument, type DamageClaimDossierData } from "@/lib/pdf/damageClaimDocument";
import { WelcomeBookletDocument, type WelcomeBookletData } from "@/lib/pdf/welcomeBookletDocument";
import type { GuidebookContent } from "@/types/database";

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

/**
 * Aggregates one owner's bookings/expenses/pending damage claims for a given
 * month into the shape the report PDF needs (cahier des charges §5.5, §16 —
 * pending recovery amounts are always broken out separately from the
 * definitive net, never folded silently into it).
 */
export async function computeOwnerMonthlyReport(ownerId: string, month: string): Promise<OwnerReportData> {
  const supabase = await createClient();
  const monthStart = `${month}-01`;
  const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 1)
    .toISOString()
    .slice(0, 10);

  const { data: owner } = await supabase.from("owners").select("*, agencies(name, commission_rate_default)").eq("id", ownerId).single();
  if (!owner) throw new Error("Propriétaire introuvable");

  const { data: properties } = await supabase.from("properties").select("id, name").eq("owner_id", ownerId);
  const propertyIds = (properties ?? []).map((p) => p.id);

  const [{ data: bookings }, { data: expenses }, { data: incidents }] = await Promise.all([
    propertyIds.length
      ? supabase
          .from("bookings")
          .select("property_id, price, checkin, checkout")
          .in("property_id", propertyIds)
          .eq("status", "confirmed")
          .gte("checkin", monthStart)
          .lt("checkin", monthEnd)
      : Promise.resolve({ data: [] as { property_id: string; price: number | null; checkin: string; checkout: string }[] }),
    propertyIds.length
      ? supabase
          .from("expenses")
          .select("category, amount")
          .in("property_id", propertyIds)
          .gte("expense_date", monthStart)
          .lt("expense_date", monthEnd)
      : Promise.resolve({ data: [] as { category: string; amount: number }[] }),
    propertyIds.length
      ? supabase
          .from("incidents")
          .select("repair_cost, recovery_status")
          .in("property_id", propertyIds)
          .not("recovery_status", "is", null)
          .neq("recovery_status", "recupere")
      : Promise.resolve({ data: [] as { repair_cost: number | null; recovery_status: string }[] }),
  ]);

  const nightsBetween = (checkin: string, checkout: string) =>
    Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000));

  const revenueByProperty = new Map<string, { revenue: number; nights: number }>();
  for (const b of bookings ?? []) {
    const entry = revenueByProperty.get(b.property_id) ?? { revenue: 0, nights: 0 };
    entry.revenue += b.price ?? 0;
    entry.nights += nightsBetween(b.checkin, b.checkout);
    revenueByProperty.set(b.property_id, entry);
  }

  const propertyRows = (properties ?? []).map((p) => ({
    name: p.name,
    revenue: revenueByProperty.get(p.id)?.revenue ?? 0,
    nights: revenueByProperty.get(p.id)?.nights ?? 0,
  }));

  const totalRevenue = propertyRows.reduce((sum, p) => sum + p.revenue, 0);
  const commissionRate = owner.commission_rate ?? owner.agencies?.commission_rate_default ?? 20;
  const commissionAmount = (totalRevenue * commissionRate) / 100;
  const expenseRows = (expenses ?? []).map((e) => ({ category: e.category, amount: e.amount }));
  const totalExpenses = expenseRows.reduce((sum, e) => sum + e.amount, 0);
  const pendingRecoveryAmount = (incidents ?? []).reduce((sum, i) => sum + (i.repair_cost ?? 0), 0);

  return {
    agencyName: owner.agencies?.name ?? "",
    ownerName: owner.name,
    monthLabel: MONTH_FORMATTER.format(new Date(monthStart)),
    properties: propertyRows,
    totalRevenue,
    commissionRate,
    commissionAmount,
    expenses: expenseRows,
    totalExpenses,
    netAmount: totalRevenue - commissionAmount - totalExpenses,
    pendingRecoveryAmount,
  };
}

export async function renderOwnerReportPdf(data: OwnerReportData): Promise<Buffer> {
  return renderToBuffer(OwnerReportDocument(data));
}

export async function renderComplaintLetterPdf(data: ComplaintLetterData): Promise<Buffer> {
  return renderToBuffer(ComplaintLetterDocument(data));
}

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Aggregates one incident's full damage-claim evidence (cahier des charges
 * request: photos, dates, nature, cleaning report, quotes/invoices, total
 * cost) into the shape the dossier PDF needs. Deliberately pulls in the
 * checkout cleaning task's photos as read-only supporting evidence — it is
 * never copied into the incident's own photo list, so the dossier always
 * reflects the cleaner's original report rather than a snapshot of it.
 */
export async function computeDamageClaimDossier(incidentId: string): Promise<DamageClaimDossierData> {
  const supabase = await createClient();

  const { data: incident } = await supabase
    .from("incidents")
    .select("*, agencies(name), properties(name, address), bookings(guest_name, checkin, checkout)")
    .eq("id", incidentId)
    .single();

  if (!incident) throw new Error("Incident introuvable");

  const [{ data: cleaningTask }, { data: documents }] = await Promise.all([
    incident.booking_id
      ? supabase
          .from("cleaning_tasks")
          .select("photos_after, scheduled_date")
          .eq("booking_id", incident.booking_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("incident_documents")
      .select("type, label, artisan_name, amount")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: true }),
  ]);

  const booking = incident.bookings as { guest_name: string | null; checkin: string; checkout: string } | null;
  const property = incident.properties as { name: string; address: string | null } | null;

  const damagePhotos = (incident.photos ?? []).map((url: string) => ({ url, caption: "Photo du dommage" }));
  const cleaningPhotos = (cleaningTask?.photos_after ?? []).map((url: string) => ({
    url,
    caption: `Compte-rendu de ménage du ${cleaningTask!.scheduled_date}`,
  }));

  const documentLines = (documents ?? []).map((d) => ({
    type: d.type === "devis" ? "Devis" : d.type === "facture" ? "Facture" : "Autre",
    label: d.label,
    artisanName: d.artisan_name,
    amount: d.amount,
  }));

  const documentsTotal = (documents ?? []).reduce((sum, d) => sum + (d.amount ?? 0), 0);

  return {
    agencyName: (incident.agencies as { name: string } | null)?.name ?? "",
    propertyName: property?.name ?? "",
    propertyAddress: property?.address ?? null,
    guestName: booking?.guest_name ?? null,
    stayDates: booking ? `${booking.checkin} → ${booking.checkout}` : null,
    reportedBy: incident.reported_by,
    damageType: incident.damage_type,
    damageDate: incident.damage_date,
    description: incident.description,
    priority: incident.priority,
    photos: [...damagePhotos, ...cleaningPhotos],
    documents: documentLines,
    totalCost: incident.repair_cost ?? documentsTotal,
    recoverySource: incident.recovery_source,
    recoveryStatus: incident.recovery_status,
    generatedAt: DATE_FORMATTER.format(new Date()),
  };
}

export async function renderDamageClaimDossierPdf(data: DamageClaimDossierData): Promise<Buffer> {
  return renderToBuffer(DamageClaimDossierDocument(data));
}

/**
 * Compiles a property's printable welcome booklet (request: a downloadable
 * document to leave physically in the apartment — wifi, house rules,
 * checkout instructions, emergency numbers, nearby parking/pharmacy).
 * Property-scoped, not booking-scoped: unlike the digital guide (§14), it
 * carries no guest name or per-stay guide_token.
 */
export async function computeWelcomeBooklet(propertyId: string): Promise<WelcomeBookletData> {
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("name, address, access_code, guidebook_content, agencies(name, whatsapp_number)")
    .eq("id", propertyId)
    .single();

  if (!property) throw new Error("Bien introuvable");

  const guide = property.guidebook_content as GuidebookContent;
  const agency = property.agencies as unknown as { name: string; whatsapp_number: string | null } | null;

  return {
    agencyName: agency?.name ?? "",
    agencyContact: agency?.whatsapp_number ?? null,
    propertyName: property.name,
    propertyAddress: property.address,
    accessCode: property.access_code,
    accessNotes: guide.access ?? null,
    wifiNetwork: guide.wifi_network ?? null,
    wifiPassword: guide.wifi_password ?? null,
    equipment: guide.equipment ?? null,
    houseRules: guide.house_rules ?? null,
    checkoutInstructions: guide.checkout_instructions ?? null,
    around: guide.around ?? null,
    parkingInfo: guide.parking_info ?? null,
    pharmacyInfo: guide.pharmacy_info ?? null,
    localEmergencyNotes: guide.local_emergency_notes ?? null,
  };
}

export async function renderWelcomeBookletPdf(data: WelcomeBookletData): Promise<Buffer> {
  return renderToBuffer(WelcomeBookletDocument(data));
}
