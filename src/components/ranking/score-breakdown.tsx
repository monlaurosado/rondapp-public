import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radius, spacing } from "@/design/tokens";
import type { LeaderboardRow } from "@/types/domain";

const statDefinitions: {
  key: keyof Pick<
    LeaderboardRow,
    | "rounds_started"
    | "moments_uploaded"
    | "participated_other_rounds"
    | "participants_joined_my_rounds"
    | "reactions_received"
    | "fotons_received"
    | "winning_photos"
  >;
  label: string;
}[] = [
  { key: "rounds_started", label: "Rondas iniciadas" },
  { key: "moments_uploaded", label: "Momentos" },
  { key: "participated_other_rounds", label: "Participación" },
  { key: "participants_joined_my_rounds", label: "Personas que se sumaron" },
  { key: "reactions_received", label: "Reacciones recibidas" },
  { key: "fotons_received", label: "Estrellas recibidas" },
  { key: "winning_photos", label: "Fotos ganadoras" },
];

export function ScoreBreakdown({ row }: { row: LeaderboardRow }) {
  return (
    <View style={styles.wrap}>
      <AppText variant="h3">Tu desglose</AppText>
      <View style={styles.grid}>
        {statDefinitions.map((stat) => (
          <View key={stat.key} style={styles.stat}>
            <AppText variant="h3" style={styles.value}>{row[stat.key]}</AppText>
            <AppText variant="caption" muted>{stat.label}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  stat: {
    minWidth: 132,
    flexGrow: 1,
    flexBasis: "44%",
    minHeight: 82,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  value: {
    color: colors.accent.spark,
    fontVariant: ["tabular-nums"],
  },
});
