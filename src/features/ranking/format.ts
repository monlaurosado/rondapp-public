import { format } from "date-fns";
import { es } from "date-fns/locale";

import { getWeekStart } from "@/lib/dates";

export function getCurrentWeekLabel(date = new Date()) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `Semana del ${format(start, "d MMM", { locale: es })} al ${format(end, "d MMM", { locale: es })}`;
}

export const SCORE_EXPLANATION =
  "Sumas por iniciar rondas, subir momentos, conseguir participación, recibir reacciones y Estrellas, participar en rondas ajenas y ganar fotos. La bebida nunca suma puntos.";
