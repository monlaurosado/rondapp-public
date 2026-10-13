import type { ReactNode } from "react";
import type { TextProps as RNTextProps } from "react-native";

import { AppText } from "@/components/ui/app-text";

type TextProps = RNTextProps & {
  children: ReactNode;
  variant?: "title" | "subtitle" | "body" | "caption" | "label";
  muted?: boolean;
};

export function Text({ children, variant = "body", muted, style, ...props }: TextProps) {
  const mappedVariant =
    variant === "title"
      ? "h1"
      : variant === "subtitle"
        ? "h3"
        : variant === "caption"
          ? "caption"
          : variant === "label"
            ? "button"
            : "body";

  return (
    <AppText variant={mappedVariant} muted={muted} style={style} {...props}>
      {children}
    </AppText>
  );
}
