import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useToast } from "@/components/feedback/toast";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import {
  type SocialProvider,
  getSocialProviderAvailability,
  isAuthFlowCancelled,
  signInWithApple,
  signInWithGoogle,
} from "@/features/auth/social-auth";
import { colors, radius, spacing } from "@/design/tokens";
import { getErrorMessage } from "@/lib/errors";
import {
  clearPendingAuthNextPath,
  rememberPendingAuthNextPath,
} from "@/lib/navigation";

export function SocialAuthButtons({
  mode,
  nextPath,
  showDivider = true,
  showApple = true,
  showHelper = true,
  googleVariant = "primary",
}: {
  mode: "login" | "register";
  nextPath?: string | null;
  showDivider?: boolean;
  showApple?: boolean;
  showHelper?: boolean;
  googleVariant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerAvailability, setProviderAvailability] = useState<Record<
    SocialProvider,
    boolean | null
  >>({
    google: null,
    apple: null,
  });
  const actionCopy = mode === "register" ? "Cuenta creada" : "Sesión iniciada";

  useEffect(() => {
    let active = true;

    async function checkProviders() {
      const [availability, nativeAppleAvailable] = await Promise.all([
        getSocialProviderAvailability(),
        process.env.EXPO_OS === "ios"
          ? AppleAuthentication.isAvailableAsync()
          : Promise.resolve(false),
      ]);
      if (active) {
        setProviderAvailability(availability);
        setAppleAvailable(nativeAppleAvailable);
      }
    }

    checkProviders().catch(() => {
      if (active) {
        setProviderAvailability({ google: null, apple: null });
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const finish = () => {
    showToast({
      kind: "success",
      title: actionCopy,
      message: "Vamos a preparar tu ronda.",
    });
    router.replace(nextPath ?? "/");
  };

  const runProvider = async (provider: SocialProvider) => {
    if (loadingProvider) return;
    setError(null);

    if (providerAvailability[provider] === false) {
      setError(
        `${provider === "google" ? "Google" : "Apple"} no está disponible ahora. Usa tu email para continuar.`,
      );
      return;
    }

    setLoadingProvider(provider);
    rememberPendingAuthNextPath(nextPath ?? null);
    try {
      const result =
        provider === "google"
          ? await signInWithGoogle(nextPath)
          : await signInWithApple(nextPath);

      if (result.completed) {
        finish();
      } else {
        clearPendingAuthNextPath();
      }
    } catch (error) {
      clearPendingAuthNextPath();
      if (!isAuthFlowCancelled(error)) {
        setError(
          getErrorMessage(error, "No hemos podido iniciar sesión. Prueba con email."),
        );
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const googleDisabled = Boolean(loadingProvider) || providerAvailability.google === false;
  const showAppleButton =
    showApple &&
    providerAvailability.apple === true &&
    (appleAvailable || process.env.EXPO_OS === "web");
  const providerError =
    error ??
    (providerAvailability.google === false
      ? "Google no está disponible ahora. Usa tu email para continuar."
      : null);
  const helperCopy =
    mode === "register"
      ? "Crearemos tu cuenta automáticamente."
      : "Si es tu primera vez, crearemos tu cuenta automáticamente.";

  return (
    <View style={styles.wrapper}>
      <Button
        variant={googleVariant}
        icon="google"
        loading={loadingProvider === "google"}
        disabled={googleDisabled}
        onPress={() => runProvider("google")}
      >
        Continuar con Google
      </Button>

      {showAppleButton && appleAvailable ? (
        <View style={[styles.appleButtonWrap, loadingProvider && styles.disabled]}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={radius.md}
            onPress={() => runProvider("apple")}
            style={styles.appleButton}
          />
        </View>
      ) : showAppleButton ? (
        <Button
          variant="secondary"
          icon="apple.logo"
          loading={loadingProvider === "apple"}
          disabled={Boolean(loadingProvider)}
          onPress={() => runProvider("apple")}
        >
          Continuar con Apple
        </Button>
      ) : null}

      {providerError ? (
        <AppText
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          variant="caption"
          style={styles.error}
        >
          {providerError}
        </AppText>
      ) : null}

      {showHelper && !providerError ? (
        <AppText variant="caption" muted style={styles.caption}>
          {helperCopy}
        </AppText>
      ) : null}

      {showDivider ? (
        <View style={styles.divider}>
          <View style={styles.line} />
          <AppText variant="caption" muted>
            o continúa con email
          </AppText>
          <View style={styles.line} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.glass.stroke,
  },
  appleButtonWrap: {
    minHeight: 52,
  },
  appleButton: {
    width: "100%",
    height: 52,
  },
  disabled: {
    opacity: 0.56,
  },
  caption: {
    textAlign: "center",
  },
  error: {
    color: colors.state.error,
    textAlign: "center",
  },
});
