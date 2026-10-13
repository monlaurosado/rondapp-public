import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { colors, gradients, radius, shadows, spacing } from "@/design/tokens";

type GlassButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: string;
  compact?: boolean;
};

export function GlassButton({
  children,
  onPress,
  disabled,
  loading,
  variant = "secondary",
  icon,
  compact = false,
}: GlassButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <AnimatedPressable
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.base, compact && styles.compact, styles[variant]]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={gradients.action as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.inner}>
        {loading ? <ActivityIndicator color={isPrimary ? colors.text.inverse : colors.text.primary} /> : null}
        {!loading && icon ? (
          <Icon
            name={icon}
            size={19}
            color={isPrimary ? colors.text.inverse : colors.text.primary}
          />
        ) : null}
        <AppText variant="button" style={isPrimary ? styles.primaryText : styles.defaultText}>
          {children}
        </AppText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
  },
  compact: {
    minHeight: 44,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  primary: {
    borderColor: colors.glass.strokeWarm,
    ...shadows.glowAmber,
  },
  secondary: {
    backgroundColor: colors.glass.surfaceStrong,
    borderColor: colors.glass.stroke,
  },
  danger: {
    backgroundColor: colors.tint.dangerMedium,
    borderColor: colors.tint.dangerBorder,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  primaryText: {
    color: colors.text.inverse,
    textAlign: "center",
  },
  defaultText: {
    color: colors.text.primary,
    textAlign: "center",
  },
});
