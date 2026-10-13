import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Screen } from "@/components/ui/screen";
import { supportEmail } from "@/constants/support";
import { colors, spacing } from "@/design/tokens";

export default function TermsScreen() {
  return (
    <Screen variant="profile">
      <View style={styles.header}>
        <AppText variant="overline" style={styles.eyebrow}>USO RESPONSABLE</AppText>
        <AppText variant="h1">Términos</AppText>
        <AppText secondary>Reglas básicas para que Rondapp siga siendo un espacio privado y seguro.</AppText>
      </View>
      <GlassPanel style={styles.section}>
        <AppText variant="h2">Uso de Rondapp</AppText>
        <AppText>Debes tener 18 años o más. No subas contenido ofensivo, íntimo, peligroso ni de terceros sin permiso.</AppText>
        <AppText variant="caption" muted>Rondapp no premia el consumo. Las bebidas son contexto opcional y no forman parte de la puntuación.</AppText>
      </GlassPanel>
      <GlassPanel style={styles.section}>
        <AppText variant="h2">Cuenta y soporte</AppText>
        <AppText>Puedes reportar, bloquear y borrar tus momentos o tu cuenta desde la app.</AppText>
        <AppText variant="caption" muted>Ayuda y revisión de contenido: {supportEmail}.</AppText>
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  eyebrow: { color: colors.accent.primary },
  section: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface.card },
});
