import { cn } from "@/lib/utils";

type SettingsPageHeaderProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tone?: "blue" | "violet" | "sky" | "amber" | "indigo" | "emerald";
  actions?: React.ReactNode;
};

const toneClass: Record<
  NonNullable<SettingsPageHeaderProps["tone"]>,
  string
> = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  violet:
    "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  indigo:
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  emerald:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

export function SettingsPageHeader({
  icon: Icon,
  title,
  description,
  tone = "blue",
  actions,
}: SettingsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            toneClass[tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {actions}
    </div>
  );
}
