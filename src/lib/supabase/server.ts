import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// One client per request, bound to the request's auth cookies — RLS applies
// using the signed-in user's session, never a service role.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no writable cookie jar.
            // Session refresh is handled by middleware.ts instead.
          }
        },
      },
    }
  );
}
