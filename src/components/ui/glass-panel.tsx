import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, spacing } from "@/design/tokens";

export function GlassPanel({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.glass.surfaceSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glass.stroke,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
