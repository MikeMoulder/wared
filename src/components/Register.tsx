"use client";

import { Fragment, useMemo, useState } from "react";
import { daysBetween, formatDate } from "@/lib/dates";
import type { Actions } from "@/lib/store";
import { STATUSES, type Deadline, type Entry, type State, type Status } from "@/lib/types";
import { TriageView } from "./TriageView";
import { Avatar, btnGhost, Card, Countdown, cx, inputCls, PageHeader, StatusPill, UrgencyPill } from "./ui";

interface Props {
  s: State;
  act: Actions;
  today: string;
}

type Quick = "open" | "soon" | "overdue" | "all";

// The deadline that matters most for an entry: the earliest one we own, else the earliest of any.
export function nextDeadline(e: Entry): Deadline | undefined {
  if (e.status === "Closed") return undefined;
  return e.deadlines.find((d) => d.owner === "us") ?? e.deadlines[0];
}

export function Register({ s, act, today }: Props) {
  const { entries, members, projects } = s;
  const [q, setQ] = useState("");
  const [project, setProject] = useState("");
  const [quick, setQuick] = useState<Quick>("open");
  const [open, setOpen] = useState<string | null>(null);

  const stats = useMemo(() => {
    const live = entries.filter((e) => e.status !== "Closed");
    const ourDue = live.flatMap((e) => e.deadlines.filter((d) => d.owner === "us"));
    return {
      open: live.length,
      overdue: live.filter((e) => e.deadlines.some((d) => d.owner === "us" && daysBetween(today, d.dueDate) <= 0)).length,
      soon: ourDue.filter((d) => {
        const n = daysBetween(today, d.dueDate);
        return n > 0 && n <= 7;
      }).length,
      week: entries.filter((e) => daysBetween(e.receivedAt, today) < 7).length,
    };
  }, [entries, today]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries
      .filter((e) => !project || e.projectCode === project)
      .filter((e) => {
        if (quick === "all") return true;
        if (e.status === "Closed") return false;
        if (quick === "open") return true;
        return e.deadlines.some((d) => {
          if (d.owner !== "us") return false;
          const n = daysBetween(today, d.dueDate);
          return quick === "overdue" ? n <= 0 : n > 0 && n <= 7;
        });
      })
      .filter((e) =>
        !needle
          ? true
          : [e.id, e.subject, e.senderName, e.senderOrg, e.reference, e.summaryEn, e.summaryAr, e.docType]
              .join(" ")
              .toLowerCase()
              .includes(needle),
      )
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [entries, q, project, quick, today]);

  function exportCsv() {
    const head = ["Ref", "Received", "Channel", "From", "Organisation", "Sender ref", "Subject", "Project", "Type", "Urgency", "Owner", "Next deadline", "Deadline basis", "Status", "Summary"];
    const body = rows.map((e) => {
      const d = nextDeadline(e);
      return [
        e.id, e.receivedAt, e.channel, e.senderName, e.senderOrg, e.reference, e.subject, e.projectCode, e.docType, e.urgency,
        members.find((m) => m.id === e.routeTo)?.name ?? e.routeTo, d?.dueDate ?? "", d?.basis ?? "", e.status, e.summaryEn,
      ];
    });
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `incoming-register-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tiles: { key: Quick; label: string; value: number; tone?: string }[] = [
    { key: "open", label: "Open items", value: stats.open },
    { key: "soon", label: "Our deadlines ≤ 7 days", value: stats.soon, tone: stats.soon ? "text-amber-700" : undefined },
    { key: "overdue", label: "Overdue / due today", value: stats.overdue, tone: stats.overdue ? "text-red-700" : undefined },
    { key: "all", label: "Received this week", value: stats.week },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Incoming register" sub="سجل الوارد · every item that reached the office, with its owner, next deadline and status." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <button
            key={t.key}
            onClick={() => setQuick(t.key)}
            className={cx(
              "rounded-xl border bg-surface p-4 text-left transition",
              quick === t.key ? "border-ink shadow-[0_0_0_1px_var(--color-ink)]" : "border-line hover:border-ink/30",
            )}
          >
            <div className={cx("text-3xl font-semibold tabular-nums", t.tone)}>{t.value}</div>
            <div className="mt-1 text-xs text-muted">{t.label}</div>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-2 border-b border-line p-3 sm:grid-cols-[1fr_12rem_auto]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, sender, subject… / بحث" className={inputCls} dir="auto" />
          <select value={project} onChange={(e) => setProject(e.target.value)} className={inputCls}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code}
              </option>
            ))}
          </select>
          <button onClick={exportCsv} className={btnGhost}>
            Export CSV
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted">Nothing matches this view.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
                  <th className="px-4 py-2.5 font-medium">Ref</th>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium">Project</th>
                  <th className="px-4 py-2.5 font-medium">Owner</th>
                  <th className="px-4 py-2.5 font-medium">Next deadline</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const owner = members.find((m) => m.id === e.routeTo);
                  const d = nextDeadline(e);
                  const isOpen = open === e.id;
                  return (
                    <Fragment key={e.id}>
                      <tr
                        onClick={() => setOpen(isOpen ? null : e.id)}
                        className={cx("cursor-pointer border-b border-line align-top transition hover:bg-paper/70", isOpen && "bg-paper/70")}
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-semibold">{e.id}</div>
                          <div className="mt-0.5 text-xs text-faint">{formatDate(e.receivedAt)}</div>
                          <div className="text-xs text-faint">{e.channel}</div>
                        </td>
                        <td className="max-w-md px-4 py-3">
                          <div dir="auto" className="text-left font-medium leading-snug">
                            {e.subject}
                          </div>
                          <div dir="auto" className="mt-0.5 truncate text-left text-xs text-muted">
                            {[e.senderOrg, e.senderName].filter(Boolean).join(" · ")}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <UrgencyPill urgency={e.urgency} reason={e.urgencyReason} />
                            <span className="text-xs text-faint">{e.docType}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-navy">{e.projectCode || <span className="text-faint">—</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar member={owner} size="sm" />
                            <span className="text-xs">{owner?.name ?? e.routeTo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {d ? (
                            <div className="space-y-1">
                              <Countdown due={d.dueDate} today={today} muted={d.owner !== "us"} />
                              <div className="max-w-44 text-xs leading-snug text-muted">{d.description}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-faint">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                          <select
                            value={e.status}
                            onChange={(ev) => act.setStatus(e.id, ev.target.value as Status)}
                            className="rounded-md border border-transparent bg-transparent text-xs hover:border-line"
                            aria-label={`Status of ${e.id}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                          <div className="mt-1">
                            <StatusPill status={e.status} />
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-line bg-paper/70">
                          <td colSpan={6} className="px-4 pb-6 pt-2">
                            <div className="mx-auto max-w-3xl">
                              <TriageView t={e} members={members} projects={projects} today={today} entryId={e.id} />
                              {e.original && e.original !== "(sample entry)" && (
                                <details className="mt-4">
                                  <summary className="cursor-pointer text-xs font-medium text-muted">Original text</summary>
                                  <pre dir="auto" className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-white p-4 font-sans text-xs leading-relaxed">
                                    {e.original}
                                  </pre>
                                </details>
                              )}
                              <div className="mt-4 flex justify-end">
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${e.id} from the register? This is recorded in the audit log.`)) act.removeEntry(e.id);
                                  }}
                                  className="text-xs font-medium text-red-700 hover:underline"
                                >
                                  Remove entry
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-faint">
        <span className="font-medium text-muted">Demo storage ·</span> The register is saved in this browser only. A real deployment would use a shared database.
      </p>
    </div>
  );
}
