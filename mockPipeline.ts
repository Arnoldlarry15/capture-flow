import type { CaptureRect, KnowledgeObject } from "@/lib/types";

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
  "you"
]);

function guessType(text: string, rect: CaptureRect): KnowledgeObject["objectType"] {
  if (/function|const |let |class |=>/.test(text)) return "code_snippet";
  if (text.length > 20) return "text_note";
  if (rect.width * rect.height > 120_000) return "ui_screen";
  return "other";
}

function extractTags(text: string, objectType: KnowledgeObject["objectType"]): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  const uniqueWords = Array.from(new Set(words)).slice(0, 4);
  return [objectType, ...uniqueWords].slice(0, 5);
}

export function buildKnowledgeObject(input: {
  imageDataUrl: string;
  rect: CaptureRect;
  sourceText?: string;
}): KnowledgeObject {
  const extractedText = input.sourceText?.trim() || "Visual capture with limited OCR in MVP mode.";
  const objectType = guessType(extractedText, input.rect);
  const title =
    extractedText.length > 60
      ? `${extractedText.slice(0, 57).trim()}...`
      : extractedText || "Untitled capture";

  const summary =
    extractedText.length > 180
      ? `${extractedText.slice(0, 177).trim()}...`
      : `Captured ${objectType.replace("_", " ")} at ${new Date().toLocaleTimeString()}. ${extractedText}`;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    imageDataUrl: input.imageDataUrl,
    rect: input.rect,
    title,
    summary,
    tags: extractTags(extractedText, objectType),
    objectType,
    extractedText
  };
}
