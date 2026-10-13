import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state";
import { FloatingRondaButton } from "@/components/ui/floating-ronda-button";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { colors, radius, spacing } from "@/design/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useMyGroups } from "@/features/groups/hooks";
import { useGroupSelection } from "@/features/groups/selection";
import { useActiveRounds } from "@/features/rounds/hooks";
import { getErrorMessage } from "@/lib/errors";
import type { RoundWithRelations } from "@/types/domain";

export default function LaunchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId?: string }>();
  const { user } = useAuth();
  const groupsQuery = useMyGroups(user?.id);
  const activeRoundsQuery = useActiveRounds(user?.id);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(params.groupId ?? null);

  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const activeRoundByGroup = useMemo(() => {
    const roundsByGroup = new Map<string, RoundWithRelations>();
    for (const round of activeRoundsQuery.data ?? []) {
      if (!roundsByGroup.has(round.group_id)) {
        roundsByGroup.set(round.group_id, round);
      }
    }
    return roundsByGroup;
  }, [activeRoundsQuery.data]);
  const { selectedGroupId: rememberedGroupId, selectGroup } = useGroupSelection(user?.id, groups);
  const selectedGroupIsValid = groups.some(
    (membership) => membership.group_id === selectedGroupId,
  );
  const effectiveSelectedGroupId = selectedGroupIsValid
    ? selectedGroupId
    : rememberedGroupId;
  const selectedGroup = useMemo(
    () => groups.find((membership) => membership.group_id === effectiveSelectedGroupId),
    [groups, effectiveSelectedGroupId],
  );
  const selectedActiveRound = selectedGroup
    ? activeRoundByGroup.get(selectedGroup.group_id)
    : undefined;

  if (!user) return <Redirect href="/login" />;

  if (groupsQuery.isLoading || activeRoundsQuery.isLoading) {
    return <Screen variant="launch"><LoadingState /></Screen>;
  }
  if (groupsQuery.error || activeRoundsQuery.error) {
    return (
      <Screen variant="launch">
        <ErrorState
          message={getErrorMessage(groupsQuery.error ?? activeRoundsQuery.error)}
          onRetry={() => {
            groupsQuery.refetch();
            activeRoundsQuery.refetch();
          }}
        />
      </Screen>
    );
  }
  if (groups.length === 0) {
    return (
      <Screen variant="launch">
        <EmptyState
          title="Primero necesitas un grupo"
          body="Crea uno o entra con código. Luego la cámara estará a un toque."
          action="Ir a grupos"
          onPress={() => router.push("/groups")}
        />
      </Screen>
    );
  }

  return (
    <Screen variant="launch">
      <View style={styles.header}>
        <AppText variant="h1">¿Dónde abrimos la ronda?</AppText>
        <AppText secondary>
          Elige un grupo. Si ya hay una ronda activa, entrarás a responderla.
        </AppText>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="h2">Tus grupos</AppText>
        <AppText variant="caption" muted>{groups.length}</AppText>
      </View>

      <View style={styles.groups}>
        {groups.map((membership) => {
          const selected = membership.group_id === effectiveSelectedGroupId;
          const activeRound = activeRoundByGroup.get(membership.group_id);
          return (
            <AnimatedPressable
              accessibilityLabel={`Elegir ${membership.group.name}`}
              accessibilityState={{ selected }}
              key={membership.group_id}
              onPress={() => {
                setSelectedGroupId(membership.group_id);
                selectGroup(membership.group_id);
              }}
              style={[styles.groupRow, selected && styles.groupSelected]}
            >
              <Avatar label={membership.group.name} size={48} accent={selected} />
              <View style={styles.groupInfo}>
                <AppText variant="bodyStrong">{membership.group.name}</AppText>
                <AppText
                  variant="caption"
                  muted={!activeRound}
                  style={activeRound ? styles.activeRoundLabel : undefined}
                >
                  {activeRound ? "Ronda activa · responde aquí" : "Sin ronda activa"}
                </AppText>
              </View>
              <View style={[styles.selection, selected && styles.selectionActive]}>
                {selected ? <Icon name="checkmark" size={18} color={colors.text.inverse} /> : null}
              </View>
            </AnimatedPressable>
          );
        })}
      </View>

      <FloatingRondaButton
        disabled={!selectedGroup}
        label={selectedGroup
          ? selectedActiveRound
            ? `Responder · ${selectedGroup.group.name}`
            : `Lanzar ronda · ${selectedGroup.group.name}`
          : "Elige un grupo"}
        onPress={selectedGroup ? () => {
          selectGroup(selectedGroup.group_id);
          router.push({
            pathname: "/capture",
            params: {
              intent: selectedActiveRound ? "createMoment" : "createRound",
              groupId: selectedGroup.group_id,
              ...(selectedActiveRound ? { roundId: selectedActiveRound.id } : {}),
            },
          });
        } : undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groups: {
    gap: spacing.sm,
  },
  groupRow: {
    minHeight: 74,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.glass,
  },
  groupSelected: {
    borderColor: colors.border.active,
    backgroundColor: colors.tint.amberSubtle,
  },
  groupInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  activeRoundLabel: {
    color: colors.accent.primary,
  },
  selection: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.glass,
  },
  selectionActive: {
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primary,
  },
});
