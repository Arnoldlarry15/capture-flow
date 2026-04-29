import type { ContentType } from "@/lib/types";

function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  if (sentence.length <= 150) return sentence;
  return `${sentence.slice(0, 147).trim()}...`;
}

export function summarizeContent(text: string, contentType: ContentType): string {
  const lead = firstSentence(text);
  if (!lead) return "Captured visual content for later retrieval.";

  switch (contentType) {
    case "code":
      return `Code snippet captured. ${lead}`;
    case "article":
      return `Article excerpt captured. ${lead}`;
    case "ui":
      return `UI context captured. ${lead}`;
    case "table":
      return `Table-like content captured. ${lead}`;
    case "notes":
      return `Notes captured. ${lead}`;
    default:
      return `Captured content. ${lead}`;
  }
}
