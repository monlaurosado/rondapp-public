import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { BrandMark } from "@/components/ui/brand-mark";
import { motion } from "@/design/tokens";
import { useReducedMotion } from "@/design/use-reduced-motion";

export function AnimatedBrandMark({ size = 72, delay = 0 }: { size?: number; delay?: number }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0.82);

  useEffect(() => {
    progress.set(
      reducedMotion ? 1 : withDelay(delay, withSpring(1, motion.springs.soft)),
    );
  }, [delay, progress, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  return (
    <Animated.View style={style}>
      <BrandMark size={size} />
    </Animated.View>
  );
}
