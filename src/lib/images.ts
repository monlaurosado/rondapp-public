import * as ImageManipulator from "expo-image-manipulator";

import { requireSupabase } from "@/lib/supabase";

export type MomentUploadPhase = "compressing" | "uploading";

const IMAGE_COMPRESSION_TIMEOUT_MS = 30_000;
const IMAGE_READ_TIMEOUT_MS = 15_000;
const IMAGE_UPLOAD_TIMEOUT_MS = 60_000;
const SIGNED_URL_TIMEOUT_MS = 15_000;
const SIGNED_URL_BATCH_SIZE = 100;

class ImageRequestTimeoutError extends Error {
  readonly code = "REQUEST_TIMEOUT";

  constructor(operation: string) {
    super(`La operación ${operation} ha agotado el tiempo de espera (timed out).`);
    this.name = "ImageRequestTimeoutError";
  }
}

async function withImageTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs: number,
  operationName: string,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(
      () => reject(new ImageRequestTimeoutError(operationName)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([Promise.resolve(operation), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function compressImage(uri: string) {
  return withImageTimeout(
    ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    ),
    IMAGE_COMPRESSION_TIMEOUT_MS,
    "de compresión de la foto",
  );
}

export function createMomentImagePath(input: {
  groupId: string;
  roundId: string;
  userId: string;
  momentId: string;
}) {
  return `${input.groupId}/${input.roundId}/${input.userId}/${input.momentId}.jpg`;
}

function isExistingObjectError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const storageError = error as {
    status?: number;
    statusCode?: string;
    error?: string;
    message?: string;
  };
  const code = storageError.statusCode?.toLowerCase();
  const name = storageError.error?.toLowerCase();
  const message = storageError.message?.toLowerCase();

  return (
    storageError.status === 409 ||
    code === "409" ||
    code === "duplicate" ||
    name === "duplicate" ||
    message?.includes("already exists") === true ||
    message?.includes("duplicate") === true
  );
}

export async function uploadMomentImage(
  path: string,
  uri: string,
  onPhase?: (phase: MomentUploadPhase) => void,
) {
  const supabase = requireSupabase();
  onPhase?.("compressing");
  const compressed = await compressImage(uri);
  const response = await withImageTimeout(
    fetch(compressed.uri),
    IMAGE_READ_TIMEOUT_MS,
    "de lectura de la foto",
  );
  if (response.status >= 400) {
    throw new Error(`No se ha podido leer la foto comprimida (${response.status}).`);
  }
  const arrayBuffer = await withImageTimeout(
    response.arrayBuffer(),
    IMAGE_READ_TIMEOUT_MS,
    "de lectura de la foto",
  );

  onPhase?.("uploading");
  const { error } = await withImageTimeout(
    supabase.storage.from("moments").upload(path, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    }),
    IMAGE_UPLOAD_TIMEOUT_MS,
    "de subida de la foto",
  );

  if (error && !isExistingObjectError(error)) {
    throw error;
  }

  return path;
}

export async function removeMomentImage(imagePath: string) {
  const supabase = requireSupabase();
  const { error } = await withImageTimeout(
    supabase.storage.from("moments").remove([imagePath]),
    IMAGE_UPLOAD_TIMEOUT_MS,
    "de limpieza de la foto",
  );

  if (error) throw error;
}

export async function getSignedMomentUrls(imagePaths: string[]) {
  const uniquePaths = [...new Set(imagePaths.filter(Boolean))];
  const urlsByPath = new Map<string, string>();

  for (let index = 0; index < uniquePaths.length; index += SIGNED_URL_BATCH_SIZE) {
    const batch = uniquePaths.slice(index, index + SIGNED_URL_BATCH_SIZE);
    const supabase = requireSupabase();
    const { data, error } = await withImageTimeout(
      supabase.storage.from("moments").createSignedUrls(batch, 60 * 60),
      SIGNED_URL_TIMEOUT_MS,
      "de acceso a las fotos",
    );

    if (error) throw error;

    for (const signedObject of data) {
      if (signedObject.error) {
        throw new Error(`No se ha podido acceder a una foto: ${signedObject.error}`);
      }
      if (!signedObject.path || !signedObject.signedUrl) {
        throw new Error("No se ha podido obtener acceso temporal a una foto.");
      }
      urlsByPath.set(signedObject.path, signedObject.signedUrl);
    }

    for (const path of batch) {
      if (!urlsByPath.has(path)) {
        throw new Error("La respuesta de Storage no incluye todas las fotos solicitadas.");
      }
    }
  }

  return urlsByPath;
}

export async function getSignedMomentUrl(imagePath: string) {
  const urlsByPath = await getSignedMomentUrls([imagePath]);
  const signedUrl = urlsByPath.get(imagePath);

  if (!signedUrl) {
    throw new Error("No se ha podido obtener acceso temporal a la foto.");
  }

  return signedUrl;
}
