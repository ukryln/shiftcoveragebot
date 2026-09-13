import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      <h1 className="text-3xl font-semibold text-gray-900">Shift Coverage Bot</h1>
      <p className="max-w-md text-gray-600">
        Automate last-minute shift coverage requests for your shop.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded bg-gray-900 px-5 py-2 text-white"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded border border-gray-300 px-5 py-2 text-gray-700"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
