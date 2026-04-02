import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetGoalTasks } from "@workspace/api-client-react";
import Colors from "@/constants/colors";

type TaskStatus = "done" | "skipped" | "too_much" | "missed" | "today" | "upcoming" | "none";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function buildGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getStatus(task: any, dateStr: string, todayStr: string): TaskStatus {
  if (!task) return "none";
  if (task.completedAt) return "done";
  if (task.tooMuchAt) return "too_much";
  if (task.skippedAt) return "skipped";
  if (dateStr === todayStr) return "today";
  if (dateStr < todayStr) return "missed";
  return "upcoming";
}

const STATUS_STYLE: Record<TaskStatus, { bg: string; text: string }> = {
  done: { bg: Colors.primary, text: Colors.white },
  skipped: { bg: Colors.amberLight, text: Colors.amber },
  too_much: { bg: "#FFEDD5", text: Colors.stateDisengaging },
  missed: { bg: "#E2E8F0", text: "#64748B" },
  today: { bg: Colors.primaryMuted, text: Colors.primary },
  upcoming: { bg: "rgba(210,205,195,0.3)", text: Colors.muted },
  none: { bg: "transparent", text: Colors.mutedLight },
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  done: "Completed",
  skipped: "Skipped",
  too_much: "Too much",
  missed: "Missed",
  today: "Today",
  upcoming: "Upcoming",
  none: "",
};

