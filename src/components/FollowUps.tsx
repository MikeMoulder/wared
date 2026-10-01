"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { addDays, daysBetween, formatWhen } from "@/lib/dates";
import type { Actions } from "@/lib/store";
import { URGENCIES, type State, type Task, type Urgency } from "@/lib/types";
import { ActorBadge, Avatar, btnGhost, Card, Countdown, cx, inputCls, Label, PageHeader, RefChip, UrgencyPill } from "./ui";

interface Props {
  s: State;
  act: Actions;
  today: string;
}

export function FollowUps({ s, act, today }: Props) {
  const [owner, setOwner] = useState("");
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const mine = s.tasks.filter((t) => !owner || t.owner === owner);
  const open = mine.filter((t) => t.status === "open").sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const groups: [string, Task[]][] = [
    ["Overdue", open.filter((t) => t.dueDate && t.dueDate < today)],
    ["Due today", open.filter((t) => t.dueDate === today)],
    ["Next 7 days", open.filter((t) => t.dueDate > today && daysBetween(today, t.dueDate) <= 7)],
    ["Later", open.filter((t) => t.dueDate && daysBetween(today, t.dueDate) > 7)],
    ["No due date", open.filter((t) => !t.dueDate)],
  ];
  const done = mine.filter((t) => t.status === "done").sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

  return (
    <div>
      <PageHeader title="Follow-ups" sub="Created automatically from deadlines, calls and requests, or added by hand. Each one has an owner, a due date and a source.">
        <div className="flex gap-2">
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className={cx(inputCls, "w-auto")}>
            <option value="">Everyone</option>
            {s.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button onClick={() => setAdding((x) => !x)} className={btnGhost}>
            <Plus className="size-4" /> Add
          </button>
        </div>
      </PageHeader>

      {adding && <AddTask s={s} today={today} onAdd={(t) => (act.addTask(t, "manual"), setAdding(false))} />}

      <div className="space-y-6">
        {groups
          .filter(([, list]) => list.length)
          .map(([label, list]) => (
            <section key={label}>
              <div className="mb-2 flex items-center gap-2">
                <Label>{label}</Label>
                <span className={cx("text-xs", label === "Overdue" ? "font-semibold text-red-700" : "text-faint")}>{list.length}</span>
              </div>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {list.map((t) => (
                    <TaskRow key={t.id} t={t} s={s} today={today} onToggle={() => act.toggleTask(t.id)} />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        {open.length === 0 && <Card className="px-6 py-10 text-center text-sm text-muted">No open follow-ups. Nice.</Card>}

        {done.length > 0 && (
          <section>
            <button onClick={() => setShowDone((x) => !x)} className="mb-2 flex items-center gap-2">
              <Label>Completed</Label>
              <span className="text-xs text-faint">
                {done.length} · {showDone ? "hide" : "show"}
              </span>
            </button>
            {showDone && (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {done.map((t) => (
                    <TaskRow key={t.id} t={t} s={s} today={today} onToggle={() => act.toggleTask(t.id)} />
                  ))}
                </ul>
              </Card>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function TaskRow({ t, s, today, onToggle }: { t: Task; s: State; today: string; onToggle: () => void }) {
  const owner = s.members.find((m) => m.id === t.owner);
  const isDone = t.status === "done";
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <input type="checkbox" checked={isDone} onChange={onToggle} className="mt-1 size-4 accent-ink" aria-label={`Mark ${t.id} ${isDone ? "open" : "done"}`} />
      <div className="min-w-0 flex-1">
        <div className={cx("text-sm font-medium", isDone && "text-faint line-through")}>{t.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span className="font-mono text-[11px] text-faint">{t.id}</span>
          <span>from</span>
          <RefChip id={t.source} />
          {t.basis && <span className="text-faint">· {t.basis}</span>}
          <ActorBadge actor={t.createdBy} />
          {isDone && t.doneAt && <span className="text-faint">· done {formatWhen(t.doneAt, today)}</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        {!isDone && t.priority !== "normal" && <UrgencyPill urgency={t.priority} />}
        {!isDone && t.dueDate && <Countdown due={t.dueDate} today={today} />}
        <span className="flex items-center gap-1.5 text-xs" title={owner?.role}>
          <Avatar member={owner} size="sm" />
          <span className="hidden md:inline">{owner?.name}</span>
        </span>
      </div>
    </li>
  );
}

function AddTask({ s, today, onAdd }: { s: State; today: string; onAdd: (t: Omit<Task, "id" | "createdAt" | "status">) => void }) {
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState(s.members[0]?.id ?? "");
  const [dueDate, setDue] = useState(addDays(today, 3));
  const [priority, setPriority] = useState<Urgency>("normal");
  const [source, setSource] = useState("Manual");
  return (
    <Card className="mb-6 p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) onAdd({ title: title.trim(), owner, dueDate, priority, source, createdBy: "human" });
        }}
        className="grid gap-2 md:grid-cols-[1fr_11rem_10rem_8rem]"
      >
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing? e.g. Renew trade licence" className={inputCls} />
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className={inputCls}>
          {s.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDue(e.target.value)} className={inputCls} />
        <select value={priority} onChange={(e) => setPriority(e.target.value as Urgency)} className={inputCls}>
          {URGENCIES.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className={cx(inputCls, "md:col-span-2")}>
          <option>Manual</option>
          <option>Renewals</option>
          {s.entries.slice(0, 30).map((e) => (
            <option key={e.id} value={e.id}>
              {e.id} – {e.subject.slice(0, 50)}
            </option>
          ))}
        </select>
        <button type="submit" disabled={!title.trim()} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-40 md:col-span-2">
          Add follow-up
        </button>
      </form>
    </Card>
  );
}
