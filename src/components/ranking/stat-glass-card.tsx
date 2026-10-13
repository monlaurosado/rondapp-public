import { GlassCard } from "@/components/ui/glass-card";
import { AppText } from "@/components/ui/app-text";

export function StatGlassCard({ label, value }: { label: string; value: string | number }) {
  return (
    <GlassCard variant="subtle" animated={false}>
      <AppText variant="stat">{value}</AppText>
      <AppText variant="caption" muted>{label}</AppText>
    </GlassCard>
  );
}
