import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { DRINK_TYPES } from "@/constants/drinks";
import { colors, radius, spacing } from "@/design/tokens";
import type { MyProfileStats } from "@/features/profile/api";

export function DrinkMomentStats({ stats }: { stats: MyProfileStats }) {
  const rows = Object.entries(stats.by_drink)
    .map(([drinkType, count]) => ({
      drinkType,
      count,
      label: DRINK_TYPES.find((drink) => drink.id === drinkType)?.label ?? "Otro",
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"));

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <AppText variant="h2">Tus momentos por bebida</AppText>
          <AppText variant="caption" muted>
            Datos privados sobre momentos subidos. No son consumo, ranking ni puntos.
          </AppText>
        </View>
      </View>

      <View style={styles.totals}>
        <View style={styles.total}>
          <AppText variant="stat">{stats.total_moments}</AppText>
          <AppText variant="caption" muted>Momentos subidos</AppText>
        </View>
        <View style={styles.total}>
          <AppText variant="stat">{stats.total_with_drink}</AppText>
          <AppText variant="caption" muted>Con bebida indicada</AppText>
        </View>
      </View>

      {stats.total_moments === 0 ? (
        <View style={styles.empty}>
          <AppText variant="bodyStrong">Todavía no has subido momentos</AppText>
          <AppText variant="caption" muted>
            Cuando compartas fotos, aquí verás el contexto de bebida que hayas indicado.
          </AppText>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="bodyStrong">Aún no has indicado ninguna bebida</AppText>
          <AppText variant="caption" muted>
            Es opcional. Tus {stats.total_moments} momentos subidos siguen contando como momentos.
          </AppText>
        </View>
      ) : (
        <View style={styles.rows}>
          {rows.map((row) => (
            <View key={row.drinkType} style={styles.row}>
              <AppText variant="bodyStrong" style={styles.rowLabel}>{row.label}</AppText>
              <AppText variant="h3" style={styles.rowCount}>{row.count}</AppText>
              <AppText variant="caption" muted>
                {row.count === 1 ? "momento subido" : "momentos subidos"}
              </AppText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  heading: {
    flexDirection: "row",
    gap: spacing.md,
  },
  headingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  totals: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  total: {
    minWidth: 0,
    flex: 1,
    minHeight: 112,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  empty: {
    minHeight: 104,
    borderRadius: radius.md,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  rows: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  row: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.glass,
  },
  rowLabel: {
    flex: 1,
  },
  rowCount: {
    color: colors.accent.cool,
    fontVariant: ["tabular-nums"],
  },
});
