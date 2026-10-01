"use client";

import { Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { formatWhen } from "@/lib/dates";
import type { Actions } from "@/lib/store";
import type { Approval, State } from "@/lib/types";
import { Avatar, Card, CopyButton, cx, inputCls, Label, PageHeader, Pill, RefChip, UrgencyPill } from "./ui";

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
      />

      {pending.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <ShieldCheck className="mx-auto size-8 text-emerald-600" />
          <p className="mt-3 font-medium">Nothing waiting for approval</p>
          <p className="text-sm text-muted">New items appear here when an intake workflow needs a human decision.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((a) => (
            <ApprovalCard key={a.id} a={a} s={s} act={act} today={today} />
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <section className="mt-10">
          <Label>Decision history</Label>
          <Card className="mt-3 overflow-hidden">
            <ul className="divide-y divide-line">
              {decided.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                  <Pill className={a.status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-100 text-stone-600"}>
                    {a.status === "approved" ? "Approved" : "Rejected"}
                  </Pill>
                  <span className="min-w-0 flex-1 truncate">{a.title}</span>
                  <RefChip id={a.ref} />
                  <span className="text-xs text-faint">{a.decidedAt && formatWhen(a.decidedAt, today)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
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

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill className="border-amber-200 bg-amber-50 text-amber-800">{a.kind === "external_reply" ? "External reply" : "Routing check"}</Pill>
            <RefChip id={a.ref} />
            {entry && <UrgencyPill urgency={entry.urgency} />}
            <span className="text-xs text-faint">{a.id} · raised {formatWhen(a.createdAt, today)}</span>
          </div>
          <h3 className="mt-2 font-semibold">{a.title}</h3>
          {entry && (
            <p dir="auto" className="mt-0.5 text-sm text-muted">
              {entry.subject}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 bg-amber-50/60 px-5 py-2.5 text-sm text-amber-900">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-medium">Why this needs you: </span>
          {a.reason}
        </span>
      </div>

      {a.kind === "external_reply" ? (
        <div className="px-5 py-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted">
              To <span className="font-medium text-ink">{a.recipient}</span>
            </div>
            <div className="flex rounded-md border border-line p-0.5 text-xs">
              {(["en", "ar"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  disabled={l === "en" ? !en : !ar}
                  className={cx("rounded px-2 py-0.5 font-medium disabled:opacity-30", lang === l ? "bg-ink text-white" : "text-muted")}
                >
                  {l === "en" ? "English" : "عربي"}
                </button>
              ))}
            </div>
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
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/85"
            >
              Approve &amp; mark sent
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-ink/30"
            >
              <Mail className="size-4" /> Open in email
            </a>
            <CopyButton text={draft} />
            <button onClick={() => act.reject(a.id)} className="ml-auto text-sm font-medium text-muted hover:text-red-700">
              Reject
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-4">
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
            <button onClick={() => act.approve(a.id, { owner })} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/85">
              Confirm routing
            </button>
            <button onClick={() => act.reject(a.id)} className="ml-auto text-sm font-medium text-muted hover:text-red-700">
              Dismiss
            </button>
          </div>
          {entry?.routeReason && <p className="mt-2 text-xs text-muted">AI suggestion: {entry.routeReason}</p>}
        </div>
      )}
    </Card>
  );
}
