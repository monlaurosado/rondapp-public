import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useToast } from "@/components/feedback/toast";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { colors, radius, spacing } from "@/design/tokens";
import { deleteCurrentAccount } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-context";
import { getErrorMessage } from "@/lib/errors";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, signOut } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Redirect href="/login" />;

  const submit = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await deleteCurrentAccount();
      await signOut();
      showToast(
        result.status === "deleted"
          ? {
              kind: result.storageCleanupPending ? "info" : "success",
              title: "Cuenta borrada",
              message: result.storageCleanupPending
                ? "Tu cuenta se ha borrado. La limpieza de archivos seguirá en segundo plano."
                : "Tus datos de Rondapp se han eliminado.",
            }
          : {
              kind: "info",
              title: "Sesión cerrada por seguridad",
              message: "No recibimos la confirmación final. Si la cuenta sigue activa, podrás volver a entrar y reintentar.",
            },
      );
      router.replace("/onboarding");
    } catch (err) {
      setError(getErrorMessage(err, "No hemos podido borrar la cuenta."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen variant="modal" bottomInset={spacing.xl}>
      <View style={styles.header}>
        <View style={styles.iconWrap}><Icon name="trash.fill" size={26} color={colors.state.error} /></View>
        <AppText variant="overline" style={styles.eyebrow}>ACCIÓN PERMANENTE</AppText>
        <AppText variant="h1">Borrar cuenta</AppText>
        <AppText secondary>Eliminaremos tu acceso, perfil, contenido propio y datos sociales asociados.</AppText>
      </View>

      <GlassPanel style={styles.warning}>
        <AppText variant="h3">Antes de continuar</AppText>
        <AppText secondary>Si eres propietario, intentaremos pasar el grupo a otro miembro. Sin más miembros, el grupo puede eliminarse.</AppText>
        <AppText secondary>Los reportes necesarios para seguridad pueden quedar anonimizados.</AppText>
      </GlassPanel>

      {confirming ? (
        <GlassPanel style={styles.confirmation}>
          <AppText variant="bodyStrong">Esta acción no se puede deshacer.</AppText>
          <AppText variant="caption" muted>Vuelve a pulsar para confirmar la eliminación definitiva.</AppText>
        </GlassPanel>
      ) : null}

      {error ? <AppText variant="caption" style={{ color: colors.state.error }}>{error}</AppText> : null}
      <Button variant="secondary" onPress={() => router.back()}>Conservar mi cuenta</Button>
      <Button variant="danger" icon="trash.fill" loading={loading} onPress={submit}>
        {confirming ? "Confirmar eliminación" : "Quiero borrar mi cuenta"}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tint.dangerSoft,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    color: colors.state.error,
  },
  warning: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface.card,
  },
  confirmation: {
    padding: spacing.md,
    borderColor: colors.state.error,
    backgroundColor: colors.tint.dangerSubtle,
  },
});
