import type { ContentType } from "@/lib/types";

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "have",
  "your",
  "about",
  "into",
  "then",
  "when",
  "where"
]);

export function generateTags(text: string, contentType: ContentType): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !stopWords.has(word));

  const tagSet = new Set<string>([contentType]);
  words.slice(0, 20).forEach((word) => tagSet.add(word));

  return Array.from(tagSet).slice(0, 6);
}
