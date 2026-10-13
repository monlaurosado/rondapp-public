import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radius, spacing } from "@/design/tokens";

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "success" | "muted";
}) {
  return (
    <View style={[styles.badge, styles[tone]]}>
      <AppText variant="caption" style={tone === "accent" || tone === "success" ? styles.darkText : null}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 30,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  default: {
    backgroundColor: colors.glass.surfaceStrong,
    borderColor: colors.glass.stroke,
  },
  accent: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  success: {
    backgroundColor: colors.accent.spark,
    borderColor: colors.accent.spark,
  },
  muted: {
    backgroundColor: colors.glass.surface,
    borderColor: colors.glass.stroke,
  },
  darkText: {
    color: colors.text.inverse,
    fontWeight: "800",
  },
});
