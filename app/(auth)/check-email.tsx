import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { AuthScaffold } from "@/components/auth/auth-scaffold";
import { useToast } from "@/components/feedback/toast";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { colors } from "@/design/tokens";
import { resendSignupConfirmation } from "@/features/auth/api";
import { getErrorMessage } from "@/lib/errors";
import { buildNextParams, normalizeNextPath } from "@/lib/navigation";

export default function CheckEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; next?: string | string[] }>();
  const { showToast } = useToast();
  const [email, setEmail] = useState(params.email ?? "");
  const nextPath = normalizeNextPath(params.next);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    setLoading(true);
    setError(null);
    try {
      await resendSignupConfirmation(email, nextPath);
      showToast({
        kind: "success",
        title: "Solicitud enviada",
        message: "Si queda una confirmación pendiente, recibirás un correo en unos minutos.",
      });
    } catch (err) {
      setError(getErrorMessage(err, "No hemos podido reenviar la confirmación."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="CONFIRMA TU CUENTA"
      title="Revisa tu email"
      body="Si tu cuenta sigue pendiente, recibirás un enlace de Rondapp. Revisa también la carpeta de spam."
      icon="envelope.badge.fill"
    >
      <TextField
        label="EMAIL"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="tu@email.com"
      />
      {error ? <AppText variant="caption" style={{ color: colors.state.error }}>{error}</AppText> : null}
      <Button icon="paperplane.fill" loading={loading} disabled={!email.trim()} onPress={resend}>Reenviar confirmación</Button>
      <Button
        variant="secondary"
        onPress={() => router.replace({ pathname: "/login", params: buildNextParams(nextPath) })}
      >
        Volver a iniciar sesión
      </Button>
    </AuthScaffold>
  );
}
