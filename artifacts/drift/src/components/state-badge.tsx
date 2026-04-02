import { motion } from "framer-motion";

type GoalState = "ON_TRACK" | "DRIFTING" | "DISENGAGING" | "AT_RISK" | "RETURNING";

const STATE_CONFIG: Record<GoalState, { label: string; color: string }> = {
  ON_TRACK: { label: "On Track", color: "bg-state-track/10 text-state-track border-state-track/20" },
  DRIFTING: { label: "Drifting", color: "bg-state-drift/15 text-state-drift border-state-drift/30" },
  DISENGAGING: { label: "Easing Back", color: "bg-state-disengage/10 text-state-disengage border-state-disengage/20" },
  AT_RISK: { label: "Gentle Mode", color: "bg-state-risk/10 text-state-risk border-state-risk/20" },
  RETURNING: { label: "Returning", color: "bg-state-return/10 text-state-return border-state-return/20" },
};

export function StateBadge({ state }: { state: GoalState | string }) {
  const config = STATE_CONFIG[state as GoalState] ?? STATE_CONFIG.ON_TRACK;
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border tracking-wide uppercase ${config.color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 opacity-75" />
      {config.label}
    </motion.div>
  );
}
