"use client";

import { Bot, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { formatWhen } from "@/lib/dates";
import type { State } from "@/lib/types";
import { MINUTES } from "@/lib/workflow";
import { Card, cx, inputCls, PageHeader, RefChip } from "./ui";

export function AuditLog({ s, today }: { s: State; today: string }) {
  const [actor, setActor] = useState<"all" | "ai" | "human">("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return s.audit
      .filter((e) => actor === "all" || e.actor === actor)
      .filter((e) => !needle || `${e.action} ${e.detail} ${e.ref ?? ""}`.toLowerCase().includes(needle));
  }, [s.audit, actor, q]);

  const ai = s.audit.filter((e) => e.actor === "ai").length;

  return (
    <div>
      <PageHeader title="Audit log" sub="Every action, whether by the AI or a person, with time, reason and the record it touched. Entries cannot be edited." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-white p-0.5 text-sm">
          {(
            [
              ["all", `All · ${s.audit.length}`],
              ["ai", `AI · ${ai}`],
              ["human", `People · ${s.audit.length - ai}`],
            ] as const
          ).map(([k, label]) => (
            <button key={k} onClick={() => setActor(k)} className={cx("rounded-md px-3 py-1 font-medium", actor === k ? "bg-ink text-white" : "text-muted")}>
              {label}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions, details, refs…" className={cx(inputCls, "max-w-xs")} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">By</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Detail</th>
                <th className="px-4 py-2.5 font-medium">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-muted">{formatWhen(e.at, today)}</td>
                  <td className="px-4 py-2.5">
                    <span className={cx("inline-flex items-center gap-1.5 text-xs font-medium", e.actor === "ai" ? "text-accent" : "text-navy")}>
                      {e.actor === "ai" ? <Bot className="size-3.5" /> : <UserRound className="size-3.5" />}
                      {e.actor === "ai" ? "Wared AI" : "Reception"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium">{e.action}</td>
                  <td className="px-4 py-2.5 text-muted" dir="auto">
                    {e.detail}
                  </td>
                  <td className="px-4 py-2.5">
                    <RefChip id={e.ref} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">No matching events.</p>}
      </Card>

      <p className="mt-4 text-xs text-faint">
        Time-saved estimates come from AI-executed events only: logging {MINUTES.log} min, routing {MINUTES.route}, follow-up {MINUTES.followUp}, reply draft{" "}
        {MINUTES.draft}, visitor check-in notice {MINUTES.visitor}. The demo stores this log in your browser; a real deployment would write it to an append-only table.
      </p>
    </div>
  );
}
