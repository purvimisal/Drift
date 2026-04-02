import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

type Variant = "primary" | "secondary" | "ghost";

interface Props {
  onPress: () => void;
  children: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function ActionButton({
  onPress,
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: Props) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? Colors.white : Colors.primary}
          size="small"
        />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.label, styles[`${variant}Label` as keyof typeof styles] as TextStyle, textStyle]}>
            {children}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.primaryLight,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabled: {
    opacity: 0.4,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    opacity: 0.85,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryLabel: {
    color: Colors.white,
  },
  secondaryLabel: {
    color: Colors.primary,
  },
  ghostLabel: {
    color: Colors.muted,
  },
});
