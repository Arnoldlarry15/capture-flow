# CaptureFlow MVP Architecture

## 1) Architecture Diagram (text)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                User Device                                   │
│                                                                              │
│  Global Hotkey (desktop helper)                                              │
│          │                                                                   │
│          ▼                                                                   │
│  Transparent Drag Overlay (Electron/Tauri helper window)                     │
│          │ on mouse release: crop screenshot + bounds + display metadata     │
│          ▼                                                                   │
│  Capture Client                                                               │
│    - PNG/WebP blob                                                            │
│    - captureContext {ts, appHint, monitor, rect}                              │
│          │ HTTPS                                                               │
└──────────┼────────────────────────────────────────────────────────────────────┘
           ▼
┌──────────────────────────── Vercel (Next.js) ────────────────────────────────┐
│ API Route: POST /api/captures                                                 │
│   1. validate payload                                                         │
│   2. create capture row (status=processing)                                   │
│   3. upload image to Vercel Blob (or S3)                                      │
│   4. enqueue background processing (Inngest/QStash)                           │
└──────────┬────────────────────────────────────────────────────────────────────┘
           ▼
┌──────────────────────────── Background Worker ────────────────────────────────┐
│ processCapture(captureId):                                                    │
│   a) OCR (primary)                                                            │
│   b) If OCR confidence low -> vision model fallback                           │
│   c) LLM structuring -> title, summary, tags, type, entities, actions         │
│   d) Embed canonical_text                                                     │
│   e) upsert knowledge_object + knowledge_chunk(s)                             │
│   f) mark capture status=ready/failed                                         │
└──────────┬────────────────────────────────────────────────────────────────────┘
           ▼
┌───────────────────────────── PostgreSQL + pgvector ──────────────────────────┐
│ captures | knowledge_objects | knowledge_chunks | tags | object_tags          │
└──────────┬────────────────────────────────────────────────────────────────────┘
           ▼
┌──────────────────────────── Retrieval Dashboard (web) ────────────────────────┐
│ /app                                                                           │
│ - Search box (semantic + keyword)                                              │
│ - Recent captures list                                                         │
│ - Object detail panel (summary, source image, metadata, actions)              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2) Frontend Interaction Model (drag-to-capture overlay)

### Components
1. **Desktop Capture Helper (thin client)**
   - Single responsibility: handle global hotkey + drag overlay + local screenshot crop.
   - Tech: Electron or Tauri (Tauri preferred for smaller binary).
2. **Web Dashboard (Next.js App Router)**
   - Read/search/manage knowledge objects.
   - No heavy capture UI in browser for MVP.

### Interaction states
1. `IDLE`
2. `ARMED` (hotkey pressed; full-screen transparent overlay appears)
3. `DRAGGING` (user drags rectangle)
4. `CAPTURED` (mouse up; overlay closes immediately)
5. `UPLOADING` (silent background upload)
6. `DONE` (optional toast: “Captured”) or `ERROR` (retry button)

### UX principles
- **Zero friction:** no modal/forms in capture path.
- **Instant vanish:** overlay should disappear <100ms after release.
- **Non-blocking:** user returns to original task immediately.
- **Graceful failure:** if upload fails, queue locally and retry once online.

### MVP hotkey behavior
- Default: `Cmd/Ctrl + Shift + 2`
- Rebindable later; fixed for MVP to reduce settings complexity.

---

## 3) Backend Pipeline for Captured Region

### Ingest API (`POST /api/captures`)
Input:
- image file (binary)
- capture metadata: `{x, y, width, height, screenId, capturedAt, appHint?}`

Processing:
1. Authenticate user session token.
2. Validate payload size/type.
3. Store raw image in object storage.
4. Insert capture row with status `processing`.
5. Trigger async job and return `202 Accepted` + `captureId`.

### Async Processor (`processCapture`)
1. Fetch capture image.
2. OCR extraction (fast OCR model/service).
3. Classification:
   - `text_note`, `code_snippet`, `table`, `ui_screen`, `receipt`, `diagram`, `other`
4. LLM structuring output JSON:
   - `title`
   - `summary` (2–4 lines)
   - `tags[]`
   - `entities[]`
   - `action_items[]`
   - `canonical_text`
5. Create embedding from `canonical_text`.
6. Write knowledge object + chunks + tag mappings.
7. Mark capture `ready` (or `failed` with error reason).

### Why this is minimal
- Single ingest endpoint.
- Single worker function.
- Single DB for metadata + vectors.
- No event bus, no microservices, no distributed coordination for MVP.

