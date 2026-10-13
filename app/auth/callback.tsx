import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Screen } from "@/components/ui/screen";
import { ErrorState, LoadingState } from "@/components/ui/state";
import { completeAuthFromUrl } from "@/features/auth/callback";
import { getAuthRedirectUrl } from "@/lib/deep-links";
import { getErrorMessage } from "@/lib/errors";
import {
  clearPendingAuthNextPath,
  normalizeNextPath,
  rememberPendingAuthNextPath,
} from "@/lib/navigation";

function buildFallbackUrl(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => search.append(key, entry));
    } else if (value) {
      search.set(key, value);
    }
  });

  const base = getAuthRedirectUrl();
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const url = Linking.useURL();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fallbackUrl = useMemo(() => buildFallbackUrl(params), [params]);
  const nextPath = useMemo(() => normalizeNextPath(params.next), [params.next]);

  useEffect(() => {
    let active = true;

    async function finishAuth() {
      rememberPendingAuthNextPath(nextPath);
      try {
        const initialUrl = url ?? (await Linking.getInitialURL()) ?? fallbackUrl;
        await completeAuthFromUrl(initialUrl);
        if (!active) return;
        showToast({
          kind: "success",
          title: "Acceso completado",
          message: "Ya puedes continuar en Rondapp.",
        });
        setDone(true);
        router.replace(nextPath ?? "/");
      } catch (err) {
        if (active) {
          clearPendingAuthNextPath();
          setError(getErrorMessage(err, "No hemos podido completar el acceso."));
        }
      }
    }

    finishAuth();

    return () => {
      active = false;
    };
  }, [fallbackUrl, nextPath, router, showToast, url]);

  if (!error && !done) {
    return (
      <Screen>
        <LoadingState label="Terminando el acceso..." />
      </Screen>
    );
  }

  return (
    <Screen variant="auth">
      <ErrorState
        message={error ?? "Estamos terminando el acceso."}
        onRetry={() => router.replace("/login")}
      />
    </Screen>
  );
}
