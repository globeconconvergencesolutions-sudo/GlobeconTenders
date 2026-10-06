"use client";

import { useRouter } from "next/navigation";

import { BID_STAGES } from "@/lib/db/pis-schema";

export function StageSelect({
  tenderId,
  stage,
}: {
  tenderId: number;
  stage: string;
}) {
  const router = useRouter();

  async function onChange(next: string) {
    await fetch("/api/pis/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenderId, stage: next }),
    });
    router.refresh();
  }

  return (
    <select
      className="mt-2 w-full rounded-md border bg-white px-2 py-1 text-xs"
      value={stage}
      onChange={(event) => onChange(event.target.value)}
    >
      {BID_STAGES.map((item) => (
        <option key={item} value={item}>
          {item.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}
