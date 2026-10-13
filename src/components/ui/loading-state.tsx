import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Skeleton } from "@/components/ui/skeleton";
import { radius, spacing } from "@/design/tokens";

export function LoadingState({ label = "Preparando la ronda..." }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <Skeleton style={styles.hero} />
      <View style={styles.row}>
        <Skeleton style={styles.avatar} />
        <View style={styles.copy}>
          <Skeleton style={styles.line} />
          <Skeleton style={styles.short} />
        </View>
      </View>
      <AppText muted>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 280,
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  hero: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
  },
  copy: {
    flex: 1,
    gap: spacing.sm,
  },
  line: {
    width: "78%",
    height: 12,
  },
  short: {
    width: "48%",
    height: 10,
  },
});
