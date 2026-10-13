import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AuthScaffold } from "@/components/auth/auth-scaffold";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { colors, spacing } from "@/design/tokens";
import { upsertProfile } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-context";
import { getErrorMessage } from "@/lib/errors";
import { buildNextParams, normalizeNextPath } from "@/lib/navigation";

const usernameRegex = /^[a-z0-9_]{3,20}$/;

export default function CompleteProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string | string[] }>();
  const { user, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nextPath = useMemo(() => normalizeNextPath(params.next), [params.next]);

  if (!user) {
    return <Redirect href={{ pathname: "/login", params: buildNextParams(nextPath) }} />;
  }

  const submit = async () => {
    const cleanUsername = username.trim().toLowerCase();
    if (!usernameRegex.test(cleanUsername)) {
      setError("Nombre de usuario: 3-20 caracteres, minúsculas, números o guion bajo.");
      return;
    }
    if (displayName.trim().length < 2) {
      setError("El nombre visible debe tener al menos 2 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await upsertProfile({ userId: user.id, username: cleanUsername, displayName });
      await refreshProfile();
      router.replace(nextPath ?? "/groups");
    } catch (err) {
      setError(getErrorMessage(err, "No hemos podido guardar el perfil."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="CÓMO TE VERÁ EL GRUPO"
      title="Ponle cara a tu perfil"
      body="Usaremos este nombre en rondas, reacciones y ranking."
      variant="profile"
      back={false}
    >
      <View style={styles.preview}>
        <Avatar label={displayName || username || "R"} size={72} accent />
        <View style={styles.previewCopy}>
          <AppText variant="h3">{displayName.trim() || "Tu nombre"}</AppText>
          <AppText variant="caption" muted>@{username.trim() || "usuario"}</AppText>
        </View>
      </View>
      <TextField
        label="USERNAME"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        placeholder="rosado"
      />
      <TextField
        label="NOMBRE VISIBLE"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        placeholder="Rosado"
      />
      {error ? <AppText variant="caption" style={{ color: colors.state.error }}>{error}</AppText> : null}
      <Button icon="checkmark" loading={loading} onPress={submit}>Guardar perfil</Button>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  previewCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
