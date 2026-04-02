import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, Clock, Check, X, ChevronDown } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00",
];

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function ReminderSettings() {
  const { settings, loading, permission, supported, subscribe, updateTime, unsubscribe } = useNotifications();
  const [expanded, setExpanded] = useState(false);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.reminderTime) {
      setSelectedTime(settings.reminderTime);
    }
  }, [settings?.reminderTime]);

  if (!supported) return null;

  const isSubscribed = settings?.subscribed ?? false;
  const isDenied = permission === "denied";

  const handleToggle = async () => {
    if (isSubscribed) {
      setSaving(true);
      await unsubscribe();
      setSaving(false);
      setExpanded(false);
    } else {
      setExpanded(true);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    let success: boolean;
    if (isSubscribed) {
      success = await updateTime(selectedTime);
    } else {
      success = await subscribe(selectedTime);
    }
    setSaving(false);
    if (success) {
      setJustSaved(true);
      setShowPicker(false);
      setTimeout(() => setJustSaved(false), 2000);
      if (!isSubscribed) setExpanded(false);
    } else {
      if (permission === "denied") {
        setError("Notifications are blocked. Enable them in your browser settings.");
      } else {
        setError("Couldn't enable notifications. Please try again.");
      }
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button
        onClick={() => isSubscribed ? setExpanded((v) => !v) : handleToggle()}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isSubscribed ? "bg-primary/15" : "bg-secondary"}`}>
            {isSubscribed
              ? <Bell className="w-4 h-4 text-primary" />
              : <BellOff className="w-4 h-4 text-muted-foreground" />
            }
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">
              {isSubscribed ? "Daily reminder" : "Set a daily reminder"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading ? "Loading…"
                : isSubscribed && settings?.reminderTime ? `Every day at ${formatTime(settings.reminderTime)}`
                : isDenied ? "Blocked in browser settings"
                : "Get a gentle nudge each day"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSubscribed && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">On</span>
          )}
          {justSaved && <Check className="w-4 h-4 text-primary" />}
          <ChevronDown className={`w-4 h-4 text-muted-foreground/50 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/20"
          >
            <div className="px-5 py-4 space-y-4">
              {isDenied && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                  Notifications are blocked. Please enable them in your browser or device settings, then try again.
                </p>
              )}

              {!isDenied && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">Pick your reminder time:</p>
                    <button
                      onClick={() => setShowPicker((v) => !v)}
                      className="w-full flex items-center justify-between bg-white/70 border border-border/40 rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        {formatTime(selectedTime)}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground/50 transition-transform ${showPicker ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {showPicker && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-2"
                        >
                          <div className="bg-white/80 border border-border/30 rounded-xl max-h-52 overflow-y-auto">
                            {TIME_OPTIONS.map((t) => (
                              <button
                                key={t}
                                onClick={() => { setSelectedTime(t); setShowPicker(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors flex items-center justify-between ${t === selectedTime ? "text-primary font-medium" : "text-foreground"}`}
                              >
                                {formatTime(t)}
                                {t === selectedTime && <Check className="w-3.5 h-3.5 text-primary" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {error && (
                    <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-primary text-white text-sm font-medium py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Bell className="w-3.5 h-3.5" />
                          {isSubscribed ? "Update time" : "Enable reminder"}
                        </>
                      )}
                    </button>
                    {isSubscribed && (
                      <button
                        onClick={handleToggle}
                        disabled={saving}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary hover:bg-border/40 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Turn off
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
