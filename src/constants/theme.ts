import {
  colors as designColors,
  radius as designRadius,
  shadows,
  spacing,
} from "@/design/tokens";

export const colors = {
  background: designColors.background.base,
  surface: designColors.glass.surface,
  surfaceElevated: designColors.glass.surfaceStrong,
  surfaceMuted: designColors.tint.whiteSoft,
  border: designColors.glass.stroke,
  borderStrong: designColors.glass.strokeWarm,
  text: designColors.text.primary,
  textMuted: designColors.text.muted,
  textSubtle: designColors.text.subtle,
  accent: designColors.accent.primary,
  accentStrong: designColors.accent.secondary,
  mint: designColors.accent.spark,
  blue: designColors.accent.ice,
  danger: designColors.state.error,
  warning: designColors.state.warning,
  success: designColors.state.success,
  black: designColors.primitive.black,
  white: designColors.primitive.white,
};

export { spacing };

export const radius = {
  sm: designRadius.xs,
  md: designRadius.md,
  lg: designRadius.lg,
  pill: designRadius.pill,
};

export const shadow = {
  card: shadows.glass,
};
