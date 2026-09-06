import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { NotificationBell } from "./NotificationBell";

const NAV_LINKS = [
  { href: "/", label: "Aujourd'hui" },
  { href: "/biens", label: "Biens" },
  { href: "/proprietaires", label: "Propriétaires" },
  { href: "/reservations", label: "Réservations" },
  { href: "/menages", label: "Ménages" },
  { href: "/incidents", label: "Incidents" },
  { href: "/messages", label: "Messages" },
  { href: "/documents", label: "Documents" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // Owners never see the agency's operational space (§16) — a separate
  // portal with its own layout and its own, much narrower RLS access.
  if (user.role === "owner") redirect("/proprietaire");

  // Cleaners get a single-purpose mobile view — nothing else in the nav
  // (cahier des charges §7, §15): the day's tasks replace phone/SMS entirely.
  const links = user.role === "cleaner" ? [{ href: "/menages", label: "Mes tâches" }] : NAV_LINKS;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user.role !== "cleaner" && <NotificationBell agencyId={user.agency_id} />}
            <form action={logout}>
              <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
