import { Image, type ImageProps } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { colors, radius } from "@/design/tokens";
import { useReducedMotion } from "@/design/use-reduced-motion";

const AnimatedImage = Animated.createAnimatedComponent(Image);

export function ParallaxHeroImage({
  source,
  scrollY,
  style,
}: {
  source: ImageProps["source"];
  scrollY: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: reducedMotion ? 0 : interpolate(scrollY.value, [-120, 0, 260], [-12, 0, 62]) },
      { scale: reducedMotion ? 1 : interpolate(scrollY.value, [-120, 0], [1.12, 1], "clamp") },
    ],
  }));

  return (
    <View style={[styles.clip, style]}>
      <AnimatedImage source={source} contentFit="cover" style={[styles.image, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
  },
  image: {
    width: "100%",
    height: "118%",
  },
});
