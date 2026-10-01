"use client";

import { CalendarClock, CalendarDays, Forward, Hash, ListTodo, Mail, Route, TriangleAlert, UserRound } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/dates";
import type { Member, Project, Triage } from "@/lib/types";
import { Avatar, Card, CardHeader, CopyButton, Countdown, cx, inputCls, Pill, Segmented, UrgencyPill } from "./ui";

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

const OWNER_TAG = {
  us: { label: "Our action", cls: "border-accent/30 bg-accent-soft text-accent" },
  sender: { label: "Sender", cls: "border-line bg-paper text-muted" },
  other: { label: "For info", cls: "border-line bg-paper text-muted" },
};

export function TriageView({ t, members, projects, today, entryId, onOwnerChange }: Props) {
  const [ackLang, setAckLang] = useState<"en" | "ar">(t.language === "ar" && t.ackAr ? "ar" : "en");
  const [sumLang, setSumLang] = useState<"en" | "ar">("en");
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
        <h2 dir="auto" className="mt-3 text-lg font-semibold leading-snug tracking-tight text-balance">
          {t.subject}
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {(t.senderName || t.senderOrg) && (
            <span className="inline-flex items-center gap-1.5" dir="auto">
              <UserRound className="size-3.5 text-faint" />
              {[t.senderName, t.senderOrg].filter(Boolean).join(" · ")}
            </span>
          )}
          {t.reference && (
            <span className="inline-flex items-center gap-1.5 font-mono">
              <Hash className="size-3.5 text-faint" />
              {t.reference}
            </span>
          )}
          {t.documentDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-faint" />
              Dated {formatDate(t.documentDate)}
            </span>
          )}
        </div>
        {project && (
          <div className="mt-1.5 text-xs text-faint">
            {project.name} · {project.contract}
          </div>
        )}
        {t.urgencyReason && (
          <p className="mt-4 border-t border-line pt-3 text-sm leading-relaxed text-muted">
            <span className="font-medium text-ink">Why {t.urgency}: </span>
            {t.urgencyReason}
          </p>
        )}
      </Card>

      {/* Deadlines */}
      <Card className="overflow-hidden">
        <CardHeader
          icon={CalendarClock}
          title="Deadlines"
          right={ours.length > 0 && <span className="text-xs font-medium text-accent">{ours.length} running against us</span>}
        />
        {t.deadlines.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">No deadlines found in this item.</p>
        ) : (
          <ul className="divide-y divide-line">
            {t.deadlines.map((d, i) => {
              const tag = OWNER_TAG[d.owner] ?? OWNER_TAG.other;
              return (
                <li key={i} className={cx("flex gap-4 border-l-2 py-3.5 pl-[18px] pr-5", d.owner === "us" ? "border-l-accent" : "border-l-transparent")}>
                  <div className="flex w-24 shrink-0 flex-col items-start gap-1">
                    <Countdown due={d.dueDate} today={today} muted={d.owner !== "us"} />
                    <span className="text-[11px] tabular-nums text-faint">{formatDate(d.dueDate)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-snug">{d.description}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                      <Pill className={cx("px-1.5 py-px text-[10px] uppercase tracking-wide", tag.cls)}>{tag.label}</Pill>
                      <span>{d.basis}</span>
                      {d.days > 0 && d.anchorDate && (
                        <span className="text-faint">
                          · {d.days} days from {formatDate(d.anchorDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Routing */}
      <Card className="overflow-hidden">
        <CardHeader
          icon={Route}
          title="Routed to"
          right={
            <a
              href={forwardMailto(t, owner, entryId)}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs font-medium text-muted hover:border-ink/30 hover:text-ink"
            >
              <Forward className="size-3.5" /> Forward
            </a>
          }
        />
        <div className="flex items-start gap-3 p-5">
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
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{t.routeReason}</p>
            {cc.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                <span className="mr-0.5 text-faint">cc</span>
                {cc.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-0.5 pl-0.5 pr-2">
                    <Avatar member={m} size="sm" />
                    {m.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="overflow-hidden">
        <CardHeader
          title={sumLang === "en" ? "Summary" : "الملخص"}
          right={
            <Segmented
              value={sumLang}
              onChange={setSumLang}
              options={[
                ["en", "English"],
                ["ar", "عربي"],
              ]}
            />
          }
        />
        {sumLang === "en" ? (
          <div className="p-5">
            <p className="text-sm leading-relaxed">{t.summaryEn}</p>
            {t.keyPoints.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                {t.keyPoints.map((k, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-faint" />
                    <span dir="auto">{k}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p dir="rtl" className="p-5 text-[15px] leading-loose">
            {t.summaryAr}
          </p>
        )}
      </Card>

      {/* Actions */}
      {t.actions.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader icon={ListTodo} title="Next actions" />
          <ul className="divide-y divide-line">
            {t.actions.map((a, i) => (
              <li key={i}>
                <label className="flex cursor-pointer gap-3 px-5 py-2.5 text-sm hover:bg-paper/60">
                  <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-ink" />
                  <span>{a}</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Risks */}
      {t.risks.length > 0 && (
        <Card className="overflow-hidden border-red-100">
          <CardHeader icon={TriangleAlert} title="If ignored" className="border-red-100 bg-red-50/50" />
          <ul className="space-y-2 p-5 text-sm text-red-900">
            {t.risks.map((r, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-red-400" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Acknowledgement */}
      <Card className="overflow-hidden">
        <CardHeader
          icon={Mail}
          title="Acknowledgement draft"
          right={
            <>
              <Segmented
                value={ackLang}
                onChange={setAckLang}
                options={[
                  ["en", "English"],
                  ["ar", "عربي"],
                ]}
                disabled={[...(!t.ackEn ? (["en"] as const) : []), ...(!t.ackAr ? (["ar"] as const) : [])]}
              />
              <CopyButton text={ack} />
            </>
          }
        />
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
