import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Screen } from "@/components/ui/screen";
import { communityRules } from "@/constants/copy";
import { supportEmail } from "@/constants/support";
import { colors, radius, spacing } from "@/design/tokens";

export default function CommunityGuidelinesScreen() {
  return (
    <Screen variant="profile">
      <View style={styles.header}>
        <AppText variant="overline" style={styles.eyebrow}>GRUPOS SEGUROS</AppText>
        <AppText variant="h1">Normas de Rondapp</AppText>
        <AppText secondary>Momentos con tu gente, sin presionar ni exponer a nadie.</AppText>
      </View>
      <View style={styles.rules}>
        {communityRules.map((rule, index) => (
          <View key={rule} style={styles.rule}>
            <View style={styles.number}><AppText variant="overline" style={styles.numberText}>{index + 1}</AppText></View>
            <AppText style={styles.ruleCopy}>{rule}</AppText>
          </View>
        ))}
      </View>
      <GlassPanel style={styles.help}>
        <AppText variant="h3">¿Necesitas ayuda?</AppText>
        <AppText variant="caption" muted>Reporta desde cada momento o escribe a {supportEmail}.</AppText>
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  eyebrow: { color: colors.state.success },
  rules: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  rule: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.glass,
  },
  number: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tint.successSoft,
  },
  numberText: { color: colors.state.success },
  ruleCopy: { flex: 1 },
  help: { padding: spacing.lg, backgroundColor: colors.surface.card },
});
