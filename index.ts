import type { CaptureMetadata, KnowledgeObject } from "@/lib/types";
import { extractKnowledgeObject } from "@/lib/pipeline/extract";

// The old sub-pipeline (classify, summarize, tags, title) is retired.
// The firewall-validated LLM output IS the knowledge object.
// This module is now a thin pass-through so the API route stays unchanged.

export async function processCaptureRegion(input: CaptureMetadata): Promise<KnowledgeObject> {
  return extractKnowledgeObject(input);
}
