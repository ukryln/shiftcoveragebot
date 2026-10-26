import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Supabase's free tier pauses a project after a week with no database
// activity. A scheduled Netlify function (netlify/functions/keepalive.mts)
// calls this every few days. It reads one row and returns nothing sensitive.
export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await supabaseAdmin.from("shops").select("id").limit(1);
  if (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
