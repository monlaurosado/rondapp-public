import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Screen } from "@/components/ui/screen";
import { supportEmail } from "@/constants/support";
import { colors, spacing } from "@/design/tokens";

export default function PrivacyScreen() {
  return (
    <Screen variant="profile">
      <View style={styles.header}>
        <AppText variant="overline" style={styles.eyebrow}>TU CONTENIDO, TU CONTROL</AppText>
        <AppText variant="h1">Privacidad</AppText>
        <AppText secondary>Los grupos son privados y el MVP no pide tu ubicación.</AppText>
      </View>
      <GlassPanel style={styles.section}>
        <AppText variant="h2">Datos que tratamos</AppText>
        <AppText>Perfil, grupos, rondas, momentos, reacciones, Estrellas de la ronda, reportes, bloqueos y tokens de dispositivo para notificaciones.</AppText>
        <AppText variant="caption" muted>El tipo de bebida es un metadato opcional y no puntúa.</AppText>
      </GlassPanel>
      <GlassPanel style={styles.section}>
        <AppText variant="h2">Control de tus datos</AppText>
        <AppText>Desde Ajustes puedes borrar momentos, reportar, bloquear y eliminar tu cuenta.</AppText>
        <AppText variant="caption" muted>Para solicitudes de privacidad escribe desde tu email a {supportEmail}.</AppText>
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  eyebrow: { color: colors.accent.cool },
  section: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface.card },
});
