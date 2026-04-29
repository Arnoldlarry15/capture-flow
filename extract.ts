import type { CaptureMetadata } from "@/lib/types";
import { runFirewall, fallbackObject } from "@/lib/pipeline/aiFirewall";
import { demoLog, startTimer } from "@/lib/demoLogger";
import type { KnowledgeObject } from "@/lib/types";

const EXTRACTION_PROMPT = `Analyze this screen capture and return a JSON object with EXACTLY this shape and no other text:

{
  "title": "short descriptive title (max 80 chars)",
  "type": one of exactly: "idea" | "code" | "task" | "quote" | "research" | "other",
  "summary": "1-2 sentence summary of what this content is and why it matters",
  "entities": ["notable names, tools, concepts, or keywords found — max 6 items"],
  "content": "the full extracted text or description of what you see"
}

Rules:
- Return ONLY the JSON object. No markdown. No explanation. No preamble.
- If you see code, use type "code".
- If you see a to-do, action item, or checklist, use type "task".
- If you see a direct quotation or highlighted passage, use type "quote".
- If you see research, data, or factual content, use type "research".
- If you see a concept or creative idea, use type "idea".
- Otherwise use "other".`;

async function callVision(imageDataUrl: string): Promise<string> {
  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const elapsed = startTimer();

  demoLog.llmStart("vision");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/png", data: base64 } },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    }),
  });

  demoLog.llmComplete(elapsed());

  if (!response.ok) throw new Error(`Claude API ${response.status}`);

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
}

const TEXT_PROMPT = (text: string) =>
  `Analyze this text and return a JSON object with EXACTLY this shape and no other text:

{
  "title": "short descriptive title (max 80 chars)",
  "type": one of exactly: "idea" | "code" | "task" | "quote" | "research" | "other",
  "summary": "1-2 sentence summary of what this content is and why it matters",
  "entities": ["notable names, tools, concepts, or keywords found — max 6 items"],
  "content": ${JSON.stringify(text)}
}

Return ONLY the JSON object. No markdown. No explanation.`;

async function callText(text: string): Promise<string> {
  const elapsed = startTimer();
  demoLog.llmStart("text");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: TEXT_PROMPT(text) }],
    }),
  });

  demoLog.llmComplete(elapsed());

  if (!response.ok) throw new Error(`Claude API ${response.status}`);

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
}

export async function extractKnowledgeObject(input: CaptureMetadata): Promise<KnowledgeObject> {
  const selectedText = (input.sourceText ?? "").replace(/\s+/g, " ").trim();

  try {
    const raw = selectedText.length > 0
      ? await callText(selectedText)
      : await callVision(input.imageDataUrl);

    return runFirewall(raw);
  } catch (err) {
    demoLog.error("extractKnowledgeObject", err);
    return fallbackObject(selectedText || "Visual capture — API unavailable.");
  }
}
