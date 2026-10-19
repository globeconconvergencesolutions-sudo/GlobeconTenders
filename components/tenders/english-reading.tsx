const LANGUAGE_NAMES: Record<string, string> = {
  fr: "French",
  pt: "Portuguese",
  es: "Spanish",
  sw: "Swahili",
  ar: "Arabic",
};

export function EnglishReading({
  text,
  sourceLang,
  clamp = false,
}: {
  text?: string | null;
  sourceLang?: string | null;
  clamp?: boolean;
}) {
  const reading = text?.trim();
  if (!reading) return null;
  const language = sourceLang ? LANGUAGE_NAMES[sourceLang] : null;
  return (
    <p
      className={`mb-2 text-xs leading-relaxed text-muted-foreground${clamp ? " line-clamp-3" : ""}`}
    >
      {language ? `${language}, in English: ` : "In English: "}
      {reading}
    </p>
  );
}
