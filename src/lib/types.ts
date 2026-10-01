export const DOC_TYPES = [
  "Notice / Claim",
  "Variation / Change",
  "RFI / Clarification",
  "Payment / Invoice",
  "Submittal / Drawings",
  "Meeting / Visit",
  "Delivery / Courier",
  "Complaint / Dispute",
  "Tender / Proposal",
  "HR / Admin",
  "General",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const URGENCIES = ["critical", "high", "normal", "low"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const CHANNELS = ["Email", "Letter", "WhatsApp", "Phone call", "Hand delivered", "Courier"] as const;
export type Channel = (typeof CHANNELS)[number];

export const STATUSES = ["New", "Routed", "Acknowledged", "Closed"] as const;
export type Status = (typeof STATUSES)[number];

export interface Member {
  id: string;
  name: string;
  role: string;
  email: string;
  handles: string; // plain-language routing rule, read by the model
}

export interface Project {
  code: string;
  name: string;
  client: string;
  contractor: string;
  contract: string; // e.g. "FIDIC Red Book 2017"
  notes: string; // project-specific rules, e.g. RFI response periods
}

export interface Deadline {
  description: string;
  anchorDate: string; // YYYY-MM-DD the period runs from, "" if n/a
  days: number; // contractual/stated period in days, 0 if an explicit date is given instead
  dueDate: string; // YYYY-MM-DD, computed server-side when days > 0
  basis: string; // where the deadline comes from, e.g. "FIDIC 2017 Sub-Clause 20.2.4"
  owner: "us" | "sender" | "other";
}

export interface Triage {
  subject: string;
  reference: string;
  documentDate: string;
  language: "ar" | "en" | "mixed";
  senderName: string;
  senderOrg: string;
  docType: DocType;
  projectCode: string;
  projectConfidence: number;
  urgency: Urgency;
  urgencyReason: string;
  summaryEn: string;
  summaryAr: string;
  keyPoints: string[];
  deadlines: Deadline[];
  routeTo: string; // member id
  routeReason: string;
  cc: string[]; // member ids
  actions: string[];
  risks: string[];
  ackEn: string;
  ackAr: string;
}

export interface Entry extends Triage {
  id: string; // e.g. IN-2026-0143
  receivedAt: string; // YYYY-MM-DD
  channel: Channel;
  status: Status;
  original: string; // raw text (truncated) or file name
  loggedAt: string; // ISO timestamp
}

export type Actor = "ai" | "human";

export interface AuditEvent {
  id: string;
  at: string; // ISO timestamp
  actor: Actor;
  action: string;
  detail: string;
  ref?: string; // IN-/FU-/AP-/VS- id this event is about
  minutesSaved?: number; // estimate, only on AI-executed actions
}

export interface Task {
  id: string; // FU-0001
  title: string;
  owner: string; // member id
  dueDate: string; // YYYY-MM-DD or ""
  priority: Urgency;
  source: string; // entry ref, "Assistant", "Manual", "Renewals"
  basis?: string;
  status: "open" | "done";
  createdBy: Actor;
  createdAt: string;
  doneAt?: string;
}

export type ApprovalKind = "external_reply" | "routing_check";

export interface Approval {
  id: string; // AP-0001
  kind: ApprovalKind;
  ref: string; // entry id
  title: string;
  reason: string; // why a human must decide (from policy, not the model)
  recipient: string;
  draftEn: string;
  draftAr: string;
  lang: "en" | "ar";
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt?: string;
}

export type VisitorStatus = "expected" | "on-site" | "left" | "no-show";

export interface Visitor {
  id: string; // VS-0001
  name: string;
  company: string;
  host: string; // member id
  purpose: string;
  projectCode: string;
  room: string;
  expectedAt: string; // ISO timestamp
  arrivedAt?: string;
  leftAt?: string;
  status: VisitorStatus;
}

export interface State {
  members: Member[];
  projects: Project[];
  entries: Entry[];
  tasks: Task[];
  approvals: Approval[];
  audit: AuditEvent[];
  visitors: Visitor[];
}

export interface TriageRequest {
  text: string;
  file?: { mimeType: string; data: string; name: string };
  channel: Channel;
  receivedAt: string;
  today: string;
  members: Member[];
  projects: Project[];
}
