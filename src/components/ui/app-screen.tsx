import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  RondaNovaBackground,
  type BackgroundVariant,
} from "@/components/brand/ronda-nova-background";
import { colors, spacing } from "@/design/tokens";

type AppScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  variant?: BackgroundVariant;
  bottomInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboard?: boolean;
};

export function AppScreen({
  children,
  scroll = true,
  variant = "default",
  bottomInset = spacing.xxxl + 74,
  contentStyle,
  refreshing = false,
  onRefresh,
  keyboard = false,
}: AppScreenProps) {
  if (!scroll) {
    return (
      <RondaNovaBackground variant={variant}>
        <View style={styles.staticContent}>{children}</View>
      </RondaNovaBackground>
    );
  }

  const scrollView = (
    <RondaNovaBackground variant={variant}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }, contentStyle]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              progressBackgroundColor={colors.surface.card}
              tintColor={colors.accent.primary}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </RondaNovaBackground>
  );

  if (!keyboard) return scrollView;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.staticContent}
    >
      {scrollView}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.lg,
  },
  staticContent: {
    flex: 1,
  },
});
