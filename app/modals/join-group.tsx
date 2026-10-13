import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useToast } from "@/components/feedback/toast";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { colors, radius, spacing } from "@/design/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useJoinGroup } from "@/features/groups/hooks";
import { getErrorMessage } from "@/lib/errors";

export default function JoinGroupModal() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const joinGroup = useJoinGroup(user?.id);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Redirect href="/login" />;

  const submit = async () => {
    setError(null);
    try {
      const groupId = await joinGroup.mutateAsync(inviteCode);
      showToast({ kind: "success", title: "Ya estás dentro", message: "El grupo se ha añadido a tu lista." });
      router.replace(`/group/${groupId}`);
    } catch (err) {
      setError(getErrorMessage(err, "Ese código no existe o ya no está activo."));
    }
  };

  return (
    <Screen variant="modal" keyboard bottomInset={spacing.xl}>
      <View style={styles.intro}>
        <View style={styles.iconWrap}>
          <Icon name="arrow.right" size={26} color={colors.accent.cool} />
        </View>
        <AppText variant="overline" style={styles.eyebrow}>INVITACIÓN PRIVADA</AppText>
        <AppText variant="h1">Entra con tu código</AppText>
        <AppText secondary>Te lo puede pasar cualquier miembro del grupo.</AppText>
      </View>
      <GlassPanel style={styles.form}>
        <TextField
          label="CÓDIGO"
          value={inviteCode}
          onChangeText={(value) => setInviteCode(value.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ABC123"
          maxLength={12}
          autoFocus
        />
        {error ? <AppText variant="caption" style={{ color: colors.state.error }}>{error}</AppText> : null}
        <Button
          icon="arrow.right"
          loading={joinGroup.isPending}
          disabled={inviteCode.trim().length < 4}
          onPress={submit}
        >
          Entrar al grupo
        </Button>
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent.cool,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tint.coolSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.tint.coolBorder,
    marginBottom: spacing.sm,
  },
  form: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
});
