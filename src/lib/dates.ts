import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";

import type { Round } from "@/types/domain";

export function getWeekStart(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isRoundExpired(round: Pick<Round, "status" | "closes_at">) {
  return round.status === "closed" || new Date(round.closes_at).getTime() <= Date.now();
}

export function formatTimeLeft(closesAt: string) {
  const closes = new Date(closesAt);
  if (closes.getTime() <= Date.now()) {
    return "Terminada";
  }
  return formatDistanceToNowStrict(closes, { addSuffix: false, locale: es });
}
