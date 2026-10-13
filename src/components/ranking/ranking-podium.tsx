import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { colors, radius, spacing } from "@/design/tokens";
import type { LeaderboardRow } from "@/types/domain";

export function RankingPodium({ rows }: { rows: LeaderboardRow[] }) {
  const top = rows.slice(0, 3);
  if (!top.length) return null;

  const ordered = [top[1], top[0], top[2]].filter((row): row is LeaderboardRow => Boolean(row));

  return (
    <View style={styles.wrap}>
      <View style={styles.heading}>
        <View style={styles.trophy}>
          <Icon name="trophy" size={24} color={colors.text.inverse} />
        </View>
        <View style={styles.headingCopy}>
          <AppText variant="overline" style={styles.eyebrow}>PODIO SEMANAL</AppText>
          <AppText variant="h2">Las primeras posiciones</AppText>
        </View>
      </View>
      <View style={styles.podium}>
        {ordered.map((row) => {
          const rank = top.findIndex((item) => item.user_id === row.user_id) + 1;
          const first = rank === 1;
          return (
            <View key={row.user_id} style={[styles.slot, first && styles.firstSlot]}>
              <View style={styles.avatarWrap}>
                {first ? <View style={styles.crown}><Icon name="trophy" size={16} color={colors.text.inverse} /></View> : null}
                <Avatar label={row.display_name ?? row.username ?? "?"} size={first ? 72 : 56} accent={first} />
              </View>
              <View style={[styles.step, first && styles.firstStep]}>
                <AppText variant="stat" style={styles.rank}>{rank}</AppText>
                <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>{row.display_name ?? row.username ?? "Usuario"}</AppText>
                <AppText variant="caption" style={first ? styles.firstScore : styles.score}>{row.score} pts</AppText>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xl,
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.active,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  trophy: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.primary,
  },
  headingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accent.primary,
  },
  podium: {
    minHeight: 230,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: spacing.sm,
  },
  slot: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
  },
  firstSlot: {
    transform: [{ translateY: -12 }],
  },
  avatarWrap: {
    alignItems: "center",
  },
  crown: {
    position: "absolute",
    zIndex: 2,
    top: -12,
    right: -7,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.primary,
  },
  step: {
    width: "100%",
    minHeight: 108,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
    backgroundColor: colors.surface.glassStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  firstStep: {
    minHeight: 146,
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  rank: {
    color: colors.text.primary,
  },
  name: {
    textAlign: "center",
    width: "100%",
  },
  score: {
    color: colors.accent.spark,
  },
  firstScore: {
    color: colors.text.inverse,
    fontWeight: "800",
  },
});
