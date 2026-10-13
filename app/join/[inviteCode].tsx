import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useToast } from "@/components/feedback/toast";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Screen } from "@/components/ui/screen";
import { LoadingState } from "@/components/ui/state";
import { colors, spacing } from "@/design/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { isProfileComplete } from "@/features/auth/api";
import { useJoinGroup } from "@/features/groups/hooks";
import { getErrorMessage } from "@/lib/errors";
import { buildNextParams, firstParam } from "@/lib/navigation";

export default function JoinDeepLinkScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>();
  const { user, profile, isLoading } = useAuth();
  const joinGroup = useJoinGroup(user?.id);
  const [error, setError] = useState<string | null>(null);
  const cleanInviteCode = firstParam(inviteCode)?.trim().toUpperCase() ?? "";
  const nextPath = cleanInviteCode ? `/join/${cleanInviteCode}` : null;

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Preparando invitación..." />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Redirect
        href={{
          pathname: "/login",
          params: buildNextParams(nextPath),
        }}
      />
    );
  }

  if (!profile?.is_age_confirmed) {
    return (
      <Redirect
        href={{
          pathname: "/age-gate",
          params: buildNextParams(nextPath),
        }}
      />
    );
  }

  if (!isProfileComplete(profile)) {
    return (
      <Redirect
        href={{
          pathname: "/complete-profile",
          params: buildNextParams(nextPath),
        }}
      />
    );
  }

  const submit = async () => {
    setError(null);
    try {
      const groupId = await joinGroup.mutateAsync(cleanInviteCode);
      showToast({
        kind: "success",
        title: "Ya estás dentro",
        message: "El grupo aparece en tu inicio.",
      });
      router.replace(`/group/${groupId}`);
    } catch (err) {
      setError(getErrorMessage(err, "Ese código no existe o ya no está activo."));
    }
  };

  return (
    <Screen variant="group" bottomInset={spacing.xl}>
      <View style={styles.header}>
        <AppText variant="overline" style={styles.eyebrow}>TE HAN INVITADO</AppText>
        <AppText variant="h1">Entra en la ronda</AppText>
        <AppText secondary>El grupo es privado. Solo quienes tienen invitación pueden ver sus momentos.</AppText>
      </View>
      <GlassPanel style={styles.panel}>
        <AppText variant="overline" muted>CÓDIGO</AppText>
        <AppText variant="stat" style={styles.code}>{cleanInviteCode || "----"}</AppText>
        {error ? <AppText variant="caption" style={{ color: colors.state.error }}>{error}</AppText> : null}
        <Button icon="arrow.right" loading={joinGroup.isPending} onPress={submit}>Unirme al grupo</Button>
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  eyebrow: { color: colors.accent.cool },
  panel: { padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.surface.card },
  code: { color: colors.accent.primary },
});
