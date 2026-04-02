import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { ActionButton } from "@/components/action-button";
import { SaveProgressBanner } from "@/components/save-progress-banner";
import { ReminderSettings } from "@/components/reminder-settings";
import { useGoals } from "@/hooks/use-drift";
import { Leaf, Plus, ArrowRight, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import type { Goal } from "@workspace/api-client-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function getDayNumber(goal: Goal) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const day = Math.floor((Date.now() - new Date(goal.createdAt).getTime()) / msPerDay) + 1;
  return Math.min(Math.max(day, 1), goal.durationDays);
}

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  ON_TRACK:     { label: "On track",       color: "bg-primary" },
  DRIFTING:     { label: "Drifting",        color: "bg-amber-400" },
  DISENGAGING:  { label: "Losing pace",     color: "bg-orange-400" },
  AT_RISK:      { label: "Let's reconnect", color: "bg-destructive" },
  RETURNING:    { label: "Coming back",     color: "bg-primary" },
};

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { data: goals, isLoading } = useGoals();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  const hasGoals = goals && goals.length > 0;

  if (!hasGoals) {
    return (
      <Layout>
        <div className="flex flex-col items-center min-h-[calc(100svh-4rem)]">
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, type: "spring" }}
              className="w-20 h-20 bg-white shadow-xl shadow-primary/10 rounded-[1.75rem] flex items-center justify-center mb-8 rotate-3"
            >
              <Leaf className="w-10 h-10 text-primary -rotate-3" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="space-y-3"
            >
              <h1 className="text-5xl font-display font-bold text-foreground tracking-tight">
                Drift
              </h1>
              <p className="text-lg text-muted-foreground max-w-xs mx-auto leading-relaxed">
                A gentle place to return to your goals.
                <br />
                No streaks, no guilt. Just soft nudges.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-full pb-6 pt-4 space-y-3"
          >
            <SaveProgressBanner hasGoals={false} />
            <ReminderSettings />
            <ActionButton
              variant="primary"
              onClick={() => setLocation("/setup")}
              className="text-lg py-5"
            >
              Start gently
            </ActionButton>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6 space-y-7">

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-1"
        >
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Leaf className="w-3.5 h-3.5 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              {getGreeting()}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground pl-9">{getTodayLabel()}</p>
        </motion.div>

        <SaveProgressBanner hasGoals={true} />

        {/* Goal cards */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">
            Your intentions
          </p>
          {goals.map((goal, i) => {
            const currentDay = getDayNumber(goal);
            const progress = currentDay / goal.durationDays;
            const stateInfo = STATE_LABELS[goal.state] ?? { label: goal.state, color: "bg-muted-foreground" };

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="w-full glass-card rounded-2xl overflow-hidden group"
              >
                <button
                  onClick={() => setLocation(`/goal/${goal.id}`)}
                  className="w-full p-5 text-left hover:bg-white/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h4 className="font-semibold text-base text-foreground leading-snug flex-1">
                      {goal.title}
                    </h4>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary/60 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06 + 0.2, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stateInfo.color}`} />
                      {stateInfo.label}
                    </span>
                    <span className="text-xs text-muted-foreground/60">
                      Day {currentDay} of {goal.durationDays}
                    </span>
                  </div>
                </button>

                <div className="border-t border-border/20">
                  <button
                    onClick={() => setLocation(`/goal/${goal.id}/calendar`)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    View calendar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <ReminderSettings />

        <div className="pt-1">
          <ActionButton
            variant="ghost"
            onClick={() => setLocation("/setup")}
            icon={<Plus className="w-4 h-4" />}
          >
            Set a new intention
          </ActionButton>
        </div>
      </div>
    </Layout>
  );
}
