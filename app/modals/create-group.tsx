import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useToast } from "@/components/feedback/toast";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { colors, spacing } from "@/design/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useCreateGroup } from "@/features/groups/hooks";
import { getErrorMessage } from "@/lib/errors";

export default function CreateGroupModal() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const createGroup = useCreateGroup(user?.id);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Redirect href="/login" />;

  const submit = async () => {
    setError(null);
    try {
      const group = await createGroup.mutateAsync(name);
      showToast({ kind: "success", title: "Grupo creado", message: `${group.name} ya está listo.` });
      router.replace(`/group/${group.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "No hemos podido crear el grupo."));
    }
  };

  return (
    <Screen variant="modal" keyboard bottomInset={spacing.xl}>
      <View style={styles.intro}>
        <AppText variant="overline" style={styles.eyebrow}>NUEVO GRUPO</AppText>
        <AppText variant="h1">Ponle nombre a tu gente</AppText>
        <AppText secondary>Tú entras como propietario y recibes un código para invitar.</AppText>
      </View>
      <View style={styles.preview}>
        <Avatar label={name || "R"} size={72} accent />
        <View style={styles.previewCopy}>
          <AppText variant="h2">{name.trim() || "Los de siempre"}</AppText>
          <AppText variant="caption" muted>Grupo privado · código automático</AppText>
        </View>
      </View>
      <GlassPanel style={styles.form}>
        <TextField
          label="NOMBRE DEL GRUPO"
          value={name}
          onChangeText={setName}
          placeholder="Los de siempre"
          maxLength={40}
          autoCapitalize="words"
          autoFocus
        />
        {error ? <AppText variant="caption" style={{ color: colors.state.error }}>{error}</AppText> : null}
        <Button
          icon="person.crop.circle.badge.plus"
          loading={createGroup.isPending}
          disabled={name.trim().length < 2 || name.trim().length > 40}
          onPress={submit}
        >
          Crear grupo
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
    color: colors.accent.primary,
  },
  preview: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  previewCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  form: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
});
