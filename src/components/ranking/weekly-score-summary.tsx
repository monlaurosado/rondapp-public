import { StyleSheet, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { colors, radius, spacing } from "@/design/tokens";
import type { LeaderboardRow } from "@/types/domain";

export function formatWeeklyPosition(position: number) {
  return `${position}.º esta semana`;
}

export function WeeklyScoreSummary({
  groupName,
  periodLabel,
  position,
  row,
  onPress,
}: {
  groupName: string;
  periodLabel: string;
  position: number | null;
  row: LeaderboardRow | null;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.icon}>
        <Icon name="chart.bar.fill" size={22} color={colors.text.inverse} />
      </View>
      <View style={styles.copy}>
        <AppText variant="overline" style={styles.eyebrow}>{periodLabel}</AppText>
        <AppText variant="h3">
          {position ? formatWeeklyPosition(position) : "Aún sin posición esta semana"}
        </AppText>
        <AppText variant="caption" muted numberOfLines={2}>
          {groupName} · {row?.score ?? 0} puntos
        </AppText>
      </View>
      {onPress ? <Icon name="chevron.right" size={18} color={colors.text.muted} /> : null}
    </>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        accessibilityLabel={`Abrir ranking. ${position ? formatWeeklyPosition(position) : "Sin posición"}. ${row?.score ?? 0} puntos en ${groupName}.`}
        haptic={false}
        onPress={onPress}
        style={styles.card}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    minHeight: 96,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.active,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.spark,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accent.spark,
  },
});
