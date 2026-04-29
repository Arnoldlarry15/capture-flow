import type { ContentType } from "@/lib/types";

const codePattern = /(function\s+\w+|const\s+\w+|let\s+\w+|class\s+\w+|=>|import\s+.+from|<\/?\w+>)/i;
const tablePattern = /\b(row|column|table|header|total|subtotal)\b/i;
const notesPattern = /\b(todo|note|remember|idea|next step|action item)\b/i;

export function classifyContent(text: string, area: number): ContentType {
  const normalized = text.trim();

  if (codePattern.test(normalized)) return "code";
  if (tablePattern.test(normalized)) return "table";
  if (notesPattern.test(normalized)) return "notes";
  if (normalized.length > 320) return "article";
  if (area > 140_000) return "ui";
  if (normalized.length > 40) return "notes";

  return "other";
}
