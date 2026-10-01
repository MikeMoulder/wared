"use client";

import { Bot, Check, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { samples } from "@/lib/seed";
import type { Actions } from "@/lib/store";
import { CHANNELS, type Channel, type State, type Triage } from "@/lib/types";
import { planWorkflow, type Plan } from "@/lib/workflow";
import type { Tab } from "./App";
import { TriageView } from "./TriageView";
import { btnPrimary, Card, cx, inputCls, Label, PageHeader } from "./ui";

interface Props {
  s: State;
  act: Actions;
  today: string;
  go: (t: Tab) => void;
}

type Attached = { name: string; mimeType: string; data: string; preview?: string };

const STEPS = ["Reading the document", "Identifying sender and project", "Checking contractual deadlines", "Choosing an owner", "Drafting acknowledgements"];

export function Intake({ s, act, today, go }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<Attached | null>(null);
  const [channel, setChannel] = useState<Channel>("Email");
  const [receivedAt, setReceivedAt] = useState(today);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Triage | null>(null);
  const [done, setDone] = useState<Plan | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setStep((x) => Math.min(x + 1, STEPS.length - 1)), 2200);
    return () => clearInterval(id);
  }, [loading]);

  const original = file ? `[file] ${file.name}` : text.slice(0, 4000);
  const plan = useMemo(
    () => (result && !done ? planWorkflow(result, s, { channel, receivedAt, original }, new Date(), today) : null),
    [result, done, s, channel, receivedAt, original, today],
  );

  async function attach(f: File) {
    setError("");
    if (f.size > 3 * 1024 * 1024) return setError("File is larger than 3 MB.");
    if (f.type === "text/plain") return setText(await f.text());
    if (!/^(image\/(png|jpeg|webp|heic|heif)|application\/pdf)$/.test(f.type)) return setError("Use a PNG/JPEG/WebP image, a PDF or a .txt file.");
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
      r.onerror = reject;
      r.readAsDataURL(f);
    });
    setFile({ name: f.name, mimeType: f.type, data, preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined });
  }

  async function run() {
    setLoading(true);
    setStep(0);
    setError("");
    setResult(null);
    setDone(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, file: file ?? undefined, channel, receivedAt, today, members: s.members, projects: s.projects }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setResult(json.triage);
      if (window.matchMedia("(max-width: 1023px)").matches) {
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setText("");
    setFile(null);
    setResult(null);
    setDone(null);
    setError("");
    setReceivedAt(today);
  }

  function execute() {
    if (!plan) return;
    act.runPlan(plan);
    setDone(plan);
  }

  const canRun = !loading && (text.trim().length > 0 || !!file);
  const shown = done ? done.entry : result;

  return (
    <div>
      <PageHeader title="Intake" sub="Paste, drop or forward anything that arrives. Wared reads it, plans the work and waits for you only where it must." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Input column */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <Label>New incoming item</Label>
              {(text || file || result) && (
                <button onClick={reset} className="text-xs font-medium text-muted hover:text-ink">
                  Clear
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-muted">
                Channel
                <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className={cx(inputCls, "mt-1")}>
                  {CHANNELS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted">
                Received
                <input type="date" value={receivedAt} max={today} onChange={(e) => setReceivedAt(e.target.value || today)} className={cx(inputCls, "mt-1")} />
              </label>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files[0];
                if (f) attach(f);
              }}
              className={cx("relative mt-3 rounded-lg transition", drag && "ring-2 ring-accent ring-offset-2")}
            >
              <textarea
                dir="auto"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Paste an email, letter, WhatsApp message or call note (Arabic or English)…\n\nor drop a scanned letter / PDF here"}
                rows={12}
                className={cx(inputCls, "scroll-thin resize-y leading-relaxed")}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) attach(f);
                  e.target.value = "";
                }}
              />
              {file ? (
                <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-paper py-1 pl-1 pr-2 text-xs">
                  {file.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.preview} alt="" className="size-7 rounded object-cover" />
                  ) : (
                    <span className="flex size-7 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700">PDF</span>
                  )}
                  <span className="truncate">{file.name}</span>
                  <button onClick={() => setFile(null)} className="text-faint hover:text-ink" aria-label="Remove file">
                    ✕
                  </button>
                </span>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
                  + Attach scan, photo or PDF
                </button>
              )}
            </div>

            <button onClick={run} disabled={!canRun} className={cx(btnPrimary, "mt-4 w-full")}>
              {loading ? "Reading…" : "Analyse item"}
            </button>
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </Card>

          <Card className="p-5">
            <Label>Try a sample</Label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {samples(today).map((x) => (
                <button
                  key={x.label}
                  onClick={() => {
                    setText(x.text);
                    setFile(null);
                    setChannel(x.channel);
                    setReceivedAt(today);
                    setResult(null);
                    setDone(null);
                    setError("");
                  }}
                  className="rounded-lg border border-line px-3 py-2.5 text-left transition hover:border-ink/30 hover:bg-paper"
                >
                  <div className="text-sm font-medium">{x.label}</div>
                  <div className="text-xs text-faint">{x.hint}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Result column */}
        <div ref={resultRef} className="min-w-0 scroll-mt-4">
          {loading ? (
            <Card className="p-8">
              <div className="relative h-1 overflow-hidden rounded bg-line loading-bar" />
              <ul className="mt-6 space-y-3">
                {STEPS.map((x, i) => (
                  <li key={x} className={cx("flex items-center gap-3 text-sm transition", i <= step ? "text-ink" : "text-faint")}>
                    <span
                      className={cx(
                        "flex size-5 items-center justify-center rounded-full border text-[10px]",
                        i < step ? "border-ink bg-ink text-white" : i === step ? "border-accent text-accent" : "border-line",
                      )}
                    >
                      {i < step ? "✓" : i + 1}
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </Card>
          ) : shown ? (
            <div className="space-y-4">
              {plan && <PlanCard plan={plan} onRun={execute} />}
              {done && <DoneCard plan={done} onNext={reset} go={go} />}
              <TriageView
                t={shown}
                members={s.members}
                projects={s.projects}
                today={today}
                entryId={done?.entry.id ?? plan?.entry.id}
                onOwnerChange={done ? undefined : (id) => result && setResult({ ...result, routeTo: id, cc: result.cc.filter((c) => c !== id) })}
              />
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, onRun }: { plan: Plan; onRun: () => void }) {
  const auto = plan.steps.filter((x) => x.mode === "auto");
  const gated = plan.steps.filter((x) => x.mode === "approval");
  return (
    <Card className="overflow-hidden border-navy/25">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-navy px-5 py-3 text-white">
        <div>
          <div className="text-sm font-semibold">Workflow plan</div>
          <div className="text-xs text-white/70">
            {auto.length} automatic · {gated.length} need{gated.length === 1 ? "s" : ""} a person
          </div>
        </div>
        <button onClick={onRun} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">
          Run workflow
        </button>
      </div>
      <ul className="divide-y divide-line">
        {plan.steps.map((x, i) => (
          <li key={i} className="flex items-start gap-3 px-5 py-2.5">
            <span className={cx("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", x.mode === "auto" ? "bg-accent-soft text-accent" : "bg-amber-50 text-amber-700")}>
              {x.mode === "auto" ? <Bot className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{x.label}</div>
              <div className="text-xs text-muted">{x.detail}</div>
            </div>
            <span className={cx("shrink-0 text-[11px] font-semibold uppercase tracking-wide", x.mode === "auto" ? "text-accent" : "text-amber-700")}>
              {x.mode === "auto" ? "Auto" : "Approval"}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line bg-paper/60 px-5 py-2 text-[11px] text-faint">
        The AI proposes; fixed rules decide. Anything leaving the office, or any doubtful routing, always waits for a person.
      </p>
    </Card>
  );
}

function DoneCard({ plan, onNext, go }: { plan: Plan; onNext: () => void; go: (t: Tab) => void }) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/50 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            Logged as <span className="font-mono">{plan.entry.id}</span>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            Routed, {plan.tasks.length} follow-up{plan.tasks.length === 1 ? "" : "s"} created
            {plan.approvals.length ? `, ${plan.approvals.length} item${plan.approvals.length === 1 ? "" : "s"} waiting for approval` : ""}. Every step is in the audit log.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.approvals.length > 0 && (
              <button onClick={() => go("approvals")} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-ink/85">
                Review approval →
              </button>
            )}
            <button onClick={onNext} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium hover:border-ink/30">
              Next item
            </button>
            <button onClick={() => go("register")} className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:text-ink">
              Open register
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  const rows = [
    ["1 · Understand", "Reads emails, scanned letters, PDFs, WhatsApp messages and call notes in Arabic or English. Finds the sender, project, urgency and every deadline."],
    ["2 · Plan", "Proposes the work: log, route, create follow-ups, draft replies. Fixed rules mark each step as automatic or needing approval."],
    ["3 · Act", "Routine steps run straight away. Replies to outside parties and doubtful routing wait in Approvals."],
    ["4 · Record", "Everything lands in the register, follow-ups and audit log, ready for the Command Center and the assistant."],
  ];
  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-semibold">Every letter starts a clock.</h2>
        <span dir="rtl" className="text-lg text-faint">
          وارد
        </span>
      </div>
      <p className="mt-2 max-w-prose text-sm text-muted">
        A Notice of Claim under FIDIC 2017 gives the Engineer 14 days before it is deemed valid. A payment statement starts a 28-day certification clock. Wared makes
        sure none of these is missed at the front desk.
      </p>
      <dl className="mt-6 divide-y divide-line border-y border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]">
            <dt className="text-sm font-medium">{k}</dt>
            <dd className="text-sm text-muted">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-xs text-faint">Pick a sample on the left to see it work. All companies, people and projects are fictional.</p>
    </Card>
  );
}
