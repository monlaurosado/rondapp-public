import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { AuthScaffold } from "@/components/auth/auth-scaffold";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { colors } from "@/design/tokens";
import { confirmAge } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-context";
import { getErrorMessage } from "@/lib/errors";
import { buildNextParams, normalizeNextPath } from "@/lib/navigation";

export default function AgeGateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string | string[] }>();
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextPath = useMemo(() => normalizeNextPath(params.next), [params.next]);

  if (!user) {
    return <Redirect href={{ pathname: "/login", params: buildNextParams(nextPath) }} />;
  }

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextProfile = await confirmAge(user.id);
      await refreshProfile();
      const hasProfile = Boolean((profile ?? nextProfile).username && (profile ?? nextProfile).display_name);
      router.replace(
        hasProfile
          ? nextPath ?? "/home"
          : { pathname: "/complete-profile", params: buildNextParams(nextPath) },
      );
    } catch (err) {
      setError(getErrorMessage(err, "No hemos podido guardar la confirmación."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="ESPACIO ADULTO Y PRIVADO"
      title="Confirma que tienes 18+"
      body="Puede haber referencias a planes de ocio adulto. Rondapp no premia ni puntúa el consumo."
      icon="checkmark.shield.fill"
      back={false}
    >
      <AppText secondary>
        Al continuar aceptas las normas de comunidad y confirmas que tienes 18 años o más.
      </AppText>
      {error ? <AppText variant="caption" style={{ color: colors.state.error }}>{error}</AppText> : null}
      <Button icon="checkmark" loading={loading} onPress={submit}>Tengo 18 años o más</Button>
    </AuthScaffold>
  );
}
