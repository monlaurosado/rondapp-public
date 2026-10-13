import { StyleSheet, View } from "react-native";

import { REACTIONS, type ReactionType } from "@/constants/reactions";
import { ReactionChip } from "@/components/ui/reaction-chip";
import { spacing } from "@/design/tokens";

export function ReactionDock({
  counts,
  selected,
  disabled,
  onReact,
}: {
  counts: Record<ReactionType, number>;
  selected: Record<ReactionType, boolean>;
  disabled?: boolean;
  onReact: (type: ReactionType) => void;
}) {
  return (
    <View style={styles.dock}>
      {REACTIONS.map((reaction) => (
        <ReactionChip
          key={reaction.id}
          label={reaction.label}
          symbol={reaction.symbol}
          icon={reaction.icon}
          count={counts[reaction.id]}
          selected={selected[reaction.id]}
          disabled={disabled}
          onPress={() => onReact(reaction.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
