"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function AssessButton({ tenderId }: { tenderId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/pis/opportunities/${tenderId}/assess`, {
      method: "POST",
    });
    setPending(false);
    if (!response.ok) {
      setError("That comparison did not finish. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button onClick={run} disabled={pending}>
        {pending ? "Comparing…" : "Compare with your company"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs leading-relaxed text-muted-foreground">
        This reads the invitation and lines it up with what you saved on Company.
        If a certificate is not uploaded yet, the result says the proof is missing. That does not mean your firm cannot do the work.
        If the invitation text cannot be read, there is no result yet. The page says Rules when no model is configured.
      </p>
    </div>
  );
}
