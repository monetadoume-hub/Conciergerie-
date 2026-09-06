import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  ComplaintLetterDocument,
  OwnerReportDocument,
  type ComplaintLetterData,
  type OwnerReportData,
} from "@/lib/pdf/documents";

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
