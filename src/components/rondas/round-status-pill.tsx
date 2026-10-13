import { Chip } from "@/components/ui/chip";

export function RoundStatusPill({
  closed,
  label,
}: {
  closed?: boolean;
  label: string;
}) {
  return <Chip tone={closed ? "default" : "spark"} active={!closed}>{label}</Chip>;
}
