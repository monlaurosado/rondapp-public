import { StyleSheet } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Icon } from "@/components/ui/icon";
import { colors, radius } from "@/design/tokens";

export function IconButton({
  icon,
  onPress,
  label,
  active,
  disabled,
}: {
  icon: string;
  onPress?: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <AnimatedPressable
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(active) }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, active && styles.active]}
    >
      <Icon
        name={icon}
        color={disabled ? colors.text.muted : active ? colors.text.inverse : colors.text.primary}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glass.stroke,
  },
  active: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
});
