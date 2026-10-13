import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

import { colors } from "@/design/tokens";

export function AmbientGlow({
  tone = "amber",
  style,
}: {
  tone?: "amber" | "coral" | "lime" | "ice";
  style?: object;
}) {
  const color = tone === "amber"
    ? colors.glow.primary
    : tone === "coral"
      ? colors.glow.secondary
      : tone === "lime"
        ? colors.tint.sparkSubtle
        : colors.tint.coolSoft;

  return (
    <LinearGradient
      colors={[colors.overlay.clear, color, colors.overlay.clear]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[styles.glow, style, { pointerEvents: "none" }]}
    />
  );
}

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    left: "-18%",
    width: "136%",
    height: 220,
    opacity: 0.86,
    transform: [{ rotate: "-12deg" }],
  },
});
