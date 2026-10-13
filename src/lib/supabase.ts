import "react-native-url-polyfill/auto";

import {
  createClient,
  processLock,
  type SupabaseClient,
} from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { env, isSupabaseConfigured, missingEnv } from "@/lib/env";

type SupabaseStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const memoryStorage = new Map<string, string>();
const SECURE_STORE_CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number) {
  return `${key}.chunk.${index}`;
}

function manifestKey(key: string) {
  return `${key}.chunks`;
}

async function getStoredChunkCount(key: string) {
  const manifest = await SecureStore.getItemAsync(manifestKey(key));
  if (!manifest) return 0;

  const count = Number.parseInt(manifest, 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

const webStorageAdapter: SupabaseStorageAdapter = {
  async getItem(key) {
    return globalThis.localStorage?.getItem(key) ?? memoryStorage.get(key) ?? null;
  },
  async setItem(key, value) {
    if (globalThis.localStorage) {
      globalThis.localStorage.setItem(key, value);
      return;
    }
    memoryStorage.set(key, value);
  },
  async removeItem(key) {
    globalThis.localStorage?.removeItem(key);
    memoryStorage.delete(key);
  },
};

const secureStoreAdapter: SupabaseStorageAdapter = {
  async getItem(key) {
    const chunkCount = await getStoredChunkCount(key);
    if (!chunkCount) {
      return SecureStore.getItemAsync(key);
    }

    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, index)),
      ),
    );

    return chunks.every((chunk): chunk is string => chunk !== null)
      ? chunks.join("")
      : null;
  },
  async setItem(key, value) {
    const previousChunkCount = await getStoredChunkCount(key);
    const chunks = Array.from(
      { length: Math.ceil(value.length / SECURE_STORE_CHUNK_SIZE) },
      (_, index) =>
        value.slice(
          index * SECURE_STORE_CHUNK_SIZE,
          (index + 1) * SECURE_STORE_CHUNK_SIZE,
        ),
    );

    if (chunks.length <= 1) {
      await SecureStore.setItemAsync(key, value);
      await Promise.all([
        SecureStore.deleteItemAsync(manifestKey(key)),
        ...Array.from({ length: previousChunkCount }, (_, index) =>
          SecureStore.deleteItemAsync(chunkKey(key, index)),
        ),
      ]);
      return;
    }

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(key, index), chunk),
      ),
    );
    await SecureStore.setItemAsync(manifestKey(key), String(chunks.length));
    await Promise.all([
      SecureStore.deleteItemAsync(key),
      ...Array.from(
        { length: Math.max(0, previousChunkCount - chunks.length) },
        (_, index) =>
          SecureStore.deleteItemAsync(chunkKey(key, chunks.length + index)),
      ),
    ]);
  },
  async removeItem(key) {
    const chunkCount = await getStoredChunkCount(key);
    await Promise.all([
      SecureStore.deleteItemAsync(key),
      SecureStore.deleteItemAsync(manifestKey(key)),
      ...Array.from({ length: chunkCount }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index)),
      ),
    ]);
  },
};

const authStorage = Platform.OS === "web" ? webStorageAdapter : secureStoreAdapter;
const authStorageKey = env.supabaseUrl
  ? `sb-${new URL(env.supabaseUrl).hostname.split(".")[0]}-auth-token`
  : "rondapp-auth-token";

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(env.supabaseUrl!, env.supabasePublishableKey!, {
      auth: {
        storage: authStorage,
        storageKey: authStorageKey,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;

if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      `Faltan variables de entorno de Supabase: ${missingEnv.join(", ")}`,
    );
  }

  return supabase;
}

export async function revokeSupabaseSession(accessToken: string) {
  if (!env.supabaseUrl || !env.supabasePublishableKey) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: {
        apikey: env.supabasePublishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });
    if (response.ok || [401, 403, 404].includes(response.status)) return true;
    throw new Error(`No hemos podido revocar la sesión (${response.status}).`);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function clearLocalSupabaseSession() {
  supabase?.auth.stopAutoRefresh();

  // auth-js performs a network request before its public local sign-out. The
  // internal remover is the only network-free path and also bumps auth-js's
  // session epoch, preventing an in-flight refresh from restoring the token.
  const authWithOfflineRemoval = supabase?.auth as unknown as
    | { _removeSession?: () => Promise<void> }
    | undefined;
  if (authWithOfflineRemoval?._removeSession) {
    await authWithOfflineRemoval._removeSession().catch(() => undefined);
  }

  await Promise.allSettled([
    authStorage.removeItem(authStorageKey),
    authStorage.removeItem(`${authStorageKey}-code-verifier`),
    authStorage.removeItem(`${authStorageKey}-user`),
  ]);
  await supabase?.removeAllChannels().catch(() => undefined);
}
