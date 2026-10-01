"use client";

import { useCallback, useMemo, useState } from "react";
import { seedState } from "./seed";
import type { Approval, AuditEvent, Member, Project, State, Status, Task, Visitor, VisitorStatus } from "./types";
import { executePlan, MINUTES, nextSeq, type Plan } from "./workflow";

// Demo persistence: the whole office state lives in this browser's localStorage.
const KEY = "wared.state.v2";
const pad = (n: number) => String(n).padStart(4, "0");

function load(today: string): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {}
  return seedState(today, new Date());
}

let evSeq = 0;
function mkEvent(e: Omit<AuditEvent, "id" | "at">): AuditEvent {
  return { ...e, id: `EV-${Date.now().toString(36)}-${evSeq++}`, at: new Date().toISOString() };
}

export function useWared(today: string) {
  const [s, setS] = useState<State>(() => load(today));

  const update = useCallback((fn: (prev: State) => State) => {
    setS((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const log = (prev: State, e: Omit<AuditEvent, "id" | "at">): State => ({ ...prev, audit: [mkEvent(e), ...prev.audit] });
  const who = (prev: State, id: string) => prev.members.find((m) => m.id === id)?.name ?? id;

  const act = useMemo(
    () => ({
      runPlan: (p: Plan) => update((prev) => executePlan(prev, p, mkEvent)),

      approve: (id: string, patch: Partial<Pick<Approval, "draftEn" | "draftAr" | "lang">> & { owner?: string }) =>
        update((prev) => {
          const a = prev.approvals.find((x) => x.id === id);
          if (!a || a.status !== "pending") return prev;
          let next: State = {
            ...prev,
            approvals: prev.approvals.map((x) => (x.id === id ? { ...x, ...patch, status: "approved", decidedAt: new Date().toISOString() } : x)),
          };
          if (a.kind === "external_reply") {
            next = {
              ...next,
              entries: next.entries.map((e) => (e.id === a.ref && e.status !== "Closed" ? { ...e, status: "Acknowledged" } : e)),
            };
            return log(next, { actor: "human", action: "Approved & sent", detail: `${id}: acknowledgement to ${a.recipient} (${patch.lang ?? a.lang})`, ref: a.ref });
          }
          const owner = patch.owner;
          if (owner) {
            next = {
              ...next,
              entries: next.entries.map((e) => (e.id === a.ref ? { ...e, routeTo: owner } : e)),
              tasks: next.tasks.map((t) => (t.source === a.ref && t.status === "open" ? { ...t, owner } : t)),
            };
          }
          return log(next, { actor: "human", action: "Routing confirmed", detail: `${id}: owner ${who(next, owner ?? "")}`, ref: a.ref });
        }),

      reject: (id: string) =>
        update((prev) => {
          const a = prev.approvals.find((x) => x.id === id);
          if (!a) return prev;
          const next: State = { ...prev, approvals: prev.approvals.map((x) => (x.id === id ? { ...x, status: "rejected", decidedAt: new Date().toISOString() } : x)) };
          return log(next, { actor: "human", action: "Rejected", detail: `${id}: ${a.title}`, ref: a.ref });
        }),

      setStatus: (id: string, status: Status) =>
        update((prev) => {
          const e = prev.entries.find((x) => x.id === id);
          if (!e || e.status === status) return prev;
          const next = { ...prev, entries: prev.entries.map((x) => (x.id === id ? { ...x, status } : x)) };
          return log(next, { actor: "human", action: "Status changed", detail: `${e.status} → ${status}`, ref: id });
        }),

      removeEntry: (id: string) =>
        update((prev) =>
          log({ ...prev, entries: prev.entries.filter((x) => x.id !== id) }, { actor: "human", action: "Record removed", detail: `${id} removed from the register`, ref: id }),
        ),

      toggleTask: (id: string) =>
        update((prev) => {
          const t = prev.tasks.find((x) => x.id === id);
          if (!t) return prev;
          const done = t.status === "open";
          const next = {
            ...prev,
            tasks: prev.tasks.map((x) => (x.id === id ? { ...x, status: done ? ("done" as const) : ("open" as const), doneAt: done ? new Date().toISOString() : undefined } : x)),
          };
          return log(next, { actor: "human", action: done ? "Follow-up completed" : "Follow-up reopened", detail: `${id}: ${t.title}`, ref: t.source });
        }),

      addTask: (t: Omit<Task, "id" | "createdAt" | "status">, via: "manual" | "assistant") =>
        update((prev) => {
          const task: Task = { ...t, id: `FU-${pad(nextSeq(prev.tasks.map((x) => x.id), "FU-"))}`, status: "open", createdAt: new Date().toISOString() };
          const next = { ...prev, tasks: [task, ...prev.tasks] };
          return log(next, {
            actor: "human",
            action: via === "assistant" ? "Approved assistant follow-up" : "Follow-up created",
            detail: `${task.id}: ${task.title} → ${who(prev, task.owner)}`,
            ref: task.id,
          });
        }),

      addVisitor: (v: Omit<Visitor, "id" | "status">, checkInNow: boolean) =>
        update((prev) => {
          const now = new Date().toISOString();
          const visitor: Visitor = {
            ...v,
            id: `VS-${pad(nextSeq(prev.visitors.map((x) => x.id), "VS-"))}`,
            status: checkInNow ? "on-site" : "expected",
            arrivedAt: checkInNow ? now : undefined,
          };
          const next = { ...prev, visitors: [...prev.visitors, visitor] };
          return log(next, {
            actor: "human",
            action: checkInNow ? "Walk-in checked in" : "Visitor expected",
            detail: `${visitor.name} (${visitor.company || "no company"}) · host ${who(prev, visitor.host)}${visitor.room ? ` · ${visitor.room}` : ""}`,
            ref: visitor.id,
            minutesSaved: checkInNow ? MINUTES.visitor : undefined,
          });
        }),

      setVisitor: (id: string, status: VisitorStatus) =>
        update((prev) => {
          const v = prev.visitors.find((x) => x.id === id);
          if (!v) return prev;
          const now = new Date().toISOString();
          const next = {
            ...prev,
            visitors: prev.visitors.map((x) =>
              x.id === id ? { ...x, status, arrivedAt: status === "on-site" ? now : x.arrivedAt, leftAt: status === "left" ? now : x.leftAt } : x,
            ),
          };
          const action = status === "on-site" ? "Visitor checked in" : status === "left" ? "Visitor checked out" : "Marked no-show";
          const detail = status === "on-site" ? `${v.name} (${v.company}) · host ${who(prev, v.host)} notified` : v.name;
          return log(next, { actor: "human", action, detail, ref: id, minutesSaved: status === "on-site" ? MINUTES.visitor : undefined });
        }),

      setMembers: (members: Member[]) => update((prev) => ({ ...prev, members })),
      setProjects: (projects: Project[]) => update((prev) => ({ ...prev, projects })),
      reset: () => update(() => seedState(today, new Date())),
    }),
    [update, today],
  );

  return { s, act };
}

export type Actions = ReturnType<typeof useWared>["act"];
