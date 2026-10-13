import { StyleSheet, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { colors, radius, spacing } from "@/design/tokens";
import type { MyGroup } from "@/types/domain";

export function GroupSelector({
  groups,
  selectedGroupId,
  onSelect,
}: {
  groups: MyGroup[];
  selectedGroupId: string | null;
  onSelect: (groupId: string) => void;
}) {
  if (groups.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.heading}>
        <AppText variant="bodyStrong">
          {groups.length === 1 ? "Grupo" : "Elige un grupo"}
        </AppText>
        {groups.length > 1 && !selectedGroupId ? (
          <AppText variant="caption" style={styles.required}>Necesario</AppText>
        ) : null}
      </View>
      <View style={styles.selector}>
        {groups.map((membership) => {
          const selected = membership.group_id === selectedGroupId;
          return (
            <AnimatedPressable
              accessibilityLabel={`Ver datos de ${membership.group.name}`}
              accessibilityState={{ selected }}
              haptic={!selected}
              key={membership.group_id}
              onPress={() => onSelect(membership.group_id)}
              style={[styles.groupChip, selected && styles.groupChipSelected]}
            >
              <AppText
                variant="caption"
                style={selected ? styles.selectedText : null}
                numberOfLines={2}
              >
                {membership.group.name}
              </AppText>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  heading: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  required: {
    color: colors.state.warning,
  },
  selector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  groupChip: {
    maxWidth: "100%",
    minHeight: 44,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  groupChipSelected: {
    backgroundColor: colors.accent.spark,
    borderColor: colors.accent.spark,
  },
  selectedText: {
    color: colors.text.inverse,
    fontWeight: "800",
  },
});
