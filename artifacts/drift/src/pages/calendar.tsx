import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, CheckCircle2, Wind, AlertCircle, X } from "lucide-react";
import { Layout } from "@/components/layout";
import { useGoalTasks } from "@/hooks/use-drift";
import type { Task } from "@workspace/api-client-react";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type TaskStatus = "done" | "skipped" | "too_much" | "missed" | "today" | "upcoming" | "none";

function getTaskStatus(task: Task | undefined, dateStr: string, todayStr: string): TaskStatus {
  if (!task) return "none";
  if (task.completedAt) return "done";
  if (task.tooMuchAt) return "too_much";
  if (task.skippedAt) return "skipped";
  if (dateStr === todayStr) return "today";
  if (dateStr < todayStr) return "missed";
  return "upcoming";
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  done: "bg-primary text-white",
  skipped: "bg-amber-200 text-amber-800",
  too_much: "bg-orange-200 text-orange-800",
  missed: "bg-slate-200 text-slate-500",
  today: "bg-primary/20 text-primary border-2 border-primary font-bold",
  upcoming: "bg-secondary/70 text-foreground/70",
  none: "text-muted-foreground/30",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  done: "Completed",
  skipped: "Skipped",
  too_much: "Too much",
  missed: "Missed",
  today: "Today",
  upcoming: "Upcoming",
  none: "",
};

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function buildCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells: (Date | null)[] = [];

  for (let i = 0; i < firstDay.getDay(); i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface TaskDetailSheetProps {
  task: Task;
  status: TaskStatus;
  date: Date;
  onClose: () => void;
}

function TaskDetailSheet({ task, status, date, onClose }: TaskDetailSheetProps) {
  const icon = {
    done: <CheckCircle2 className="w-5 h-5 text-primary" />,
    skipped: <Wind className="w-5 h-5 text-amber-500" />,
    too_much: <AlertCircle className="w-5 h-5 text-orange-500" />,
    missed: <AlertCircle className="w-5 h-5 text-slate-400" />,
    today: <CheckCircle2 className="w-5 h-5 text-primary" />,
    upcoming: <Clock className="w-5 h-5 text-foreground/50" />,
    none: null,
  }[status];

  const dateLabel = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <motion.div
      key="sheet"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full max-w-sm mx-auto bg-white rounded-t-[2rem] p-6 pb-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{dateLabel}</p>
            <div className="flex items-center gap-2">
              {icon}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
                {STATUS_LABELS[status]}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Task content */}
        <div className="space-y-3">
          <h3 className="text-xl font-display font-semibold text-foreground">{task.title}</h3>
          <p className="text-muted-foreground leading-relaxed">{task.description}</p>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1">
            <Clock className="w-4 h-4" />
            <span>{task.estimatedMinutes} minutes · Day {task.dayNumber}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CalendarPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const goalId = parseInt(params.id || "0");

  const { data, isLoading } = useGoalTasks(goalId);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; task: Task; status: TaskStatus } | null>(null);

  const today = new Date();
  const todayStr = toDateStr(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Build task map by scheduledFor date
  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    if (!data?.tasks) return map;
    for (const task of data.tasks) {
      map.set(task.scheduledFor, task);
    }
    return map;
  }, [data?.tasks]);

  // Compute goal date range
  const goalStart = data?.goal?.createdAt ? toDateStr(new Date(data.goal.createdAt)) : null;
  const goalEnd = data?.goal ? (() => {
    const end = new Date(data.goal.createdAt);
    end.setDate(end.getDate() + data.goal.durationDays - 1);
    return toDateStr(end);
  })() : null;

  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Summary counts
  const counts = useMemo(() => {
    const c = { done: 0, skipped: 0, too_much: 0, missed: 0 };
    if (!data?.tasks) return c;
    for (const task of data.tasks) {
      const dateStr = task.scheduledFor;
      if (task.completedAt) c.done++;
      else if (task.tooMuchAt) c.too_much++;
      else if (task.skippedAt) c.skipped++;
      else if (dateStr < todayStr) c.missed++;
    }
    return c;
  }, [data?.tasks, todayStr]);

  if (!goalId) {
    setLocation("/");
    return null;
  }

  return (
    <Layout>
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 px-2">
        <button
          onClick={() => setLocation(`/goal/${goalId}`)}
          className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-full hover:bg-black/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center flex-1">
          {isLoading ? (
            <div className="h-4 w-32 bg-secondary animate-pulse rounded-full mx-auto" />
          ) : (
            <h1 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/70 truncate px-2">
              {data?.goal?.title}
            </h1>
          )}
        </div>
        <div className="w-9" />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading your journey...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary pills */}
          <div className="flex gap-2 flex-wrap justify-center">
            {counts.done > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> {counts.done} done
              </span>
            )}
            {counts.skipped > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full">
                <Wind className="w-3.5 h-3.5" /> {counts.skipped} skipped
              </span>
            )}
            {counts.too_much > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" /> {counts.too_much} too much
              </span>
            )}
            {counts.missed > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full">
                · {counts.missed} missed
              </span>
            )}
          </div>

          {/* Calendar card */}
          <div className="glass-card rounded-[2rem] p-5">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <h2 className="text-base font-display font-semibold text-foreground">{monthLabel}</h2>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl hover:bg-secondary transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_OF_WEEK.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground/60 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {grid.map((date, idx) => {
                if (!date) return <div key={idx} />;
                const dateStr = toDateStr(date);
                const task = taskMap.get(dateStr);
                const status = getTaskStatus(task, dateStr, todayStr);
                const isInGoalRange = goalStart && goalEnd
                  ? dateStr >= goalStart && dateStr <= goalEnd
                  : true;
                const isClickable = !!task;

                return (
                  <motion.button
                    key={dateStr}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => task && setSelectedDay({ date, task, status })}
                    disabled={!isClickable}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all duration-150
                      ${isInGoalRange ? STATUS_STYLES[status] : "text-muted-foreground/20"}
                      ${isClickable ? "cursor-pointer hover:opacity-80 active:scale-95" : "cursor-default"}
                      ${dateStr === todayStr ? "ring-2 ring-primary ring-offset-1" : ""}
                    `}
                  >
                    <span className="leading-none">{date.getDate()}</span>
                    {task && status === "done" && (
                      <span className="text-[8px] mt-0.5 opacity-80">✓</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center px-2">
            {([
              ["done", "Done"],
              ["skipped", "Skipped"],
              ["too_much", "Too much"],
              ["missed", "Missed"],
              ["upcoming", "Upcoming"],
            ] as const).map(([status, label]) => (
              <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`w-3 h-3 rounded-sm ${STATUS_STYLES[status]}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task detail bottom sheet */}
      <AnimatePresence>
        {selectedDay && (
          <TaskDetailSheet
            task={selectedDay.task}
            status={selectedDay.status}
            date={selectedDay.date}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}
