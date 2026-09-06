import { requireUser } from "@/lib/auth";
import { computeOwnerMonthlyReport } from "@/lib/pdf/generate";

function lastMonths(count: number): string[] {
  const months: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    months.push(new Date(d.getFullYear(), d.getMonth() - i, 1).toISOString().slice(0, 7));
  }
  return months;
}

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

export default async function OwnerReportsPage() {
  const user = await requireUser();
  const ownerId = user.owner_id!;
  const months = lastMonths(12);
  const currentMonth = months[0];

  const currentReport = await computeOwnerMonthlyReport(ownerId, currentMonth).catch(() => null);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Rapports mensuels</h1>

      {currentReport && (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-medium text-neutral-500">
            {MONTH_FORMATTER.format(new Date(`${currentMonth}-01`))} — en cours, mis à jour en direct
          </h2>
          <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-lg font-semibold">{currentReport.totalRevenue.toFixed(0)} €</p>
              <p className="text-neutral-500">revenu brut</p>
            </div>
            <div>
              <p className="text-lg font-semibold">-{(currentReport.commissionAmount + currentReport.totalExpenses).toFixed(0)} €</p>
              <p className="text-neutral-500">commission + charges</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{currentReport.netAmount.toFixed(0)} €</p>
              <p className="text-neutral-500">net</p>
            </div>
          </div>
          {currentReport.pendingRecoveryAmount > 0 && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Dont {currentReport.pendingRecoveryAmount.toFixed(2)} € de frais avancés en attente de recouvrement.
            </p>
          )}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-500">Historique</h2>
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {months.map((month) => (
            <li key={month} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm capitalize">{MONTH_FORMATTER.format(new Date(`${month}-01`))}</span>
              <a
                href={`/api/documents/owner-report?ownerId=${ownerId}&month=${month}`}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
              >
                Télécharger PDF
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
