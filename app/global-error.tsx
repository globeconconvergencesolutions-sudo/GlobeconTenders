"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Application error</h1>
          <p className="mt-2 text-sm text-slate-400">
            GlobeTender Cloud hit an unexpected error. Please refresh the page.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
