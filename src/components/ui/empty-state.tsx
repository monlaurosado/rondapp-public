import { BrandMark } from "@/components/ui/brand-mark";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import { AppText } from "@/components/ui/app-text";

export function EmptyState({
  title,
  body,
  action,
  onPress,
}: {
  title: string;
  body: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <GlassCard variant="subtle">
      <BrandMark size={48} />
      <AppText variant="h3">{title}</AppText>
      <AppText muted>{body}</AppText>
      {action && onPress ? <GlassButton variant="primary" onPress={onPress}>{action}</GlassButton> : null}
    </GlassCard>
  );
}
