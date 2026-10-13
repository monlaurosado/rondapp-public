import type { ReactNode } from "react";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { useReducedMotion } from "@/design/use-reduced-motion";

export function FloatingLayer({
  children,
  scrollY,
  distance = 28,
}: {
  children: ReactNode;
  scrollY: SharedValue<number>;
  distance?: number;
}) {
  const reducedMotion = useReducedMotion();
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: reducedMotion
          ? 0
          : interpolate(scrollY.value, [0, 300], [0, distance], "clamp"),
      },
    ],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
