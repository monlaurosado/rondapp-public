export const DRINK_TYPES = [
  { id: "beer", label: "Cerveza" },
  { id: "tinto", label: "Tinto de verano" },
  { id: "wine", label: "Vino" },
  { id: "spirit", label: "Copa" },
  { id: "cocktail", label: "Cóctel" },
  { id: "vermouth", label: "Vermut" },
  { id: "soft_drink", label: "Refresco" },
  { id: "zero_zero", label: "0,0 / sin alcohol" },
  { id: "water", label: "Agua" },
  { id: "other", label: "Otro" },
  { id: "prefer_not_say", label: "Prefiero no decirlo" },
] as const;

export type DrinkTypeId = (typeof DRINK_TYPES)[number]["id"];
