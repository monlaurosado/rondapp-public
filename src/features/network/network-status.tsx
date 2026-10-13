import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import React, { createContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { colors, radius, shadows, spacing } from "@/design/tokens";

type NetworkStatus = {
  isOffline: boolean;
};

const NetworkStatusContext = createContext<NetworkStatus>({ isOffline: false });

function connectionIsOffline(state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}) {
  return state.isConnected === false || state.isInternetReachable === false;
}

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOffline = connectionIsOffline(state);
      setIsOffline(nextOffline);
      onlineManager.setOnline(!nextOffline);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(() => ({ isOffline }), [isOffline]);

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
      {isOffline ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[
            styles.host,
            { top: insets.top + spacing.sm, pointerEvents: "none" },
          ]}
        >
          <View style={styles.banner}>
            <Icon name="wifi.slash" size={17} color={colors.text.primary} />
            <AppText variant="caption" style={styles.copy}>
              Sin conexión · conservamos lo que estás preparando
            </AppText>
          </View>
        </View>
      ) : null}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  return React.use(NetworkStatusContext);
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    alignItems: "center",
  },
  banner: {
    minHeight: 44,
    maxWidth: 520,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface.modal,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.state.warning,
    ...shadows.glass,
  },
  copy: {
    flexShrink: 1,
    color: colors.text.primary,
  },
});
