import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { motion } from "@/design/tokens";
import { useReducedMotion } from "@/design/use-reduced-motion";

type AnimatedPressableProps = PressableProps & {
  children: ReactNode | ((state: { pressed: boolean }) => ReactNode);
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  haptic = true,
  onPressIn,
  style,
  disabled,
  accessibilityRole = "button",
  ...props
}: AnimatedPressableProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableBase
      {...props}
      accessibilityRole={accessibilityRole}
      disabled={disabled}
      onPressIn={(event) => {
        scale.set(
          reducedMotion ? 1 : withSpring(motion.pressScale, motion.springs.press),
        );
        if (!disabled && haptic && Platform.OS !== "web") {
          Haptics.selectionAsync();
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(reducedMotion ? 1 : withSpring(1, motion.springs.press));
        props.onPressOut?.(event);
      }}
      style={[style, animatedStyle, disabled ? styles.disabled : null]}
    >
      {(state) => (typeof children === "function" ? children(state) : children)}
    </AnimatedPressableBase>
  );
}

const styles = {
  disabled: { opacity: 0.45 },
} satisfies Record<string, ViewStyle>;
