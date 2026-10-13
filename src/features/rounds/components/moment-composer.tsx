import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { DRINK_TYPES } from "@/constants/drinks";
import { colors, radius, spacing } from "@/design/tokens";

export function MomentComposer({
  caption,
  drinkType,
  imageUri,
  errorMessage,
  loading,
  metadataLocked,
  progressMessage,
  submitLabel,
  onCancel,
  onMetadataChange,
  onRetake,
  onSubmit,
}: {
  caption: string;
  drinkType: string | null;
  imageUri: string;
  errorMessage?: string | null;
  loading?: boolean;
  metadataLocked?: boolean;
  progressMessage?: string | null;
  submitLabel: string;
  onCancel?: () => void;
  onMetadataChange: (input: { caption?: string; drinkType?: string | null }) => void;
  onRetake: () => void;
  onSubmit: (input: { caption?: string; drinkType?: string | null }) => void;
}) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const selectedDrink = useMemo(
    () => DRINK_TYPES.find((drink) => drink.id === drinkType),
    [drinkType],
  );

  return (
    <Screen
      variant="launch"
      keyboard
      contentStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      bottomInset={insets.bottom + spacing.xl}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="h2">Revisa tu foto</AppText>
          <AppText variant="caption" muted>El texto y los detalles son opcionales.</AppText>
        </View>
        {onCancel ? (
          <IconButton
            icon="x"
            label="Cancelar y descartar foto"
            disabled={loading}
            onPress={onCancel}
          />
        ) : null}
      </View>

      <View style={styles.preview}>
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      </View>

      <GlassPanel style={styles.form}>
        <TextField
          label="¿QUÉ ESTÁ PASANDO? · OPCIONAL"
          placeholder="Terraza, concierto, cena…"
          value={caption}
          onChangeText={(value) => onMetadataChange({ caption: value, drinkType })}
          editable={!loading && !metadataLocked}
          maxLength={120}
          multiline
          autoCapitalize="sentences"
          textAlignVertical="top"
          style={styles.captionInput}
        />

        <AnimatedPressable
          accessibilityState={{ disabled: Boolean(loading || metadataLocked), expanded: detailsVisible }}
          disabled={loading || metadataLocked}
          onPress={() => setDetailsVisible((current) => !current)}
          style={styles.detailsToggle}
        >
          <View style={styles.detailsCopy}>
            <AppText variant="bodyStrong">Añadir bebida</AppText>
            <AppText variant="caption" muted>
              {selectedDrink?.label ?? "Opcional · no suma puntos"}
            </AppText>
          </View>
          <View style={detailsVisible ? styles.chevronOpen : null}>
            <Icon name="chevron.right" size={19} color={colors.text.secondary} />
          </View>
        </AnimatedPressable>

        {detailsVisible ? (
          <View style={styles.section}>
            <View style={styles.chips}>
              {DRINK_TYPES.map((drink) => {
                const selected = drinkType === drink.id;
                return (
                  <AnimatedPressable
                    key={drink.id}
                    accessibilityState={{ disabled: Boolean(loading || metadataLocked), selected }}
                    disabled={loading || metadataLocked}
                    onPress={() => onMetadataChange({
                      caption,
                      drinkType: selected ? null : drink.id,
                    })}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <AppText
                      variant="caption"
                      style={selected ? styles.chipTextSelected : null}
                    >
                      {drink.label}
                    </AppText>
                  </AnimatedPressable>
                );
              })}
            </View>
            <AppText variant="caption" muted>La bebida no suma puntos. El momento sí.</AppText>
          </View>
        ) : null}

        {errorMessage ? (
          <AppText accessibilityRole="alert" variant="caption" style={styles.errorText}>
            {errorMessage}
          </AppText>
        ) : null}

        {metadataLocked && !loading ? (
          <AppText variant="caption" muted style={styles.lockedText}>
            Reintentaremos exactamente la misma publicación para evitar duplicados. Si quieres cambiar los detalles, repite la foto.
          </AppText>
        ) : null}

        {progressMessage ? (
          <View accessibilityLiveRegion="polite" style={styles.progress}>
            <ActivityIndicator color={colors.accent.primary} size="small" />
            <AppText variant="caption" style={styles.progressText}>
              {progressMessage}
            </AppText>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            icon="paperplane.fill"
            loading={loading}
            onPress={() => onSubmit({ caption: caption.trim() || undefined, drinkType })}
          >
            {submitLabel}
          </Button>
          <Button
            variant="secondary"
            icon="camera.fill"
            disabled={loading}
            onPress={onRetake}
          >
            Repetir foto
          </Button>
        </View>
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  preview: {
    width: "100%",
    maxWidth: 430,
    aspectRatio: 4 / 5,
    alignSelf: "center",
    borderRadius: radius.xl,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  form: {
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface.card,
  },
  captionInput: {
    minHeight: 88,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  detailsToggle: {
    minHeight: 64,
    borderRadius: radius.md,
    borderCurve: "continuous",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.glassStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  detailsCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  chevronOpen: {
    transform: [{ rotate: "90deg" }],
  },
  section: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.glassStrong,
  },
  chipSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  chipTextSelected: {
    color: colors.text.inverse,
    fontWeight: "700",
  },
  errorText: {
    color: colors.state.error,
    textAlign: "center",
  },
  lockedText: {
    textAlign: "center",
  },
  progress: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.tint.amberSubtle,
  },
  progressText: {
    color: colors.text.primary,
  },
  actions: {
    gap: spacing.sm,
  },
});
