import Link from "next/link";
import { AlertCircle } from "lucide-react";

import type { ParsedClientError } from "@/lib/api/client-error";
import { isPlanLimitError } from "@/lib/api/client-error";
import { cn } from "@/lib/utils";

type ApiErrorAlertProps = {
  error: ParsedClientError | string | null;
  className?: string;
  onDismiss?: () => void;
};

export function ApiErrorAlert({ error, className, onDismiss }: ApiErrorAlertProps) {
  if (!error) return null;

  const parsed =
    typeof error === "string" ? { message: error } satisfies ParsedClientError : error;

  const showUpgrade = isPlanLimitError(parsed) && parsed.upgradeUrl;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <p>{parsed.message}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {showUpgrade && (
              <Link
                href={parsed.upgradeUrl!}
                className="font-medium underline underline-offset-2"
              >
                View plan & upgrade
              </Link>
            )}
            {parsed.contact && (
              <a href={parsed.contact} className="font-medium underline underline-offset-2">
                Contact support
              </a>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="font-medium opacity-80 hover:opacity-100"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
