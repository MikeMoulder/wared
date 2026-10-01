import { addDays } from "./dates";
import type { Approval, AuditEvent, Channel, DocType, Entry, State, Task, Triage, Urgency } from "./types";

/*
 * The workflow engine: the model proposes, this code decides.
 * Which actions run automatically and which need a human is fixed policy here,
 * never something the model output can switch off.
 */

const CONTRACTUAL: DocType[] = ["Notice / Claim", "Variation / Change", "Payment / Invoice", "Complaint / Dispute"];
const LOW_STAKES: DocType[] = ["HR / Admin", "Delivery / Courier", "General", "Tender / Proposal", "Meeting / Visit"];

// Rough minutes a person spends on each step by hand. Used only for the "estimated time saved" metric.
export const MINUTES = { log: 6, route: 2, followUp: 2, draft: 5, visitor: 2 };

export function replyReason(t: Triage): string {
  if (CONTRACTUAL.includes(t.docType)) return "Contractual or financial correspondence: any reply needs a human sign-off.";
  if (t.urgency === "critical") return "Critical item: a human confirms before anything leaves the office.";
  return "External communication: replies leave the office only after approval.";
}

export function routingCheckReason(t: Triage): string | null {
  if (t.projectConfidence < 0.5 && !LOW_STAKES.includes(t.docType)) {
    return `Low-confidence project match (${Math.round(t.projectConfidence * 100)}%) on a ${t.docType} item: confirm owner and project.`;
  }
  return null;
}

function defaultDue(u: Urgency, receivedAt: string): string {
  return addDays(receivedAt, u === "critical" ? 0 : u === "high" ? 2 : 5);
}

export function nextSeq(ids: string[], prefix: string): number {
  return ids.reduce((n, id) => (id.startsWith(prefix) ? Math.max(n, Number(id.slice(prefix.length)) || 0) : n), 0) + 1;
}
const pad = (n: number) => String(n).padStart(4, "0");

export function nextEntryId(s: State, today: string) {
  const prefix = `IN-${today.slice(0, 4)}-`;
  return prefix + pad(nextSeq(s.entries.map((e) => e.id), prefix));
}

export interface PlanStep {
  mode: "auto" | "approval";
  label: string;
  detail: string;
}

export interface Plan {
  entry: Entry;
  tasks: Task[];
  approvals: Approval[];
  steps: PlanStep[];
}

export function planWorkflow(
  t: Triage,
  s: State,
  meta: { channel: Channel; receivedAt: string; original: string },
  now: Date,
  today: string,
): Plan {
  const at = now.toISOString();
  const entry: Entry = { ...t, ...meta, id: nextEntryId(s, today), status: "Routed", loggedAt: at };
  const owner = s.members.find((m) => m.id === t.routeTo);
  const steps: PlanStep[] = [
    { mode: "auto", label: `Log as ${entry.id}`, detail: `${t.docType} · ${t.projectCode || "no project"} · filed in the incoming register` },
    {
      mode: "auto",
      label: `Route to ${owner?.name ?? t.routeTo}`,
      detail: t.cc.length ? `cc ${t.cc.map((id) => s.members.find((m) => m.id === id)?.name ?? id).join(", ")}` : "Internal notification",
    },
  ];

  // Follow-ups: one per deadline that runs against us, else one from the first suggested action.
  let fu = nextSeq(s.tasks.map((x) => x.id), "FU-");
  const tasks: Task[] = [];
  const ours = t.deadlines.filter((d) => d.owner === "us");
  for (const d of ours) {
    tasks.push({ id: `FU-${pad(fu++)}`, title: d.description, owner: t.routeTo, dueDate: d.dueDate, priority: t.urgency, source: entry.id, basis: d.basis, status: "open", createdBy: "ai", createdAt: at });
  }
  if (!ours.length && t.actions.length && t.urgency !== "low") {
    tasks.push({ id: `FU-${pad(fu++)}`, title: t.actions[0], owner: t.routeTo, dueDate: defaultDue(t.urgency, meta.receivedAt), priority: t.urgency, source: entry.id, basis: `Default ${t.urgency}-priority turnaround`, status: "open", createdBy: "ai", createdAt: at });
  }
  for (const x of tasks) steps.push({ mode: "auto", label: `Create follow-up ${x.id}`, detail: `${x.title} · due ${x.dueDate}` });

  // Anything leaving the building, or any doubtful routing, waits for a person.
  let ap = nextSeq(s.approvals.map((x) => x.id), "AP-");
  const approvals: Approval[] = [];
  const recipient = t.senderOrg || t.senderName || "sender";
  if (meta.channel !== "Phone call" && (t.ackEn || t.ackAr)) {
    approvals.push({
      id: `AP-${pad(ap++)}`, kind: "external_reply", ref: entry.id, title: `Acknowledge receipt to ${recipient}`,
      reason: replyReason(t), recipient, draftEn: t.ackEn, draftAr: t.ackAr, lang: t.language === "ar" ? "ar" : "en", status: "pending", createdAt: at,
    });
  }
  const rc = routingCheckReason(t);
  if (rc) {
    approvals.push({
      id: `AP-${pad(ap++)}`, kind: "routing_check", ref: entry.id, title: `Confirm routing of ${entry.id}`,
      reason: rc, recipient: "", draftEn: "", draftAr: "", lang: "en", status: "pending", createdAt: at,
    });
  }
  for (const a of approvals) {
    steps.push({ mode: "approval", label: a.kind === "external_reply" ? `Send acknowledgement to ${recipient}` : "Confirm routing", detail: a.reason });
  }

  return { entry, tasks, approvals, steps };
}

export function executePlan(s: State, p: Plan, mkEvent: (e: Omit<AuditEvent, "id" | "at">) => AuditEvent): State {
  const owner = s.members.find((m) => m.id === p.entry.routeTo)?.name ?? p.entry.routeTo;
  const events: AuditEvent[] = [
    mkEvent({ actor: "ai", action: "Classified & logged", detail: `${p.entry.docType} · ${p.entry.projectCode || "no project"} · ${p.entry.urgency}`, ref: p.entry.id, minutesSaved: MINUTES.log }),
    mkEvent({ actor: "ai", action: "Routed", detail: `To ${owner}: ${p.entry.routeReason}`, ref: p.entry.id, minutesSaved: MINUTES.route }),
    ...p.tasks.map((t) => mkEvent({ actor: "ai", action: "Follow-up created", detail: `${t.id}: ${t.title}`, ref: p.entry.id, minutesSaved: MINUTES.followUp })),
    ...p.approvals.map((a) =>
      mkEvent({
        actor: "ai",
        action: a.kind === "external_reply" ? "Reply drafted → approval" : "Routing check → approval",
        detail: `${a.id}: ${a.reason}`,
        ref: p.entry.id,
        minutesSaved: a.kind === "external_reply" ? MINUTES.draft : undefined,
      }),
    ),
  ];
  return {
    ...s,
    entries: [p.entry, ...s.entries],
    tasks: [...p.tasks, ...s.tasks],
    approvals: [...p.approvals, ...s.approvals],
    audit: [...events.reverse(), ...s.audit],
  };
}
