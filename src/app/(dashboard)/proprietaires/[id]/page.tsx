import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { inviteOwner, updateOwner } from "../actions";
import type { Owner } from "@/types/database";

export default async function OwnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; invited?: string }>;
}) {
  const { id } = await params;
  const { error, saved, invited } = await searchParams;

  const supabase = await createClient();
  const [{ data: owner }, { data: properties }, { data: portalUser }] = await Promise.all([
    supabase.from("owners").select("*").eq("id", id).single(),
    supabase.from("properties").select("id, name").eq("owner_id", id),
    supabase.from("users").select("id").eq("owner_id", id).eq("role", "owner").maybeSingle(),
  ]);

  if (!owner) notFound();

  const o = owner as Owner;
  const updateWithId = updateOwner.bind(null, o.id);
  const inviteWithId = inviteOwner.bind(null, o.id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">{o.name}</h1>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Modifications enregistrées</p>}
      {invited && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Invitation envoyée</p>}

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-neutral-500">Espace propriétaire</h2>
            <p className="text-sm">
              {portalUser
                ? "Ce propriétaire a accès à son espace en ligne."
                : "Pas encore d'accès à l'espace propriétaire."}
            </p>
          </div>
          {!portalUser && (
            <form action={inviteWithId}>
              <button
                type="submit"
                disabled={!o.email}
                title={o.email ? undefined : "Renseignez un email pour inviter"}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
              >
                Inviter
              </button>
            </form>
          )}
        </div>
        {portalUser && (
          <Link href={`/proprietaires/${o.id}/messages`} className="inline-block text-sm font-medium underline">
            Voir le fil de messages
          </Link>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Biens gérés</h2>
        {!properties?.length && <p className="text-sm text-neutral-400">Aucun bien associé pour l&apos;instant.</p>}
        <ul className="space-y-1 text-sm">
          {properties?.map((p) => (
            <li key={p.id}>
              <Link href={`/biens/${p.id}`} className="underline">
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <form action={updateWithId} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="name">
            Nom
          </label>
          <input
            id="name"
            name="name"
            defaultValue={o.name}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={o.email ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="phone">
            Téléphone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={o.phone ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="commission_rate">
            Taux de commission (%)
          </label>
          <input
            id="commission_rate"
            name="commission_rate"
            type="number"
            step="0.1"
            defaultValue={o.commission_rate ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}
