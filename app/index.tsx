import { Redirect } from "expo-router";

import { MissingEnvScreen } from "@/components/feedback/missing-env";
import { Screen } from "@/components/ui/screen";
import { LoadingState } from "@/components/ui/state";
import { isProfileComplete } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-context";
import { isSupabaseConfigured } from "@/lib/env";

export default function IndexRoute() {
  const { session, profile, isLoading } = useAuth();

  if (!isSupabaseConfigured) {
    return <MissingEnvScreen />;
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Preparando tu ronda..." />
      </Screen>
    );
  }

  if (!session) {
    return <Redirect href="/onboarding" />;
  }

  if (!profile?.is_age_confirmed) {
    return <Redirect href="/age-gate" />;
  }

  if (!isProfileComplete(profile)) {
    return <Redirect href="/complete-profile" />;
  }

  return <Redirect href="/home" />;
}
