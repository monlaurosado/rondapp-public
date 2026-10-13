import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { colors, gradients, radius, shadows, spacing } from "@/design/tokens";

export function FloatingRondaButton({
  onPress,
  label = "Lanzar ronda",
  disabled = false,
}: {
  onPress?: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <AnimatedPressable disabled={disabled} onPress={onPress} style={styles.button}>
      <LinearGradient
        colors={gradients.action as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.iconWrap}>
        <Icon name="camera.aperture" size={22} color={colors.text.inverse} />
      </View>
      <AppText variant="button" style={styles.text}>{label}</AppText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 64,
    borderRadius: radius.pill,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glass.strokeWarm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.glowAmber,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tint.blackSoft,
  },
  text: {
    color: colors.text.inverse,
  },
});
