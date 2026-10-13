import * as Linking from "expo-linking";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { colors, radius, spacing } from "@/design/tokens";
import { getSupportMailto, supportEmail } from "@/constants/support";

export default function SupportScreen() {
  return (
    <Screen variant="profile">
      <View style={styles.header}>
        <View style={styles.icon}><Icon name="lifebuoy" size={26} color={colors.accent.cool} /></View>
        <AppText variant="overline" style={styles.eyebrow}>ESTAMOS AQUÍ</AppText>
        <AppText variant="h1">Soporte</AppText>
        <AppText secondary>Ayuda con tu cuenta, privacidad, reportes o una incidencia de seguridad.</AppText>
      </View>
      <GlassPanel style={styles.panel}>
        <AppText variant="overline" muted>EMAIL DE SOPORTE</AppText>
        <AppText variant="h3" selectable>{supportEmail}</AppText>
        <AppText variant="caption" muted>Escribe desde el email de tu cuenta para que podamos verificar la solicitud.</AppText>
        <Button icon="paperplane.fill" onPress={() => Linking.openURL(getSupportMailto("Soporte Rondapp"))}>Escribir a soporte</Button>
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  eyebrow: { color: colors.accent.cool },
  icon: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tint.coolSubtle,
    marginBottom: spacing.sm,
  },
  panel: { padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.surface.card },
});
