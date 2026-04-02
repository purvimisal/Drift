import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type GoalState = "ON_TRACK" | "DRIFTING" | "DISENGAGING" | "AT_RISK" | "RETURNING";

const STATE_LABELS: Record<GoalState, { label: string; color: string }> = {
  ON_TRACK: { label: "On track", color: Colors.primary },
  DRIFTING: { label: "Drifting", color: Colors.stateDrifting },
  DISENGAGING: { label: "Losing pace", color: Colors.stateDisengaging },
  AT_RISK: { label: "Let's reconnect", color: Colors.stateAtRisk },
  RETURNING: { label: "Coming back", color: Colors.stateReturning },
};

interface GoalCardProps {
  goal: {
    id: number;
    title: string;
    state: string;
    durationDays: number;
    createdAt: string;
  };
  onPress: () => void;
  onCalendarPress: () => void;
}

function getDayNumber(goal: { createdAt: string; durationDays: number }): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const day = Math.floor((Date.now() - new Date(goal.createdAt).getTime()) / msPerDay) + 1;
  return Math.min(Math.max(day, 1), goal.durationDays);
}

export function GoalCard({ goal, onPress, onCalendarPress }: GoalCardProps) {
  const currentDay = getDayNumber(goal);
  const progress = currentDay / goal.durationDays;
  const stateInfo = STATE_LABELS[goal.state as GoalState] ?? { label: goal.state, color: Colors.muted };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.mainArea}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>{goal.title}</Text>
          <Feather name="chevron-right" size={18} color={Colors.mutedLight} />
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` as any }]} />
        </View>

        <View style={styles.footer}>
          <View style={styles.stateRow}>
            <View style={[styles.stateDot, { backgroundColor: stateInfo.color }]} />
            <Text style={[styles.stateLabel, { color: stateInfo.color }]}>{stateInfo.label}</Text>
          </View>
          <Text style={styles.dayCount}>Day {currentDay} of {goal.durationDays}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity onPress={onCalendarPress} activeOpacity={0.7} style={styles.calendarRow}>
        <Feather name="calendar" size={13} color={Colors.mutedLight} />
        <Text style={styles.calendarLabel}>View calendar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mainArea: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.foreground,
    lineHeight: 22,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
    opacity: 0.7,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stateLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  dayCount: {
    fontSize: 12,
    color: Colors.mutedLight,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  calendarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  calendarLabel: {
    fontSize: 12,
    color: Colors.mutedLight,
    fontWeight: "500",
  },
});
