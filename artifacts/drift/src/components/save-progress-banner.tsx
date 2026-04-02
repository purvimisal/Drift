import { useAuth } from "@workspace/replit-auth-web";
import { CloudUpload, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function SaveProgressBanner({ hasGoals }: { hasGoals: boolean }) {
  const { isLoading, isAuthenticated, login } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || isAuthenticated || !hasGoals || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full mb-6"
      >
        <div className="relative bg-white/70 backdrop-blur-sm border border-primary/20 rounded-2xl px-5 py-4 flex items-start gap-4 shadow-sm">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <CloudUpload className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Save your progress</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Your goals are only on this device right now. Sign in to keep them safe across all your devices.
            </p>
            <button
              onClick={login}
              className="mt-3 text-xs font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
            >
              Sign in to save
            </button>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 -mt-0.5 -mr-1 p-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
