import type { ReactNode } from "react";

import { GlassCard } from "@/components/ui/glass-card";

type CardProps = {
  children: ReactNode;
  tone?: "default" | "elevated" | "accent";
};

export function Card({ children, tone = "default" }: CardProps) {
  const variant = tone === "accent" ? "strong" : tone === "elevated" ? "default" : "subtle";
  return <GlassCard variant={variant}>{children}</GlassCard>;
}
