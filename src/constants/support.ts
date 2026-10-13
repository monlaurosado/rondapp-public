export const supportEmail = "soporte@rondapp.app";

export function getSupportMailto(subject: string) {
  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`;
}
