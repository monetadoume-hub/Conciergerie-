"use client";

import { useState } from "react";
import { sendComplaintLetterEmail } from "../actions";
import type { ComplaintLetterData } from "@/lib/pdf/documents";

const TODAY = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function ComplaintLetterPage() {
  const [agencyName, setAgencyName] = useState("");
  const [agencyAddress, setAgencyAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function buildData(): ComplaintLetterData {
    return {
      agencyName,
      agencyAddress: agencyAddress || undefined,
      recipientName,
      recipientAddress: recipientAddress || undefined,
      date: TODAY,
      subject,
      body,
      signatureName: signatureName || undefined,
    };
  }

  async function handleDownload() {
    const res = await fetch("/api/documents/complaint-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildData()),
    });
    if (!res.ok) {
      setFeedback("Erreur lors de la génération du PDF");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "courrier.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSendEmail() {
    if (!recipientEmail) {
      setFeedback("Renseignez l'email du destinataire pour l'envoyer par email");
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      await sendComplaintLetterEmail(recipientEmail, buildData());
      setFeedback("Email envoyé ✓");
    } catch {
      setFeedback("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  const isValid = agencyName && recipientName && subject && body;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Rédiger un courrier</h1>
        <p className="text-sm text-neutral-500">
          Réclamation, mise en demeure, gestion de litige — relisez toujours avant d&apos;envoyer ou d&apos;imprimer
          pour un envoi en recommandé (cf. §21.6).
        </p>
      </div>

      {feedback && <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm">{feedback}</p>}

      <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Votre agence" value={agencyName} onChange={setAgencyName} />
          <Field label="Adresse de l'agence" value={agencyAddress} onChange={setAgencyAddress} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Destinataire" value={recipientName} onChange={setRecipientName} />
          <Field label="Adresse du destinataire" value={recipientAddress} onChange={setRecipientAddress} />
        </div>
        <Field label="Email du destinataire (pour l'envoi par email)" value={recipientEmail} onChange={setRecipientEmail} type="email" />
        <Field label="Objet" value={subject} onChange={setSubject} />
        <div>
          <label className="block text-sm font-medium text-neutral-700">Corps du courrier</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            placeholder="Un paragraphe par ligne vide sépare les paragraphes dans le PDF."
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <Field label="Signature" value={signatureName} onChange={setSignatureName} />

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            disabled={!isValid}
            onClick={handleDownload}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-40"
          >
            Télécharger le PDF
          </button>
          <button
            type="button"
            disabled={!isValid || sending}
            onClick={handleSendEmail}
            className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {sending ? "Envoi…" : "Envoyer par email"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />
    </div>
  );
}
