import type { EmailOtpType } from "@supabase/supabase-js";

import { requireSupabase } from "@/lib/supabase";

function collectUrlParams(url: string) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;

  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });
  }

  return params;
}

function readAuthError(params: URLSearchParams) {
  const errorCode = params.get("error") ?? params.get("error_code");
  const description = params.get("error_description")?.replace(/\+/g, " ").trim();

  if (!errorCode && !description) {
    return null;
  }

  if (errorCode === "access_denied") {
    return "El acceso se ha cancelado. Puedes volver a intentarlo cuando quieras.";
  }

  if (description?.toLowerCase().includes("redirect_uri_mismatch")) {
    return "Google no está configurado correctamente. Prueba con email mientras lo resolvemos.";
  }

  return description || "No hemos podido completar el acceso.";
}

export async function completeAuthFromUrl(url: string) {
  const supabase = requireSupabase();
  const params = collectUrlParams(url);
  const authError = readAuthError(params);
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (authError) {
    throw new Error(authError);
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) throw error;
    return data.session;
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return data.session;
  }

  throw new Error("No hemos encontrado una respuesta de acceso válida.");
}
