import { Redirect, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state";
import { colors, radius, spacing } from "@/design/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useMyGroups } from "@/features/groups/hooks";
import { getErrorMessage } from "@/lib/errors";
import type { GroupRole } from "@/types/domain";

const roleLabels: Record<GroupRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
};

export default function GroupsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const groupsQuery = useMyGroups(user?.id);

  if (!user) return <Redirect href="/login" />;

  if (groupsQuery.isLoading) {
    return <Screen variant="group"><LoadingState /></Screen>;
  }

  if (groupsQuery.error) {
    return (
      <Screen variant="group">
        <ErrorState
          message={getErrorMessage(groupsQuery.error)}
          onRetry={() => groupsQuery.refetch()}
        />
      </Screen>
    );
  }

  const groups = groupsQuery.data ?? [];

  return (
    <Screen
      variant="group"
      refreshing={groupsQuery.isFetching}
      onRefresh={() => groupsQuery.refetch()}
    >
      <View style={styles.header}>
        <AppText variant="h1">Tus grupos</AppText>
        <AppText secondary>Crea uno nuevo o entra con el código de una invitación.</AppText>
      </View>

      <View style={styles.actions}>
        <Button
          icon="person.crop.circle.badge.plus"
          onPress={() => router.push("/modals/create-group")}
        >
          Crear grupo
        </Button>
        <Button
          variant="secondary"
          icon="arrow.right"
          onPress={() => router.push("/modals/join-group")}
        >
          Unirme con código
        </Button>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="h2">Grupos</AppText>
        <AppText variant="caption" muted>{groups.length}</AppText>
      </View>

      {groups.length === 0 ? (
        <EmptyState
          title="Aún no tienes grupos"
          body="Crea uno o usa el código que te haya enviado un amigo."
          action="Crear mi primer grupo"
          onPress={() => router.push("/modals/create-group")}
        />
      ) : (
        <View style={styles.list}>
          {groups.map((membership) => (
            <AnimatedPressable
              accessibilityLabel={`Abrir grupo ${membership.group.name}`}
              key={membership.group_id}
              onPress={() => router.push(`/group/${membership.group_id}`)}
              style={styles.groupRow}
            >
              <Avatar label={membership.group.name} size={50} accent />
              <View style={styles.groupInfo}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {membership.group.name}
                </AppText>
                <AppText variant="caption" muted numberOfLines={1}>
                  {roleLabels[membership.role]}
                  {membership.muted ? " · Avisos silenciados" : ""}
                </AppText>
              </View>
              <Icon name="chevron.right" size={18} color={colors.text.muted} />
            </AnimatedPressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  list: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  groupRow: {
    minHeight: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.glass,
  },
  groupInfo: {
    flex: 1,
    gap: spacing.xs,
  },
});
