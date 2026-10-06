import Link from "next/link";

const STEPS = [
  { href: "/company", label: "Company" },
  { href: "/evidence", label: "Evidence" },
  { href: "/qualification", label: "Qualification" },
  { href: "/gaps", label: "Gaps" },
] as const;

export function DecisionPath({ current }: { current: (typeof STEPS)[number]["href"] }) {
  return (
    <nav aria-label="Decision path" className="flex flex-wrap gap-2">
      {STEPS.map((step, index) => {
        const active = step.href === current;
        return (
          <Link
            key={step.href}
            href={step.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
              active
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <span className={active ? "text-white/80" : "text-slate-400"}>{index + 1}</span>
            {step.label}
          </Link>
        );
      })}
    </nav>
  );
}
