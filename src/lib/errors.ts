type ErrorRecord = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

export type ParsedAppError = {
  userMessage: string;
  technicalMessage?: string;
  code?: string;
  status?: number;
};

function isErrorRecord(error: unknown): error is ErrorRecord {
  return Boolean(error && typeof error === "object");
}

function readError(error: unknown): ErrorRecord {
  if (error instanceof Error) {
    const record = error as Error & ErrorRecord;
    return {
      message: error.message,
      code: record.code,
      details: record.details,
      hint: record.hint,
      status: record.status,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (isErrorRecord(error)) {
    return error;
  }

  return {};
}

export function parseSupabaseError(
  error: unknown,
  fallback = "Algo ha fallado. Prueba otra vez.",
): ParsedAppError {
  const record = readError(error);
  const raw = record.message ?? fallback;
  const normalized = raw.toLowerCase();

  if (
    record.code === "PGRST116" ||
    normalized.includes("cannot coerce the result to a single json object")
  ) {
    return {
      userMessage: "No tienes acceso a este contenido o ya no existe.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (
    record.code === "PGRST202" ||
    (normalized.includes("could not find the function") &&
      normalized.includes("schema cache"))
  ) {
    return {
      userMessage:
        "No hemos podido cargar esta parte de Rondapp. Prueba otra vez en unos minutos.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("invalid login credentials")) {
    return {
      userMessage: "Email o password no coinciden.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("email not confirmed")) {
    return {
      userMessage: "Confirma tu email antes de iniciar sesión.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (
    record.code === "email_address_not_authorized" ||
    normalized.includes("email address not authorized")
  ) {
    return {
      userMessage:
        "Ahora mismo no podemos enviar la confirmación a ese email. Entra con Google o prueba más tarde.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (
    record.code === "over_email_send_rate_limit" ||
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("email send rate limit")
  ) {
    return {
      userMessage:
        "El envío de emails está temporalmente limitado. Espera un poco o entra con Google.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("user already registered") || normalized.includes("already registered")) {
    return {
      userMessage: "Ya existe una cuenta con ese email.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("provider is not enabled") || normalized.includes("unsupported provider")) {
    return {
      userMessage: "Ese método de acceso no está disponible ahora mismo.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("age confirmation required")) {
    return {
      userMessage: "Confirma que tienes 18 años o más antes de continuar.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("group name must be between")) {
    return {
      userMessage: "El nombre del grupo debe tener entre 2 y 40 caracteres.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("invalid invite code")) {
    return {
      userMessage: "Ese código no existe o ya no está activo.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("active round already exists")) {
    return {
      userMessage:
        "Ya hay una ronda activa en este grupo. Entra y sube tu momento antes de abrir otra.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("only group owner can delete group")) {
    return {
      userMessage: "Solo el propietario puede eliminar este grupo.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("group not found")) {
    return {
      userMessage: "Este grupo ya no existe o no tienes acceso.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("row-level security") || normalized.includes("permission denied")) {
    return {
      userMessage: "No tienes permisos para hacer eso en este grupo.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("duplicate key")) {
    return {
      userMessage: "Ese dato ya existe. Revisa el formulario y prueba otra vez.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (
    normalized.includes("round is closed") ||
    normalized.includes("round star not allowed") ||
    normalized.includes("photo vote not allowed")
  ) {
    return {
      userMessage: "La ronda ya está cerrada o esta acción ya no está disponible.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("reaction not allowed")) {
    return {
      userMessage: "No puedes reaccionar a este momento ahora mismo.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (normalized.includes("max moments per user per round reached")) {
    return {
      userMessage: "Ya has subido el máximo de 3 momentos en esta ronda.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (
    normalized.includes("idempotency conflict") ||
    normalized.includes("image path does not match") ||
    normalized.includes("identity cannot be changed")
  ) {
    return {
      userMessage: "No hemos podido confirmar esta publicación de forma segura. Conservamos la foto para que puedas reintentarlo.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (
    normalized.includes("report not allowed") ||
    normalized.includes("invalid report reason")
  ) {
    return {
      userMessage: "No puedes enviar este reporte o el contenido ya no está disponible.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (
    normalized.includes("jwt expired") ||
    normalized.includes("invalid jwt") ||
    normalized.includes("not authenticated")
  ) {
    return {
      userMessage: "Tu sesión ha caducado. Vuelve a entrar para continuar.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (
    normalized.includes("edge function returned a non-2xx status code") ||
    normalized.includes("requested function was not found")
  ) {
    return {
      userMessage:
        "No hemos podido conectar con los avisos. Prueba otra vez en unos minutos.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  if (
    normalized.includes("network request failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("load failed") ||
    normalized.includes("internet connection appears to be offline") ||
    normalized.includes("networkerror") ||
    normalized.includes("network timeout") ||
    normalized.includes("timed out") ||
    record.status === 0
  ) {
    return {
      userMessage: "No hay conexión ahora mismo. Revisa tu internet y prueba otra vez.",
      technicalMessage: raw,
      code: record.code,
      status: record.status,
    };
  }

  return {
    userMessage: raw || fallback,
    technicalMessage: raw,
    code: record.code,
    status: record.status,
  };
}

export function getErrorMessage(error: unknown, fallback = "Algo ha fallado.") {
  return parseSupabaseError(error, fallback).userMessage;
}
