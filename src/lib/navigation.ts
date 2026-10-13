const ALLOWED_UUID_ROUTE =
  /^\/(?:group|moment|round)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_INVITE_ROUTE = /^\/join\/[a-z0-9]{6,32}$/i;

const ALLOWED_NEXT_EXACT = new Set([
  "/",
  "/groups",
  "/home",
  "/launch",
  "/profile",
  "/ranking",
  "/settings",
]);

let pendingAuthNextPath: string | null = null;

export function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function normalizeNextPath(value: string | string[] | undefined) {
  const rawValue = firstParam(value)?.trim();
  if (!rawValue) {
    return null;
  }

  let path = rawValue;
  try {
    path = decodeURIComponent(rawValue);
  } catch {
    path = rawValue;
  }

  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /^[a-z][a-z0-9+.-]*:/i.test(path)
  ) {
    return null;
  }

  if (ALLOWED_NEXT_EXACT.has(path)) {
    return path;
  }

  if (ALLOWED_UUID_ROUTE.test(path) || ALLOWED_INVITE_ROUTE.test(path)) {
    return path;
  }

  return null;
}

export function buildNextParams(nextPath: string | null) {
  return nextPath ? { next: nextPath } : undefined;
}

export function rememberPendingAuthNextPath(nextPath: string | null) {
  pendingAuthNextPath = normalizeNextPath(nextPath ?? undefined);
}

export function getPendingAuthNextPath() {
  return pendingAuthNextPath;
}

export function clearPendingAuthNextPath() {
  pendingAuthNextPath = null;
}
