import { NextResponse } from "next/server";
import { processCaptureRegion } from "@/lib/pipeline";
import { insertKnowledgeObject } from "@/lib/storage";
import type { CaptureRect } from "@/lib/types";

type CapturePayload = {
  imageDataUrl?: string;
  rect?: CaptureRect;
  sourceText?: string;
};

const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;

function isValidRect(rect: CaptureRect | undefined): rect is CaptureRect {
  return Boolean(
    rect &&
      Number.isFinite(rect.x) &&
      Number.isFinite(rect.y) &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height) &&
      rect.width > 3 &&
      rect.height > 3
  );
}

export async function POST(request: Request) {
  let body: CapturePayload;

  try {
    body = (await request.json()) as CapturePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.imageDataUrl?.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image payload." }, { status: 400 });
  }

  if (body.imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "Image payload too large." }, { status: 413 });
  }

  if (!isValidRect(body.rect)) {
    return NextResponse.json({ error: "Invalid selection rectangle." }, { status: 400 });
  }

  let knowledgeObject;
  try {
    knowledgeObject = await processCaptureRegion({
      imageDataUrl: body.imageDataUrl,
      rect: body.rect,
      sourceText: body.sourceText
    });
  } catch (err) {
    console.error("Pipeline error:", err);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  try {
    await insertKnowledgeObject(knowledgeObject);
  } catch (err) {
    console.error("Storage error:", err);
    return NextResponse.json({ error: "Storage failed." }, { status: 500 });
  }

  return NextResponse.json({ object: knowledgeObject }, { status: 201 });
}
