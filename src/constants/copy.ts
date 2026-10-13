export const communityRules = [
  "Solo mayores de 18 años.",
  "Respeta a la gente de tus grupos.",
  "No subas contenido ofensivo, íntimo o de terceros sin permiso.",
  "No uses Rondapp para presionar a nadie a beber.",
  "No publiques contenido relacionado con conducción y consumo.",
  "Reporta lo que no debería estar aquí.",
];

export const reportReasons = [
  { id: "offensive", label: "Contenido ofensivo" },
  { id: "harassment", label: "Acoso" },
  { id: "minor", label: "Menor de edad" },
  { id: "dangerous", label: "Contenido peligroso" },
  { id: "privacy", label: "Privacidad/imagen sin permiso" },
  { id: "other", label: "Otro" },
] as const;
