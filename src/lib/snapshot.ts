import { formatWhen } from "./dates";
import type { State } from "./types";

// A compact, plain-text view of the office state for the assistant to read.
export function snapshot(s: State, today: string): string {
  const name = (id: string) => s.members.find((m) => m.id === id)?.name ?? id;
  const lines: string[] = [];

  lines.push("TEAM:");
  for (const m of s.members) lines.push(`- ${m.id} | ${m.name} | ${m.role}`);

  lines.push("\nPROJECTS:");
  for (const p of s.projects) lines.push(`- ${p.code} | ${p.name} | client ${p.client} | contractor ${p.contractor} | ${p.contract}`);

  lines.push("\nINCOMING REGISTER (newest first):");
  for (const e of s.entries.slice(0, 60)) {
    const dl = e.deadlines.map((d) => `${d.owner === "us" ? "OUR" : d.owner.toUpperCase()} ${d.dueDate} ${d.description}`).join("; ");
    lines.push(
      `- ${e.id} | received ${e.receivedAt} via ${e.channel} | ${e.status} | ${e.docType} | ${e.projectCode || "-"} | ${e.urgency} | from ${[e.senderName, e.senderOrg].filter(Boolean).join(", ")} | ref ${e.reference || "-"} | "${e.subject}" | owner ${name(e.routeTo)} | ${e.summaryEn}${dl ? ` | deadlines: ${dl}` : ""}`,
    );
  }

  lines.push("\nFOLLOW-UPS:");
  for (const t of s.tasks.slice(0, 80)) {
    lines.push(`- ${t.id} | ${t.status} | due ${t.dueDate || "none"} | ${t.priority} | owner ${name(t.owner)} | source ${t.source} | ${t.title}`);
  }

  lines.push("\nAPPROVALS:");
  for (const a of s.approvals.slice(0, 40)) lines.push(`- ${a.id} | ${a.status} | ${a.kind} | ${a.ref} | ${a.title}`);

  lines.push("\nVISITORS:");
  for (const v of s.visitors.slice(-40)) {
    lines.push(
      `- ${v.id} | ${v.status} | ${v.name} (${v.company}) | host ${name(v.host)} | ${v.purpose} | ${v.room || "no room"} | expected ${formatWhen(v.expectedAt, today)}${v.arrivedAt ? ` | arrived ${formatWhen(v.arrivedAt, today)}` : ""}${v.leftAt ? ` | left ${formatWhen(v.leftAt, today)}` : ""}`,
    );
  }

  lines.push("\nRECENT ACTIVITY (audit log, newest first):");
  for (const ev of s.audit.slice(0, 40)) lines.push(`- ${formatWhen(ev.at, today)} | ${ev.actor.toUpperCase()} | ${ev.action} | ${ev.detail}${ev.ref ? ` | ${ev.ref}` : ""}`);

  return lines.join("\n");
}
