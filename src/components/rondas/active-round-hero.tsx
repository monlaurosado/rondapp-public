import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { RoundStatusPill } from "@/components/rondas/round-status-pill";
import { colors, radius, shadows, spacing } from "@/design/tokens";
import { formatTimeLeft } from "@/lib/dates";
import type { RoundWithRelations } from "@/types/domain";

export function ActiveRoundHero({ round, onPress }: { round: RoundWithRelations; onPress: () => void }) {
  const creator = round.creator?.display_name ?? round.creator?.username ?? "Alguien";

  return (
    <AnimatedPressable onPress={onPress} style={styles.hero}>
      {round.preview_url ? (
        <Image
          source={{ uri: round.preview_url }}
          contentFit="cover"
          contentPosition={{ top: "25%", left: "50%" }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Image
          source={require("../../../assets/social/ronda-nova-hero.jpg")}
          contentFit="cover"
          contentPosition={{ top: "25%", left: "50%" }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={[colors.overlay.photoSoft, colors.overlay.photoQuarter, colors.overlay.photoStrong]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.top}>
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <AppText variant="overline" style={styles.liveText}>RONDA ACTIVA</AppText>
        </View>
        <RoundStatusPill label={formatTimeLeft(round.closes_at)} />
      </View>
      <View style={styles.bottom}>
        <AppText variant="h1">{round.group?.name ?? "Tu ronda"}</AppText>
        <View style={styles.creator}>
          <Avatar label={creator} size={34} />
          <AppText variant="caption" secondary>{creator} la encendió</AppText>
        </View>
        <View style={styles.cta}>
          <Icon name="camera.fill" size={20} color={colors.text.inverse} />
          <AppText variant="button" style={styles.ctaText}>Entrar y responder</AppText>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 340,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.active,
    padding: spacing.lg,
    justifyContent: "space-between",
    ...shadows.glass,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  live: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.spark,
  },
  liveText: {
    color: colors.text.primary,
  },
  bottom: {
    gap: spacing.md,
  },
  creator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cta: {
    minHeight: 52,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
  },
  ctaText: {
    color: colors.text.inverse,
  },
});
