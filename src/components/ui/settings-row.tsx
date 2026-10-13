import { StyleSheet, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { colors, radius, spacing } from "@/design/tokens";

export function SettingsRow({
  icon,
  label,
  detail,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  detail?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const color = danger ? colors.state.error : colors.text.primary;
  return (
    <AnimatedPressable onPress={onPress} haptic={false} style={styles.row}>
      <View style={[styles.iconWrap, danger && styles.dangerIcon]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong" style={danger ? styles.dangerText : null}>{label}</AppText>
        {detail ? <AppText variant="caption" muted>{detail}</AppText> : null}
      </View>
      {onPress ? <Icon name="chevron.right" size={18} color={colors.text.muted} /> : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.glass,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.glassStrong,
  },
  dangerIcon: {
    backgroundColor: colors.tint.dangerSoft,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  dangerText: {
    color: colors.state.error,
  },
});
