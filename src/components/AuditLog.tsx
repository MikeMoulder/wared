"use client";

import { Bot, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { daysBetween, formatTime, localDay } from "@/lib/dates";
import type { AuditEvent, State } from "@/lib/types";
import { MINUTES } from "@/lib/workflow";
import { Card, cx, inputCls, PageHeader, RefChip, Segmented } from "./ui";

function dayLabel(day: string, today: string) {
  const n = daysBetween(day, today);
  const long = new Date(day + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return n === 0 ? `Today · ${long}` : n === 1 ? `Yesterday · ${long}` : long;
}

export function AuditLog({ s, today }: { s: State; today: string }) {
  const [actor, setActor] = useState<"all" | "ai" | "human">("all");
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = s.audit
      .filter((e) => actor === "all" || e.actor === actor)
      .filter((e) => !needle || `${e.action} ${e.detail} ${e.ref ?? ""}`.toLowerCase().includes(needle));
    const byDay = new Map<string, AuditEvent[]>();
    for (const e of rows) {
      const d = localDay(e.at);
      byDay.set(d, [...(byDay.get(d) ?? []), e]);
    }
    return [...byDay.entries()];
  }, [s.audit, actor, q]);

  const ai = s.audit.filter((e) => e.actor === "ai").length;

  return (
    <div>
      <PageHeader title="Audit log" sub="Every action, whether by the AI or a person, with time, reason and the record it touched. Entries cannot be edited." />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Segmented
          value={actor}
          onChange={setActor}
          options={[
            ["all", `All · ${s.audit.length}`],
            ["ai", `AI · ${ai}`],
            ["human", `People · ${s.audit.length - ai}`],
          ]}
        />
        <div className="relative w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions, details, refs…" className={cx(inputCls, "pl-9")} />
        </div>
      </div>

      {groups.length === 0 ? (
        <Card className="px-5 py-12 text-center text-sm text-muted">No matching events.</Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, events]) => (
            <section key={day}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="text-xs font-semibold text-muted">{dayLabel(day, today)}</h2>
                <span className="text-[11px] text-faint">
                  {events.length} event{events.length === 1 ? "" : "s"}
                </span>
              </div>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {events.map((e) => (
                    <li key={e.id} className="flex gap-3 px-5 py-3 sm:gap-4">
                      <span className="w-10 shrink-0 pt-1 text-xs tabular-nums text-faint">{formatTime(e.at)}</span>
                      <span
                        className={cx(
                          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                          e.actor === "ai" ? "bg-accent-soft text-accent" : "bg-navy/5 text-navy",
                        )}
                        title={e.actor === "ai" ? "Wared AI" : "Reception"}
                      >
                        {e.actor === "ai" ? <Bot className="size-3.5" /> : <UserRound className="size-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-medium">{e.action}</span>
                          <RefChip id={e.ref} />
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted" dir="auto">
                          {e.detail}
                        </p>
                      </div>
                      <div className="hidden shrink-0 flex-col items-end gap-0.5 pt-0.5 text-[11px] sm:flex">
                        <span className={e.actor === "ai" ? "font-medium text-accent" : "font-medium text-navy"}>{e.actor === "ai" ? "Wared AI" : "Reception"}</span>
                        {!!e.minutesSaved && <span className="text-faint">~{e.minutesSaved} min saved</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-faint">
        Time-saved estimates come from automated steps only: logging {MINUTES.log} min, routing {MINUTES.route}, follow-up {MINUTES.followUp}, reply draft{" "}
        {MINUTES.draft}, visitor check-in notice {MINUTES.visitor}. The demo stores this log in your browser; a real deployment would write it to an append-only table.
      </p>
    </div>
  );
}
