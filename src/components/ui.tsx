"use client";

import { Bot, ChevronDown, UserRound, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { countdownLabel, formatDate } from "@/lib/dates";
import { STATUSES, type Member, type Status, type Urgency } from "@/lib/types";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-line bg-surface", className)}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-medium uppercase tracking-wider text-faint">{children}</div>;
}

// Standard header row for a card: optional icon, small caps title, optional right-hand content.
export function CardHeader({ icon: Icon, title, right, className }: { icon?: LucideIcon; title: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex min-h-12 items-center justify-between gap-3 border-b border-line px-5 py-2.5", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon className="size-4 shrink-0 text-faint" />}
        <Label>{title}</Label>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

// Two-option segmented toggle, used for English / Arabic switches.
export function Segmented<T extends string>({ value, options, onChange, disabled }: { value: T; options: [T, string][]; onChange: (v: T) => void; disabled?: T[] }) {
  return (
    <div className="flex rounded-lg border border-line bg-paper p-0.5 text-xs">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          disabled={disabled?.includes(v)}
          className={cx(
            "rounded-md px-2.5 py-0.5 font-medium transition disabled:opacity-30",
            value === v ? "bg-white text-ink shadow-[0_1px_2px_rgba(27,26,23,0.08)] ring-1 ring-line" : "text-muted hover:text-ink",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
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

// A status badge that is also the control for changing it.
export function StatusSelect({ value, onChange, label }: { value: Status; onChange: (s: Status) => void; label: string }) {
  return (
    <span className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Status)}
        aria-label={label}
        className={cx("cursor-pointer appearance-none rounded-full border py-0.5 pl-2.5 pr-6 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ink/20", STATUS_STYLE[value])}
      >
        {STATUSES.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 opacity-60" />
    </span>
  );
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

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
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
      className={cx("rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-muted hover:border-ink/30 hover:text-ink", className)}
    >
      {done ? "Copied" : label}
    </button>
  );
}

export function ActorBadge({ actor }: { actor: "ai" | "human" }) {
  return actor === "ai" ? (
    <Pill className="border-accent/25 bg-accent-soft text-accent">
      <Bot className="size-3" /> AI
    </Pill>
  ) : (
    <Pill className="border-navy/20 bg-navy/5 text-navy">
      <UserRound className="size-3" /> Human
    </Pill>
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
