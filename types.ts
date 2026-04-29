// ── Infrastructure types (capture plumbing) ──────────────────────────────────

export type CaptureRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CaptureMetadata = {
  imageDataUrl: string;
  rect: CaptureRect;
  sourceText?: string;
};

// ── Knowledge Object Contract (LOCKED) ───────────────────────────────────────
// This is the ONLY shape that reaches storage or UI.
// All LLM output must pass through aiFirewall before becoming this.

export type KnowledgeType = "idea" | "code" | "task" | "quote" | "research" | "other";

export type KnowledgeObject = {
  id: string;
  title: string;
  type: KnowledgeType;
  summary: string;
  entities: string[];
  content: string;
  timestamp: number;
};

// ── Retrieval ─────────────────────────────────────────────────────────────────

export type RetrievalFilters = {
  query?: string;
  type?: KnowledgeType;
};
