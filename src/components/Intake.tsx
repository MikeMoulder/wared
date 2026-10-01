"use client";

import {
  Bot,
  Check,
  ChevronDown,
  FileText,
  Hand,
  LoaderCircle,
  Mail,
  MessageCircle,
  Paperclip,
  Phone,
  ShieldCheck,
  Truck,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { samples, type Sample } from "@/lib/seed";
import type { Actions } from "@/lib/store";
import { CHANNELS, type Channel, type State, type Triage } from "@/lib/types";
import { planWorkflow, type Plan } from "@/lib/workflow";
import type { Tab } from "./App";
import { TriageView } from "./TriageView";
import { Card, cx, inputCls, Label, PageHeader } from "./ui";

interface Props {
  s: State;
  act: Actions;
  today: string;
  go: (t: Tab) => void;
}

type Attached = { name: string; mimeType: string; data: string; size: number; preview?: string };

const STEPS = ["Reading the document", "Identifying sender and project", "Checking contractual deadlines", "Choosing an owner", "Drafting acknowledgements"];

const CHANNEL_ICON: Record<Channel, LucideIcon> = {
  Email: Mail,
  Letter: FileText,
  WhatsApp: MessageCircle,
  "Phone call": Phone,
  "Hand delivered": Hand,
  Courier: Truck,
};

const CHANNEL_SHORT: Record<Channel, string> = {
  Email: "Email",
  Letter: "Letter",
  WhatsApp: "WhatsApp",
  "Phone call": "Call",
  "Hand delivered": "By hand",
  Courier: "Courier",
};

// Rough script detection so the operator can see what the AI will be reading.
function detectLanguage(text: string): "Arabic" | "English" | "Arabic + English" | null {
  const ar = (text.match(/[؀-ۿ]/g) ?? []).length;
  const en = (text.match(/[A-Za-z]/g) ?? []).length;
  if (ar + en < 12) return null;
  if (ar > en * 4) return "Arabic";
  if (en > ar * 4) return "English";
  return "Arabic + English";
}

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function Intake({ s, act, today, go }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<Attached | null>(null);
  const [channel, setChannel] = useState<Channel>("Email");
  const [receivedAt, setReceivedAt] = useState(today);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Triage | null>(null);
  const [done, setDone] = useState<Plan | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const sampleList = useMemo(() => samples(today), [today]);

  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - started) / 1000);
      setElapsed(secs);
      setStep(Math.min(Math.floor(secs / 2.2), STEPS.length - 1));
    }, 250);
    return () => clearInterval(id);
  }, [loading]);

  const original = file ? `[file] ${file.name}` : text.slice(0, 4000);
  const plan = useMemo(
    () => (result && !done ? planWorkflow(result, s, { channel, receivedAt, original }, new Date(), today) : null),
    [result, done, s, channel, receivedAt, original, today],
  );
  const language = detectLanguage(text);
  const canRun = !loading && (text.trim().length > 0 || !!file);
  const shown = done ? done.entry : result;

  async function attach(f: File) {
    setError("");
    if (f.size > 3 * 1024 * 1024) return setError("That file is larger than 3 MB.");
    if (f.type === "text/plain") return setText(await f.text());
    if (!/^(image\/(png|jpeg|webp|heic|heif)|application\/pdf)$/.test(f.type)) return setError("Use a PNG/JPEG/WebP image, a PDF or a .txt file.");
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
      r.onerror = reject;
      r.readAsDataURL(f);
    });
    setFile({ name: f.name, mimeType: f.type, data, size: f.size, preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined });
  }

  async function run() {
    if (!canRun) return;
    setLoading(true);
    setStep(0);
    setElapsed(0);
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

  function loadSample(x: Sample) {
    setText(x.text);
    setFile(null);
    setChannel(x.channel);
    setReceivedAt(today);
    setResult(null);
    setDone(null);
    setError("");
    // Show the sample from its first line, ready to edit or analyse.
    setTimeout(() => {
      const el = textRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange(0, 0);
      el.scrollTop = 0;
    }, 0);
  }

  function execute() {
    if (!plan) return;
    act.runPlan(plan);
    setDone(plan);
  }

  return (
    <div>
      <PageHeader title="Intake" sub="Paste, drop or forward anything that arrives. Wared reads it, plans the work and waits for you only where it must." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Input column */}
        <div className="min-w-0">
          <Card className="overflow-hidden lg:sticky lg:top-6">
            <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
              <span className="whitespace-nowrap">
                <Label>New item</Label>
              </span>
              <div className="flex items-center gap-1">
                <div className="relative">
                  <select
                    value=""
                    onChange={(e) => {
                      const x = sampleList[Number(e.target.value)];
                      if (x) loadSample(x);
                    }}
                    className="w-[6.75rem] appearance-none truncate rounded-md bg-transparent py-1 pl-2 pr-6 text-xs font-medium text-muted hover:bg-paper hover:text-ink"
                    aria-label="Load a sample item"
                  >
                    <option value="" disabled>
                      Load sample
                    </option>
                    {sampleList.map((x, i) => (
                      <option key={x.label} value={i}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
                </div>
                {(text || file || result) && (
                  <button onClick={reset} className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-paper hover:text-ink">
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 p-5">
              {/* Channel */}
              <div>
                <div className="mb-1.5 text-xs font-medium text-muted">Arrived by</div>
                <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Channel">
                  {CHANNELS.map((c) => {
                    const Icon = CHANNEL_ICON[c];
                    const on = channel === c;
                    return (
                      <button
                        key={c}
                        role="radio"
                        aria-checked={on}
                        onClick={() => setChannel(c)}
                        className={cx(
                          "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition",
                          on ? "border-ink bg-ink text-white" : "border-line bg-white text-muted hover:border-ink/30 hover:text-ink",
                        )}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        {CHANNEL_SHORT[c]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
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
                className={cx(
                  "relative overflow-hidden rounded-xl border bg-white transition focus-within:border-ink/40 focus-within:ring-2 focus-within:ring-ink/5",
                  drag ? "border-accent ring-2 ring-accent/20" : "border-line",
                )}
              >
                <textarea
                  ref={textRef}
                  dir="auto"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      run();
                    }
                  }}
                  placeholder="Paste an email, letter, WhatsApp message or call note, in Arabic or English…"
                  rows={11}
                  className="scroll-thin block w-full resize-y bg-transparent px-4 pb-2 pt-3.5 text-sm leading-relaxed outline-none placeholder:text-faint"
                />

                {file && (
                  <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-lg border border-line bg-paper p-1.5 pr-2">
                    {file.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.preview} alt="" className="size-9 rounded-md object-cover" />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-md bg-red-50 text-[10px] font-bold text-red-700">PDF</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{file.name}</div>
                      <div className="text-[11px] text-faint">{kb(file.size)} · the AI reads the scan directly</div>
                    </div>
                    <button onClick={() => setFile(null)} className="rounded p-1 text-faint hover:bg-white hover:text-ink" aria-label="Remove file">
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 border-t border-line bg-paper/50 px-3 py-2">
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
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-white hover:text-ink"
                  >
                    <Paperclip className="size-3.5" /> {file ? "Replace file" : "Attach scan or PDF"}
                  </button>
                  <span className="ml-auto flex items-center gap-2 text-[11px] text-faint">
                    {language && <span className="rounded-full border border-line bg-white px-2 py-0.5 font-medium text-muted">{language}</span>}
                    {text.length > 0 && <span className="tabular-nums">{text.length.toLocaleString()} chars</span>}
                  </span>
                </div>

                {drag && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-accent-soft/90 text-accent">
                    <Upload className="size-6" />
                    <span className="text-sm font-semibold">Drop to attach</span>
                    <span className="text-xs">Scan, photo or PDF up to 3 MB</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-muted">
                  Received
                  <input
                    type="date"
                    value={receivedAt}
                    max={today}
                    onChange={(e) => setReceivedAt(e.target.value || today)}
                    className={cx(inputCls, "w-auto py-1 text-xs")}
                  />
                </label>
                <span className="hidden text-[11px] text-faint sm:inline">
                  <kbd className="rounded border border-line bg-white px-1 font-sans">Ctrl</kbd> + <kbd className="rounded border border-line bg-white px-1 font-sans">Enter</kbd>
                </span>
              </div>

              <button
                onClick={run}
                disabled={!canRun}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:bg-ink/25"
              >
                {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Bot className="size-4" />}
                {loading ? "Reading…" : "Analyse item"}
              </button>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            </div>
          </Card>
        </div>

        {/* Result column */}
        <div ref={resultRef} className="min-w-0 scroll-mt-4">
          {loading ? (
            <Card className="overflow-hidden">
              <div className="loading-bar relative h-1 overflow-hidden bg-line" />
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Bot className="size-4 text-accent" /> Wared is reading the item
                  </div>
                  <span className="font-mono text-xs tabular-nums text-faint">{elapsed}s</span>
                </div>
                <ul className="mt-6 space-y-3.5">
                  {STEPS.map((x, i) => (
                    <li key={x} className={cx("flex items-center gap-3 text-sm transition", i <= step ? "text-ink" : "text-faint")}>
                      <span
                        className={cx(
                          "flex size-6 items-center justify-center rounded-full border text-[10px] transition",
                          i < step ? "border-emerald-600 bg-emerald-600 text-white" : i === step ? "border-accent text-accent" : "border-line",
                        )}
                      >
                        {i < step ? <Check className="size-3.5" /> : i === step ? <LoaderCircle className="size-3.5 animate-spin" /> : i + 1}
                      </span>
                      {x}
                    </li>
                  ))}
                </ul>
                {elapsed >= 15 && (
                  <p className="mt-6 rounded-lg bg-paper px-3 py-2 text-xs text-muted">
                    Google&apos;s models are busy right now, so Wared may be trying a backup model. This can take up to 30 seconds.
                  </p>
                )}
              </div>
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
            <EmptyState samples={sampleList} onPick={loadSample} />
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

function EmptyState({ samples, onPick }: { samples: Sample[]; onPick: (x: Sample) => void }) {
  const steps: [LucideIcon, string, string][] = [
    [Bot, "Understand", "Sender, project, urgency, deadlines"],
    [FileText, "Plan", "Log, route, follow-ups, reply drafts"],
    [ShieldCheck, "Act", "Routine runs; exceptions wait for you"],
    [Check, "Record", "Register, follow-ups and audit log"],
  ];
  return (
    <Card className="overflow-hidden">
      <div className="p-6 sm:p-8">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Every letter starts a clock.</h2>
          <span dir="rtl" className="text-lg text-faint">
            وارد
          </span>
        </div>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          A Notice of Claim under FIDIC 2017 gives the Engineer 14 days before it is deemed valid. A payment statement starts a 28-day certification
          clock. Wared makes sure none of these is missed at the front desk.
        </p>

        <ol className="mt-6 grid gap-2 sm:grid-cols-4">
          {steps.map(([Icon, k, v]) => (
            <li key={k} className="rounded-lg bg-paper px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white text-muted ring-1 ring-inset ring-line">
                  <Icon className="size-3.5" />
                </span>
                <span className="text-xs font-semibold">{k}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-muted">{v}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="border-t border-line bg-paper/40 p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>Start with a sample</Label>
          <span className="text-[11px] text-faint">All people and companies are fictional</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {samples.map((x) => {
            const Icon = CHANNEL_ICON[x.channel];
            const lang = detectLanguage(x.text);
            return (
              <button
                key={x.label}
                onClick={() => onPick(x)}
                className="group flex items-start gap-3 rounded-xl border border-line bg-white p-3 text-left transition hover:-translate-y-px hover:border-ink/25 hover:shadow-[0_6px_16px_-8px_rgba(27,26,23,0.2)]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-paper text-muted ring-1 ring-inset ring-line transition group-hover:text-accent">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug">{x.label}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-faint">
                    {x.hint}
                    {lang && lang !== "English" && <span className="rounded-full bg-accent-soft px-1.5 py-px font-medium text-accent">{lang}</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
