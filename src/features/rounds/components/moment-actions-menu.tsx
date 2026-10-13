import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { colors, radius, shadows, spacing } from "@/design/tokens";

export function MomentActionsMenu({
  ownMoment,
  onReport,
  onBlock,
  onDelete,
}: {
  ownMoment: boolean;
  onReport: () => void;
  onBlock: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const run = (action: () => void) => {
    setOpen(false);
    action();
  };
  const confirmDelete = () => {
    Alert.alert(
      "¿Borrar este momento?",
      "La foto desaparecerá de la ronda. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Borrar", style: "destructive", onPress: () => run(onDelete) },
      ],
    );
  };
  const confirmBlock = () => {
    Alert.alert(
      "¿Bloquear a esta persona?",
      "Dejaréis de ver el contenido del otro en grupos y rondas compartidos.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Bloquear", style: "destructive", onPress: () => run(onBlock) },
      ],
    );
  };

  return (
    <>
      <IconButton icon="ellipsis" label="Más acciones" onPress={() => setOpen(true)} />
      <Modal
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        presentationStyle="overFullScreen"
        transparent
        visible={open}
      >
        <View style={styles.modal}>
          <Pressable
            accessibilityLabel="Cerrar acciones"
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.handle} />
            <AppText variant="h3">Acciones del momento</AppText>
            {ownMoment ? (
              <Button variant="danger" icon="trash.fill" onPress={confirmDelete}>
                Borrar mi momento
              </Button>
            ) : (
              <>
                <Button variant="secondary" onPress={() => run(onReport)}>
                  Reportar publicación
                </Button>
                <Button variant="danger" onPress={confirmBlock}>
                  Bloquear a esta persona
                </Button>
              </>
            )}
            <Button variant="ghost" onPress={() => setOpen(false)}>
              Cancelar
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay.photoMedium,
  },
  sheet: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface.modal,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
    ...shadows.glass,
  },
  handle: {
    width: 44,
    height: 4,
    alignSelf: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.text.muted,
    marginBottom: spacing.xs,
  },
});
