import type { ReactNode } from "react";

import { GlassButton } from "@/components/ui/glass-button";

type ButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: string;
  compact?: boolean;
};

export function Button({
  children,
  onPress,
  disabled,
  loading,
  variant = "primary",
  icon,
  compact,
}: ButtonProps) {
  return (
    <GlassButton
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      variant={variant}
      icon={icon}
      compact={compact}
    >
      {children}
    </GlassButton>
  );
}
