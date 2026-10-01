import { daysBetween, localDay } from "./dates";
import type { State } from "./types";

// Every number on the dashboard is counted from the register, tasks and audit log. Nothing is hard-coded.
export function computeMetrics(s: State, today: string) {
  const isToday = (iso?: string) => !!iso && localDay(iso) === today;
  const inWeek = (iso: string) => daysBetween(localDay(iso), today) < 7;

  const eventsToday = s.audit.filter((e) => isToday(e.at));
  const week = s.audit.filter((e) => inWeek(e.at));
  const aiWeek = week.filter((e) => e.actor === "ai").length;
  const openTasks = s.tasks.filter((t) => t.status === "open");
  const pending = s.approvals.filter((a) => a.status === "pending");
  const itemsToday = s.entries.filter((e) => e.receivedAt === today).length;
  const arrivalsToday = s.visitors.filter((v) => isToday(v.arrivedAt)).length;

  return {
    itemsToday,
    arrivalsToday,
    interactionsToday: itemsToday + arrivalsToday,
    // Open follow-ups due from today through the next 7 days (overdue counted separately).
    dueSoonTasks: openTasks.filter((t) => t.dueDate && t.dueDate >= today && daysBetween(today, t.dueDate) <= 7).length,
    oldestPendingDays: pending.reduce((n, a) => Math.max(n, daysBetween(localDay(a.createdAt), today)), 0),
    aiActionsToday: eventsToday.filter((e) => e.actor === "ai").length,
    humanActionsToday: eventsToday.filter((e) => e.actor === "human").length,
    pendingApprovals: s.approvals.filter((a) => a.status === "pending").length,
    openTasks: openTasks.length,
    overdueTasks: openTasks.filter((t) => t.dueDate && t.dueDate < today).length,
    dueTodayTasks: openTasks.filter((t) => t.dueDate === today).length,
    onSite: s.visitors.filter((v) => v.status === "on-site").length,
    expectedToday: s.visitors.filter((v) => v.status === "expected" && isToday(v.expectedAt)).length,
    minutesSavedWeek: week.reduce((n, e) => n + (e.minutesSaved ?? 0), 0),
    automationRate: week.length ? Math.round((aiWeek / week.length) * 100) : 0,
    receivedWeek: s.entries.filter((e) => daysBetween(e.receivedAt, today) < 7).length,
    approvalsDecidedWeek: s.approvals.filter((a) => a.decidedAt && inWeek(a.decidedAt)).length,
    aiWeek,
  };
}
