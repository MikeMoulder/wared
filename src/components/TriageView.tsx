"use client";

import { useState } from "react";
import { formatDate } from "@/lib/dates";
import type { Member, Project, Triage } from "@/lib/types";
import { Avatar, Card, CopyButton, Countdown, cx, Label, Pill, UrgencyPill, inputCls } from "./ui";

interface Props {
  t: Triage;
  members: Member[];
  projects: Project[];
  today: string;
  entryId?: string;
  onOwnerChange?: (id: string) => void;
}

export function forwardMailto(t: Triage, owner: Member | undefined, entryId?: string) {
  const lines = [
    t.summaryEn,
    "",
    ...(t.deadlines.length ? ["Deadlines:", ...t.deadlines.map((d) => `• ${d.dueDate} – ${d.description} (${d.basis})`), ""] : []),
    ...(t.actions.length ? ["Suggested actions:", ...t.actions.map((a) => `• ${a}`), ""] : []),
    `From: ${[t.senderName, t.senderOrg].filter(Boolean).join(", ")}`,
    t.reference ? `Ref: ${t.reference}` : "",
  ];
  const subject = `[${entryId ?? "Incoming"}] ${t.subject}`;
  return `mailto:${owner?.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

export function TriageView({ t, members, projects, today, entryId, onOwnerChange }: Props) {
  const [ackLang, setAckLang] = useState<"en" | "ar">(t.language === "ar" ? "ar" : "en");
  const project = projects.find((p) => p.code === t.projectCode);
  const owner = members.find((m) => m.id === t.routeTo);
  const cc = t.cc.map((id) => members.find((m) => m.id === id)).filter(Boolean) as Member[];
  const ours = t.deadlines.filter((d) => d.owner === "us");
  const ack = ackLang === "en" ? t.ackEn : t.ackAr;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <UrgencyPill urgency={t.urgency} reason={t.urgencyReason} />
          <Pill className="border-line bg-paper text-ink">{t.docType}</Pill>
          {project ? (
            <Pill className="border-navy/20 bg-navy/5 text-navy" title={project.name}>
              {project.code}
            </Pill>
          ) : (
            <Pill className="border-dashed border-line text-faint">No project match</Pill>
          )}
          <Pill className="border-line text-muted">{t.language === "ar" ? "Arabic" : t.language === "mixed" ? "Arabic + English" : "English"}</Pill>
        </div>
        <h2 dir="auto" className="mt-3 text-lg font-semibold leading-snug text-balance">
          {t.subject}
        </h2>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
          {(t.senderName || t.senderOrg) && <span dir="auto">{[t.senderName, t.senderOrg].filter(Boolean).join(" · ")}</span>}
          {t.reference && <span className="font-mono text-xs leading-5">{t.reference}</span>}
          {t.documentDate && <span>Dated {formatDate(t.documentDate)}</span>}
        </div>
        {project && <div className="mt-1 text-xs text-faint">{project.name} · {project.contract}</div>}
        {t.urgencyReason && <p className="mt-3 text-sm text-muted">{t.urgencyReason}</p>}
      </Card>

      {/* Deadlines */}
      <Card className={cx("overflow-hidden", ours.length > 0 && "border-accent/30")}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <Label>Deadlines</Label>
          {ours.length > 0 && <span className="text-xs font-medium text-accent">{ours.length} running against us</span>}
        </div>
        {t.deadlines.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">No deadlines found in this item.</p>
        ) : (
          <ul className="divide-y divide-line">
            {t.deadlines.map((d, i) => (
              <li key={i} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-start">
                <div className="flex w-40 shrink-0 items-center gap-2">
                  <Countdown due={d.dueDate} today={today} muted={d.owner !== "us"} />
                  <span className="text-xs text-muted">{formatDate(d.dueDate)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {d.description}
                    <span className={cx("ml-2 text-[11px] font-medium", d.owner === "us" ? "text-accent" : "text-faint")}>
                      {d.owner === "us" ? "OUR ACTION" : d.owner === "sender" ? "SENDER" : "INFO"}
                    </span>
                  </div>
                  <div className="text-xs text-muted">
                    {d.basis}
                    {d.days > 0 && d.anchorDate && ` · ${d.days} days from ${formatDate(d.anchorDate)}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Routing */}
      <Card className="p-5">
        <Label>Routed to</Label>
        <div className="mt-3 flex items-start gap-3">
          <Avatar member={owner} />
          <div className="min-w-0 flex-1">
            {onOwnerChange ? (
              <select value={t.routeTo} onChange={(e) => onOwnerChange(e.target.value)} className={cx(inputCls, "max-w-xs py-1.5 font-medium")}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} – {m.role}
                  </option>
                ))}
              </select>
            ) : (
              <div className="font-medium">
                {owner?.name} <span className="font-normal text-muted">· {owner?.role}</span>
              </div>
            )}
            <p className="mt-1 text-sm text-muted">{t.routeReason}</p>
            {cc.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                cc
                {cc.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2">
                    <Avatar member={m} size="sm" />
                    {m.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <a href={forwardMailto(t, owner, entryId)} className="shrink-0 rounded-md border border-line px-2.5 py-1 text-xs font-medium text-muted hover:border-ink/30 hover:text-ink">
            Forward
          </a>
        </div>
      </Card>

      {/* Summary */}
      <Card className="grid gap-0 sm:grid-cols-2">
        <div className="p-5">
          <Label>Summary</Label>
          <p className="mt-2 text-sm leading-relaxed">{t.summaryEn}</p>
          {t.keyPoints.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {t.keyPoints.map((k, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-faint">–</span>
                  <span dir="auto">{k}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div dir="rtl" className="border-t border-line bg-paper/60 p-5 sm:border-l sm:border-t-0">
          <div className="text-xs font-medium text-faint">الملخص</div>
          <p className="mt-2 text-[15px] leading-loose">{t.summaryAr}</p>
        </div>
      </Card>

      {/* Actions + risks */}
      {(t.actions.length > 0 || t.risks.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {t.actions.length > 0 && (
            <Card className="p-5">
              <Label>Next actions</Label>
              <ul className="mt-2 space-y-2 text-sm">
                {t.actions.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <input type="checkbox" className="mt-1 accent-ink" aria-label={a} />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {t.risks.length > 0 && (
            <Card className="border-red-100 bg-red-50/40 p-5">
              <Label>If ignored</Label>
              <ul className="mt-2 space-y-2 text-sm text-red-900">
                {t.risks.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden>⚠</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Acknowledgement */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-2.5">
          <div className="flex items-center gap-3">
            <Label>Acknowledgement draft</Label>
            <div className="flex rounded-md border border-line p-0.5 text-xs">
              {(["en", "ar"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setAckLang(l)}
                  className={cx("rounded px-2 py-0.5 font-medium", ackLang === l ? "bg-ink text-white" : "text-muted")}
                >
                  {l === "en" ? "English" : "عربي"}
                </button>
              ))}
            </div>
          </div>
          <CopyButton text={ack} />
        </div>
        <pre dir={ackLang === "ar" ? "rtl" : "ltr"} className="whitespace-pre-wrap px-5 py-4 font-sans text-sm leading-relaxed">
          {ack}
        </pre>
        <p className="border-t border-line bg-paper/50 px-5 py-2 text-[11px] text-faint">
          Confirms receipt only. It does not comment on the merits or admit liability.
        </p>
      </Card>
    </div>
  );
}
