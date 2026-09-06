"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { addIncidentDocument } from "../actions";
import type { IncidentDocument } from "@/types/database";

const TYPE_LABEL: Record<string, string> = { devis: "Devis", facture: "Facture", autre: "Autre" };

export function IncidentDocumentForm({ incidentId, documents }: { incidentId: string; documents: IncidentDocument[] }) {
  const [items, setItems] = useState(documents);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${incidentId}/docs/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("incident-photos").upload(path, file);
      if (error) throw error;

      const { data: publicUrl } = supabase.storage.from("incident-photos").getPublicUrl(path);
      const formData = new FormData(form);
      formData.set("file_url", publicUrl.publicUrl);

      startTransition(async () => {
        await addIncidentDocument(incidentId, formData);
        setItems((prev) => [
          {
            id: crypto.randomUUID(),
            agency_id: "",
            incident_id: incidentId,
            type: String(formData.get("type") ?? "autre") as IncidentDocument["type"],
            label: String(formData.get("label") ?? "Document"),
            file_url: publicUrl.publicUrl,
            amount: formData.get("amount") ? Number(formData.get("amount")) : null,
            artisan_name: (formData.get("artisan_name") as string) || null,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        formRef.current?.reset();
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-medium text-neutral-500">Devis & factures</h2>

      {!items.length && <p className="text-sm text-neutral-400">Aucun document pour l&apos;instant.</p>}
      <ul className="space-y-1 text-sm">
        {items.map((d) => (
          <li key={d.id} className="flex items-center justify-between">
            <a href={d.file_url} target="_blank" rel="noreferrer" className="underline">
              {TYPE_LABEL[d.type]} — {d.label} {d.artisan_name ? `(${d.artisan_name})` : ""}
            </a>
            {d.amount != null && <span className="font-medium">{d.amount.toFixed(2)} €</span>}
          </li>
        ))}
      </ul>

      <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3">
        <select name="type" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="devis">Devis</option>
          <option value="facture">Facture</option>
          <option value="autre">Autre</option>
        </select>
        <input name="label" required placeholder="Libellé" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        <input name="artisan_name" placeholder="Artisan / entreprise" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        <input name="amount" type="number" step="0.01" placeholder="Montant (€)" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        <input name="file" type="file" accept="application/pdf,image/*" required className="col-span-2 text-sm" />
        <button
          type="submit"
          disabled={uploading || isPending}
          className="col-span-2 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-40"
        >
          {uploading ? "Envoi en cours…" : "Ajouter le document"}
        </button>
      </form>
    </section>
  );
}
