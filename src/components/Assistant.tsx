"use client";

import { ListChecks, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/dates";
import { snapshot } from "@/lib/snapshot";
import type { Actions } from "@/lib/store";
import type { State, Urgency } from "@/lib/types";
import { Avatar, cx } from "./ui";

interface FollowUp {
  title: string;
  owner: string;
  dueDate: string;
  priority: Urgency;
  source: string;
}

interface Msg {
  role: "user" | "assistant";
  text: string;
  followUp?: FollowUp | null;
  created?: boolean;
  error?: boolean;
}

interface Props {
  open: boolean;
  request: { prompt?: string; nonce: number };
  onClose: () => void;
  s: State;
  act: Actions;
  today: string;
}

const SUGGESTIONS = [
  "Summarise today's office activity",
  "Who is handling the payment guarantee?",
  "What follow-ups are overdue?",
  "Who is visiting today?",
  "What renewals are coming up?",
  "ما هي المراسلات التي تنتظر الموافقة؟",
];

export function Assistant({ open, request, onClose, s, act, today }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastNonce = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history = msgs.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          history,
          snapshot: snapshot(s, today),
          today,
          now: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setMsgs((m) => [...m, { role: "assistant", text: json.answer, followUp: json.followUp }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", text: e instanceof Error ? e.message : "Something went wrong.", error: true }]);
    } finally {
      setBusy(false);
    }
  }

  // Open requests from elsewhere in the app (e.g. "Daily brief") arrive with a fresh nonce.
  useEffect(() => {
    if (!open || request.nonce === lastNonce.current) return;
    lastNonce.current = request.nonce;
    if (request.prompt) send(request.prompt);
    else setTimeout(() => inputRef.current?.focus(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request.nonce]);

  return (
    <>
      <div onClick={onClose} className={cx("fixed inset-0 z-30 bg-ink/20 transition-opacity", open ? "opacity-100" : "pointer-events-none opacity-0")} />
      <aside
        className={cx(
          "fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <Sparkles className="size-4 text-accent" />
          <div className="flex-1">
            <div className="font-semibold">Ask Wared</div>
            <div className="text-xs text-muted">Answers from the register, follow-ups, visitors and audit log</div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-paper hover:text-ink" aria-label="Close assistant">
            <X className="size-5" />
          </button>
        </div>

        <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {msgs.length === 0 && (
            <div>
              <p className="text-sm text-muted">Ask about anything the office has on record, in English or Arabic.</p>
              <div className="mt-4 flex flex-col gap-2">
                {SUGGESTIONS.map((q) => (
                  <button key={q} dir="auto" onClick={() => send(q)} className="rounded-lg border border-line px-3 py-2 text-left text-sm hover:border-ink/30 hover:bg-paper">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) => (
            <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cx("max-w-[90%] space-y-2", m.role === "user" && "text-right")}>
                <div
                  dir="auto"
                  className={cx(
                    "inline-block whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed",
                    m.role === "user" ? "rounded-br-sm bg-ink text-white" : m.error ? "bg-red-50 text-red-700" : "rounded-bl-sm bg-paper",
                  )}
                >
                  {m.text}
                </div>
                {m.followUp && (
                  <FollowUpCard
                    f={m.followUp}
                    s={s}
                    created={!!m.created}
                    onCreate={() => {
                      act.addTask({ ...m.followUp!, createdBy: "ai" }, "assistant");
                      setMsgs((all) => all.map((x, j) => (j === i ? { ...x, created: true } : x)));
                    }}
                  />
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-1 px-2 py-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-faint" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 border-t border-line p-4"
        >
          <textarea
            ref={inputRef}
            dir="auto"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about items, follow-ups, visitors…"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
          />
          <button type="submit" disabled={!input.trim() || busy} className="flex size-10 items-center justify-center rounded-lg bg-ink text-white disabled:opacity-40" aria-label="Send">
            <Send className="size-4" />
          </button>
        </form>
      </aside>
    </>
  );
}

function FollowUpCard({ f, s, created, onCreate }: { f: FollowUp; s: State; created: boolean; onCreate: () => void }) {
  const owner = s.members.find((m) => m.id === f.owner);
  return (
    <div className="rounded-xl border border-line bg-white p-3 text-left">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-faint">
        <ListChecks className="size-3.5" /> Proposed follow-up
      </div>
      <div className="mt-1.5 text-sm font-medium">{f.title}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Avatar member={owner} size="sm" /> {owner?.name ?? "Unassigned"} · due {f.dueDate ? formatDate(f.dueDate) : "—"} · {f.priority}
        {f.source && ` · ${f.source}`}
      </div>
      <button
        onClick={onCreate}
        disabled={created || !owner}
        className="mt-3 w-full rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white disabled:bg-emerald-600 disabled:opacity-100"
      >
        {created ? "✓ Created" : "Create follow-up"}
      </button>
    </div>
  );
}
