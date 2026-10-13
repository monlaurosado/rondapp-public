import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import { AppText } from "@/components/ui/app-text";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <GlassCard variant="danger">
      <AppText variant="h2">Algo no ha salido.</AppText>
      <AppText muted>{message}</AppText>
      {onRetry ? <GlassButton variant="secondary" onPress={onRetry}>Reintentar</GlassButton> : null}
    </GlassCard>
  );
}
