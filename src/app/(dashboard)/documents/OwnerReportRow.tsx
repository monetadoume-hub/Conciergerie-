"use client";

import { useState, useTransition } from "react";
import { sendOwnerReportEmail } from "./actions";

function previousMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

export function OwnerReportRow({ ownerId, ownerName, hasEmail }: { ownerId: string; ownerName: string; hasEmail: boolean }) {
  const [month, setMonth] = useState(previousMonth());
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSendEmail() {
    setFeedback(null);
    startTransition(async () => {
      try {
        await sendOwnerReportEmail(ownerId, month);
        setFeedback("Envoyé ✓");
      } catch (err) {
        setFeedback(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{ownerName}</p>
        {feedback && <p className="text-xs text-neutral-500">{feedback}</p>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
        />
        <a
          href={`/api/documents/owner-report?ownerId=${ownerId}&month=${month}`}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
        >
          Télécharger PDF
        </a>
        <button
          type="button"
          disabled={isPending || !hasEmail}
          onClick={handleSendEmail}
          title={hasEmail ? undefined : "Aucun email renseigné pour ce propriétaire"}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          Envoyer par email
        </button>
      </div>
    </li>
  );
}
