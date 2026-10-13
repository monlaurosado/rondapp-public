import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { parallax } from "@/design/tokens";
import { useReducedMotion } from "@/design/use-reduced-motion";

export function ParallaxHeader({
  children,
  scrollY,
  style,
}: {
  children: ReactNode;
  scrollY: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : interpolate(scrollY.value, [0, 220], [1, 0.72], "clamp"),
    transform: [
      {
        translateY: reducedMotion
          ? 0
          : interpolate(scrollY.value, [-120, 0, 260], [-24, 0, 54], "clamp"),
      },
    ],
  }));

  return <Animated.View style={[styles.header, style, animatedStyle]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  header: {
    minHeight: parallax.heroHeight,
  },
});
