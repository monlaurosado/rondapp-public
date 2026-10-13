import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/state";
import { Screen } from "@/components/ui/screen";
import { DRINK_TYPES } from "@/constants/drinks";
import { colors, radius, spacing } from "@/design/tokens";
import { isProfileComplete } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-context";
import { getMomentById } from "@/features/rounds/api";
import { getErrorMessage } from "@/lib/errors";
import { getSignedMomentUrl } from "@/lib/images";
import { buildNextParams, firstParam } from "@/lib/navigation";
import { userQueryKeys } from "@/lib/queryClient";

export default function MomentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ momentId?: string | string[] }>();
  const momentId = firstParam(params.momentId);
  const { user, profile, isLoading } = useAuth();
  const nextPath = momentId ? `/moment/${momentId}` : null;
  const momentQuery = useQuery({
    queryKey: user && momentId
      ? userQueryKeys.moment(user.id, momentId)
      : ["moment", "missing"],
    enabled: Boolean(user && isProfileComplete(profile) && momentId),
    queryFn: async () => {
      const moment = await getMomentById(momentId!);
      const signedUrl = await getSignedMomentUrl(moment.image_path);
      return { moment, signedUrl };
    },
  });

  if (isLoading) return <Screen variant="round"><LoadingState /></Screen>;
  if (!user) {
    return <Redirect href={{ pathname: "/login", params: buildNextParams(nextPath) }} />;
  }
  if (!profile?.is_age_confirmed) {
    return <Redirect href={{ pathname: "/age-gate", params: buildNextParams(nextPath) }} />;
  }
  if (!isProfileComplete(profile)) {
    return <Redirect href={{ pathname: "/complete-profile", params: buildNextParams(nextPath) }} />;
  }
  if (!momentId) return <Screen><ErrorState message="Falta el momento a mostrar." /></Screen>;
  if (momentQuery.isLoading) return <Screen variant="round"><LoadingState /></Screen>;
  if (momentQuery.error || !momentQuery.data) {
    return <Screen variant="round"><ErrorState message={getErrorMessage(momentQuery.error, "No hemos podido cargar este momento.")} onRetry={() => momentQuery.refetch()} /></Screen>;
  }

  const { moment, signedUrl } = momentQuery.data;
  const authorName = moment.author?.display_name ?? moment.author?.username ?? "Alguien";
  const drinkLabel = DRINK_TYPES.find((drink) => drink.id === moment.drink_type)?.label;

  return (
    <Screen variant="round">
      <View style={styles.photo}>
        {signedUrl ? <Image source={{ uri: signedUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <LinearGradient colors={[colors.overlay.clear, colors.overlay.photoStrong]} style={StyleSheet.absoluteFill} />
        <View style={styles.meta}>
          <Avatar label={authorName} size={42} />
          <View style={styles.metaCopy}>
            <AppText variant="bodyStrong">{authorName}</AppText>
            <AppText variant="caption" secondary>Momento de la ronda</AppText>
          </View>
        </View>
      </View>
      {moment.caption ? <AppText variant="h3">{moment.caption}</AppText> : null}
      {drinkLabel ? <AppText variant="caption" muted>En la foto: {drinkLabel}</AppText> : null}
      <Button icon="arrow.right" onPress={() => router.push(`/round/${moment.round_id}`)}>Ver ronda completa</Button>
      <Button variant="ghost" onPress={() => router.push(`/modals/report?momentId=${moment.id}`)}>Reportar publicación</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: radius.xl,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: colors.surface.card,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  metaCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
