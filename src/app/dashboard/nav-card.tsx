import Link from "next/link";

export function NavCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <span className="text-2xl">{icon}</span>
      <span>
        <span className="block font-semibold text-slate-900 group-hover:text-indigo-600">{title}</span>
        <span className="block text-sm text-slate-500">{description}</span>
      </span>
    </Link>
  );
}
