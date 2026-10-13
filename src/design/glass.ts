import { colors } from "@/design/colors";
import { radius } from "@/design/radius";
import { shadows } from "@/design/shadows";

export const glass = {
  card: {
    backgroundColor: colors.surface.card,
    borderColor: colors.border.glass,
    borderRadius: radius.lg,
    ...shadows.glass,
  },
  strong: {
    backgroundColor: colors.surface.glassStrong,
    borderColor: colors.border.active,
    borderRadius: radius.lg,
    ...shadows.glowAmber,
  },
  subtle: {
    backgroundColor: colors.surface.glassSubtle,
    borderColor: colors.border.glass,
    borderRadius: radius.md,
  },
  danger: {
    backgroundColor: "rgba(255, 77, 94, 0.12)",
    borderColor: "rgba(255, 77, 94, 0.36)",
    borderRadius: radius.md,
  },
} as const;

export const blur = {
  lite: 18,
  strong: 32,
} as const;
