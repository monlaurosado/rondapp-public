import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radius, shadows } from "@/design/tokens";

export function Avatar({
  label,
  size = 48,
  accent,
}: {
  label: string;
  size?: number;
  accent?: boolean;
}) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          backgroundColor: accent ? colors.tint.amberAvatar : colors.glass.surfaceStrong,
          borderColor: accent ? colors.accent.primary : colors.glass.stroke,
        },
      ]}
    >
      <AppText variant={size >= 64 ? "h1" : "button"} style={accent ? styles.accentText : null}>
        {label.slice(0, 1).toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    ...shadows.avatar,
  },
  accentText: {
    color: colors.accent.primary,
  },
});
