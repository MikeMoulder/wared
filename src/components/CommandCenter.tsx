"use client";

import { Activity, ArrowRight, ArrowUpRight, Bot, CalendarClock, Clock, DoorOpen, Hand, Inbox, ListChecks, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { daysBetween, formatTime, formatWhen, localDay } from "@/lib/dates";
import { computeMetrics } from "@/lib/metrics";
import type { Actions } from "@/lib/store";
import type { State } from "@/lib/types";
import { MINUTES } from "@/lib/workflow";
import type { Tab } from "./App";
import { Avatar, Card, CardHeader, Countdown, cx, Label, RefChip } from "./ui";

interface Props {
  s: State;
  act: Actions;
  today: string;
  go: (t: Tab) => void;
  ask: (prompt?: string) => void;
}

export function CommandCenter({ s, act, today, go, ask }: Props) {
  const m = computeMetrics(s, today);
  const name = (id: string) => s.members.find((x) => x.id === id);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // What needs a person right now, most urgent first.
  const attention: { key: string; tone: "red" | "amber" | "navy"; icon: ReactNode; title: string; sub: string; tab: Tab }[] = [
    ...s.tasks
      .filter((t) => t.status === "open" && t.dueDate && daysBetween(today, t.dueDate) <= 0)
      .map((t) => ({
        key: t.id,
        tone: "red" as const,
        icon: <TriangleAlert className="size-4" />,
        title: t.title,
        sub: `${t.dueDate < today ? `Overdue ${-daysBetween(today, t.dueDate)}d` : "Due today"} · ${name(t.owner)?.name ?? t.owner} · ${t.source}`,
        tab: "followups" as Tab,
      })),
    ...s.approvals
      .filter((a) => a.status === "pending")
      .map((a) => ({
        key: a.id,
        tone: "amber" as const,
        icon: <ShieldCheck className="size-4" />,
        title: a.title,
        sub: `Awaiting approval · ${a.ref}`,
        tab: "approvals" as Tab,
      })),
    ...s.tasks
      .filter((t) => t.status === "open" && t.dueDate && daysBetween(today, t.dueDate) > 0 && daysBetween(today, t.dueDate) <= 2)
      .map((t) => ({
        key: t.id,
        tone: "navy" as const,
        icon: <ListChecks className="size-4" />,
        title: t.title,
        sub: `Due in ${daysBetween(today, t.dueDate)}d · ${name(t.owner)?.name ?? t.owner}${t.basis ? ` · ${t.basis}` : ""}`,
        tab: "followups" as Tab,
      })),
  ];

  const visitorsToday = s.visitors
    .filter((v) => localDay(v.expectedAt) === today || v.status === "on-site")
    .sort((a, b) => a.expectedAt.localeCompare(b.expectedAt));

  const hours = m.minutesSavedWeek / 60;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{greet}. Here&apos;s the office.</h1>
        </div>
        <button onClick={() => ask("Give me today's office brief: what came in, what's waiting for approval, what's due or overdue, and who is visiting.")} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/85">
          <Bot className="size-4" /> Daily brief
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          icon={Inbox}
          label="Interactions today"
          value={m.interactionsToday}
          meter={[
            { value: m.itemsToday, className: "bg-navy" },
            { value: m.arrivalsToday, className: "bg-emerald-500" },
          ]}
          note={
            <>
              <Dot className="bg-navy" />
              {m.itemsToday} item{m.itemsToday === 1 ? "" : "s"} <Dot className="ml-1.5 bg-emerald-500" />
              {m.arrivalsToday} arrival{m.arrivalsToday === 1 ? "" : "s"}
            </>
          }
        />
        <Kpi
          icon={Bot}
          tone="accent"
          label="AI actions today"
          value={m.aiActionsToday}
          meter={[
            { value: m.aiActionsToday, className: "bg-accent" },
            { value: m.humanActionsToday, className: "bg-navy/30" },
          ]}
          note={`${m.humanActionsToday} by people`}
        />
        <Kpi
          icon={ShieldCheck}
          tone={m.pendingApprovals ? "amber" : "green"}
          alert={m.pendingApprovals > 0}
          label="Awaiting approval"
          value={m.pendingApprovals}
          meter={[
            { value: m.pendingApprovals, className: "bg-amber-500" },
            { value: m.approvalsDecidedWeek, className: "bg-emerald-500" },
          ]}
          note={m.pendingApprovals ? `Oldest waiting ${m.oldestPendingDays ? `${m.oldestPendingDays}d` : "today"}` : "All clear"}
          onClick={() => go("approvals")}
        />
        <Kpi
          icon={ListChecks}
          tone={m.overdueTasks ? "red" : "neutral"}
          alert={m.overdueTasks > 0}
          label="Open follow-ups"
          value={m.openTasks}
          meter={[
            { value: m.overdueTasks, className: "bg-red-500" },
            { value: m.dueSoonTasks, className: "bg-amber-400" },
            { value: m.openTasks - m.overdueTasks - m.dueSoonTasks, className: "bg-stone-300" },
          ]}
          note={
            m.overdueTasks ? (
              <>
                <span className="font-medium text-red-700">{m.overdueTasks} overdue</span> · {m.dueSoonTasks} this week
              </>
            ) : (
              `${m.dueSoonTasks} due this week`
            )
          }
          onClick={() => go("followups")}
        />
        <Kpi
          icon={DoorOpen}
          tone={m.onSite ? "green" : "neutral"}
          label="Visitors on site"
          value={m.onSite}
          meter={[
            { value: m.onSite, className: "bg-emerald-500" },
            { value: m.expectedToday, className: "bg-stone-300" },
          ]}
          note={`${m.expectedToday} more expected today`}
          onClick={() => go("visitors")}
        />
        <Kpi
          icon={Clock}
          tone="green"
          label="Time saved"
          value={hours.toFixed(1)}
          unit="h"
          meter={[
            { value: m.automationRate, className: "bg-emerald-500" },
            { value: 100 - m.automationRate, className: "bg-stone-200" },
          ]}
          note="Estimate · last 7 days"
          title={`Estimated from automated steps in the audit log: logging ${MINUTES.log} min, routing ${MINUTES.route}, follow-up ${MINUTES.followUp}, reply draft ${MINUTES.draft}, visitor notice ${MINUTES.visitor}.`}
        />
      </div>

      {/* Pipeline */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>How work moved this week</Label>
          <span className="text-xs text-faint">{m.automationRate}% of logged actions were done by AI</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ["Came in", m.receivedWeek, "letters, emails, calls"],
            [
              "Deadlines found",
              s.entries.filter((e) => daysBetween(e.receivedAt, today) < 7).reduce((n, e) => n + e.deadlines.length, 0),
              "tracked with a countdown",
            ],
            ["AI handled", m.aiWeek, "automatic, low-risk actions"],
            ["People decided", m.approvalsDecidedWeek, "approvals and exceptions"],
            ["On record", s.audit.length, "audit events, all traceable"],
          ].map(([k, v, sub], i) => (
            <div key={k as string} className="relative rounded-lg bg-paper px-4 py-3">
              <div className="text-2xl font-semibold tabular-nums">{v}</div>
              <div className="text-sm font-medium">{k}</div>
              <div className="text-xs text-muted">{sub}</div>
              {i < 4 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden size-4 -translate-y-1/2 text-faint sm:block" />}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Needs attention */}
        <Card className="overflow-hidden">
          <CardHeader icon={Hand} title="Needs a person" right={<span className="text-xs text-faint">{attention.length} items</span>} />
          {attention.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">Nothing is waiting on anyone. 🎉</p>
          ) : (
            <ul className="divide-y divide-line">
              {attention.slice(0, 8).map((a) => (
                <li key={a.key}>
                  <button onClick={() => go(a.tab)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-paper/70">
                    <span
                      className={cx(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                        a.tone === "red" ? "bg-red-50 text-red-700" : a.tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-navy/5 text-navy",
                      )}
                    >
                      {a.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{a.title}</span>
                      <span className="block text-xs text-muted">{a.sub}</span>
                    </span>
                    <ArrowRight className="mt-1.5 size-4 shrink-0 text-faint" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Visitors */}
        <Card className="overflow-hidden">
          <CardHeader icon={DoorOpen} title="Visitors today" right={<button onClick={() => go("visitors")} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">Visitor desk <ArrowRight className="size-3.5" /></button>} />
          {visitorsToday.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No visitors expected today.</p>
          ) : (
            <ul className="divide-y divide-line">
              {visitorsToday.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                  <DoorOpen className={cx("size-4 shrink-0", v.status === "on-site" ? "text-emerald-600" : "text-faint")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{v.name}</div>
                    <div className="truncate text-xs text-muted">
                      {formatTime(v.expectedAt)} · {name(v.host)?.name} · {v.room || "no room"}
                    </div>
                  </div>
                  {v.status === "expected" ? (
                    <button onClick={() => act.setVisitor(v.id, "on-site")} className="rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:border-ink/30">
                      Check in
                    </button>
                  ) : (
                    <span className={cx("text-xs font-medium", v.status === "on-site" ? "text-emerald-700" : "text-faint")}>
                      {v.status === "on-site" ? "On site" : v.status === "left" ? "Left" : "No-show"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Activity */}
        <Card className="overflow-hidden">
          <CardHeader icon={Activity} title="Live activity" right={<button onClick={() => go("audit")} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">Full audit log <ArrowRight className="size-3.5" /></button>} />
          <ul className="divide-y divide-line">
            {s.audit.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-5 py-2.5">
                <span className={cx("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", e.actor === "ai" ? "bg-accent-soft text-accent" : "bg-navy/5 text-navy")}>
                  {e.actor === "ai" ? <Bot className="size-3.5" /> : <UserRound className="size-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="font-medium">{e.action}</span> <RefChip id={e.ref} />
                  </div>
                  <div className="truncate text-xs text-muted" dir="auto">
                    {e.detail}
                  </div>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-faint">{formatWhen(e.at, today)}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Upcoming deadlines */}
        <Card className="overflow-hidden">
          <CardHeader icon={CalendarClock} title="Our deadlines · next 14 days" right={<button onClick={() => go("register")} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">Register <ArrowRight className="size-3.5" /></button>} />
          <ul className="divide-y divide-line">
            {s.entries
              .filter((e) => e.status !== "Closed")
              .flatMap((e) => e.deadlines.filter((d) => d.owner === "us").map((d) => ({ e, d })))
              .filter(({ d }) => daysBetween(today, d.dueDate) <= 14)
              .sort((a, b) => a.d.dueDate.localeCompare(b.d.dueDate))
              .slice(0, 7)
              .map(({ e, d }, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-[4.5rem] shrink-0">
                    <Countdown due={d.dueDate} today={today} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-snug">{d.description}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <RefChip id={e.id} />
                      {e.projectCode && <span className="font-medium text-navy">{e.projectCode}</span>}
                      <span className="inline-flex items-center gap-1">
                        <Avatar member={name(e.routeTo)} size="sm" />
                        {name(e.routeTo)?.name}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

type Tone = "neutral" | "accent" | "amber" | "red" | "green";

const CHIP: Record<Tone, string> = {
  neutral: "bg-paper text-muted ring-1 ring-inset ring-line",
  accent: "bg-accent-soft text-accent",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  green: "bg-emerald-50 text-emerald-700",
};

function Dot({ className }: { className: string }) {
  return <span aria-hidden className={cx("mr-1 inline-block size-1.5 rounded-full align-middle", className)} />;
}

interface KpiProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  unit?: string;
  note?: ReactNode;
  tone?: Tone;
  alert?: boolean; // needs attention: colours the number and adds a top accent
  meter?: { value: number; className: string }[]; // what the number is made of
  onClick?: () => void;
  title?: string;
}

function Kpi({ icon: Icon, label, value, unit, note, tone = "neutral", alert, meter = [], onClick, title }: KpiProps) {
  const parts = meter.filter((p) => p.value > 0);
  const alertColor = tone === "red" ? "red" : "amber";
  const body = (
    <>
      {alert && <span aria-hidden className={cx("absolute inset-x-0 top-0 h-0.5", alertColor === "red" ? "bg-red-500" : "bg-amber-500")} />}
      <div className="flex items-center justify-between">
        <span className={cx("flex size-8 items-center justify-center rounded-lg", CHIP[tone])}>
          <Icon className="size-4" />
        </span>
        {onClick && <ArrowUpRight className="size-4 text-faint opacity-0 transition group-hover:opacity-100" />}
      </div>
      <div className="mt-4 flex items-baseline gap-0.5">
        <span
          className={cx(
            "text-[28px] font-semibold leading-none tracking-tight tabular-nums",
            alert && (alertColor === "red" ? "text-red-700" : "text-amber-700"),
          )}
        >
          {value}
        </span>
        {unit && <span className="text-base font-medium text-muted">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[13px] font-medium leading-tight">{label}</div>
      <div className="mt-auto pt-3">
        <div aria-hidden className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-line/70">
          {parts.map((p, i) => (
            <span key={i} className={cx("h-full basis-0 rounded-full", p.className)} style={{ flexGrow: p.value }} />
          ))}
        </div>
        {note && <div className="mt-2 truncate text-[11px] text-muted">{note}</div>}
      </div>
    </>
  );
  const cls =
    "group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface p-4 text-left shadow-[0_1px_2px_rgba(27,26,23,0.04)]";
  return onClick ? (
    <button
      onClick={onClick}
      title={title}
      className={cx(
        cls,
        "transition duration-150 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_8px_20px_-8px_rgba(27,26,23,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20",
      )}
    >
      {body}
    </button>
  ) : (
    <div className={cls} title={title}>
      {body}
    </div>
  );
}
