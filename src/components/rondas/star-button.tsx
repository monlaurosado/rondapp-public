import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { colors, gradients, motion, radius, shadows, spacing } from "@/design/tokens";
import { useReducedMotion } from "@/design/use-reduced-motion";

export type StarButtonState = "give" | "selected" | "change";

const labels: Record<StarButtonState, string> = {
  give: "Dar mi estrella",
  selected: "Tu estrella",
  change: "Cambiar mi estrella",
};

export function StarButton({
  state,
  disabled = false,
  disabledReason,
  loading = false,
  onPress,
}: {
  state: StarButtonState;
  disabled?: boolean;
  disabledReason?: string;
  loading?: boolean;
  onPress?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const shine = useSharedValue(0);
  const label = labels[state];
  const isDisabled = disabled || loading;

  useEffect(() => {
    if (state !== "selected" || reducedMotion) return;
    shine.set(0);
    shine.set(withTiming(1, { duration: motion.emphasisMs }));
  }, [reducedMotion, shine, state]);

  const shineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shine.value, [0, 0.25, 1], [0, 0.7, 0]),
    transform: [
      { translateX: interpolate(shine.value, [0, 1], [-160, 340]) },
      { rotate: "18deg" },
    ],
  }));

  return (
    <AnimatedPressable
      accessibilityHint={disabledReason}
      accessibilityLabel={label}
      accessibilityState={{
        disabled: isDisabled,
        selected: state === "selected",
        busy: loading,
      }}
      disabled={isDisabled}
      haptic={false}
      onPress={() => {
        if (isDisabled) return;
        if (process.env.EXPO_OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        }
        if (!reducedMotion) {
          shine.set(0);
          shine.set(withTiming(1, { duration: motion.emphasisMs }));
        }
        onPress?.();
      }}
      style={[
        styles.button,
        state === "selected" && styles.selected,
        isDisabled && styles.disabled,
      ]}
    >
      <LinearGradient
        colors={
          isDisabled
            ? [colors.tint.whiteSoft, colors.tint.whiteSubtle]
            : state === "selected"
              ? (gradients.foton as [string, string])
              : (gradients.action as [string, string])
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.shine, shineStyle, { pointerEvents: "none" }]} />
      <View style={styles.inner}>
        <Icon
          name="star.fill"
          size={19}
          color={isDisabled ? colors.text.muted : colors.text.inverse}
        />
        <AppText variant="button" style={isDisabled ? styles.disabledText : styles.text}>
          {label}
        </AppText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.active,
    ...shadows.glowAmber,
  },
  selected: {
    borderColor: colors.tint.sparkBorderStrong,
  },
  disabled: {
    borderColor: colors.border.glass,
    boxShadow: "none",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  text: {
    color: colors.text.inverse,
  },
  disabledText: {
    color: colors.text.muted,
  },
  shine: {
    position: "absolute",
    top: -32,
    bottom: -32,
    width: 34,
    backgroundColor: colors.tint.whiteShine,
  },
});
