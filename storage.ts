import type { KnowledgeObject, RetrievalFilters } from "@/lib/types";

// In-memory store — Vercel-safe, demo-appropriate.
const store: KnowledgeObject[] = [];

function applyFilters(items: KnowledgeObject[], filters: RetrievalFilters): KnowledgeObject[] {
  const q = filters.query?.trim().toLowerCase() ?? "";
  const type = filters.type;

  return items.filter((item) => {
    if (type && item.type !== type) return false;

    if (!q) return true;

    const haystack = [
      item.title,
      item.summary,
      item.content,
      item.type,
      ...item.entities,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export async function listKnowledgeObjects(filters: RetrievalFilters = {}): Promise<KnowledgeObject[]> {
  const filtered = applyFilters(store, filters);
  return filtered.sort((a, b) => b.timestamp - a.timestamp);
}

export async function insertKnowledgeObject(item: KnowledgeObject): Promise<void> {
  store.unshift(item);
}
