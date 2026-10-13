import { BlurView } from "expo-blur";
import { useEffect, useState } from "react";
import { Keyboard, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { colors, motion, radius, shadows, spacing } from "@/design/tokens";
import { useReducedMotion } from "@/design/use-reduced-motion";

type Route = {
  key: string;
  name: string;
  params?: object;
};

type Descriptor = {
  options: {
    tabBarLabel?: unknown;
    title?: string;
  };
};

type Navigation = {
  emit: (event: { type: "tabPress"; target: string; canPreventDefault: true }) => {
    defaultPrevented: boolean;
  };
  navigate: (name: string, params?: object) => void;
};

type GlassTabBarProps = {
  state: {
    index: number;
    routes: Route[];
  };
  descriptors: Record<string, Descriptor>;
  navigation: Navigation;
};

const icons: Record<string, string> = {
  home: "house.fill",
  groups: "person.3.fill",
  launch: "camera.aperture",
  ranking: "chart.bar.fill",
  profile: "person.crop.circle.fill",
};

export function GlassTabBar({ state, descriptors, navigation }: GlassTabBarProps) {
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const visibleRoutes = state.routes;
  const activeRouteKey = state.routes[state.index]?.key;
  const visibleIndex = visibleRoutes.findIndex((route) => route.key === activeRouteKey);
  const barWidth = Math.min(width - spacing.lg * 2, 520);
  const itemWidth = (barWidth - spacing.sm) / Math.max(visibleRoutes.length, 1);
  const selectedIndex = useSharedValue(Math.max(visibleIndex, 0));

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (visibleIndex >= 0) {
      selectedIndex.set(
        reducedMotion ? visibleIndex : withSpring(visibleIndex, motion.springs.soft),
      );
    }
  }, [reducedMotion, selectedIndex, visibleIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: selectedIndex.value * itemWidth }],
  }));

  if (keyboardVisible) return null;

  return (
    <View
      style={[
        styles.host,
        { bottom: Math.max(insets.bottom, spacing.md), pointerEvents: "box-none" },
      ]}
    >
      <View style={[styles.bar, { width: barWidth }]}>
        <BlurView blurMethod="dimezisBlurViewSdk31Plus" intensity={34} tint="dark" style={StyleSheet.absoluteFill} />
        {visibleIndex >= 0 ? (
          <Animated.View
            style={[
              styles.indicator,
              { width: itemWidth, pointerEvents: "none" },
              indicatorStyle,
            ]}
          />
        ) : null}
        {visibleRoutes.map((route) => {
          const focused = route.key === activeRouteKey;
          const options = descriptors[route.key]?.options;
          const label =
            typeof options?.tabBarLabel === "string"
              ? options.tabBarLabel
              : options?.title ?? route.name;

          return (
            <AnimatedPressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={String(label)}
              haptic={focused === false}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={styles.item}
            >
              <View style={[styles.iconWrap, route.name === "launch" && styles.launchIconWrap]}>
                <Icon
                  name={icons[route.name] ?? "circle.fill"}
                  size={20}
                  color={
                    route.name === "launch"
                      ? colors.text.inverse
                      : focused
                        ? colors.accent.primary
                        : colors.text.muted
                  }
                />
              </View>
              <AppText
                numberOfLines={1}
                variant="overline"
                style={
                  route.name === "launch"
                    ? styles.launchText
                    : focused
                      ? styles.activeText
                      : styles.text
                }
              >
                {String(label)}
              </AppText>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  bar: {
    minHeight: 68,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glass.stroke,
    backgroundColor: colors.tint.tabBar,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.xs,
    ...shadows.glass,
  },
  item: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  indicator: {
    position: "absolute",
    left: spacing.xs,
    top: spacing.xs,
    bottom: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.tint.amberSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.active,
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  launchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.primary,
    ...shadows.glowAmber,
  },
  text: {
    color: colors.text.muted,
  },
  activeText: {
    color: colors.accent.primary,
  },
  launchText: {
    color: colors.accent.primary,
  },
});
