import { createBrowserClient } from "@supabase/ssr";

// Browser-side client — used in components that run in the user's browser.
// Respects Row Level Security using the publishable key.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
