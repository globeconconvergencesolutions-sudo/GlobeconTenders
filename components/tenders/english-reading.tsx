export function EnglishReading({ text }: { text?: string | null }) {
  const reading = text?.trim();
  if (!reading) return null;
  return (
    <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
      English reading for matching: {reading}
    </p>
  );
}
