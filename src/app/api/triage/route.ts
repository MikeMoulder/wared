import type { Part } from "@google/genai";
import { addDays, isIsoDate } from "@/lib/dates";
import { AiError, generateJson, jsonError, rateLimited } from "@/lib/gemini";
import { systemPrompt, TRIAGE_SCHEMA } from "@/lib/prompt";
import { DOC_TYPES, URGENCIES, type Triage, type TriageRequest } from "@/lib/types";

export const maxDuration = 60;

const MAX_TEXT = 20_000;
const MAX_FILE_B64 = 4_000_000; // ~3 MB binary, under Vercel's 4.5 MB body limit
const ALLOWED_MIME = /^(image\/(png|jpeg|webp|heic|heif)|application\/pdf)$/;

export async function POST(req: Request) {
  if (rateLimited(req)) return jsonError("Too many requests. Please wait a minute.", 429);

  let body: TriageRequest;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const text = (body.text ?? "").slice(0, MAX_TEXT).trim();
  const file = body.file;
  if (!text && !file) return jsonError("Paste some text or attach a file.");
  if (file && (!ALLOWED_MIME.test(file.mimeType) || file.data.length > MAX_FILE_B64)) {
    return jsonError("Attach a PNG/JPEG/WebP image or PDF under 3 MB.");
  }
  const members = (body.members ?? []).slice(0, 30);
  const projects = (body.projects ?? []).slice(0, 30);
  if (!members.length) return jsonError("Add at least one team member first.");
  const today = isIsoDate(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  const receivedAt = isIsoDate(body.receivedAt) ? body.receivedAt : today;

  const parts: Part[] = [];
  if (file) parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
  parts.push({ text: text ? `INCOMING ITEM:\n${text}` : "INCOMING ITEM: see the attached file." });

  try {
    const { data, model } = await generateJson<Triage>({
      system: systemPrompt(members, projects, today, receivedAt, body.channel || "Email"),
      parts,
      schema: TRIAGE_SCHEMA,
    });
    return Response.json({ triage: normalize(data, members.map((m) => m.id), projects.map((p) => p.code), receivedAt), model });
  } catch (err) {
    if (err instanceof AiError) return jsonError(err.message, err.status);
    throw err;
  }
}

// Don't trust the model for date arithmetic or ids: recompute and validate here.
function normalize(t: Triage, memberIds: string[], projectCodes: string[], receivedAt: string): Triage {
  const fallbackOwner = memberIds.includes("dana") ? "dana" : memberIds[memberIds.length - 1];
  const routeTo = memberIds.includes(t.routeTo) ? t.routeTo : fallbackOwner;
  const deadlines = (t.deadlines ?? [])
    .map((d) => {
      const days = Number.isFinite(d.days) ? Math.max(0, Math.round(d.days)) : 0;
      const anchor = isIsoDate(d.anchorDate) ? d.anchorDate : receivedAt;
      const dueDate = days > 0 ? addDays(anchor, days) : isIsoDate(d.dueDate) ? d.dueDate : "";
      const owner: "us" | "sender" | "other" = ["us", "sender", "other"].includes(d.owner) ? d.owner : "other";
      return { ...d, owner, days, anchorDate: days > 0 ? anchor : d.anchorDate || "", dueDate };
    })
    .filter((d) => d.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    ...t,
    docType: DOC_TYPES.includes(t.docType) ? t.docType : "General",
    urgency: URGENCIES.includes(t.urgency) ? t.urgency : "normal",
    projectCode: projectCodes.includes(t.projectCode) ? t.projectCode : "",
    projectConfidence: Math.min(1, Math.max(0, Number(t.projectConfidence) || 0)),
    documentDate: isIsoDate(t.documentDate) ? t.documentDate : "",
    routeTo,
    cc: [...new Set((t.cc ?? []).filter((id) => memberIds.includes(id) && id !== routeTo))],
    deadlines,
    keyPoints: t.keyPoints ?? [],
    actions: t.actions ?? [],
    risks: t.risks ?? [],
  };
}
