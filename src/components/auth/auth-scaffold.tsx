import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { RondaLogo } from "@/components/brand/ronda-logo";
import { AppText } from "@/components/ui/app-text";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Screen } from "@/components/ui/screen";
import { colors, radius, spacing } from "@/design/tokens";

export function AuthScaffold({
  eyebrow,
  title,
  body,
  children,
  icon,
  back = true,
  variant = "auth",
}: {
  eyebrow?: string;
  title: string;
  body: string;
  children: ReactNode;
  icon?: string;
  back?: boolean;
  variant?: "auth" | "profile";
}) {
  const router = useRouter();

  return (
    <Screen
      variant={variant}
      keyboard
      bottomInset={spacing.xl}
      contentStyle={styles.screenContent}
    >
      <View style={styles.shell}>
        <View style={styles.topBar}>
          {back ? (
            <IconButton icon="chevron.left" label="Volver" onPress={() => router.back()} />
          ) : (
            <View style={styles.topSpacer} />
          )}
          <RondaLogo compact />
        </View>
        <View style={styles.intro}>
          {icon ? (
            <View style={styles.iconWrap}>
              <Icon name={icon} size={26} color={colors.accent.primary} />
            </View>
          ) : null}
          {eyebrow ? (
            <AppText variant="overline" style={styles.eyebrow}>{eyebrow}</AppText>
          ) : null}
          <AppText variant="h1">{title}</AppText>
          <AppText secondary>{body}</AppText>
        </View>
        <GlassPanel style={styles.panel}>{children}</GlassPanel>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: "center",
  },
  shell: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    gap: spacing.lg,
  },
  topBar: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  topSpacer: {
    width: 44,
    height: 44,
  },
  intro: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accent.primary,
  },
  panel: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface.glass,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.glassStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.active,
    marginBottom: spacing.xs,
  },
});
