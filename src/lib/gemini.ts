import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";

// Try the preferred model first, then fall back when Google reports overload or quota errors,
// so a public demo link keeps working during demand spikes.
const CHAIN = [process.env.GEMINI_MODEL, "gemini-3.8-flash", "gemini-flash-latest", "gemini-3.5-flash", "gemini-flash-lite-latest"].filter(
  (m, i, a): m is string => !!m && a.indexOf(m) === i,
);

// Errors worth trying the next model for: overload, quota, timeouts, retired/unknown model.
const TRANSIENT = /\b(404|429|500|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|NOT_FOUND|overloaded|high demand|INTERNAL|DEADLINE/i;

export class AiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function generateJson<T>(opts: { system: string; parts: Part[]; schema: object; temperature?: number }): Promise<{ data: T; model: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("Server is missing GEMINI_API_KEY.", 500);
  const ai = new GoogleGenAI({ apiKey: key });

  const started = Date.now();
  let last = "";
  for (const model of CHAIN) {
    if (Date.now() - started > 35_000) break; // stay inside the 60s function limit
    let thinking = true;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: opts.parts }],
          config: {
            systemInstruction: opts.system,
            responseMimeType: "application/json",
            responseJsonSchema: opts.schema,
            temperature: opts.temperature ?? 0.2,
            // Extraction doesn't need long deliberation; low thinking keeps intake fast.
            ...(thinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
            httpOptions: { timeout: 30_000 },
          },
        });
        try {
          return { data: JSON.parse(res.text ?? "") as T, model };
        } catch {
          last = "unparseable JSON";
          break;
        }
      } catch (err) {
        last = err instanceof Error ? err.message : String(err);
        console.error(`gemini ${model} failed:`, last.slice(0, 300));
        if (thinking && /thinking/i.test(last)) {
          thinking = false; // model doesn't support thinking levels: retry once without
          continue;
        }
        break;
      }
    }
    if (last !== "unparseable JSON" && !TRANSIENT.test(last) && !/abort|timeout/i.test(last)) break;
  }
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(last)) throw new AiError("The AI quota is used up for now. Try again in a minute.", 429);
  throw new AiError("The AI service is busy. Please try again in a moment.", 503);
}

// Best-effort per-instance rate limit so a public demo link can't drain the key.
const hits = new Map<string, number[]>();
export function rateLimited(req: Request, perMinute = 12) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > perMinute;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
