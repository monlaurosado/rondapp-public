import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radius, spacing } from "@/design/tokens";

export function Chip({
  children,
  active,
  tone = "default",
}: {
  children: ReactNode;
  active?: boolean;
  tone?: "default" | "warm" | "spark" | "ice" | "danger";
}) {
  return (
    <View style={[styles.chip, active && styles.active, styles[tone]]}>
      <AppText variant="caption" style={active ? styles.activeText : null}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 32,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.surface,
    borderColor: colors.glass.stroke,
  },
  default: {},
  warm: {
    borderColor: colors.glass.strokeWarm,
  },
  spark: {
    borderColor: colors.tint.sparkBorderSoft,
  },
  ice: {
    borderColor: colors.tint.coolBorderSoft,
  },
  danger: {
    borderColor: colors.tint.dangerBorderSoft,
  },
  active: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  activeText: {
    color: colors.text.inverse,
  },
});
