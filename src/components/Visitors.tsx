"use client";

import { LogIn, LogOut, Mail, Sparkles, UserPlus } from "lucide-react";
import { useState } from "react";
import { formatTime, formatWhen, localDay } from "@/lib/dates";
import { ROOMS } from "@/lib/seed";
import type { Actions } from "@/lib/store";
import type { State, Visitor } from "@/lib/types";
import { Avatar, btnPrimary, Card, cx, inputCls, Label, PageHeader, Pill } from "./ui";

interface Props {
  s: State;
  act: Actions;
  today: string;
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

// Rooms are held for an hour either side of a booked arrival unless the visitor has left.
function clashes(s: State, room: string, atIso: string, ignoreId?: string) {
  const t = new Date(atIso).getTime();
  return s.visitors.filter(
    (v) => v.id !== ignoreId && v.room === room && v.status !== "left" && v.status !== "no-show" && Math.abs(new Date(v.expectedAt).getTime() - t) < 60 * 60000,
  );
}

export function Visitors({ s, act, today }: Props) {
  const name = (id: string) => s.members.find((m) => m.id === id);
  const onSite = s.visitors.filter((v) => v.status === "on-site");
  const expectedToday = s.visitors.filter((v) => v.status === "expected" && localDay(v.expectedAt) <= today).sort((a, b) => a.expectedAt.localeCompare(b.expectedAt));
  const upcoming = s.visitors.filter((v) => v.status === "expected" && localDay(v.expectedAt) > today).sort((a, b) => a.expectedAt.localeCompare(b.expectedAt));
  const earlier = s.visitors
    .filter((v) => (v.status === "left" || v.status === "no-show") && localDay(v.expectedAt) === today)
    .sort((a, b) => b.expectedAt.localeCompare(a.expectedAt));

  return (
    <div>
      <PageHeader title="Visitor desk" sub="Expected guests, walk-ins and meeting rooms. Checking a guest in notifies their host and writes to the audit log." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          <Group s={s} today={today} title="On site now" list={onSite} empty="Nobody is in the building.">
            {(v) => (
              <>
                <a
                  href={`mailto:${name(v.host)?.email ?? ""}?subject=${encodeURIComponent(`Your visitor ${v.name} is at reception`)}&body=${encodeURIComponent(`${v.name} (${v.company}) arrived at ${formatTime(v.arrivedAt ?? v.expectedAt)} for: ${v.purpose}.${v.room ? ` Room: ${v.room}.` : ""}`)}`}
                  className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-medium text-muted hover:border-ink/30 hover:text-ink"
                  title="Email the host"
                >
                  <Mail className="size-3.5" /> Notify host
                </a>
                <button onClick={() => act.setVisitor(v.id, "left")} className="inline-flex items-center gap-1 rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-white hover:bg-ink/85">
                  <LogOut className="size-3.5" /> Check out
                </button>
              </>
            )}
          </Group>
          <Group s={s} today={today} title="Expected today" list={expectedToday} empty="No more visitors expected today.">
            {(v) => (
              <>
                <button onClick={() => act.setVisitor(v.id, "no-show")} className="text-xs font-medium text-faint hover:text-ink">
                  No-show
                </button>
                <button onClick={() => act.setVisitor(v.id, "on-site")} className="inline-flex items-center gap-1 rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-white hover:bg-ink/85">
                  <LogIn className="size-3.5" /> Check in
                </button>
              </>
            )}
          </Group>
          {upcoming.length > 0 && <Group s={s} today={today} title="Upcoming" list={upcoming} empty="" showDay />}
          {earlier.length > 0 && <Group s={s} today={today} title="Earlier today" list={earlier} empty="" />}
        </div>

        <AddVisitor s={s} act={act} today={today} />
      </div>
    </div>
  );

}

function Group({
  s,
  title,
  list,
  empty,
  children,
  showDay,
  today,
}: {
  s: State;
  title: string;
  list: Visitor[];
  empty: string;
  children?: (v: Visitor) => React.ReactNode;
  showDay?: boolean;
  today: string;
}) {
  const name = (id: string) => s.members.find((m) => m.id === id);
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Label>{title}</Label>
        <span className="text-xs text-faint">{list.length}</span>
      </div>
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-muted">{empty}</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="w-16 shrink-0 text-sm font-semibold tabular-nums">{formatTime(v.expectedAt)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium" dir="auto">
                    {v.name} <span className="font-normal text-muted">· {v.company}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <Avatar member={name(v.host)} size="sm" />
                    {name(v.host)?.name} · {v.purpose}
                    {v.room && <Pill className="border-line text-muted">{v.room}</Pill>}
                    {showDay && <span className="text-faint">· {formatWhen(v.expectedAt, today)}</span>}
                    {v.arrivedAt && v.status === "on-site" && <span className="text-emerald-700">· arrived {formatTime(v.arrivedAt)}</span>}
                    {v.status === "left" && v.leftAt && <span className="text-faint">· left {formatTime(v.leftAt)}</span>}
                    {v.status === "no-show" && <span className="text-faint">· no-show</span>}
                  </div>
                </div>
                {children && <div className="flex items-center gap-2">{children(v)}</div>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

// Next half-hour slot at least an hour from now.
function inAnHour() {
  const d = new Date(Date.now() + 60 * 60000);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return toLocalInput(d.toISOString());
}

function blankVisitor(host: string) {
  return { name: "", company: "", host, purpose: "", projectCode: "", room: "", expectedAt: inAnHour() };
}

function AddVisitor({ s, act, today }: Props) {
  const [f, setF] = useState(() => blankVisitor(s.members[0]?.id ?? ""));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const atIso = f.expectedAt ? new Date(f.expectedAt).toISOString() : new Date().toISOString();
  const conflict = f.room ? clashes(s, f.room, atIso) : [];
  const free = ROOMS.filter((r) => clashes(s, r, atIso).length === 0);

  async function parse() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: note, now: toLocalInput(new Date().toISOString()), members: s.members, projects: s.projects, rooms: ROOMS }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not read that.");
      const v = json.visitor;
      setF((prev) => ({
        name: v.name || prev.name,
        company: v.company || prev.company,
        host: v.host || prev.host,
        purpose: v.purpose || prev.purpose,
        projectCode: v.projectCode || prev.projectCode,
        room: ROOMS.includes(v.room) ? v.room : prev.room,
        expectedAt: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v.expectedAt) ? v.expectedAt.slice(0, 16) : prev.expectedAt,
      }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function submit(checkInNow: boolean) {
    if (!f.name.trim()) return setErr("Visitor name is required.");
    act.addVisitor({ ...f, name: f.name.trim(), expectedAt: checkInNow ? new Date().toISOString() : atIso }, checkInNow);
    setF(blankVisitor(f.host));
    setNote("");
    setErr("");
  }

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <Label>Quick add with AI</Label>
        </div>
        <textarea
          dir="auto"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Eng. Sami from Petra Structures is coming tomorrow at 2pm to see Lina about the DSR arbitration, boardroom"
          className={cx(inputCls, "mt-3 resize-y")}
        />
        <button onClick={parse} disabled={!note.trim() || busy} className={cx(btnPrimary, "mt-2 w-full py-2")}>
          {busy ? "Reading…" : "Fill the form"}
        </button>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-muted" />
          <Label>Visitor details</Label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input value={f.name} onChange={set("name")} placeholder="Visitor name" className={cx(inputCls, "col-span-2")} dir="auto" />
          <input value={f.company} onChange={set("company")} placeholder="Company" className={cx(inputCls, "col-span-2")} dir="auto" />
          <label className="text-xs text-muted">
            Host
            <select value={f.host} onChange={set("host")} className={cx(inputCls, "mt-1")}>
              {s.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Project
            <select value={f.projectCode} onChange={set("projectCode")} className={cx(inputCls, "mt-1")}>
              <option value="">None</option>
              {s.projects.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code}
                </option>
              ))}
            </select>
          </label>
          <input value={f.purpose} onChange={set("purpose")} placeholder="Purpose of visit" className={cx(inputCls, "col-span-2")} />
          <label className="text-xs text-muted">
            Expected
            <input type="datetime-local" value={f.expectedAt} min={`${today}T00:00`} onChange={set("expectedAt")} className={cx(inputCls, "mt-1")} />
          </label>
          <label className="text-xs text-muted">
            Room
            <select value={f.room} onChange={set("room")} className={cx(inputCls, "mt-1")}>
              <option value="">No room</option>
              {ROOMS.map((r) => (
                <option key={r} value={r}>
                  {r}
                  {free.includes(r) ? "" : " (busy)"}
                </option>
              ))}
            </select>
          </label>
        </div>
        {conflict.length > 0 ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {f.room} is held for {conflict.map((c) => `${c.name} at ${formatTime(c.expectedAt)}`).join(", ")}.{" "}
            {free.length ? `Free at that time: ${free.join(", ")}.` : "No rooms are free at that time."}
          </p>
        ) : (
          <p className="mt-3 text-xs text-faint">Free at that time: {free.join(", ") || "none"}.</p>
        )}
        {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => submit(false)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium hover:border-ink/30">
            Add as expected
          </button>
          <button onClick={() => submit(true)} className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-ink/85">
            Walk-in · check in now
          </button>
        </div>
      </Card>
    </div>
  );
}
