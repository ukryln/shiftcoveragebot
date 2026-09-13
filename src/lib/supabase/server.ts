import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client — used in Server Components, Server Actions, and Route
// Handlers. Reads/writes the user's session via cookies. Respects Row Level
// Security using the publishable key (unlike lib/supabase/admin.ts).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
            // Called from a Server Component — safe to ignore because
            // proxy.ts refreshes the session on every request.
          }
        },
      },
    }
  );
}
