# CaptureFlow

CaptureFlow is a production-lean cognitive offload tool.

It turns a hotkey-triggered drag selection into a structured knowledge object that can be retrieved later with minimal effort.

**Core interaction:** `hotkey → drag → release → done`

---

## 1) Problem

Modern knowledge work is full of brief but valuable fragments:
- a code snippet in a browser tab,
- a pricing table in a dashboard,
- a key sentence in documentation,
- a UI state you need to revisit.

Traditional note-taking interrupts flow. Users must switch context, decide where to store information, and manually summarize it.

This friction causes loss of context and dropped insights.

---

## 2) Solution

CaptureFlow provides a near-invisible capture loop:
1. Trigger capture with `Cmd/Ctrl + Shift + 2`
2. Drag a rectangle over relevant content
3. Release
4. System automatically extracts and structures the capture
5. Object appears in a minimal retrieval dashboard

The system stores each capture as a structured knowledge object with:
- content
- summary
- tags
- timestamp
- type classification

This makes capture fast enough to use continuously without disrupting primary work.

---

## 3) Cognitive Offload Concept

CaptureFlow applies **cognitive offload**: externalizing short-term memory pressure into a reliable system.

Instead of remembering where information came from or re-locating it later, users store a lightweight, structured memory artifact at the moment of discovery.

Practical outcomes:
- less context switching during focused work,
- fewer lost fragments of useful information,
- faster recall through searchable structured objects.

---

## 4) System Architecture Summary

CaptureFlow is intentionally lightweight for hackathon delivery:

- **Frontend (Next.js + React)**
  - hotkey listener
  - drag-selection overlay
  - release-to-capture interaction
  - minimal retrieval dashboard

- **Backend API (Next.js route handlers)**
  - `POST /api/captures` for ingest
  - `GET /api/objects` for retrieval

- **Processing pipeline (modular)**
  - extraction (`extract.ts`)
  - classification (`classify.ts`)
  - summarization (`summarize.ts`)
  - tagging (`tags.ts`)
  - title generation (`title.ts`)
  - orchestration (`index.ts`)

- **Storage (local JSON for MVP)**
  - concurrent-safe writes
  - filterable retrieval
  - supports text search and `#tag` query style

This architecture is easy to evolve: extraction and storage can be upgraded without changing core UX.

---

## 5) How Codex Was Used

Codex was used as an engineering copilot to accelerate implementation quality and speed.

Specifically, Codex helped with:
- architecture drafting and project decomposition,
- implementation of the capture flow UI and API routes,
- creation of a modular processing pipeline,
- retrieval model and filtering behavior,
- iterative UX simplification toward utility-style interaction,
- repository hygiene and documentation updates.

All design decisions were constrained to MVP practicality: minimal components, clear module boundaries, and deployability for demo conditions.

---

## 6) Impact and Utility

CaptureFlow is useful where speed and recall matter more than rich editing:
- engineering research and debugging notes,
- product/design reference capture,
- operations and analytics observations,
- rapid context collection before synthesis.

The innovation is not UI novelty; it is reducing capture friction to the point where structured knowledge logging becomes habitual.

---

## 7) Run Locally

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

Hotkey: `Cmd/Ctrl + Shift + 2`

---

## 8) Project Structure

```text
app/
  api/
    captures/route.ts      # ingest capture and build knowledge object
    objects/route.ts       # retrieve stored objects
  globals.css
  layout.tsx
  page.tsx                 # capture flow + dashboard shell
components/
  CaptureOverlay.tsx       # drag selection overlay
  Dashboard.tsx            # minimal retrieval interface
lib/
  pipeline/
    extract.ts
    classify.ts
    summarize.ts
    tags.ts
    title.ts
    index.ts               # processCaptureRegion orchestrator
  storage.ts               # JSON persistence + search/filter
  types.ts
data/
  captures.json            # generated at runtime
```

---

## 9) MVP Notes

- Storage is local JSON for hackathon speed and simplicity.
- Production path: move to managed DB/object storage and async workers.
- Core product principle remains unchanged: **Drag. Release. AI handles the rest.**
