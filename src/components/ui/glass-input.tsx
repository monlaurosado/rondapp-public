import { useState } from "react";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radius, spacing } from "@/design/tokens";

type GlassInputProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export function GlassInput({ label, error, style, ...props }: GlassInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <AppText variant="overline" style={focused ? styles.labelFocused : styles.label}>{label}</AppText>
      <TextInput
        {...props}
        accessibilityHint={error ?? props.accessibilityHint}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={colors.text.muted}
        autoCapitalize="none"
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[styles.input, focused && styles.inputFocused, error && styles.inputError, style]}
      />
      {error ? (
        <AppText
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          variant="caption"
          style={styles.error}
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 54,
    borderRadius: radius.md,
    borderCurve: "continuous",
    backgroundColor: colors.glass.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glass.stroke,
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: colors.border.active,
    backgroundColor: colors.surface.glassStrong,
  },
  inputError: {
    borderColor: colors.state.error,
  },
  error: {
    color: colors.state.error,
  },
  label: {
    color: colors.text.muted,
  },
  labelFocused: {
    color: colors.accent.primary,
  },
});
