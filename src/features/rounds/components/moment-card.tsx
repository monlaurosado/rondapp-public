import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { ReactionDock } from "@/components/rondas/reaction-dock";
import { StarButton } from "@/components/rondas/star-button";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { colors, radius, spacing } from "@/design/tokens";
import { DRINK_TYPES } from "@/constants/drinks";
import { type ReactionType } from "@/constants/reactions";
import { MomentActionsMenu } from "@/features/rounds/components/moment-actions-menu";
import { formatTimeLeft, isRoundExpired } from "@/lib/dates";
import type { MomentWithStats, Round } from "@/types/domain";

export function MomentCard({
  moment,
  round,
  userId,
  hasRoundStar,
  reactionLoading,
  starLoading,
  onReact,
  onStar,
  onReport,
  onBlock,
  onDelete,
}: {
  moment: MomentWithStats;
  round: Round;
  userId: string;
  hasRoundStar: boolean;
  reactionLoading?: boolean;
  starLoading?: boolean;
  onReact: (type: ReactionType) => void;
  onStar: () => void;
  onReport: () => void;
  onBlock: () => void;
  onDelete: () => void;
}) {
  const ownMoment = moment.user_id === userId;
  const closed = isRoundExpired(round);
  const authorName = moment.author?.display_name ?? moment.author?.username ?? "Alguien";
  const drinkLabel = DRINK_TYPES.find((drink) => drink.id === moment.drink_type)?.label;
  const starState = moment.myFoton ? "selected" : hasRoundStar ? "change" : "give";
  const starDisabledReason = closed
    ? "La ronda ya está cerrada"
    : ownMoment
      ? "No puedes dar una estrella a tu propia foto"
      : undefined;

  return (
    <View style={styles.card}>
      <View style={styles.photo}>
        {moment.signedUrl ? (
          <Image source={{ uri: moment.signedUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.imageFallback]}>
            <AppText muted>No se pudo cargar la foto</AppText>
          </View>
        )}
        <LinearGradient
          colors={[colors.overlay.clear, colors.overlay.photoStrong]}
          locations={[0.52, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.photoMeta}>
          <Avatar label={authorName} size={40} />
          <View style={styles.author}>
            <AppText variant="bodyStrong">{authorName}</AppText>
            <AppText variant="caption" secondary>
              {closed ? "Ronda cerrada" : `${formatTimeLeft(round.closes_at)} restantes`}
            </AppText>
          </View>
          <View style={styles.starCount}>
            <AppText variant="overline" style={styles.starText}>
              {moment.fotonCount} {moment.fotonCount === 1 ? "ESTRELLA" : "ESTRELLAS"}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {moment.caption ? <AppText variant="bodyStrong">{moment.caption}</AppText> : null}
        {drinkLabel ? (
          <AppText variant="caption" muted>En la foto: {drinkLabel}</AppText>
        ) : null}
        <ReactionDock
          counts={moment.reactionCounts}
          selected={moment.hasMyReaction}
          disabled={closed || reactionLoading || ownMoment}
          onReact={onReact}
        />
        <StarButton
          state={starState}
          disabled={closed || ownMoment}
          disabledReason={starDisabledReason}
          loading={starLoading}
          onPress={onStar}
        />
        {starDisabledReason ? (
          <AppText variant="caption" muted style={styles.starHint}>{starDisabledReason}</AppText>
        ) : null}
        <View style={styles.actionsRow}>
          <AppText variant="caption" muted>Opciones del momento</AppText>
          <MomentActionsMenu
            ownMoment={ownMoment}
            onReport={onReport}
            onBlock={onBlock}
            onDelete={onDelete}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  photo: {
    width: "100%",
    aspectRatio: 4 / 5,
    justifyContent: "flex-end",
    backgroundColor: colors.surface.card,
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  author: {
    flex: 1,
    gap: spacing.xs,
  },
  starCount: {
    minHeight: 32,
    borderRadius: radius.pill,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.tint.sparkSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.tint.sparkBorder,
  },
  starText: {
    color: colors.accent.spark,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  starHint: {
    textAlign: "center",
  },
  actionsRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
});
