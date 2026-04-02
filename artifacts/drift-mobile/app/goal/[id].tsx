import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useGetTodayTask, useRecordTaskAction } from "@workspace/api-client-react";
import { StateBadge } from "@/components/StateBadge";
import Colors from "@/constants/colors";

type ViewMode = "task" | "mini_offer" | "mini_task" | "feedback";

export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goalId = parseInt(id || "0");

  const { data, isLoading, isError, refetch } = useGetTodayTask(goalId);
  const recordAction = useRecordTaskAction();

  const [viewMode, setViewMode] = useState<ViewMode>("task");
  const [actionResponse, setActionResponse] = useState<{ message: string; adapted?: boolean } | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleAction = useCallback(async (actionType: "done" | "skip" | "too_much") => {
    if (!data?.task) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const response = await recordAction.mutateAsync({
        id: goalId,
        taskId: data.task.id,
        data: { action: actionType },
      });
      setActionResponse(response);
      setViewMode("feedback");
    } catch (e) {
      console.error("Failed to record action", e);
    }
  }, [data, goalId, recordAction]);

  const resetAndNext = useCallback(() => {
    setViewMode("task");
    setActionResponse(null);
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading today's intention…</Text>
      </View>
    );
  }

  if (isError || !data?.task) {
    return (
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Feather name="arrow-left" size={20} color={Colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.allDoneCard}>
          <View style={styles.sunWrap}>
            <Feather name="sun" size={36} color={Colors.muted} />
          </View>
          <Text style={styles.allDoneTitle}>You're all caught up.</Text>
          <Text style={styles.allDoneSubtitle}>
            Nothing left for today. Take a deep breath and enjoy your day.
          </Text>
          <TouchableOpacity
            style={styles.calBtn}
            onPress={() => router.push(`/goal/${goalId}/calendar`)}
            activeOpacity={0.8}
          >
            <Feather name="calendar" size={16} color={Colors.primary} />
            <Text style={styles.calBtnText}>View your calendar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const miniMinutes = 5;
  const miniDescription = `Just take the very first step — spend ${miniMinutes} minutes. You can stop whenever. Starting is the win.`;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      {/* Header */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => (viewMode !== "task" ? setViewMode("task") : router.back())}
          style={styles.navBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={Colors.foreground} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle} numberOfLines={1}>{data.goal.title}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/goal/${goalId}/calendar`)}
          style={styles.navBtn}
          activeOpacity={0.7}
        >
          <Feather name="calendar" size={18} color={Colors.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Task view ── */}
        {viewMode === "task" && (
          <View style={styles.section}>
            <View style={styles.stateArea}>
              <StateBadge state={data.goalState} />
              <Text style={styles.adaptiveMsg}>{data.adaptiveMessage}</Text>
            </View>

            <View style={styles.taskCard}>
              <View style={styles.taskCardAccent} />
              <View style={styles.taskMeta}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>Day {data.task.dayNumber}</Text>
                </View>
                <View style={styles.timeBadge}>
                  <Feather name="clock" size={12} color={Colors.primary} />
                  <Text style={styles.timeBadgeText}>~{data.task.estimatedMinutes} min</Text>
                </View>
              </View>
              <Text style={styles.taskTitle}>{data.task.title}</Text>
              <Text style={styles.taskDesc}>{data.task.description}</Text>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => handleAction("done")}
              disabled={recordAction.isPending}
              activeOpacity={0.8}
            >
              {recordAction.isPending ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Feather name="check-circle" size={20} color={Colors.white} />
                  <Text style={styles.doneBtnText}>Done for today</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setViewMode("mini_offer")}
                disabled={recordAction.isPending}
                activeOpacity={0.7}
              >
                <Feather name="wind" size={16} color={Colors.muted} />
                <Text style={styles.secondaryBtnText}>Too much</Text>
              </TouchableOpacity>
              <View style={styles.secondaryDivider} />
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => handleAction("skip")}
                disabled={recordAction.isPending}
                activeOpacity={0.7}
              >
                <Feather name="skip-forward" size={16} color={Colors.muted} />
                <Text style={styles.secondaryBtnText}>Skip today</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Mini offer view ── */}
        {viewMode === "mini_offer" && (
          <View style={styles.section}>
            <View style={styles.miniOfferHeader}>
              <View style={styles.sparkleWrap}>
                <Feather name="zap" size={24} color={Colors.amber} />
              </View>
              <Text style={styles.miniOfferTitle}>That's completely okay.</Text>
              <Text style={styles.miniOfferSubtitle}>
                What if you tried a smaller version? Just 5 minutes — no pressure.
              </Text>
            </View>

            <View style={styles.miniCard}>
              <View style={[styles.taskCardAccent, { backgroundColor: Colors.amber }]} />
              <View style={styles.taskMeta}>
                <View style={[styles.dayBadge, { backgroundColor: Colors.amberLight }]}>
                  <Text style={[styles.dayBadgeText, { color: Colors.amber }]}>Gentle version</Text>
                </View>
                <View style={[styles.timeBadge, { backgroundColor: Colors.amberLight }]}>
                  <Feather name="clock" size={12} color={Colors.amber} />
                  <Text style={[styles.timeBadgeText, { color: Colors.amber }]}>~{miniMinutes} min</Text>
                </View>
              </View>
              <Text style={styles.taskTitle}>{data.task.title}</Text>
              <Text style={styles.taskDesc}>{miniDescription}</Text>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setViewMode("mini_task")}
              activeOpacity={0.8}
            >
              <Feather name="check-circle" size={20} color={Colors.white} />
              <Text style={styles.doneBtnText}>Yes, I'll try this</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipAllBtn}
              onPress={() => handleAction("too_much")}
              disabled={recordAction.isPending}
              activeOpacity={0.7}
            >
              <Text style={styles.skipAllBtnText}>Not even this today</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Mini task view ── */}
        {viewMode === "mini_task" && (
          <View style={styles.section}>
            <View style={styles.stateArea}>
              <View style={styles.gentleModeBadge}>
                <Feather name="zap" size={13} color={Colors.primary} />
                <Text style={styles.gentleModeText}>Gentle mode — 5 minutes</Text>
              </View>
              <Text style={styles.adaptiveMsg}>Just start. You can stop after 5 minutes.</Text>
            </View>

            <View style={styles.taskCard}>
              <View style={styles.taskCardAccent} />
              <Text style={styles.taskTitle}>{data.task.title}</Text>
              <Text style={styles.taskDesc}>{miniDescription}</Text>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => handleAction("done")}
              disabled={recordAction.isPending}
              activeOpacity={0.8}
            >
              {recordAction.isPending ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Feather name="check-circle" size={20} color={Colors.white} />
                  <Text style={styles.doneBtnText}>Done — I showed up</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipAllBtn}
              onPress={() => handleAction("too_much")}
              disabled={recordAction.isPending}
              activeOpacity={0.7}
            >
              <Text style={styles.skipAllBtnText}>Still too much today</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Feedback view ── */}
        {viewMode === "feedback" && actionResponse && (
          <View style={styles.feedbackCard}>
            <View style={[styles.feedbackIcon, actionResponse.adapted && styles.feedbackIconAmber]}>
              <Feather
                name={actionResponse.adapted ? "zap" : "feather"}
                size={28}
                color={actionResponse.adapted ? Colors.amber : Colors.primary}
              />
            </View>
            <Text style={styles.feedbackMsg}>{actionResponse.message}</Text>
            {actionResponse.adapted && (
              <View style={styles.adaptedNotice}>
                <Text style={styles.adaptedNoticeText}>
                  Your upcoming tasks have been made gentler.
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={resetAndNext}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.muted,
    fontFamily: "Inter_400Regular",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  navCenter: {
    flex: 1,
    alignItems: "center",
  },
  navTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  section: {
    gap: 16,
    paddingTop: 8,
  },
  stateArea: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  adaptiveMsg: {
    fontSize: 22,
    fontWeight: "600",
    color: Colors.foreground,
    textAlign: "center",
    lineHeight: 30,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 8,
  },
  taskCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    gap: 12,
  },
  miniCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.amberLight,
    overflow: "hidden",
    gap: 12,
  },
  taskCardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primary,
    opacity: 0.5,
  },
  taskMeta: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 4,
  },
  dayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: Colors.primaryLight,
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontFamily: "Inter_700Bold",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: Colors.primaryMuted,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.primary,
    fontFamily: "Inter_500Medium",
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.foreground,
    lineHeight: 28,
    fontFamily: "Inter_700Bold",
  },
  taskDesc: {
    fontSize: 16,
    color: Colors.muted,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 100,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  doneBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  secondaryRow: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  secondaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  secondaryBtnText: {
    fontSize: 14,
    color: Colors.muted,
    fontFamily: "Inter_500Medium",
  },
  miniOfferHeader: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  sparkleWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.amberLight,
    alignItems: "center",
    justifyContent: "center",
  },
  miniOfferTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.foreground,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
  },
  miniOfferSubtitle: {
    fontSize: 16,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 8,
  },
  skipAllBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipAllBtnText: {
    fontSize: 14,
    color: Colors.mutedLight,
    fontFamily: "Inter_400Regular",
  },
  gentleModeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  gentleModeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  feedbackCard: {
    backgroundColor: Colors.card,
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    gap: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 2,
  },
  feedbackIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackIconAmber: {
    backgroundColor: Colors.amberLight,
  },
  feedbackMsg: {
    fontSize: 22,
    fontWeight: "600",
    color: Colors.foreground,
    textAlign: "center",
    lineHeight: 30,
    fontFamily: "Inter_600SemiBold",
  },
  adaptedNotice: {
    backgroundColor: Colors.amberLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  adaptedNoticeText: {
    fontSize: 13,
    color: Colors.amber,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
  },
  allDoneCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  sunWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  allDoneTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.foreground,
    fontFamily: "Inter_700Bold",
  },
  allDoneSubtitle: {
    fontSize: 15,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  calBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: 8,
  },
  calBtnText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
