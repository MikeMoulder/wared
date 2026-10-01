"use client";

import { Bot, Check, CircleCheck, Clock3, Mail, Route, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { formatWhen } from "@/lib/dates";
import type { Actions } from "@/lib/store";
import type { Approval, State } from "@/lib/types";
import { Avatar, Card, CardHeader, CopyButton, cx, inputCls, Label, PageHeader, Pill, RefChip, Segmented, UrgencyPill } from "./ui";

interface Props {
  s: State;
  act: Actions;
  today: string;
}

export function Approvals({ s, act, today }: Props) {
  const pending = s.approvals.filter((a) => a.status === "pending").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const decided = s.approvals.filter((a) => a.status !== "pending").sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));

  return (
    <div>
      <PageHeader
        title="Approvals"
        sub="Wared only sends things outside the office, or changes doubtful routing, after a person signs off here. Each decision is recorded."
      >
        {pending.length > 0 && (
          <Pill className="border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
            <ShieldCheck className="size-3.5" /> {pending.length} waiting for you
          </Pill>
        )}
      </PageHeader>

      {pending.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CircleCheck className="size-6" />
          </span>
          <p className="mt-4 font-semibold">You&apos;re all caught up</p>
          <p className="mt-1 text-sm text-muted">New items appear here when an intake workflow needs a human decision.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((a) => (
            <ApprovalCard key={a.id} a={a} s={s} act={act} today={today} />
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <Card className="mt-8 overflow-hidden">
          <CardHeader icon={Clock3} title="Decision history" right={<span className="text-xs text-faint">{decided.length} decided</span>} />
          <ul className="divide-y divide-line">
            {decided.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                <span
                  className={cx(
                    "flex size-6 shrink-0 items-center justify-center rounded-full",
                    a.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500",
                  )}
                  title={a.status === "approved" ? "Approved" : "Rejected"}
                >
                  {a.status === "approved" ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{a.title}</span>
                <RefChip id={a.ref} />
                <span className="w-36 text-right text-xs tabular-nums text-faint">{a.decidedAt && formatWhen(a.decidedAt, today)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ApprovalCard({ a, s, act, today }: { a: Approval; s: State; act: Actions; today: string }) {
  const entry = s.entries.find((e) => e.id === a.ref);
  const [lang, setLang] = useState<"en" | "ar">(a.lang === "ar" && a.draftAr ? "ar" : a.draftEn ? "en" : "ar");
  const [en, setEn] = useState(a.draftEn);
  const [ar, setAr] = useState(a.draftAr);
  const [owner, setOwner] = useState(entry?.routeTo ?? s.members[0]?.id);
  const draft = lang === "en" ? en : ar;
  const subject = `${entry?.reference ? `Your ref. ${entry.reference} – ` : ""}Acknowledgement of receipt`;
  const isReply = a.kind === "external_reply";
  const Icon = isReply ? Mail : Route;

  return (
    <Card className="overflow-hidden shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
      <div className="flex items-start gap-3.5 px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-amber-800">{isReply ? "External reply" : "Routing check"}</span>
            <span className="text-faint">·</span>
            <RefChip id={a.ref} />
            {entry && <UrgencyPill urgency={entry.urgency} />}
          </div>
          <h3 className="mt-1.5 font-semibold leading-snug">{a.title}</h3>
          {entry && (
            <p dir="auto" className="mt-0.5 truncate text-left text-sm text-muted">
              {entry.subject}
            </p>
          )}
        </div>
        <span className="hidden shrink-0 text-xs text-faint sm:block">raised {formatWhen(a.createdAt, today)}</span>
      </div>

      <div className="mx-5 flex items-start gap-2 rounded-lg bg-amber-50/70 px-3 py-2.5 text-sm text-amber-900">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-medium">Why this needs you: </span>
          {a.reason}
        </span>
      </div>

      {isReply ? (
        <div className="p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
                <Bot className="size-3" /> AI draft · editable
              </span>
              to <span className="font-medium text-ink">{a.recipient}</span>
            </div>
            <Segmented
              value={lang}
              onChange={setLang}
              options={[
                ["en", "English"],
                ["ar", "عربي"],
              ]}
              disabled={[...(!en ? (["en"] as const) : []), ...(!ar ? (["ar"] as const) : [])]}
            />
          </div>
          <textarea
            dir={lang === "ar" ? "rtl" : "ltr"}
            value={draft}
            onChange={(e) => (lang === "en" ? setEn(e.target.value) : setAr(e.target.value))}
            rows={6}
            className={cx(inputCls, "resize-y leading-relaxed")}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => act.approve(a.id, { draftEn: en, draftAr: ar, lang })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/85"
            >
              <Check className="size-4" /> Approve &amp; mark sent
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium hover:border-ink/30"
            >
              <Mail className="size-4" /> Open in email
            </a>
            <CopyButton text={draft} className="rounded-lg px-3 py-2 text-sm text-ink" />
            <button
              onClick={() => act.reject(a.id)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-red-50 hover:text-red-700"
            >
              <X className="size-4" /> Reject
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <Label>Confirm the owner</Label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Avatar member={s.members.find((m) => m.id === owner)} />
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className={cx(inputCls, "max-w-xs")}>
              {s.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} – {m.role}
                </option>
              ))}
            </select>
            <button
              onClick={() => act.approve(a.id, { owner })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/85"
            >
              <Check className="size-4" /> Confirm routing
            </button>
            <button
              onClick={() => act.reject(a.id)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-red-50 hover:text-red-700"
            >
              <X className="size-4" /> Dismiss
            </button>
          </div>
          {entry?.routeReason && <p className="mt-2 text-xs text-muted">AI suggestion: {entry.routeReason}</p>}
        </div>
      )}
    </Card>
  );
}
