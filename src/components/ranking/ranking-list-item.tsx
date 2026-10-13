import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { colors, radius, spacing } from "@/design/tokens";
import type { LeaderboardRow } from "@/types/domain";

export function RankingListItem({
  row,
  index,
  isCurrentUser = false,
}: {
  row: LeaderboardRow;
  index: number;
  isCurrentUser?: boolean;
}) {
  const momentLabel = row.moments_uploaded === 1 ? "momento" : "momentos";
  const starLabel = row.fotons_received === 1 ? "Estrella" : "Estrellas";
  return (
    <View
      accessibilityLabel={`${index + 1}.º puesto. ${row.display_name ?? row.username ?? "Usuario"}. ${row.score} puntos.`}
      style={[styles.item, isCurrentUser && styles.currentItem]}
    >
      <View style={styles.position}>
        <AppText variant="h3" style={styles.positionText}>{index + 1}</AppText>
      </View>
      <Avatar label={row.display_name ?? row.username ?? "?"} size={46} accent={index === 0} />
      <View style={styles.info}>
        <AppText variant="bodyStrong">
          {row.display_name ?? row.username ?? "Usuario"}{isCurrentUser ? " · Tú" : ""}
        </AppText>
        <AppText variant="caption" muted>
          {row.moments_uploaded} {momentLabel} · {row.fotons_received} {starLabel}
        </AppText>
      </View>
      <View style={styles.score}>
        <AppText variant="h3" style={styles.scoreText}>{row.score}</AppText>
        <AppText variant="overline" muted>PTS</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: 82,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  currentItem: {
    backgroundColor: colors.tint.sparkSubtle,
    borderColor: colors.tint.sparkBorder,
  },
  position: {
    width: 34,
    alignItems: "center",
  },
  positionText: {
    color: colors.text.muted,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  score: {
    minWidth: 44,
    alignItems: "flex-end",
  },
  scoreText: {
    color: colors.accent.spark,
    fontVariant: ["tabular-nums"],
  },
});
