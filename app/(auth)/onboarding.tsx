import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { RondaLogo } from "@/components/brand/ronda-logo";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { ParallaxHeader } from "@/components/ui/parallax-header";
import { ParallaxScrollScreen } from "@/components/ui/parallax-scroll-screen";
import { colors, radius, spacing } from "@/design/tokens";
import { PwaInstallButton } from "@/features/pwa/pwa-install";

export default function OnboardingScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const heroHeight = Math.min(Math.max(height * 0.54, 360), 500);

  return (
    <ParallaxScrollScreen variant="auth" bottomInset={spacing.xl} contentStyle={styles.content}>
      {(scrollY) => (
        <>
          <ParallaxHeader scrollY={scrollY} style={[styles.hero, { height: heroHeight }]}>
            <Image
              source={require("../../assets/social/ronda-nova-hero.jpg")}
              contentFit="cover"
              contentPosition="center"
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={[colors.overlay.photoFaint, colors.overlay.photoLight, colors.overlay.photoStrong]}
              locations={[0, 0.42, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTop}>
              <RondaLogo compact />
            </View>
            <View style={styles.heroCopy}>
              <AppText variant="display">Tu gente. Tu momento.</AppText>
              <AppText secondary>
                Rondas privadas de fotos con tus amigos, solo para vosotros.
              </AppText>
            </View>
          </ParallaxHeader>

          <View style={styles.actions}>
            <PwaInstallButton />
            <SocialAuthButtons
              mode="register"
              showApple={false}
              showDivider={false}
              showHelper={false}
            />
            <Button
              variant="secondary"
              icon="envelope.badge.fill"
              onPress={() => router.push("/register")}
            >
              Usar email
            </Button>
            <Button variant="ghost" onPress={() => router.push("/login")}>
              Ya tengo cuenta
            </Button>
            <AppText variant="caption" muted style={styles.privacyCopy}>
              Privada y solo para mayores de 18 años.
            </AppText>
          </View>
        </>
      )}
    </ParallaxScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 660,
    alignSelf: "center",
  },
  hero: {
    minHeight: 360,
    borderRadius: radius.xl,
    overflow: "hidden",
    padding: spacing.lg,
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroCopy: {
    gap: spacing.sm,
    maxWidth: 360,
  },
  actions: {
    gap: spacing.md,
  },
  privacyCopy: {
    textAlign: "center",
  },
});
