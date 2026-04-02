import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { Layout } from "@/components/layout";
import { StateBadge } from "@/components/state-badge";
import { ActionButton } from "@/components/action-button";
import { useDriftTodayTask, useRecordDriftAction, useUpdateGoalContext } from "@/hooks/use-drift";
import { CheckCircle2, ChevronRight, Wind, ArrowLeft, Sun, CalendarDays, Leaf, Sparkles, Pencil, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { TaskActionResponse } from "@workspace/api-client-react";

type ViewMode = "task" | "mini_offer" | "mini_task" | "feedback";

export default function DailyTaskPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const goalId = parseInt(params.id || "0");
  const isGenerating = new URLSearchParams(search).get("generating") === "true";

  const { data, isLoading, isError, refetch } = useDriftTodayTask(goalId);
  const recordAction = useRecordDriftAction();

  const [viewMode, setViewMode] = useState<ViewMode>("task");
  const [actionResponse, setActionResponse] = useState<TaskActionResponse | null>(null);
  const [generatingTasks, setGeneratingTasks] = useState(isGenerating);
  const [showContextEdit, setShowContextEdit] = useState(false);
  const [contextDraft, setContextDraft] = useState("");
  const contextRef = useRef<HTMLTextAreaElement>(null);
  const updateContext = useUpdateGoalContext();

  // Poll every 3s until tasks are ready when generating
  const poll = useCallback(() => {
    if (!generatingTasks) return;
    refetch().then((result) => {
      if (result.data?.task) {
        setGeneratingTasks(false);
        setLocation(`/goal/${goalId}`, { replace: true });
      }
    });
  }, [generatingTasks, goalId, refetch, setLocation]);

  useEffect(() => {
    if (!generatingTasks) return;
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [generatingTasks, poll]);

  useEffect(() => {
    if (generatingTasks && data?.task) {
      setGeneratingTasks(false);
      setLocation(`/goal/${goalId}`, { replace: true });
    }
  }, [data, generatingTasks, goalId, setLocation]);

  if (!goalId) {
    setLocation("/");
    return null;
  }

  const handleAction = async (actionType: "done" | "skip" | "too_much") => {
    if (!data?.task) return;
    try {
      const response = await recordAction.mutateAsync({ goalId, taskId: data.task.id, action: actionType });
      setActionResponse(response);
      setViewMode("feedback");
    } catch (e) {
      console.error("Failed to record action", e);
    }
  };

  const resetAndFetchNext = () => {
    setViewMode("task");
    setActionResponse(null);
    refetch();
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (generatingTasks || isLoading) {
    return (
      <Layout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center space-y-6"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg relative z-10">
              <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-display font-medium text-foreground mb-2">
              {generatingTasks ? "Thinking about your goal..." : "Loading today's intention..."}
            </h2>
            <p className="text-muted-foreground">
              {generatingTasks ? "Crafting a path that feels doable, not demanding." : "One moment..."}
            </p>
          </div>
        </motion.div>
      </Layout>
    );
  }

  // ── No task / all done ───────────────────────────────────────────────────
  if (isError || !data?.task) {
    return (
      <Layout>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-[2rem] p-10 text-center flex flex-col items-center justify-center"
        >
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
            <Sun className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-display font-medium mb-3">You're all caught up.</h2>
          <p className="text-muted-foreground mb-8">
            There's nothing left for today. Take a deep breath and enjoy the rest of your day.
          </p>
          <div className="flex flex-col gap-3 w-full">
            <ActionButton onClick={() => setLocation(`/goal/${goalId}/calendar`)} icon={<CalendarDays className="w-4 h-4" />}>
              View your calendar
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => setLocation("/")} icon={<ArrowLeft className="w-4 h-4" />}>
              Back home
            </ActionButton>
          </div>
        </motion.div>
      </Layout>
    );
  }

  // ── Mini task values (rule-based, instant) ───────────────────────────────
  const miniMinutes = 5;
  const miniDescription = `Just take the very first step — spend ${miniMinutes} minutes on this. You can stop whenever. Starting is the win.`;

  return (
    <Layout>
      {/* Header */}
      <div className="w-full mb-6">
        <div className="flex justify-between items-center px-2">
          <button
            onClick={() => viewMode !== "task" ? setViewMode("task") : setLocation("/")}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-full hover:bg-black/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/70 truncate px-2">
              {data.goal.title}
            </h1>
            <button
              onClick={() => {
                setContextDraft(data.goal.context ?? "");
                setShowContextEdit(v => !v);
                setTimeout(() => contextRef.current?.focus(), 50);
              }}
              className="text-xs text-muted-foreground/40 hover:text-primary/60 transition-colors mt-0.5 flex items-center gap-1 mx-auto"
            >
              <Pencil className="w-2.5 h-2.5" />
              {data.goal.context ? "update context" : "add context"}
            </button>
          </div>
          <button
            onClick={() => setLocation(`/goal/${goalId}/calendar`)}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2 rounded-full hover:bg-black/5"
            title="View calendar"
          >
            <CalendarDays className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence>
          {showContextEdit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-3 px-1"
            >
              <div className="glass-card rounded-2xl p-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tell us more about where you're starting from — this shapes your future tasks.
                </p>
                <textarea
                  ref={contextRef}
                  value={contextDraft}
                  onChange={e => setContextDraft(e.target.value)}
                  placeholder="e.g., I can already read 2 pages a day, I've been running 3x a week..."
                  rows={2}
                  className="w-full bg-white/60 border border-border/40 focus:border-primary/40 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/50 resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowContextEdit(false)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await updateContext.mutateAsync({ goalId, context: contextDraft });
                      setShowContextEdit(false);
                    }}
                    disabled={updateContext.isPending}
                    className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">

        {/* ── View: main task ─────────────────────────────────────────────── */}
        {viewMode === "task" && (
          <motion.div
            key="task-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-4 px-4">
              <StateBadge state={data.goalState} />
              <h2 className="text-2xl sm:text-3xl font-display font-medium text-foreground leading-snug">
                {data.adaptiveMessage}
              </h2>
            </div>

            <div className="glass-card rounded-[2rem] p-8 border border-white/60 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                  Day {data.task.dayNumber}
                </span>
                <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                  ~{data.task.estimatedMinutes} min
                </span>
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-foreground">{data.task.title}</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">{data.task.description}</p>
            </div>

            <div className="space-y-4 pt-2">
              <ActionButton
                onClick={() => handleAction("done")}
                disabled={recordAction.isPending}
                icon={<CheckCircle2 className="w-5 h-5" />}
              >
                Done for today
              </ActionButton>
              <div className="grid grid-cols-2 gap-4">
                <ActionButton
                  variant="ghost"
                  onClick={() => setViewMode("mini_offer")}
                  disabled={recordAction.isPending}
                  icon={<Wind className="w-4 h-4" />}
                  className="text-sm py-3"
                >
                  This is too much
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  onClick={() => handleAction("skip")}
                  disabled={recordAction.isPending}
                  icon={<ChevronRight className="w-4 h-4" />}
                  className="text-sm py-3"
                >
                  Skip today
                </ActionButton>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── View: mini task offer ────────────────────────────────────────── */}
        {viewMode === "mini_offer" && (
          <motion.div
            key="mini-offer-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-3 px-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-2xl font-display font-medium text-foreground">
                That's completely okay.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                What if you tried a smaller version? Just 5 minutes — no pressure to do more.
              </p>
            </div>

            {/* Mini task card */}
            <div className="glass-card rounded-[2rem] p-7 border border-amber-100/60 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-200/40 via-amber-300/60 to-amber-200/40" />
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  Gentle version
                </span>
                <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  ~{miniMinutes} min
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">{data.task.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{miniDescription}</p>
            </div>

            <div className="space-y-3 pt-1">
              <ActionButton
                onClick={() => setViewMode("mini_task")}
                icon={<CheckCircle2 className="w-5 h-5" />}
              >
                Yes, I'll try this
              </ActionButton>
              <ActionButton
                variant="ghost"
                onClick={() => handleAction("too_much")}
                disabled={recordAction.isPending}
                className="text-sm text-muted-foreground"
              >
                Not even this today
              </ActionButton>
            </div>
          </motion.div>
        )}

        {/* ── View: doing the mini task ────────────────────────────────────── */}
        {viewMode === "mini_task" && (
          <motion.div
            key="mini-task-view"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3 px-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full">
                <Sparkles className="w-4 h-4" /> Gentle mode — 5 minutes
              </div>
              <h2 className="text-2xl font-display font-medium text-foreground leading-snug">
                Just start. You can stop after 5 minutes.
              </h2>
            </div>

            <div className="glass-card rounded-[2rem] p-8 border border-primary/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10" />
              <h3 className="text-2xl font-semibold mb-3 text-foreground">{data.task.title}</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">{miniDescription}</p>
            </div>

            <div className="space-y-3 pt-2">
              <ActionButton
                onClick={() => handleAction("done")}
                disabled={recordAction.isPending}
                icon={<CheckCircle2 className="w-5 h-5" />}
              >
                Done — I showed up
              </ActionButton>
              <ActionButton
                variant="ghost"
                onClick={() => handleAction("too_much")}
                disabled={recordAction.isPending}
                className="text-sm text-muted-foreground"
              >
                Still too much today
              </ActionButton>
            </div>
          </motion.div>
        )}

        {/* ── View: feedback after action ──────────────────────────────────── */}
        {viewMode === "feedback" && actionResponse && (
          <motion.div
            key="feedback-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-[2rem] p-10 text-center flex flex-col items-center justify-center space-y-6"
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${actionResponse.adapted ? "bg-amber-100" : "bg-primary/10"}`}>
              {actionResponse.adapted
                ? <Sparkles className="w-8 h-8 text-amber-500" />
                : <Leaf className="w-8 h-8 text-primary" />
              }
            </div>

            <h2 className="text-2xl font-display font-medium text-foreground">
              {actionResponse.message}
            </h2>

            {actionResponse.adapted && (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl">
                Your upcoming tasks have been made gentler.
              </p>
            )}

            <ActionButton variant="primary" onClick={resetAndFetchNext}>
              Got it
            </ActionButton>
          </motion.div>
        )}

      </AnimatePresence>
    </Layout>
  );
}
