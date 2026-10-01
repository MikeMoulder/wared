"use client";

import { FolderKanban, Mail, Plus, RotateCcw, Trash2, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { Actions } from "@/lib/store";
import type { Member, Project, State } from "@/lib/types";
import { Avatar, btnGhost, Card, cx, inputCls, Label, PageHeader } from "./ui";

interface Props {
  s: State;
  act: Actions;
}

const field = cx(inputCls, "py-1.5");
// Looks like plain text until hovered or focused, for names and titles.
const inline =
  "w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 outline-none transition hover:border-line focus:border-ink/30 focus:bg-white";

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-[11px] font-medium text-faint">{label}</span>
      {children}
    </label>
  );
}

function SectionHeader({ icon: Icon, title, sub, action }: { icon: typeof Users; title: string; sub: string; action: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-faint" />
          <Label>{title}</Label>
        </div>
        <p className="mt-1 text-xs text-muted">{sub}</p>
      </div>
      {action}
    </div>
  );
}

export function Settings({ s, act }: Props) {
  const { members, projects } = s;
  const setMembers = (m: Member[]) => act.setMembers(m);
  const setProjects = (p: Project[]) => act.setProjects(p);
  const updM = (i: number, patch: Partial<Member>) => setMembers(members.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const updP = (i: number, patch: Partial<Project>) => setProjects(projects.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-10">
      <PageHeader
        title="Team & projects"
        sub="The AI reads this page on every item. Change who gets what by editing the routing rules in plain language. Nothing needs retraining."
      />

      <section>
        <SectionHeader
          icon={Users}
          title="Team & routing rules"
          sub={`${members.length} people. Each item goes to exactly one owner, with others copied in.`}
          action={
            <button
              className={btnGhost}
              onClick={() => setMembers([...members, { id: `m${Date.now().toString(36)}`, name: "New member", role: "", email: "", handles: "" }])}
            >
              <Plus className="size-4" /> Add person
            </button>
          }
        />
        <div className="grid gap-3 md:grid-cols-2">
          {members.map((m, i) => (
            <Card key={m.id} className="group p-4">
              <div className="flex items-start gap-3">
                <Avatar member={m} />
                <div className="min-w-0 flex-1">
                  <input className={cx(inline, "font-semibold")} value={m.name} onChange={(e) => updM(i, { name: e.target.value })} aria-label="Name" />
                  <input
                    className={cx(inline, "text-sm text-muted")}
                    value={m.role}
                    placeholder="Role"
                    onChange={(e) => updM(i, { role: e.target.value })}
                    aria-label="Role"
                  />
                </div>
                <button
                  onClick={() => members.length > 1 && setMembers(members.filter((_, j) => j !== i))}
                  className="rounded-md p-1.5 text-faint opacity-0 transition hover:bg-red-50 hover:text-red-700 focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={`Remove ${m.name}`}
                  title="Remove person"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-3 space-y-2.5">
                <Field label="Email">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
                    <input className={cx(field, "pl-8")} value={m.email} placeholder="name@company.com" onChange={(e) => updM(i, { email: e.target.value })} />
                  </div>
                </Field>
                <Field label="Send them…">
                  <textarea
                    className={cx(field, "resize-y leading-relaxed")}
                    rows={2}
                    value={m.handles}
                    placeholder="What should be routed to this person?"
                    onChange={(e) => updM(i, { handles: e.target.value })}
                  />
                </Field>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          icon={FolderKanban}
          title="Active projects"
          sub="The contract form decides which deadlines the AI looks for, e.g. FIDIC 2017 vs 1999 time-bars."
          action={
            <button
              className={btnGhost}
              onClick={() => setProjects([...projects, { code: `P${projects.length + 1}`, name: "New project", client: "", contractor: "", contract: "", notes: "" }])}
            >
              <Plus className="size-4" /> Add project
            </button>
          }
        />
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((p, i) => (
            <Card key={i} className="group p-4">
              <div className="flex items-start gap-3">
                <input
                  className="w-16 shrink-0 rounded-lg border border-navy/15 bg-navy/5 px-2 py-1.5 text-center font-mono text-xs font-semibold text-navy outline-none focus:border-navy/40"
                  value={p.code}
                  onChange={(e) => updP(i, { code: e.target.value.toUpperCase() })}
                  aria-label="Project code"
                />
                <div className="min-w-0 flex-1">
                  <input className={cx(inline, "font-semibold")} value={p.name} onChange={(e) => updP(i, { name: e.target.value })} aria-label="Project name" />
                  <input
                    className={cx(inline, "text-sm text-muted")}
                    value={p.contract}
                    placeholder="Contract form, e.g. FIDIC Red Book 2017"
                    onChange={(e) => updP(i, { contract: e.target.value })}
                    aria-label="Contract form"
                  />
                </div>
                <button
                  onClick={() => setProjects(projects.filter((_, j) => j !== i))}
                  className="rounded-md p-1.5 text-faint opacity-0 transition hover:bg-red-50 hover:text-red-700 focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={`Remove ${p.code}`}
                  title="Remove project"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <Field label="Client">
                  <input className={field} value={p.client} onChange={(e) => updP(i, { client: e.target.value })} />
                </Field>
                <Field label="Contractor">
                  <input className={field} value={p.contractor} onChange={(e) => updP(i, { contractor: e.target.value })} />
                </Field>
                <Field label="Rules the AI should know" className="col-span-2">
                  <textarea
                    className={cx(field, "resize-y leading-relaxed")}
                    rows={2}
                    value={p.notes}
                    placeholder="e.g. RFI responses due within 7 days"
                    onChange={(e) => updP(i, { notes: e.target.value })}
                  />
                </Field>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed p-5">
        <div>
          <div className="text-sm font-medium">Reset demo</div>
          <p className="text-xs text-muted">Restore the sample team, projects, register, follow-ups, visitors and audit log. Your changes in this browser will be lost.</p>
        </div>
        <button onClick={() => confirm("Reset everything to the sample data?") && act.reset()} className={btnGhost}>
          <RotateCcw className="size-4" /> Reset demo data
        </button>
      </Card>
    </div>
  );
}
