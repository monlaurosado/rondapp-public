import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { GlassCard } from "@/components/ui/glass-card";
import { Icon } from "@/components/ui/icon";
import { RoundStatusPill } from "@/components/rondas/round-status-pill";
import { colors, radius, spacing } from "@/design/tokens";
import { formatTimeLeft, isRoundExpired } from "@/lib/dates";
import type { RoundWithRelations } from "@/types/domain";

export function RondaNovaRoundCard({
  round,
  onPress,
  index,
}: {
  round: RoundWithRelations;
  onPress: () => void;
  index?: number;
}) {
  const expired = isRoundExpired(round);
  const creator = round.creator?.display_name ?? round.creator?.username ?? "Alguien";

  return (
    <GlassCard
      variant="default"
      onPress={onPress}
      index={index}
      contentStyle={styles.content}
    >
      <View style={styles.hero}>
        {round.preview_url ? (
          <Image source={{ uri: round.preview_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={[colors.tint.amberMedium, colors.tint.coralSubtle, colors.surface.card]}
            style={[StyleSheet.absoluteFill, styles.placeholder]}
          >
            <Icon name="camera.aperture" size={42} color={colors.accent.primary} />
          </LinearGradient>
        )}
        <LinearGradient
          colors={[colors.overlay.photoSoft, colors.overlay.photoStrong]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.status}>
          <RoundStatusPill closed={expired} label={expired ? "Cerrada" : formatTimeLeft(round.closes_at)} />
        </View>
        <View style={styles.heroCopy}>
          <AppText variant="h2">{round.group?.name ?? "Ronda"}</AppText>
          <AppText variant="caption" secondary>{round.moment_count ?? 0} momentos</AppText>
        </View>
      </View>
      <View style={styles.row}>
        <Avatar label={creator} size={38} accent />
        <View style={styles.meta}>
          <AppText variant="bodyStrong">{creator} encendió la ronda</AppText>
          <AppText variant="caption" muted>Toca para entrar y responder</AppText>
        </View>
        <Icon name="arrow.right" size={20} color={colors.text.muted} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 0,
    gap: 0,
  },
  hero: {
    height: 208,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: colors.surface.card,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  status: {
    alignSelf: "flex-end",
  },
  heroCopy: {
    gap: spacing.xs,
  },
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  meta: {
    flex: 1,
    gap: spacing.xs,
  },
});
