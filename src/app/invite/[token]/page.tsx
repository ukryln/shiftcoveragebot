import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteButton } from "@/app/invite/[token]/accept-invite-button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Manager invite</h1>

        {user ? (
          <AcceptInviteButton token={token} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Log in or sign up with the email this invite was sent to, then come back to this link
              to accept it.
            </p>
            <div className="flex gap-3">
              <Link href="/login" className="rounded bg-indigo-600 px-4 py-2 text-sm text-white">
                Log in
              </Link>
              <Link href="/signup" className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700">
                Sign up
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
