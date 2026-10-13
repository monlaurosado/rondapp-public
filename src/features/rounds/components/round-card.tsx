import { RondaNovaRoundCard } from "@/components/rondas/round-card";
import type { RoundWithRelations } from "@/types/domain";

export function RoundCard({
  round,
  onPress,
}: {
  round: RoundWithRelations;
  onPress: () => void;
}) {
  return <RondaNovaRoundCard round={round} onPress={onPress} />;
}
