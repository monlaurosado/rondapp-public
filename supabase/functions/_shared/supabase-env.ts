type KeyDictionary = Record<string, unknown>;

function readDefaultKeyFromJson(envName: string) {
  const raw = Deno.env.get(envName);
  if (!raw) {
    return null;
  }

  let parsed: KeyDictionary;
  try {
    parsed = JSON.parse(raw) as KeyDictionary;
  } catch {
    throw new Error(`${envName} must be a JSON object with a default key.`);
  }

  const defaultKey = parsed.default;
  if (typeof defaultKey !== "string" || defaultKey.length === 0) {
    throw new Error(`${envName} must include a non-empty default key.`);
  }

  return defaultKey;
}

function readKeysFromJson(envName: string) {
  const raw = Deno.env.get(envName);
  if (!raw) {
    return [];
  }

  let parsed: KeyDictionary;
  try {
    parsed = JSON.parse(raw) as KeyDictionary;
  } catch {
    throw new Error(`${envName} must be a JSON object of keys.`);
  }

  const keys = Object.values(parsed).filter((key): key is string =>
    typeof key === "string" && key.length > 0
  );
  if (keys.length === 0) {
    throw new Error(`${envName} must include at least one non-empty key.`);
  }
  return keys;
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function getSupabaseUrl() {
  return requireEnv("SUPABASE_URL");
}

export function getSupabaseSecretKeys() {
  return [
    ...new Set([
      ...readKeysFromJson("SUPABASE_SECRET_KEYS"),
      Deno.env.get("SUPABASE_SECRET_KEY"),
    ].filter((key): key is string => Boolean(key))),
  ];
}

export function getSupabaseAdminKeys() {
  const keys = [
    ...getSupabaseSecretKeys(),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  ].filter((key): key is string => Boolean(key));

  if (keys.length === 0) {
    throw new Error("Missing Supabase admin key.");
  }

  return [...new Set(keys)];
}

export function getSupabaseAdminKey() {
  return getSupabaseAdminKeys()[0];
}

export function getSupabaseLegacyServiceRoleKey() {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

export function getSupabasePublishableKey() {
  return (
    readDefaultKeyFromJson("SUPABASE_PUBLISHABLE_KEYS") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      (() => {
        throw new Error("Missing Supabase publishable key.");
      })()
  );
}
