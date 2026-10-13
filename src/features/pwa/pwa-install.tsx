import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { colors, radius, shadows, spacing } from "@/design/tokens";

type InstallOutcome = "accepted" | "dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
};

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

type PwaInstallContextValue = {
  canInstall: boolean;
  isInstalled: boolean;
  requestInstall: () => Promise<boolean>;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function isIosDevice(navigatorValue: Navigator) {
  return (
    /iPad|iPhone|iPod/i.test(navigatorValue.userAgent) ||
    (navigatorValue.platform === "MacIntel" && navigatorValue.maxTouchPoints > 1)
  );
}

function readInitialIosState() {
  return (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    isIosDevice(navigator)
  );
}

function readInitialInstalledState() {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  const navigatorValue = window.navigator as StandaloneNavigator;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorValue.standalone === true
  );
}

function InstallStep({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepIcon}>
        <Icon name={icon} size={20} color={colors.accent.primary} />
      </View>
      <View style={styles.stepCopy}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" secondary>{body}</AppText>
      </View>
    </View>
  );
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos] = useState(readInitialIosState);
  const [isInstalled, setIsInstalled] = useState(readInitialInstalledState);
  const [instructionsVisible, setInstructionsVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const navigatorValue = window.navigator as StandaloneNavigator;
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const refreshInstalledState = () => {
      setIsInstalled(standaloneQuery.matches || navigatorValue.standalone === true);
    };
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const markAsInstalled = () => {
      setDeferredPrompt(null);
      setInstructionsVisible(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", markAsInstalled);
    standaloneQuery.addEventListener("change", refreshInstalledState);

    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", markAsInstalled);
      standaloneQuery.removeEventListener("change", refreshInstalledState);
    };
  }, []);

  const requestInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          return true;
        }
        return false;
      } catch {
        setDeferredPrompt(null);
      }
    }

    setInstructionsVisible(true);
    return false;
  }, [deferredPrompt]);

  const canInstall = Platform.OS === "web" && !isInstalled && (isIos || Boolean(deferredPrompt));
  const value = useMemo(
    () => ({ canInstall, isInstalled, requestInstall }),
    [canInstall, isInstalled, requestInstall],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
      {Platform.OS === "web" ? (
        <Modal
          animationType="fade"
          transparent
          visible={instructionsVisible}
          onRequestClose={() => setInstructionsVisible(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              accessibilityLabel="Cerrar instrucciones de instalación"
              accessibilityRole="button"
              onPress={() => setInstructionsVisible(false)}
              style={StyleSheet.absoluteFill}
            />
            <View
              accessibilityViewIsModal
              style={[
                styles.panel,
                {
                  paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm,
                },
              ]}
            >
              <View style={styles.handle} />
              <View style={styles.heading}>
                <AppText variant="overline" style={styles.eyebrow}>INSTALAR EN IPHONE</AppText>
                <AppText variant="h1">Pon Rondapp en tu inicio</AppText>
                <AppText secondary>
                  Se abrirá a pantalla completa desde su propio icono, como una aplicación.
                </AppText>
              </View>

              <View style={styles.steps}>
                <InstallStep
                  icon="globe"
                  title="Abre el enlace en Safari"
                  body="Si estás dentro de WhatsApp o Instagram, usa su menú para abrir esta página en Safari."
                />
                <InstallStep
                  icon="square.and.arrow.up"
                  title="Pulsa Compartir"
                  body="Es el botón con un cuadrado y una flecha hacia arriba."
                />
                <InstallStep
                  icon="plus.app"
                  title="Añadir a pantalla de inicio"
                  body="Confirma con Añadir y abre Rondapp desde el nuevo icono."
                />
              </View>

              <Button onPress={() => setInstructionsVisible(false)}>Entendido</Button>
            </View>
          </View>
        </Modal>
      ) : null}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const value = useContext(PwaInstallContext);
  if (!value) {
    throw new Error("usePwaInstall must be used inside PwaInstallProvider");
  }
  return value;
}

export function PwaInstallButton({ compact = false }: { compact?: boolean }) {
  const { canInstall, requestInstall } = usePwaInstall();
  if (!canInstall) return null;

  return (
    <Button
      variant="secondary"
      icon="download"
      compact={compact}
      onPress={() => {
        requestInstall().catch(() => undefined);
      }}
    >
      Instalar Rondapp
    </Button>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay.scrim,
  },
  panel: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.border.glass,
    backgroundColor: colors.surface.modal,
    ...shadows.glass,
  },
  handle: {
    width: 42,
    height: 5,
    alignSelf: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.text.subtle,
  },
  heading: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent.cool,
  },
  steps: {
    gap: spacing.lg,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tint.amberSoft,
  },
  stepCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
