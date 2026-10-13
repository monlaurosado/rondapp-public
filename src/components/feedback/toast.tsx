import { usePathname } from "expo-router";
import React, { createContext, useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { colors, radius, spacing, shadow } from "@/constants/theme";
import { useNetworkStatus } from "@/features/network/network-status";

type ToastKind = "success" | "error" | "info";

type ToastInput = {
  title?: string;
  message: string;
  kind?: ToastKind;
  durationMs?: number;
};

type ToastState = Required<Pick<ToastInput, "message" | "kind">> &
  Pick<ToastInput, "title"> & {
    id: number;
  };

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  dismissToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { isOffline } = useNetworkStatus();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    ({ title, message, kind = "info", durationMs = 3200 }: ToastInput) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setToast({ id: Date.now(), title, message, kind });
      timeoutRef.current = setTimeout(dismissToast, durationMs);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          style={[
            styles.host,
            {
              top:
                insets.top +
                spacing.md +
                (isOffline ? 52 : 0) +
                (pathname === "/capture" ? 56 : 0),
              pointerEvents: "box-none",
            },
          ]}
        >
          <Pressable
            accessibilityRole="alert"
            onPress={dismissToast}
            style={[styles.toast, styles[toast.kind]]}
          >
            {toast.title ? <Text variant="label">{toast.title}</Text> : null}
            <Text muted={toast.kind !== "error"}>{toast.message}</Text>
          </Pressable>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = React.use(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return value;
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
    zIndex: 100,
  },
  toast: {
    width: "100%",
    maxWidth: 560,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow.card,
  },
  success: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.success,
  },
  error: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.danger,
  },
  info: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
  },
});
