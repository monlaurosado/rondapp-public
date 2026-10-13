import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { blur, colors, glass, motion, spacing } from "@/design/tokens";
import { useReducedMotion } from "@/design/use-reduced-motion";

type GlassCardProps = {
  children: ReactNode;
  variant?: "default" | "strong" | "subtle" | "danger" | "highlight";
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  animated?: boolean;
  index?: number;
};

export function GlassCard({
  children,
  variant = "default",
  style,
  contentStyle,
  onPress,
  animated = true,
  index = 0,
}: GlassCardProps) {
  const reducedMotion = useReducedMotion();
  const variantStyle = variant === "strong" || variant === "highlight"
    ? glass.strong
    : variant === "subtle"
      ? glass.subtle
      : variant === "danger"
        ? glass.danger
        : glass.card;

  const body = (
    <View style={[styles.clip, variantStyle, style]}>
      <BlurView
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={variant === "strong" || variant === "highlight" ? blur.strong : blur.lite}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.highlight, { pointerEvents: "none" }]} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  const wrapped = onPress ? (
    <AnimatedPressable onPress={onPress} style={styles.pressable}>
      {body}
    </AnimatedPressable>
  ) : (
    body
  );

  if (!animated || reducedMotion) {
    return wrapped;
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(index * motion.cardStaggerMs).duration(motion.standardMs).springify()}
      layout={Platform.OS === "web" ? undefined : LinearTransition.duration(motion.standardMs)}
    >
      {wrapped}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: glass.card.borderRadius,
  },
  clip: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  highlight: {
    position: "absolute",
    top: 0,
    left: spacing.md,
    right: spacing.md,
    height: 1,
    backgroundColor: colors.glass.highlight,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
