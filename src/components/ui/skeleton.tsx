import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors, motion, radius } from "@/design/tokens";
import { useReducedMotion } from "@/design/use-reduced-motion";

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0.42);

  useEffect(() => {
    if (reducedMotion) {
      pulse.set(0.58);
      return;
    }
    pulse.set(
      withRepeat(withTiming(0.86, { duration: motion.heroMs }), -1, true),
    );
  }, [pulse, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={[styles.clip, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.fill, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    minHeight: 12,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.surface.card,
  },
  fill: {
    backgroundColor: colors.surface.glassStrong,
  },
});
