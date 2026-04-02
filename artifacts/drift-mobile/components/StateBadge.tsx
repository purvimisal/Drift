import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";

type GoalState = "ON_TRACK" | "DRIFTING" | "DISENGAGING" | "AT_RISK" | "RETURNING";

const STATE_CONFIG: Record<GoalState, { label: string; color: string; bg: string }> = {
  ON_TRACK: { label: "On track", color: Colors.primary, bg: Colors.primaryMuted },
  DRIFTING: { label: "Drifting", color: Colors.stateDrifting, bg: Colors.stateDriftingBg },
  DISENGAGING: { label: "Losing pace", color: Colors.stateDisengaging, bg: Colors.stateDisengagingBg },
  AT_RISK: { label: "Let's reconnect", color: Colors.stateAtRisk, bg: Colors.stateAtRiskBg },
  RETURNING: { label: "Coming back", color: Colors.stateReturning, bg: Colors.stateReturningBg },
};

export function StateBadge({ state }: { state: string }) {
  const config = STATE_CONFIG[state as GoalState] ?? {
    label: state,
    color: Colors.muted,
    bg: Colors.primaryMuted,
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    alignSelf: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
