"use client";

import { ArrowUpRight, Bot, ListChecks, Send, X } from "lucide-react";
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
          "fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl transition-[translate,visibility] duration-200",
          open ? "visible translate-x-0" : "invisible translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Bot className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold leading-tight">Ask Wared</div>
            <div className="truncate text-xs text-muted">Answers from the register, follow-ups, visitors and audit log</div>
          </div>
          {msgs.length > 0 && (
            <button
              onClick={() => setMsgs([])}
              disabled={busy}
              className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-paper hover:text-ink disabled:opacity-40"
            >
              New chat
            </button>
          )}
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-paper hover:text-ink" aria-label="Close assistant">
            <X className="size-5" />
          </button>
        </div>

        <div className="scroll-thin flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {msgs.length === 0 && (
            <div className="pt-4">
              <div className="flex flex-col items-center text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <Bot className="size-6" />
                </span>
                <h3 className="mt-3 font-semibold">How can I help?</h3>
                <p className="mt-1 max-w-xs text-sm text-muted">Ask about anything the office has on record, in English or Arabic.</p>
              </div>
              <div className="mt-6 text-[11px] font-medium uppercase tracking-wider text-faint">Try asking</div>
              <div className="mt-2 flex flex-col gap-1.5">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="group flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm transition hover:border-ink/25 hover:bg-paper"
                  >
                    <span dir="auto" className="flex-1 text-start">
                      {q}
                    </span>
                    <ArrowUpRight className="size-3.5 shrink-0 text-faint transition group-hover:text-ink" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div dir="auto" className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm leading-relaxed text-white">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <span
                  className={cx(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                    m.error ? "bg-red-50 text-red-600" : "bg-accent-soft text-accent",
                  )}
                >
                  <Bot className="size-4" />
                </span>
                <div className="min-w-0 max-w-[88%] space-y-2">
                  <div
                    dir="auto"
                    className={cx(
                      "whitespace-pre-wrap rounded-2xl rounded-tl-md px-4 py-2.5 text-sm leading-relaxed",
                      m.error ? "bg-red-50 text-red-700" : "bg-paper",
                    )}
                  >
                    {m.error ? m.text : <RichText text={m.text} />}
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
            ),
          )}
          {busy && (
            <div className="flex gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Bot className="size-4" />
              </span>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-paper px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-1.5 animate-bounce rounded-full bg-faint" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-line p-4"
        >
          <div className="flex items-end gap-2 rounded-xl border border-line bg-white p-1.5 pl-3 transition focus-within:border-ink/40 focus-within:ring-2 focus-within:ring-ink/5">
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
              className="max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-faint"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink text-white transition disabled:bg-ink/20"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-faint">Enter to send · Shift + Enter for a new line</p>
        </form>
      </aside>
    </>
  );
}

// Answers are plain text, but models sometimes add **bold**; show it as bold rather than asterisks.
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
        /^\*\*[^*]+\*\*$/.test(part) ? (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        ),
      )}
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
