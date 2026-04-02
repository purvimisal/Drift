import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/layout";
import { ActionButton } from "@/components/action-button";
import { useCreateDriftGoal, useGenerateDriftTasks } from "@/hooks/use-drift";
import { Leaf, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const setupSchema = z.object({
  title: z.string().min(3, "Please describe your goal a bit more.").max(100),
  durationDays: z.coerce.number().min(7).max(90),
  context: z.string().max(300).optional(),
});

type SetupForm = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const createGoal = useCreateDriftGoal();
  const generateTasks = useGenerateDriftTasks();
  const [isThinking, setIsThinking] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: { durationDays: 30 }
  });

  const duration = watch("durationDays");
  const durations = [7, 14, 30, 60, 90];

  const onSubmit = async (data: SetupForm) => {
    try {
      setIsThinking(true);
      // 1. Create the goal
      const goal = await createGoal.mutateAsync(data);
      // 2. Navigate immediately — task generation happens in the background
      setLocation(`/goal/${goal.id}?generating=true`);
      // 3. Fire-and-forget: generate tasks in background (don't await)
      generateTasks.mutateAsync(goal.id).catch(() => {});
    } catch (error) {
      console.error("Failed to setup goal:", error);
      setIsThinking(false);
    }
  };

  return (
    <Layout>
      <AnimatePresence mode="wait">
        {!isThinking ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 ml-1 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>

            <div className="glass-card rounded-[2rem] p-8 sm:p-10">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Leaf className="w-6 h-6 text-primary" />
            </div>
            
            <h1 className="text-3xl font-display font-semibold mb-2">What would you like to focus on?</h1>
            <p className="text-muted-foreground mb-8 text-lg">No pressure. Just a gentle intention.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground/80 pl-1">Your goal</label>
                <input
                  {...register("title")}
                  placeholder="e.g., Run 5k under 30 mins, read daily, learn guitar..."
                  className="w-full bg-background/50 border-2 border-border/60 focus:border-primary/50 focus:bg-white rounded-2xl px-5 py-4 text-lg outline-none transition-all placeholder:text-muted-foreground/60 shadow-inner-soft"
                  autoFocus
                />
                {errors.title && (
                  <p className="text-destructive text-sm pl-2">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline justify-between pl-1">
                  <label className="text-sm font-medium text-foreground/80">Where are you starting from?</label>
                  <span className="text-xs text-muted-foreground/60">optional</span>
                </div>
                <textarea
                  {...register("context")}
                  placeholder="e.g., I can already run 5k in 45 mins, I practice 3x a week..."
                  rows={2}
                  className="w-full bg-background/50 border-2 border-border/60 focus:border-primary/50 focus:bg-white rounded-2xl px-5 py-4 text-base outline-none transition-all placeholder:text-muted-foreground/60 shadow-inner-soft resize-none leading-relaxed"
                />
                <p className="text-xs text-muted-foreground/60 pl-1">Helps us start from your actual level, not from scratch.</p>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground/80 pl-1">For how long?</label>
                <div className="flex flex-wrap gap-3">
                  {durations.map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setValue("durationDays", days)}
                      className={`px-5 py-3 rounded-xl font-medium transition-all duration-200 border-2 ${
                        duration === days 
                          ? 'border-primary bg-primary text-white shadow-sm' 
                          : 'border-transparent bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <ActionButton 
                  type="submit" 
                  disabled={createGoal.isPending || generateTasks.isPending}
                  icon={<ArrowRight className="w-5 h-5" />}
                >
                  Create a gentle plan
                </ActionButton>
              </div>
            </form>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg relative z-10">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-display font-medium text-foreground mb-2">Thinking about your goal...</h2>
              <p className="text-muted-foreground">Crafting a path that feels doable, not demanding.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
