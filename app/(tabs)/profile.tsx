import { Redirect, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { GroupSelector } from "@/components/ranking/group-selector";
import { ScoreBreakdown } from "@/components/ranking/score-breakdown";
import { WeeklyScoreSummary } from "@/components/ranking/weekly-score-summary";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state";
import { Screen } from "@/components/ui/screen";
import { SettingsRow } from "@/components/ui/settings-row";
import { colors, radius, spacing } from "@/design/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useMyGroups } from "@/features/groups/hooks";
import { useGroupSelection } from "@/features/groups/selection";
import { DrinkMomentStats } from "@/features/profile/components/drink-moment-stats";
import { useMyProfileStats } from "@/features/profile/hooks";
import { getCurrentWeekLabel } from "@/features/ranking/format";
import { useWeeklyLeaderboard } from "@/features/ranking/hooks";
import { getErrorMessage } from "@/lib/errors";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const groupsQuery = useMyGroups(user?.id);
  const groups = groupsQuery.data ?? [];
  const { selectedGroupId, selectGroup } = useGroupSelection(user?.id, groups);
  const leaderboardQuery = useWeeklyLeaderboard(selectedGroupId ?? undefined, user?.id);
  const profileStatsQuery = useMyProfileStats(user?.id);

  if (!user) return <Redirect href="/login" />;

  const displayName = profile?.display_name ?? "Sin nombre";
  const selectedGroup = groups.find((membership) => membership.group_id === selectedGroupId);
  const leaderboard = leaderboardQuery.data ?? [];
  const myIndex = leaderboard.findIndex((row) => row.user_id === user.id);
  const myRanking = myIndex >= 0 ? leaderboard[myIndex] : null;
  const periodLabel = getCurrentWeekLabel();

  return (
    <Screen
      variant="profile"
      refreshing={
        groupsQuery.isFetching ||
        leaderboardQuery.isFetching ||
        profileStatsQuery.isFetching
      }
      onRefresh={() => {
        groupsQuery.refetch();
        if (selectedGroupId) leaderboardQuery.refetch();
        profileStatsQuery.refetch();
      }}
    >
      <View style={styles.identity}>
        <Avatar label={displayName} size={76} accent />
        <View style={styles.identityCopy}>
          <AppText variant="h1" numberOfLines={2}>{displayName}</AppText>
          <AppText secondary numberOfLines={1}>@{profile?.username ?? "sin_usuario"}</AppText>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <AppText variant="h2">Tu semana</AppText>
          <AppText variant="caption" muted>Posición y puntos por grupo</AppText>
        </View>

        {groupsQuery.isLoading ? <LoadingState label="Cargando tus grupos..." /> : null}
        {groupsQuery.error ? (
          <ErrorState
            message={getErrorMessage(groupsQuery.error)}
            onRetry={() => groupsQuery.refetch()}
          />
        ) : null}

        {!groupsQuery.isLoading && !groupsQuery.error ? (
          <GroupSelector
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelect={selectGroup}
          />
        ) : null}

        {!groupsQuery.isLoading && !groupsQuery.error && groups.length === 0 ? (
          <EmptyState
            title="Aún no tienes un grupo"
            body="Cuando te unas a uno, aquí verás tu posición semanal."
            action="Ir a grupos"
            onPress={() => router.push("/groups")}
          />
        ) : null}

        {!groupsQuery.isLoading && groups.length > 1 && !selectedGroupId ? (
          <EmptyState
            title="Elige un grupo"
            body="Los puntos se calculan por grupo y semana; no mezclamos clasificaciones."
          />
        ) : null}

        {selectedGroup && leaderboardQuery.isLoading ? (
          <LoadingState label="Calculando tu semana..." />
        ) : null}
        {selectedGroup && leaderboardQuery.error ? (
          <ErrorState
            message={getErrorMessage(leaderboardQuery.error)}
            onRetry={() => leaderboardQuery.refetch()}
          />
        ) : null}
        {selectedGroup && !leaderboardQuery.isLoading && !leaderboardQuery.error ? (
          <>
            <WeeklyScoreSummary
              groupName={selectedGroup.group.name}
              periodLabel={periodLabel}
              position={myIndex >= 0 ? myIndex + 1 : null}
              row={myRanking}
            />
            {myRanking ? (
              <ScoreBreakdown row={myRanking} />
            ) : (
              <AppText variant="caption" muted>
                Comparte un momento esta semana para entrar en la clasificación.
              </AppText>
            )}
          </>
        ) : null}
      </View>

      {profileStatsQuery.isLoading ? (
        <LoadingState label="Cargando tus momentos..." />
      ) : profileStatsQuery.error ? (
        <ErrorState
          message={getErrorMessage(profileStatsQuery.error)}
          onRetry={() => profileStatsQuery.refetch()}
        />
      ) : profileStatsQuery.data ? (
        <DrinkMomentStats stats={profileStatsQuery.data} />
      ) : null}

      <View style={styles.section}>
        <AppText variant="h2">Tu cuenta</AppText>
        <View style={styles.rows}>
          <SettingsRow
            icon="settings"
            label="Ajustes"
            detail="Notificaciones, privacidad, ayuda y cuenta"
            onPress={() => router.push("/settings")}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    minHeight: 132,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeading: {
    gap: spacing.xs,
  },
  rows: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    overflow: "hidden",
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
});
