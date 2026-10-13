import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import type { BackgroundVariant } from "@/components/brand/ronda-nova-background";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  variant?: BackgroundVariant;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboard?: boolean;
  bottomInset?: number;
};

export function Screen({ children, scroll = true, variant = "default", ...props }: ScreenProps) {
  return (
    <AppScreen scroll={scroll} variant={variant} {...props}>
      {children}
    </AppScreen>
  );
}
