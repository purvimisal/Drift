import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetGoals } from "@workspace/api-client-react";
import { GoalCard } from "@/components/GoalCard";
import Colors from "@/constants/colors";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: goals, isLoading, refetch } = useGetGoals();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const hasGoals = goals && goals.length > 0;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!hasGoals && !isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={styles.emptyCenter}>
          <View style={styles.leafWrap}>
            <Feather name="feather" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.appTitle}>Drift</Text>
          <Text style={styles.tagline}>
            A gentle place to return{"\n"}to your goals.
          </Text>
          <Text style={styles.sub}>No streaks, no guilt. Just soft nudges.</Text>
        </View>

        <View style={styles.emptyFooter}>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.push("/setup")}
            activeOpacity={0.8}
          >
            <Text style={styles.startBtnText}>Start gently</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetRow}>
          <View style={styles.leafSmall}>
            <Feather name="feather" size={14} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.todayLabel}>{getTodayLabel()}</Text>
          </View>
        </View>

        {/* Section label */}
        <Text style={styles.sectionLabel}>YOUR INTENTIONS</Text>

        {/* Goal cards */}
        {isLoading
          ? [0, 1].map((i) => <View key={i} style={styles.skeleton} />)
          : goals?.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onPress={() => router.push(`/goal/${goal.id}`)}
                onCalendarPress={() => router.push(`/goal/${goal.id}/calendar`)}
              />
            ))}

        {/* Add intention */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/setup")}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={16} color={Colors.muted} />
          <Text style={styles.addBtnText}>Set a new intention</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  greetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 24,
    paddingBottom: 4,
  },
  leafSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.foreground,
    fontFamily: "Inter_700Bold",
  },
  todayLabel: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 1,
    fontFamily: "Inter_400Regular",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: Colors.mutedLight,
    paddingTop: 8,
    fontFamily: "Inter_600SemiBold",
  },
  skeleton: {
    height: 140,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    opacity: 0.4,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    marginTop: 4,
  },
  addBtnText: {
    fontSize: 14,
    color: Colors.muted,
    fontFamily: "Inter_500Medium",
  },
  emptyCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  leafWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: "700",
    color: Colors.foreground,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 17,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
  },
  sub: {
    fontSize: 14,
    color: Colors.mutedLight,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  emptyFooter: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: "center",
  },
  startBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
