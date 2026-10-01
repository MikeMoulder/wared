"use client";

import type { Actions } from "@/lib/store";
import type { Member, Project, State } from "@/lib/types";
import { Avatar, btnGhost, Card, cx, inputCls, Label, PageHeader } from "./ui";

interface Props {
  s: State;
  act: Actions;
}

const field = cx(inputCls, "py-1.5");

export function Settings({ s, act }: Props) {
  const { members, projects } = s;
  const setMembers = (m: Member[]) => act.setMembers(m);
  const setProjects = (p: Project[]) => act.setProjects(p);
  const updM = (i: number, patch: Partial<Member>) => setMembers(members.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const updP = (i: number, patch: Partial<Project>) => setProjects(projects.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-8">
      <PageHeader title="Team & projects" />
      <p className="-mt-6 max-w-2xl text-sm text-muted">
        The AI reads this page on every item. To change who gets what, edit a person&apos;s <em>handles</em> line in plain language. To teach it a
        project&apos;s rules, add them to the project notes. Nothing needs retraining.
      </p>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <Label>Team & routing rules</Label>
          <button
            className={btnGhost}
            onClick={() => setMembers([...members, { id: `m${Date.now().toString(36)}`, name: "New member", role: "", email: "", handles: "" }])}
          >
            + Add person
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {members.map((m, i) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar member={m} />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                  <input className={field} value={m.name} onChange={(e) => updM(i, { name: e.target.value })} aria-label="Name" />
                  <input className={field} value={m.role} placeholder="Role" onChange={(e) => updM(i, { role: e.target.value })} aria-label="Role" />
                  <input className={cx(field, "col-span-2")} value={m.email} placeholder="Email" onChange={(e) => updM(i, { email: e.target.value })} aria-label="Email" />
                  <textarea
                    className={cx(field, "col-span-2 resize-y")}
                    rows={2}
                    value={m.handles}
                    placeholder="What should be routed to this person?"
                    onChange={(e) => updM(i, { handles: e.target.value })}
                    aria-label="Handles"
                  />
                </div>
                <button
                  onClick={() => members.length > 1 && setMembers(members.filter((_, j) => j !== i))}
                  className="text-faint hover:text-red-700"
                  aria-label={`Remove ${m.name}`}
                >
                  ✕
                </button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <Label>Active projects</Label>
          <button
            className={btnGhost}
            onClick={() => setProjects([...projects, { code: `P${projects.length + 1}`, name: "New project", client: "", contractor: "", contract: "", notes: "" }])}
          >
            + Add project
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((p, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid min-w-0 flex-1 grid-cols-[6rem_1fr] gap-2">
                  <input className={cx(field, "font-mono font-semibold")} value={p.code} onChange={(e) => updP(i, { code: e.target.value.toUpperCase() })} aria-label="Code" />
                  <input className={field} value={p.name} onChange={(e) => updP(i, { name: e.target.value })} aria-label="Project name" />
                  <input className={cx(field, "col-span-2")} value={p.client} placeholder="Client" onChange={(e) => updP(i, { client: e.target.value })} aria-label="Client" />
                  <input className={cx(field, "col-span-2")} value={p.contractor} placeholder="Contractor" onChange={(e) => updP(i, { contractor: e.target.value })} aria-label="Contractor" />
                  <input className={cx(field, "col-span-2")} value={p.contract} placeholder="Contract form, e.g. FIDIC Red Book 2017" onChange={(e) => updP(i, { contract: e.target.value })} aria-label="Contract" />
                  <textarea className={cx(field, "col-span-2 resize-y")} rows={2} value={p.notes} placeholder="Project rules the AI should know" onChange={(e) => updP(i, { notes: e.target.value })} aria-label="Notes" />
                </div>
                <button onClick={() => setProjects(projects.filter((_, j) => j !== i))} className="text-faint hover:text-red-700" aria-label={`Remove ${p.code}`}>
                  ✕
                </button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="text-sm font-medium">Reset demo</div>
          <p className="text-xs text-muted">Restore the sample team, projects, register, follow-ups, visitors and audit log. Your changes in this browser will be lost.</p>
        </div>
        <button onClick={() => confirm("Reset everything to the sample data?") && act.reset()} className={btnGhost}>
          Reset demo data
        </button>
      </Card>
    </div>
  );
}
