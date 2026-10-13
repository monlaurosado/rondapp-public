import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { colors, gradients } from "@/design/tokens";
import { useReducedMotion } from "@/design/use-reduced-motion";

export type BackgroundVariant =
  | "default"
  | "auth"
  | "home"
  | "group"
  | "launch"
  | "round"
  | "ranking"
  | "profile"
  | "modal";

const variantGradients: Record<BackgroundVariant, readonly [string, string, string]> = {
  default: gradients.app,
  auth: gradients.auth,
  home: gradients.home,
  group: gradients.group,
  launch: gradients.launch,
  round: gradients.round,
  ranking: gradients.ranking,
  profile: gradients.profile,
  modal: gradients.modal,
};

const variantAccent: Record<BackgroundVariant, string> = {
  default: "rgba(188, 235, 255, 0.08)",
  auth: "rgba(255, 94, 58, 0.13)",
  home: "rgba(255, 184, 77, 0.13)",
  group: "rgba(188, 235, 255, 0.12)",
  launch: "rgba(255, 94, 58, 0.16)",
  round: "rgba(255, 77, 114, 0.12)",
  ranking: "rgba(200, 255, 102, 0.10)",
  profile: "rgba(188, 235, 255, 0.10)",
  modal: "rgba(255, 184, 77, 0.09)",
};

export function RondaNovaBackground({
  children,
  variant = "default",
  animated = true,
  parallaxY,
}: {
  children: React.ReactNode;
  variant?: BackgroundVariant;
  animated?: boolean;
  parallaxY?: SharedValue<number>;
}) {
  const reducedMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (!animated || reducedMotion) {
      drift.set(0);
      return;
    }

    drift.set(withRepeat(withTiming(1, { duration: 9000 }), -1, true));
  }, [animated, drift, reducedMotion]);

  const atmosphereStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.78 : interpolate(drift.value, [0, 1], [0.62, 0.9]),
    transform: [
      {
        translateY: reducedMotion
          ? 0
          : interpolate(drift.value, [0, 1], [-10, 14]) +
            (parallaxY ? interpolate(parallaxY.value, [0, 280], [0, 44], "clamp") : 0),
      },
    ],
  }));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={variantGradients[variant] as [string, string, string]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[StyleSheet.absoluteFill, atmosphereStyle, { pointerEvents: "none" }]}
      >
        <LinearGradient
          colors={[variantAccent[variant], colors.overlay.clear, colors.glow.secondary]}
          locations={[0, 0.48, 1]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <LinearGradient
        colors={[colors.overlay.clear, colors.overlay.photoMedium, colors.overlay.photoDeep]}
        locations={[0, 0.62, 1]}
        style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
    overflow: "hidden",
  },
});
