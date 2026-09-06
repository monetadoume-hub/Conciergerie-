"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/messaging/resend";
import { computeOwnerMonthlyReport, renderComplaintLetterPdf, renderOwnerReportPdf } from "@/lib/pdf/generate";
import type { ComplaintLetterData } from "@/lib/pdf/documents";

export async function sendOwnerReportEmail(ownerId: string, month: string) {
  await requireUser();
  const supabase = await createClient();

  const { data: owner } = await supabase.from("owners").select("email, name").eq("id", ownerId).single();
  if (!owner?.email) throw new Error("Cet propriétaire n'a pas d'adresse email renseignée");

  const report = await computeOwnerMonthlyReport(ownerId, month);
  const pdf = await renderOwnerReportPdf(report);

  await sendEmail({
    to: owner.email,
    subject: `Votre rapport mensuel — ${report.monthLabel}`,
    text: `Bonjour ${owner.name},\n\nVeuillez trouver ci-joint votre rapport mensuel (${report.monthLabel}).\n\nCordialement,\n${report.agencyName}`,
    attachments: [{ filename: `rapport-${month}.pdf`, content: pdf }],
  });
}

export async function sendComplaintLetterEmail(recipientEmail: string, data: ComplaintLetterData) {
  await requireUser();
  const pdf = await renderComplaintLetterPdf(data);

  await sendEmail({
    to: recipientEmail,
    subject: data.subject,
    text: `Bonjour,\n\nVeuillez trouver ci-joint notre courrier concernant : ${data.subject}.\n\nCordialement,\n${data.agencyName}`,
    attachments: [{ filename: "courrier.pdf", content: pdf }],
  });
}
