import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

// Server-only client — full database access, bypasses Row Level Security.
// Never import this file from client components.
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
