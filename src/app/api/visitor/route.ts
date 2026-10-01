import { AiError, generateJson, jsonError, rateLimited } from "@/lib/gemini";
import type { Member, Project } from "@/lib/types";

export const maxDuration = 60;

interface Parsed {
  name: string;
  company: string;
  host: string;
  purpose: string;
  projectCode: string;
  room: string;
  expectedAt: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    company: { type: "string" },
    host: { type: "string", description: "Team member id, or empty." },
    purpose: { type: "string", description: "Short English purpose of visit." },
    projectCode: { type: "string", description: "Project code, or empty." },
    room: { type: "string", description: "One of the listed rooms if mentioned, else empty." },
    expectedAt: { type: "string", description: "Local date-time YYYY-MM-DDTHH:mm, or empty if not stated." },
  },
  required: ["name", "company", "host", "purpose", "projectCode", "room", "expectedAt"],
};

export async function POST(req: Request) {
  if (rateLimited(req)) return jsonError("Too many requests. Please wait a minute.", 429);
  let body: { text: string; now: string; members: Member[]; projects: Project[]; rooms: string[] };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }
  const text = (body.text ?? "").slice(0, 2000).trim();
  if (!text) return jsonError("Describe the visitor.");
  const members = (body.members ?? []).slice(0, 30);

  const system = `Extract a visitor record for a front-desk visitor log from a short note (Arabic or English).
The current local date-time is ${body.now}. Resolve relative times like "tomorrow at 2" or "next Tuesday morning (10:00)" into YYYY-MM-DDTHH:mm.
TEAM (host must be one of these ids): ${members.map((m) => `${m.id}=${m.name} (${m.role})`).join("; ")}
PROJECTS: ${(body.projects ?? []).map((p) => `${p.code}=${p.name}`).join("; ")}
ROOMS: ${(body.rooms ?? []).join("; ")}
Use empty strings for anything not stated. Do not invent names.`;

  try {
    const { data } = await generateJson<Parsed>({ system, parts: [{ text }], schema: SCHEMA });
    const ids = members.map((m) => m.id);
    return Response.json({ visitor: { ...data, host: ids.includes(data.host) ? data.host : "" } });
  } catch (err) {
    if (err instanceof AiError) return jsonError(err.message, err.status);
    throw err;
  }
}
