#!/usr/bin/env node

import { parseSupabaseError } from "../src/lib/errors.ts";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const rawSchemaCacheError =
  "Could not find the function public.get_my_profile_stats without parameters in the schema cache";
const expectedMessage =
  "No hemos podido cargar esta parte de Rondapp. Prueba otra vez en unos minutos.";

for (const error of [
  { code: "PGRST202", message: rawSchemaCacheError },
  { message: rawSchemaCacheError },
]) {
  const parsed = parseSupabaseError(error);

  assert(
    parsed.userMessage === expectedMessage,
    "Los errores de función ausente deben mostrar un mensaje humano.",
  );
  assert(
    !parsed.userMessage.includes("schema cache") &&
      !parsed.userMessage.includes("get_my_profile_stats"),
    "La interfaz no debe exponer detalles internos de PostgREST.",
  );
  assert(
    parsed.technicalMessage === rawSchemaCacheError,
    "El detalle técnico debe conservarse para diagnóstico interno.",
  );
}

const emailDeliveryCases = [
  {
    error: {
      code: "email_address_not_authorized",
      message: "Email address not authorized",
    },
    expected:
      "Ahora mismo no podemos enviar la confirmación a ese email. Entra con Google o prueba más tarde.",
  },
  {
    error: {
      code: "over_email_send_rate_limit",
      message: "Email rate limit exceeded",
    },
    expected:
      "El envío de emails está temporalmente limitado. Espera un poco o entra con Google.",
  },
];

for (const { error, expected } of emailDeliveryCases) {
  const parsed = parseSupabaseError(error);

  assert(
    parsed.userMessage === expected,
    `El error ${error.code} debe explicar el problema sin exponer Supabase.`,
  );
  assert(
    !parsed.userMessage.toLowerCase().includes("authorized") &&
      !parsed.userMessage.toLowerCase().includes("rate limit"),
    "Los errores de entrega deben mostrarse en lenguaje humano.",
  );
}

const groupFlowCases = [
  {
    error: { code: "P0001", message: "active round already exists" },
    expected:
      "Ya hay una ronda activa en este grupo. Entra y sube tu momento antes de abrir otra.",
  },
  {
    error: { code: "P0001", message: "only group owner can delete group" },
    expected: "Solo el propietario puede eliminar este grupo.",
  },
];

for (const { error, expected } of groupFlowCases) {
  const parsed = parseSupabaseError(error);
  assert(
    parsed.userMessage === expected,
    `El error ${error.message} debe explicar cómo continuar.`,
  );
  assert(
    parsed.technicalMessage === error.message,
    "El detalle técnico del flujo de grupos debe conservarse.",
  );
}

const edgeFunctionError = {
  message: "Edge Function returned a non-2xx status code",
};
const parsedEdgeFunctionError = parseSupabaseError(edgeFunctionError);
assert(
  parsedEdgeFunctionError.userMessage ===
    "No hemos podido conectar con los avisos. Prueba otra vez en unos minutos.",
  "Los errores HTTP de Edge Functions no deben exponer detalles internos.",
);
assert(
  parsedEdgeFunctionError.technicalMessage === edgeFunctionError.message,
  "El detalle técnico de Edge Functions debe conservarse para diagnóstico.",
);

console.log(
  "PASS error parser cubre PostgREST, Auth email, rondas activas, grupos y Edge Functions.",
);
