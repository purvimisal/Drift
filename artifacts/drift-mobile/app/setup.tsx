import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCreateGoal, useGenerateTasks } from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const DURATIONS = [7, 14, 30, 60, 90];

export default function SetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [duration, setDuration] = useState(30);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGoal = useCreateGoal();
  const generateTasks = useGenerateTasks();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleStart = async () => {
    if (!title.trim()) {
      setError("Please enter your goal.");
      return;
    }
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setThinking(true);
    try {
      const goal = await createGoal.mutateAsync({
        data: {
          title: title.trim(),
          context: context.trim() || undefined,
          durationDays: duration,
        },
      });
      await generateTasks.mutateAsync({ id: goal.id });
      router.replace(`/goal/${goal.id}`);
    } catch (e) {
      setThinking(false);
      setError("Something went wrong. Please try again.");
    }
  };

  if (thinking) {
    return (
      <View style={[styles.thinkingScreen, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={styles.thinkingContent}>
          <View style={styles.spinnerWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <View style={styles.spinnerGlow} />
          </View>
          <Text style={styles.thinkingTitle}>Thinking about your goal…</Text>
          <Text style={styles.thinkingSubtitle}>
            Crafting a path that feels doable, not demanding.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={Colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>What would you{"\n"}like to focus on?</Text>
        <Text style={styles.subheading}>No pressure. Just a gentle intention.</Text>

        {/* Goal input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Your goal</Text>
          <TextInput
            style={[styles.input, styles.inputSingle]}
            placeholder="e.g., Run 5k, read daily, learn guitar…"
            placeholderTextColor={Colors.mutedLight}
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
            autoFocus
          />
        </View>

        {/* Context input */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Where are you starting from?</Text>
            <Text style={styles.optional}>optional</Text>
          </View>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="e.g., I can already run 5k in 45 mins, I practice 3x a week…"
            placeholderTextColor={Colors.mutedLight}
            value={context}
            onChangeText={setContext}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>Helps us start from your actual level, not from scratch.</Text>
        </View>

        {/* Duration */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>For how long?</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.durationChip, d === duration && styles.durationChipActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDuration(d);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.durationText, d === duration && styles.durationTextActive]}
                >
                  {d}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.startBtn, !title.trim() && styles.startBtnDisabled]}
          onPress={handleStart}
          activeOpacity={0.8}
          disabled={!title.trim() || createGoal.isPending}
        >
          <Text style={styles.startBtnText}>Begin gently</Text>
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
  nav: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
    paddingTop: 8,
  },
  heading: {
    fontSize: 30,
    fontWeight: "700",
    color: Colors.foreground,
    letterSpacing: -0.5,
    lineHeight: 38,
    fontFamily: "Inter_700Bold",
  },
  subheading: {
    fontSize: 15,
    color: Colors.muted,
    marginTop: -12,
    fontFamily: "Inter_400Regular",
  },
  fieldGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.foreground,
    fontFamily: "Inter_600SemiBold",
  },
  optional: {
    fontSize: 12,
    color: Colors.muted,
    fontFamily: "Inter_400Regular",
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
    fontFamily: "Inter_400Regular",
  },
  inputSingle: {
    paddingVertical: 14,
  },
  inputMulti: {
    paddingVertical: 14,
    minHeight: 88,
  },
  hint: {
    fontSize: 12,
    color: Colors.muted,
    fontFamily: "Inter_400Regular",
  },
  durationRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  durationChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: "transparent",
  },
  durationChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  durationText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.primary,
    fontFamily: "Inter_500Medium",
  },
  durationTextActive: {
    color: Colors.white,
  },
  error: {
    fontSize: 13,
    color: Colors.stateAtRisk,
    fontFamily: "Inter_400Regular",
  },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  startBtnDisabled: {
    opacity: 0.4,
  },
  startBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  thinkingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  thinkingContent: {
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 40,
  },
  spinnerWrap: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerGlow: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    opacity: 0.1,
  },
  thinkingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.foreground,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
  },
  thinkingSubtitle: {
    fontSize: 15,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
});
