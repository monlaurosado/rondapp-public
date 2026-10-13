import { Image } from "expo-image";
import { StyleSheet } from "react-native";

export function BrandMark({ size = 64 }: { size?: number }) {
  return (
    <Image
      accessibilityLabel="Rondapp"
      source={require("../../../assets/brand/rondapp-mark.png")}
      contentFit="contain"
      style={[styles.mark, { width: size, height: size }]}
    />
  );
}

const styles = StyleSheet.create({
  mark: {
    borderRadius: 18,
  },
});
