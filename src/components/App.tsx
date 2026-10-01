"use client";

import { BookOpen, Bot, DoorOpen, Inbox, LayoutDashboard, ListChecks, ScrollText, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { useState, type ComponentType } from "react";
import { todayIso } from "@/lib/dates";
import { computeMetrics } from "@/lib/metrics";
import { useWared } from "@/lib/store";
import { Approvals } from "./Approvals";
import { Assistant } from "./Assistant";
import { AuditLog } from "./AuditLog";
import { CommandCenter } from "./CommandCenter";
import { FollowUps } from "./FollowUps";
import { Intake } from "./Intake";
import { Register } from "./Register";
import { Settings } from "./Settings";
import { cx } from "./ui";
import { Visitors } from "./Visitors";

export type Tab = "home" | "intake" | "approvals" | "register" | "followups" | "visitors" | "audit" | "settings";

export default function App() {
  const [today] = useState(todayIso);
  const [tab, setTab] = useState<Tab>("home");
  const [assistant, setAssistant] = useState<{ open: boolean; prompt?: string; nonce: number }>({ open: false, nonce: 0 });
  const { s, act } = useWared(today);
  const m = computeMetrics(s, today);

  const ask = (prompt?: string) => setAssistant((a) => ({ open: true, prompt, nonce: a.nonce + 1 }));

  const nav: { key: Tab; label: string; icon: ComponentType<{ className?: string }>; badge?: number; alert?: boolean; group: string }[] = [
    { key: "home", label: "Command Center", icon: LayoutDashboard, group: "Operate" },
    { key: "intake", label: "Intake", icon: Inbox, group: "Operate" },
    { key: "approvals", label: "Approvals", icon: ShieldCheck, badge: m.pendingApprovals, alert: true, group: "Operate" },
    { key: "register", label: "Register", icon: BookOpen, group: "Records" },
    { key: "followups", label: "Follow-ups", icon: ListChecks, badge: m.overdueTasks, alert: true, group: "Records" },
    { key: "visitors", label: "Visitors", icon: DoorOpen, badge: m.onSite, group: "Records" },
    { key: "audit", label: "Audit log", icon: ScrollText, group: "Records" },
    { key: "settings", label: "Team & projects", icon: SettingsIcon, group: "Setup" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <Brand />
        <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-2">
          {nav.map((n, i) => (
            <div key={n.key}>
              {nav[i - 1]?.group !== n.group && <div className={cx("px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint", i > 0 ? "pt-5" : "pt-1")}>{n.group}</div>}
            <button
              onClick={() => setTab(n.key)}
              className={cx(
                "mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                tab === n.key ? "bg-ink text-white" : "text-muted hover:bg-paper hover:text-ink",
              )}
            >
              <n.icon className="size-4 shrink-0" />
              <span className="flex-1 text-left">{n.label}</span>
              {!!n.badge && (
                <span
                  className={cx(
                    "rounded-full px-1.5 text-[11px] tabular-nums",
                    tab === n.key ? "bg-white/20" : n.alert ? "bg-red-100 text-red-700" : "bg-line text-muted",
                  )}
                >
                  {n.badge}
                </span>
              )}
            </button>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <button
            onClick={() => ask()}
            className="group flex w-full items-center gap-3 rounded-xl bg-accent-soft/70 px-3 py-2.5 text-left transition hover:bg-accent-soft"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-white text-accent shadow-[0_1px_2px_rgba(27,26,23,0.08)]">
              <Bot className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">Ask Wared</span>
              <span className="block truncate text-[11px] text-muted">Questions about the office</span>
            </span>
          </button>
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-faint">
            <Credit /> All sample data is fictional.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <Brand />
            <button onClick={() => ask()} className="mr-4 flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium">
              <Bot className="size-4 text-accent" /> Ask
            </button>
          </div>
          <nav className="scroll-thin flex gap-1 overflow-x-auto px-4 pb-2">
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={cx(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
                  tab === n.key ? "bg-ink text-white" : "text-muted",
                )}
              >
                {n.label}
                {!!n.badge && <span className={cx("rounded-full px-1.5 text-[11px]", tab === n.key ? "bg-white/20" : "bg-line")}>{n.badge}</span>}
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {tab === "home" && <CommandCenter s={s} act={act} today={today} go={setTab} ask={ask} />}
          {tab === "intake" && <Intake s={s} act={act} today={today} go={setTab} />}
          {tab === "approvals" && <Approvals s={s} act={act} today={today} />}
          {tab === "register" && <Register s={s} act={act} today={today} />}
          {tab === "followups" && <FollowUps s={s} act={act} today={today} />}
          {tab === "visitors" && <Visitors s={s} act={act} today={today} />}
          {tab === "audit" && <AuditLog s={s} today={today} />}
          {tab === "settings" && <Settings s={s} act={act} />}
        </main>

        <footer className="border-t border-line px-4 py-4 text-xs text-faint lg:hidden">
          <Credit /> All sample data is fictional.
        </footer>
      </div>

      <Assistant open={assistant.open} request={assistant} onClose={() => setAssistant((a) => ({ ...a, open: false }))} s={s} act={act} today={today} />
    </div>
  );
}

function Credit() {
  return (
    <>
      Built by{" "}
      <a
        href="https://www.linkedin.com/in/ogundejimichael/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-muted underline decoration-line underline-offset-2 hover:text-ink"
      >
        Michael Ogundeji
      </a>{" "}
      as an application for the Front Desk &amp; AI Operator role.
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4">
      <span className="flex size-8 items-center justify-center rounded-lg bg-navy font-semibold text-white" dir="rtl">
        و
      </span>
      <div className="leading-tight">
        <div className="font-semibold">
          Wared <span className="font-normal text-faint">· <bdi>وارد</bdi></span>
        </div>
        <div className="text-[11px] text-muted">AI front-desk operator</div>
      </div>
    </div>
  );
}
