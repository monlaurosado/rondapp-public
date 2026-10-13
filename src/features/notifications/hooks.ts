import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { AppState, Platform } from "react-native";

import { registerDeviceToken } from "@/features/notifications/api";
import {
  getWebPushPermissionStatus,
  registerWebPushSubscription,
} from "@/features/notifications/web-push";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";

export function useRegisterPushToken(userId?: string) {
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      return;
    }

    if (Platform.OS === "web") {
      const registerExistingSubscription = () => {
        if (getWebPushPermissionStatus() !== "granted") return;
        registerWebPushSubscription({ requestPermission: false }).catch(() => {
          logger.warn("No hemos podido renovar las notificaciones web del dispositivo.");
        });
      };

      registerExistingSubscription();
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") registerExistingSubscription();
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }

    const register = (requestPermission: boolean) => {
      registerDeviceToken({ requestPermission }).catch(() => {
        logger.warn("No hemos podido registrar las notificaciones del dispositivo.");
      });
    };

    let active = true;
    let tokenSubscription: { remove: () => void } | undefined;
    let appStateSubscription: { remove: () => void } | undefined;
    register(true);
    import("expo-notifications")
      .then((Notifications) => {
        if (!active) return;
        tokenSubscription = Notifications.addPushTokenListener(() => {
          register(false);
        });
        appStateSubscription = AppState.addEventListener("change", (state) => {
          if (state === "active") register(false);
        });
      })
      .catch(() => {
        logger.warn("No hemos podido observar cambios en las notificaciones.");
      });

    return () => {
      active = false;
      tokenSubscription?.remove();
      appStateSubscription?.remove();
    };
  }, [userId]);
}

const handledNotificationResponses = new Set<string>();

function notificationResponseKey(
  response: import("expo-notifications").NotificationResponse,
) {
  return `${response.notification.request.identifier}:${response.actionIdentifier}`;
}

export function useNotificationResponseRouter(userId?: string, authReady = true) {
  const router = useRouter();

  const handleResponse = useCallback((
    response: import("expo-notifications").NotificationResponse,
  ) => {
    const responseKey = notificationResponseKey(response);
    if (handledNotificationResponses.has(responseKey)) return;

    handledNotificationResponses.add(responseKey);
    if (handledNotificationResponses.size > 50) {
      const oldestKey = handledNotificationResponses.values().next().value;
      if (oldestKey) handledNotificationResponses.delete(oldestKey);
    }

    const data = response.notification.request.content.data;
    if (data?.type === "round_created" || data?.type === "round_closed") {
      const roundId = typeof data.roundId === "string" ? data.roundId : null;
      if (roundId) {
        const nextPath = `/round/${roundId}` as const;
        if (userId) {
          router.push(nextPath);
        } else {
          router.push({ pathname: "/login", params: { next: nextPath } });
        }
      }
    }

    import("expo-notifications")
      .then((Notifications) => Notifications.clearLastNotificationResponseAsync())
      .catch(() => undefined);
  }, [router, userId]);

  useEffect(() => {
    if (Platform.OS === "web" || !authReady) return;

    let active = true;
    let subscription: { remove: () => void } | undefined;
    import("expo-notifications")
      .then(async (Notifications) => {
        if (!active) return;
        subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
        const response = await Notifications.getLastNotificationResponseAsync();
        if (active && response) handleResponse(response);
      })
      .catch(() => {
        if (active) {
          logger.warn("No hemos podido recuperar la notificación que abrió la app.");
        }
      });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [authReady, handleResponse]);
}
