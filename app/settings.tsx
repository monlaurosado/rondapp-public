import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, Linking, Platform, StyleSheet, View } from "react-native";

import { useToast } from "@/components/feedback/toast";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { SettingsRow } from "@/components/ui/settings-row";
import { Screen } from "@/components/ui/screen";
import { colors, radius, spacing } from "@/design/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useMyGroups } from "@/features/groups/hooks";
import { registerDeviceToken } from "@/features/notifications/api";
import {
  getWebPushPermissionStatus,
  registerWebPushSubscription,
  sendTestPushNotification,
  type WebPushPermissionStatus,
} from "@/features/notifications/web-push";
import { usePwaInstall } from "@/features/pwa/pwa-install";
import { getErrorMessage } from "@/lib/errors";

export default function SettingsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, signOut } = useAuth();
  const { canInstall, isInstalled, requestInstall } = usePwaInstall();
  const [signingOut, setSigningOut] = useState(false);
  const [sendingNotificationTest, setSendingNotificationTest] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    WebPushPermissionStatus
  >("loading");
  const groupsQuery = useMyGroups(user?.id);
  const mutedGroups = (groupsQuery.data ?? []).filter((membership) => membership.muted);

  useEffect(() => {
    if (Platform.OS === "web") {
      const refreshPermission = () => {
        setNotificationPermission(getWebPushPermissionStatus());
      };
      refreshPermission();
      document.addEventListener("visibilitychange", refreshPermission);
      return () => document.removeEventListener("visibilitychange", refreshPermission);
    }

    let active = true;
    const refreshPermission = () => {
      import("expo-notifications")
        .then((Notifications) => Notifications.getPermissionsAsync())
        .then(({ status }) => {
          if (active) setNotificationPermission(status);
        })
        .catch(() => {
          if (active) setNotificationPermission("undetermined");
        });
    };
    refreshPermission();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshPermission();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  if (!user) return <Redirect href="/login" />;

  const submitSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      showToast({
        kind: "error",
        title: "No hemos podido cerrar la sesión",
        message: getErrorMessage(error),
      });
    } finally {
      setSigningOut(false);
    }
  };

  const manageNotificationPermission = async () => {
    if (sendingNotificationTest) return;
    setSendingNotificationTest(true);
    try {
      if (Platform.OS === "web") {
        const currentStatus = getWebPushPermissionStatus();
        setNotificationPermission(currentStatus);
        if (currentStatus === "install_required") {
          showToast({
            kind: "info",
            title: "Instala Rondapp primero",
            message: "Añádela a la pantalla de inicio y ábrela desde su icono para activar los avisos en iPhone.",
          });
          return;
        }
        if (currentStatus === "unsupported") {
          throw new Error("Este navegador no permite notificaciones push.");
        }
        if (currentStatus === "denied") {
          showToast({
            kind: "info",
            title: "Permiso desactivado",
            message: "Activa Rondapp en Ajustes > Notificaciones del iPhone y vuelve a intentarlo.",
          });
          return;
        }

        const subscription = await registerWebPushSubscription({ requestPermission: true });
        const nextStatus = getWebPushPermissionStatus();
        setNotificationPermission(nextStatus);
        if (!subscription || nextStatus !== "granted") {
          showToast({
            kind: "info",
            title: "Permiso necesario",
            message: "Acepta las notificaciones para poder recibir avisos de nuevas rondas.",
          });
          return;
        }
      } else {
        if (notificationPermission === "denied") {
          await Linking.openSettings();
          return;
        }
        await registerDeviceToken({ requestPermission: true });
        const Notifications = await import("expo-notifications");
        const { status } = await Notifications.getPermissionsAsync();
        setNotificationPermission(status);
        if (status !== "granted") {
          showToast({
            kind: "info",
            title: "Permiso necesario",
            message: "Acepta las notificaciones para poder recibir avisos de nuevas rondas.",
          });
          return;
        }
      }

      await sendTestPushNotification();
      showToast({
        kind: "success",
        title: "Prueba enviada",
        message: "Deberías recibir ahora una notificación de Rondapp.",
      });
    } catch (error) {
      showToast({
        kind: "error",
        title: "No hemos podido probar los avisos",
        message: getErrorMessage(error),
      });
    } finally {
      setSendingNotificationTest(false);
    }
  };

  const notificationPermissionDetail =
    sendingNotificationTest
      ? "Enviando una notificación real…"
      : notificationPermission === "granted"
      ? "Activas · toca para enviar una prueba"
      : notificationPermission === "denied"
        ? "Desactivadas · abre Ajustes para activarlas"
        : notificationPermission === "install_required"
          ? "Instala la PWA para activarlas en iPhone"
          : notificationPermission === "unsupported"
            ? "No compatibles con este navegador"
          : notificationPermission === "loading"
            ? "Comprobando permiso…"
            : "Toca para activar y recibir una prueba";

  return (
    <Screen variant="profile">
      <View style={styles.header}>
        <AppText variant="overline" style={styles.eyebrow}>CONTROL Y PRIVACIDAD</AppText>
        <AppText variant="h1">Ajustes</AppText>
        <AppText secondary>Lo importante, sin menús escondidos.</AppText>
      </View>

      {Platform.OS === "web" && (canInstall || isInstalled) ? (
        <View style={styles.section}>
          <AppText variant="h2">Aplicación</AppText>
          <View style={styles.rows}>
            <SettingsRow
              icon={isInstalled ? "checkmark" : "download"}
              label={isInstalled ? "Rondapp instalada" : "Instalar Rondapp"}
              detail={
                isInstalled
                  ? "La estás usando desde su icono"
                  : "Añádela a la pantalla de inicio"
              }
              onPress={
                canInstall
                  ? () => {
                      requestInstall().catch(() => undefined);
                    }
                  : undefined
              }
            />
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="h2">Notificaciones</AppText>
        <View style={styles.rows}>
          <SettingsRow
            icon={mutedGroups.length ? "bell.slash.fill" : "bell.fill"}
            label="Avisos de grupos"
            detail={mutedGroups.length ? `${mutedGroups.length} grupos silenciados` : "Todos tus grupos tienen avisos activos"}
            onPress={() => router.push("/groups")}
          />
          <SettingsRow
            icon={notificationPermission === "granted" ? "bell.fill" : "bell.slash.fill"}
            label={notificationPermission === "granted" ? "Probar notificaciones" : "Activar notificaciones"}
            detail={notificationPermissionDetail}
            onPress={sendingNotificationTest ? undefined : manageNotificationPermission}
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="h2">Privacidad y ayuda</AppText>
        <View style={styles.rows}>
          <SettingsRow icon="lifebuoy" label="Soporte" onPress={() => router.push("/support")} />
          <SettingsRow icon="checkmark.shield.fill" label="Normas de comunidad" onPress={() => router.push("/community-guidelines")} />
          <SettingsRow icon="lock.shield" label="Política de privacidad" onPress={() => router.push("/privacy")} />
          <SettingsRow icon="file.text" label="Términos" onPress={() => router.push("/terms")} />
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="h2">Cuenta</AppText>
        <View style={styles.rows}>
          <SettingsRow icon="trash.fill" label="Borrar cuenta" detail="Eliminación permanente" danger onPress={() => router.push("/delete-account")} />
        </View>
      </View>

      <Button variant="ghost" icon="logout" loading={signingOut} onPress={submitSignOut}>
        Cerrar sesión
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  eyebrow: {
    color: colors.accent.cool,
  },
  section: {
    gap: spacing.md,
  },
  rows: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
    overflow: "hidden",
  },
});
