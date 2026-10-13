import { View, StyleSheet } from "react-native";

import { AnimatedBrandMark } from "@/components/brand/animated-brand-mark";
import { AppText } from "@/components/ui/app-text";
import { spacing } from "@/design/tokens";

export function RondaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row}>
      <AnimatedBrandMark size={compact ? 44 : 62} />
      <View style={styles.textBlock}>
        <AppText variant={compact ? "h3" : "h1"}>Rondapp</AppText>
        {!compact ? (
          <AppText variant="bodySmall" muted>
            Enciende el momento.
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
});
