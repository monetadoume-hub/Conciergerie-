"use client";

import { useState } from "react";
import { sendDamageClaimDossierEmail } from "../actions";

export function DossierActions({ incidentId }: { incidentId: string }) {
  const [sending, setSending] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSend() {
    if (!email) return;
    setSending(true);
    setFeedback(null);
    try {
      await sendDamageClaimDossierEmail(incidentId, email);
      setFeedback("Envoyé ✓");
      setShowEmailForm(false);
    } catch {
      setFeedback("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {feedback && <span className="text-xs text-neutral-500">{feedback}</span>}
      <a
        href={`/api/documents/damage-claim?incidentId=${incidentId}`}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
      >
        Télécharger le dossier
      </a>
      {!showEmailForm ? (
        <button
          type="button"
          onClick={() => setShowEmailForm(true)}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
        >
          Envoyer par email
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="destinataire@email.com"
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={sending || !email}
            onClick={handleSend}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {sending ? "…" : "OK"}
          </button>
        </div>
      )}
    </div>
  );
}
