import type { KnowledgeObject, KnowledgeType } from "@/lib/types";
import { demoLog } from "@/lib/demoLogger";

const VALID_TYPES = new Set<KnowledgeType>(["idea", "code", "task", "quote", "research", "other"]);

// ── Step 1: JSON extraction ───────────────────────────────────────────────────

export function extractJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {}

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {}
  }

  const block = text.match(/\{[\s\S]*\}/);
  if (block) {
    try {
      return JSON.parse(block[0]);
    } catch {}
  }

  return null;
}

// ── Step 2: Schema validator ──────────────────────────────────────────────────

export function validateKnowledgeObject(obj: unknown): obj is KnowledgeObject {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;

  return (
    typeof o.title === "string" &&
    o.title.trim().length > 0 &&
    typeof o.summary === "string" &&
    typeof o.content === "string" &&
    Array.isArray(o.entities) &&
    typeof o.type === "string" &&
    VALID_TYPES.has(o.type as KnowledgeType)
  );
}

// ── Step 3: Normalizer ────────────────────────────────────────────────────────

export function normalizeKnowledgeObject(obj: unknown): KnowledgeObject {
  const o = (obj && typeof obj === "object" ? obj : {}) as Record<string, unknown>;

  const rawType = typeof o.type === "string" ? o.type : "";
  const type: KnowledgeType = VALID_TYPES.has(rawType as KnowledgeType)
    ? (rawType as KnowledgeType)
    : "other";

  const rawEntities = Array.isArray(o.entities) ? o.entities : [];
  const entities = rawEntities
    .filter((e): e is string => typeof e === "string")
    .map((e) => e.trim())
    .filter(Boolean)
    .slice(0, 10);

  return {
    id: typeof o.id === "string" ? o.id : crypto.randomUUID(),
    title: typeof o.title === "string" && o.title.trim() ? o.title.trim().slice(0, 120) : "Untitled capture",
    type,
    summary: typeof o.summary === "string" ? o.summary.slice(0, 500) : "",
    entities,
    content: typeof o.content === "string" ? o.content.slice(0, 2000) : "",
    timestamp: typeof o.timestamp === "number" ? o.timestamp : Date.now(),
  };
}

// ── Step 4: Fallback ──────────────────────────────────────────────────────────

export function fallbackObject(rawInput: string): KnowledgeObject {
  return {
    id: crypto.randomUUID(),
    title: "Capture processed",
    type: "other",
    summary: "Content captured — AI parsing unavailable, raw content preserved.",
    content: rawInput.slice(0, 300),
    entities: [],
    timestamp: Date.now(),
  };
}

// ── Main entrypoint ───────────────────────────────────────────────────────────

export function runFirewall(rawLLMOutput: string): KnowledgeObject {
  const parsed = extractJson(rawLLMOutput);

  if (parsed === null) {
    demoLog.firewallPath("fallback", "JSON extraction returned null");
    return fallbackObject(rawLLMOutput);
  }

  if (validateKnowledgeObject(parsed)) {
    demoLog.firewallPath("valid");
    return {
      ...parsed,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
  }

  demoLog.firewallPath("normalized", `invalid fields detected`);
  return normalizeKnowledgeObject(parsed);
}
