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

  return {
    interactionsToday: s.entries.filter((e) => e.receivedAt === today).length + s.visitors.filter((v) => isToday(v.arrivedAt)).length,
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
