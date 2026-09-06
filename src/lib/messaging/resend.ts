import { Resend } from "resend";

export async function sendEmail(options: { to: string; subject: string; text: string }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY manquant");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "conciergerie@resend.dev",
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
}
