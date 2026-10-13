import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { colors, radius } from "@/design/tokens";

export function LiquidOrb({ size = 72 }: { size?: number }) {
  return (
    <LinearGradient
      colors={[colors.glass.surfaceStrong, colors.tint.amberMedium, colors.tint.coolSubtle]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <View style={[styles.highlight, { width: size * 0.34, height: size * 0.34, borderRadius: radius.pill }]} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  orb: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glass.strokeWarm,
    overflow: "hidden",
  },
  highlight: {
    marginTop: 12,
    marginLeft: 14,
    backgroundColor: colors.glass.highlight,
  },
});
