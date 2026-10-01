"use client";

import { useState, type ReactNode } from "react";
import { countdownLabel, formatDate } from "@/lib/dates";
import type { Member, Status, Urgency } from "@/lib/types";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-line bg-surface", className)}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-medium uppercase tracking-wider text-faint">{children}</div>;
}

export function Pill({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", className)}
    >
      {children}
    </span>
  );
}

const URGENCY_STYLE: Record<Urgency, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  normal: "border-sky-200 bg-sky-50 text-sky-700",
  low: "border-stone-200 bg-stone-50 text-stone-600",
};

export function UrgencyPill({ urgency, reason }: { urgency: Urgency; reason?: string }) {
  return (
    <Pill className={URGENCY_STYLE[urgency]} title={reason}>
      <span className="size-1.5 rounded-full bg-current" />
      {urgency[0].toUpperCase() + urgency.slice(1)}
    </Pill>
  );
}

const STATUS_STYLE: Record<Status, string> = {
  New: "border-accent/30 bg-accent-soft text-accent",
  Routed: "border-sky-200 bg-sky-50 text-sky-700",
  Acknowledged: "border-violet-200 bg-violet-50 text-violet-700",
  Closed: "border-stone-200 bg-stone-100 text-stone-500",
};

export function StatusPill({ status }: { status: Status }) {
  return <Pill className={STATUS_STYLE[status]}>{status}</Pill>;
}

export function Countdown({ due, today, muted }: { due: string; today: string; muted?: boolean }) {
  const { label, tone } = countdownLabel(due, today);
  const cls = muted
    ? "border-stone-200 bg-stone-50 text-stone-500"
    : tone === "overdue"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "soon"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return (
    <Pill className={cls} title={formatDate(due)}>
      {label}
    </Pill>
  );
}

export function Avatar({ member, size = "md" }: { member?: Member; size?: "sm" | "md" }) {
  const initials = (member?.name ?? "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-navy font-semibold text-white",
        size === "sm" ? "size-6 text-[10px]" : "size-9 text-xs",
      )}
    >
      {initials}
    </span>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-muted hover:border-ink/30 hover:text-ink"
    >
      {done ? "Copied" : label}
    </button>
  );
}

export function ActorBadge({ actor }: { actor: "ai" | "human" }) {
  return actor === "ai" ? (
    <Pill className="border-accent/25 bg-accent-soft text-accent">AI</Pill>
  ) : (
    <Pill className="border-navy/20 bg-navy/5 text-navy">Human</Pill>
  );
}

export function RefChip({ id, onClick }: { id?: string; onClick?: () => void }) {
  if (!id) return null;
  const cls = "rounded border border-line bg-paper px-1.5 py-px font-mono text-[11px] text-muted";
  return onClick ? (
    <button onClick={onClick} className={cx(cls, "hover:border-ink/30 hover:text-ink")}>
      {id}
    </button>
  ) : (
    <span className={cls}>{id}</span>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition placeholder:text-faint focus:border-ink/40 focus:ring-2 focus:ring-ink/5";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-ink/30";
