import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">Logged in as {user?.email}</p>
      <form action={logout} className="mt-4">
        <button type="submit" className="rounded border border-gray-300 px-4 py-2 text-gray-700">
          Log out
        </button>
      </form>
    </div>
  );
}
