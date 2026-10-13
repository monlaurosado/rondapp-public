import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { AuthScaffold } from "@/components/auth/auth-scaffold";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { useToast } from "@/components/feedback/toast";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { colors } from "@/design/tokens";
import { signUpWithEmail } from "@/features/auth/api";
import { getErrorMessage } from "@/lib/errors";
import {
  buildNextParams,
  clearPendingAuthNextPath,
  normalizeNextPath,
  rememberPendingAuthNextPath,
} from "@/lib/navigation";

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string | string[] }>();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nextPath = useMemo(() => normalizeNextPath(params.next), [params.next]);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Escribe un email válido.");
      return;
    }
    if (password.length < 6) {
      setError("Usa una contraseña de al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);
    rememberPendingAuthNextPath(nextPath);
    try {
      const result = await signUpWithEmail(normalizedEmail, password, nextPath);
      if (result.session) {
        showToast({ kind: "success", title: "Cuenta creada", message: "Solo falta confirmar tu edad." });
        router.replace({ pathname: "/age-gate", params: buildNextParams(nextPath) });
      } else {
        router.replace({ pathname: "/check-email", params: { email: normalizedEmail, ...buildNextParams(nextPath) } });
      }
    } catch (err) {
      clearPendingAuthNextPath();
      setError(getErrorMessage(err, "No hemos podido crear la cuenta."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      title="Crea tu cuenta"
      body="Empieza con Google o usa tu email. Solo para mayores de 18 años."
    >
      <SocialAuthButtons mode="register" nextPath={nextPath} />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
      />
      <AppText variant="caption" muted>Mínimo 6 caracteres.</AppText>
      {error ? (
        <AppText
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          variant="caption"
          style={{ color: colors.state.error }}
        >
          {error}
        </AppText>
      ) : null}
      <Button icon="person.crop.circle.badge.plus" loading={loading} onPress={submit}>
        Crear cuenta con email
      </Button>
      <Button
        variant="ghost"
        onPress={() => router.push({ pathname: "/login", params: buildNextParams(nextPath) })}
      >
        Ya tengo cuenta
      </Button>
    </AuthScaffold>
  );
}
