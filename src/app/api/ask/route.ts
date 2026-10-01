import { isIsoDate } from "@/lib/dates";
import { AiError, generateJson, jsonError, rateLimited } from "@/lib/gemini";
import { URGENCIES } from "@/lib/types";

export const maxDuration = 60;

interface Turn {
  role: "user" | "assistant";
  text: string;
}

interface Answer {
  answer: string;
  followUp: { title: string; owner: string; dueDate: string; priority: string; source: string };
}

const SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string", description: "Short, direct answer in plain text. Use '- ' bullets for lists. Cite ids like IN-2026-0137." },
    followUp: {
      type: "object",
      description: "Only when the user asks to create a follow-up, reminder or task. Otherwise all fields are empty strings.",
      properties: {
        title: { type: "string" },
        owner: { type: "string", description: "Team member id." },
        dueDate: { type: "string", description: "YYYY-MM-DD or empty." },
        priority: { type: "string", enum: ["", ...URGENCIES] },
        source: { type: "string", description: "Related register/follow-up id, or 'Assistant'." },
      },
      required: ["title", "owner", "dueDate", "priority", "source"],
    },
  },
  required: ["answer", "followUp"],
};

export async function POST(req: Request) {
  if (rateLimited(req, 20)) return jsonError("Too many requests. Please wait a minute.", 429);
  let body: { question: string; history?: Turn[]; snapshot: string; today: string; now: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }
  const question = (body.question ?? "").slice(0, 1000).trim();
  if (!question) return jsonError("Ask a question.");
  const today = isIsoDate(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  const history = (body.history ?? []).slice(-8).map((t) => `${t.role === "user" ? "User" : "Wared"}: ${t.text.slice(0, 1500)}`).join("\n");

  const system = `You are Wared, the internal assistant of a construction management consultancy's front desk. You answer staff questions using ONLY the office data below. It includes the incoming register, follow-ups, approvals, visitors and the audit log.

Today is ${today}; the time now is ${body.now || "unknown"}.

Rules:
- Be brief and specific. Give names, ids, dates and statuses. Say "overdue" when a due date is before today.
- If the data does not contain the answer, say so plainly. Never invent records.
- Answer in the language of the question (Arabic or English).
- You cannot send emails or change records yourself. If the user asks for a follow-up, reminder or task, fill "followUp" (owner = a team id from TEAM, due date as YYYY-MM-DD) and tell them to click "Create follow-up" to approve it. Otherwise leave every followUp field as "".

OFFICE DATA
${(body.snapshot ?? "").slice(0, 60_000)}`;

  try {
    const { data } = await generateJson<Answer>({
      system,
      parts: [{ text: `${history ? `Conversation so far:\n${history}\n\n` : ""}User: ${question}` }],
      schema: SCHEMA,
      temperature: 0.3,
    });
    const f = data.followUp;
    const followUp = f?.title ? { ...f, dueDate: isIsoDate(f.dueDate) ? f.dueDate : "", priority: URGENCIES.includes(f.priority as never) ? f.priority : "normal" } : null;
    return Response.json({ answer: data.answer, followUp });
  } catch (err) {
    if (err instanceof AiError) return jsonError(err.message, err.status);
    throw err;
  }
}
