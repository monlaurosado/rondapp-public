import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { AuthScaffold } from "@/components/auth/auth-scaffold";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { useToast } from "@/components/feedback/toast";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { colors } from "@/design/tokens";
import { signInWithEmail } from "@/features/auth/api";
import { getErrorMessage } from "@/lib/errors";
import {
  buildNextParams,
  clearPendingAuthNextPath,
  normalizeNextPath,
  rememberPendingAuthNextPath,
} from "@/lib/navigation";

export default function LoginScreen() {
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
    if (!password) {
      setError("Escribe tu contraseña.");
      return;
    }

    setLoading(true);
    setError(null);
    rememberPendingAuthNextPath(nextPath);
    try {
      await signInWithEmail(normalizedEmail, password);
      showToast({ kind: "success", title: "Sesión iniciada", message: "Vamos a tus rondas." });
      router.replace(nextPath ?? "/");
    } catch (err) {
      clearPendingAuthNextPath();
      setError(getErrorMessage(err, "No hemos podido iniciar sesión."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      title="Entra en Rondapp"
      body="Continúa con Google o usa tu email."
    >
      <SocialAuthButtons mode="login" nextPath={nextPath} />
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
        textContentType="password"
        autoComplete="password"
      />
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
      <Button icon="arrow.right" loading={loading} onPress={submit}>Entrar con email</Button>
      <Button
        variant="ghost"
        onPress={() => router.push({ pathname: "/register", params: buildNextParams(nextPath) })}
      >
        ¿No tienes cuenta? Crear cuenta
      </Button>
    </AuthScaffold>
  );
}
