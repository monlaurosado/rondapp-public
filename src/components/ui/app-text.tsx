import type { ReactNode } from "react";
import {
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
} from "react-native";

import { colors, typography } from "@/design/tokens";

type AppTextProps = RNTextProps & {
  children: ReactNode;
  variant?: "display" | "h1" | "h2" | "h3" | "body" | "bodySmall" | "bodyStrong" | "caption" | "button" | "stat" | "overline";
  muted?: boolean;
  secondary?: boolean;
};

export function AppText({
  children,
  variant = "body",
  muted,
  secondary,
  style,
  ...props
}: AppTextProps) {
  return (
    <RNText
      selectable={variant !== "button"}
      style={[
        styles.base,
        typography[variant],
        secondary && styles.secondary,
        muted && styles.muted,
        variant === "stat" && styles.stat,
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text.primary,
    letterSpacing: 0,
  },
  secondary: {
    color: colors.text.secondary,
  },
  muted: {
    color: colors.text.muted,
  },
  stat: {
    fontVariant: ["tabular-nums"],
  },
});
