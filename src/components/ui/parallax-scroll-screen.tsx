import type { ReactNode } from "react";
import { RefreshControl, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import {
  RondaNovaBackground,
  type BackgroundVariant,
} from "@/components/brand/ronda-nova-background";
import { colors, spacing } from "@/design/tokens";

export function ParallaxScrollScreen({
  children,
  variant = "default",
  bottomInset = spacing.xxxl + 74,
  contentStyle,
  refreshing = false,
  onRefresh,
}: {
  children: (scrollY: SharedValue<number>) => ReactNode;
  variant?: BackgroundVariant;
  bottomInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <RondaNovaBackground variant={variant} parallaxY={scrollY}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }, contentStyle]}
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
        {children(scrollY)}
      </Animated.ScrollView>
    </RondaNovaBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