---

## 4) Data Model for Knowledge Objects

### `captures`
Tracks ingestion lifecycle.
- `id` (uuid, pk)
- `user_id` (uuid, indexed)
- `image_url` (text)
- `source_rect` (jsonb)
- `captured_at` (timestamptz)
- `status` (`processing|ready|failed`)
- `error_message` (text nullable)
- `created_at`, `updated_at`

### `knowledge_objects`
Primary retrieval unit.
- `id` (uuid, pk)
- `user_id` (uuid, indexed)
- `capture_id` (uuid, unique fk -> captures)
- `object_type` (text)
- `title` (text)
- `summary` (text)
- `canonical_text` (text)
- `entities` (jsonb)
- `action_items` (jsonb)
- `confidence` (float)
- `created_at`, `updated_at`

### `knowledge_chunks`
Vector search rows (1..n per object, MVP can keep n=1).
- `id` (uuid, pk)
- `knowledge_object_id` (uuid, fk)
- `chunk_index` (int)
- `chunk_text` (text)
- `embedding` (vector)
- `tsv` (tsvector for keyword fallback)

### `tags`
- `id` (uuid, pk)
- `user_id` (uuid)
- `name` (citext)

### `object_tags`
- `knowledge_object_id` (uuid, fk)
- `tag_id` (uuid, fk)
- unique `(knowledge_object_id, tag_id)`

---

## 5) Retrieval System Design

### Query path (`GET /api/search?q=...`)
1. Compute query embedding.
2. Run hybrid retrieval:
   - semantic: cosine similarity on `knowledge_chunks.embedding`
   - lexical: PostgreSQL full-text search on `tsv`
3. Fuse scores with weighted sum (e.g., `0.75 semantic + 0.25 lexical`).
4. Return top N object IDs.
5. Hydrate full cards from `knowledge_objects` + `captures` preview URL.

### Dashboard UX
- **Primary entry:** single search bar.
- **Default state:** reverse-chron recent captures.
- **Card fields:** title, summary, tags, timestamp, “open source image”.
- **Filter chips (MVP):** `type`, `tag`, `date`.

### Relevance tuning (minimal)
- Keep all text in `canonical_text` to avoid chunking complexity early.
- Add chunking only after object text regularly exceeds token limits.

---

## 6) Storage Strategy (minimal + practical)

### Recommended for Vercel-first MVP
1. **Postgres (Neon/Supabase + pgvector)**
   - Stores all structured data and embeddings.
2. **Blob storage (Vercel Blob or S3-compatible)**
   - Stores original capture images only.
3. **No additional cache layer initially**
   - Add Redis only if search latency or job throughput requires it.

### Retention defaults
- Keep original image + derived object.
- No intermediate OCR artifacts persisted unless debugging mode enabled.
- Optional cleanup job after 90 days for failed captures.

### Backup and resilience
- Rely on managed Postgres automated backups.
- Object storage versioning optional (off by default for cost).

---

## 7) File Structure (production-lean monorepo)

```text
capture-flow/
  apps/
    web/                             # Next.js app (dashboard + API routes)
      app/
        (dashboard)/
          page.tsx
          search/page.tsx
      app/api/
        captures/route.ts            # POST ingest
        search/route.ts              # GET retrieval
        objects/[id]/route.ts
      lib/
        db.ts
        auth.ts
        storage.ts
        embeddings.ts
        retrieval.ts
        schemas.ts
  packages/
    capture-client/                  # Desktop helper (Tauri/Electron)
      src/
        hotkey.ts
        overlay.ts
        capture.ts
        uploader.ts
  workers/
    processor/
      src/
        index.ts                     # processCapture entry
        ocr.ts
        classify.ts
        structure.ts
        persist.ts
  db/
    migrations/
      001_init.sql
      002_vector.sql
  docs/
    ARCHITECTURE.md
  README.md
```

---

## 8) End-to-End System Flow Explanation

1. User hits global hotkey.
2. Desktop helper draws transparent fullscreen overlay.
3. User drags region and releases.
4. Helper instantly closes overlay and uploads crop + metadata to `/api/captures`.
5. API stores image + creates `captures` row + schedules worker.
6. Worker performs OCR + LLM structuring + embedding generation.
7. Worker writes `knowledge_objects`, `knowledge_chunks`, and tag links.
8. Dashboard shows new object in recent list.
9. User searches naturally; hybrid retrieval returns relevant objects.

This keeps the MVP laser-focused on the only loop that matters:
**capture -> understand -> store -> retrieve.**
