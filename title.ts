export function buildTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Untitled capture";

  return cleaned.length <= 72 ? cleaned : `${cleaned.slice(0, 69).trim()}...`;
}
