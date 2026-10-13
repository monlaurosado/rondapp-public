const DEFAULT_APP_LINK_BASE_URL =
  "https://darkgray-partridge-666122.hostingersite.com";

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
  appLinkBaseUrl:
    process.env.EXPO_PUBLIC_APP_LINK_BASE_URL ?? DEFAULT_APP_LINK_BASE_URL,
  easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
};

export const missingEnv = Object.entries({
  EXPO_PUBLIC_SUPABASE_URL: env.supabaseUrl,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.supabasePublishableKey,
})
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const isSupabaseConfigured = missingEnv.length === 0;

export function getEnvSummary() {
  return {
    appEnv: env.appEnv,
    supabaseUrl: env.supabaseUrl ?? "missing",
    easProjectId: env.easProjectId ?? "not set",
  };
}