export default function CalendarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goalId = parseInt(id || "0");

  const { data, isLoading } = useGetGoalTasks(goalId);
  const today = new Date();
  const todayStr = toDateStr(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<{ task: any; date: Date; status: TaskStatus } | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const taskMap = useMemo(() => {
    const map = new Map<string, any>();
    if (!data?.tasks) return map;
    for (const t of data.tasks) map.set(t.scheduledFor, t);
    return map;
  }, [data?.tasks]);

  const grid = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const goalStart = data?.goal?.createdAt ? toDateStr(new Date(data.goal.createdAt)) : null;
  const goalEnd = data?.goal ? (() => {
    const e = new Date(data.goal.createdAt);
    e.setDate(e.getDate() + data.goal.durationDays - 1);
    return toDateStr(e);
  })() : null;

  const counts = useMemo(() => {
    const c = { done: 0, skipped: 0, too_much: 0, missed: 0 };
    if (!data?.tasks) return c;
    for (const t of data.tasks) {
      if (t.completedAt) c.done++;
      else if (t.tooMuchAt) c.too_much++;
      else if (t.skippedAt) c.skipped++;
      else if (t.scheduledFor < todayStr) c.missed++;
    }
    return c;
  }, [data?.tasks, todayStr]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={Colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{data?.goal?.title ?? "Calendar"}</Text>
        <View style={styles.navSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your journey…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Summary pills */}
          <View style={styles.summaryRow}>
            {counts.done > 0 && (
              <View style={[styles.pill, { backgroundColor: Colors.primaryMuted }]}>
                <Feather name="check-circle" size={12} color={Colors.primary} />
                <Text style={[styles.pillText, { color: Colors.primary }]}>{counts.done} done</Text>
              </View>
            )}
            {counts.skipped > 0 && (
              <View style={[styles.pill, { backgroundColor: Colors.amberLight }]}>
                <Feather name="wind" size={12} color={Colors.amber} />
                <Text style={[styles.pillText, { color: Colors.amber }]}>{counts.skipped} skipped</Text>
              </View>
            )}
            {counts.too_much > 0 && (
              <View style={[styles.pill, { backgroundColor: "#FFEDD5" }]}>
                <Feather name="alert-circle" size={12} color={Colors.stateDisengaging} />
                <Text style={[styles.pillText, { color: Colors.stateDisengaging }]}>{counts.too_much} too much</Text>
              </View>
            )}
            {counts.missed > 0 && (
              <View style={[styles.pill, { backgroundColor: "#E2E8F0" }]}>
                <Text style={[styles.pillText, { color: "#64748B" }]}>{counts.missed} missed</Text>
              </View>
            )}
          </View>

          {/* Calendar */}
          <View style={styles.calCard}>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.monthBtn} activeOpacity={0.7}>
                <Feather name="chevron-left" size={20} color={Colors.muted} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.monthBtn} activeOpacity={0.7}>
                <Feather name="chevron-right" size={20} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.dayHeaders}>
              {DAYS.map((d, i) => (
                <Text key={i} style={styles.dayHeader}>{d}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {grid.map((date, idx) => {
                if (!date) return <View key={idx} style={styles.cell} />;
                const dateStr = toDateStr(date);
                const task = taskMap.get(dateStr);
                const status = getStatus(task, dateStr, todayStr);
                const inRange = goalStart && goalEnd ? dateStr >= goalStart && dateStr <= goalEnd : false;
                const st = inRange ? STATUS_STYLE[status] : STATUS_STYLE.none;
                const isToday = dateStr === todayStr;

                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[styles.cell, { backgroundColor: st.bg }, isToday && styles.todayCell]}
                    onPress={() => task && setSelectedDay({ task, date, status })}
                    disabled={!task}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.cellText, { color: st.text }, isToday && styles.todayCellText]}>
                      {date.getDate()}
                    </Text>
                    {status === "done" && (
                      <Text style={[styles.checkMark, { color: st.text }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {(["done", "skipped", "too_much", "missed", "upcoming"] as TaskStatus[]).map((s) => (
              <View key={s} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_STYLE[s].bg, borderWidth: 1, borderColor: Colors.border }]} />
                <Text style={styles.legendLabel}>{STATUS_LABEL[s]}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Task detail sheet */}
      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={() => setSelectedDay(null)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSelectedDay(null)}>
          <View style={[styles.sheet, { paddingBottom: bottomPad + 12 }]}>
            <View style={styles.sheetHandle} />
            {selectedDay && (
              <>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetDate}>
                      {selectedDay.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </Text>
                    <View style={styles.sheetStatusRow}>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_STYLE[selectedDay.status].bg }]}>
                        <Text style={[styles.statusBadgeText, { color: STATUS_STYLE[selectedDay.status].text }]}>
                          {STATUS_LABEL[selectedDay.status]}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedDay(null)} style={styles.sheetClose}>
                    <Feather name="x" size={18} color={Colors.muted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.sheetTaskTitle}>{selectedDay.task.title}</Text>
                <Text style={styles.sheetTaskDesc}>{selectedDay.task.description}</Text>
                <View style={styles.sheetMeta}>
                  <Feather name="clock" size={14} color={Colors.muted} />
                  <Text style={styles.sheetMetaText}>
                    {selectedDay.task.estimatedMinutes} min · Day {selectedDay.task.dayNumber}
                  </Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  navBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    fontSize: 13, fontWeight: "600",
    color: Colors.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
  },
  navSpacer: { width: 36 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, color: Colors.muted, fontFamily: "Inter_400Regular" },
  scrollContent: { paddingHorizontal: 20, gap: 16, paddingBottom: 40 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 100,
  },
  pillText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  calCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  monthBtn: { padding: 8 },
  monthLabel: { fontSize: 16, fontWeight: "600", color: Colors.foreground, fontFamily: "Inter_600SemiBold" },
  dayHeaders: { flexDirection: "row", marginBottom: 8 },
  dayHeader: {
    flex: 1, textAlign: "center",
    fontSize: 11, fontWeight: "600",
    color: Colors.mutedLight,
    fontFamily: "Inter_600SemiBold",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginBottom: 2,
  },
  todayCell: { borderWidth: 2, borderColor: Colors.primary },
  cellText: { fontSize: 13, fontWeight: "500", fontFamily: "Inter_500Medium" },
  todayCellText: { fontWeight: "700", fontFamily: "Inter_700Bold" },
  checkMark: { fontSize: 8, marginTop: 1 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { fontSize: 11, color: Colors.muted, fontFamily: "Inter_400Regular" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 12,
  },
  sheetHandle: {
    width: 40, height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sheetDate: { fontSize: 12, fontWeight: "600", color: Colors.muted, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Inter_600SemiBold" },
  sheetStatusRow: { marginTop: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, alignSelf: "flex-start" },
  statusBadgeText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  sheetClose: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTaskTitle: { fontSize: 22, fontWeight: "700", color: Colors.foreground, lineHeight: 28, fontFamily: "Inter_700Bold" },
  sheetTaskDesc: { fontSize: 15, color: Colors.muted, lineHeight: 22, fontFamily: "Inter_400Regular" },
  sheetMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  sheetMetaText: { fontSize: 14, color: Colors.muted, fontFamily: "Inter_400Regular" },
});
