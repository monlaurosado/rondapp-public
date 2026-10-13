import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { colors, motion, radius, spacing } from "@/design/tokens";
import { useReducedMotion } from "@/design/use-reduced-motion";

export function ReactionChip({
  label,
  symbol,
  icon,
  count,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  symbol: string;
  icon?: string;
  count: number;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const action = selected ? "Quitar reacción" : "Añadir reacción";
  const reducedMotion = useReducedMotion();
  const pop = useSharedValue(1);

  useEffect(() => {
    if (!selected || reducedMotion) return;
    pop.set(0.82);
    pop.set(withSpring(1, motion.springs.celebrate));
  }, [pop, reducedMotion, selected]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <AnimatedPressable
      accessibilityLabel={`${action}: ${label}. ${count} en este momento.`}
      accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(selected) }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Animated.View style={popStyle}>
        <View style={styles.content}>
          {icon ? (
            <Icon
              name={icon}
              size={17}
              color={selected ? colors.text.inverse : colors.text.secondary}
            />
          ) : (
            <AppText variant="caption">{symbol}</AppText>
          )}
          <AppText variant="caption" style={selected ? styles.selectedText : null}>
            {count}
          </AppText>
        </View>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    minWidth: 0,
    flex: 1,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glass.stroke,
    backgroundColor: colors.glass.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  selected: {
    backgroundColor: colors.accent.ice,
    borderColor: colors.accent.ice,
  },
  selectedText: {
    color: colors.text.inverse,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
