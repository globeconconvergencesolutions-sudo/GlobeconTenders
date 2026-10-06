export function isModelConfigured(): boolean {
  return Boolean(process.env.PIS_MODEL_API_KEY?.trim());
}

/** Extra requirement lines from a configured model. Empty when no key is set. */
export async function suggestRequirementLines(text: string): Promise<string[]> {
  const key = process.env.PIS_MODEL_API_KEY?.trim();
  if (!key || text.trim().length < 40) return [];
  const base = (process.env.PIS_MODEL_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.PIS_MODEL_NAME ?? "gpt-4o-mini";
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "user",
          content:
            'Extract explicit procurement requirement sentences. Reply with JSON {"requirements": string[]}. If none are explicit, use an empty array.\n\n' +
            text.slice(0, 12000),
        },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  const json = content.replace(/^```json\s*|```$/g, "").trim();
  const parsed = JSON.parse(json) as { requirements?: unknown };
  if (!Array.isArray(parsed.requirements)) return [];
  return parsed.requirements
    .filter((item): item is string => typeof item === "string" && item.trim().length > 40)
    .slice(0, 12);
}
