import type { ReactNode } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { GlassCard } from "@/components/ui/glass-card";
import { useReducedMotion } from "@/design/use-reduced-motion";

export function ParallaxCard({
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
    transform: [
      {
        translateY: reducedMotion
          ? 0
          : interpolate(scrollY.value, [0, 280], [0, 20], "clamp"),
      },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <GlassCard variant="strong" style={style} animated={false}>
        {children}
      </GlassCard>
    </Animated.View>
  );
}
