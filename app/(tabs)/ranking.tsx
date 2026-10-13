import { Redirect } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";

import { GroupSelector } from "@/components/ranking/group-selector";
import { RankingListItem } from "@/components/ranking/ranking-list-item";
import { RankingPodium } from "@/components/ranking/ranking-podium";
import { ScoreBreakdown } from "@/components/ranking/score-breakdown";
import { WeeklyScoreSummary } from "@/components/ranking/weekly-score-summary";
import { AppText } from "@/components/ui/app-text";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state";
import { Screen } from "@/components/ui/screen";
import { colors, radius, spacing } from "@/design/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useMyGroups } from "@/features/groups/hooks";
import { useGroupSelection } from "@/features/groups/selection";
import { getCurrentWeekLabel, SCORE_EXPLANATION } from "@/features/ranking/format";
import { useWeeklyLeaderboard } from "@/features/ranking/hooks";
import { getErrorMessage } from "@/lib/errors";

export default function RankingScreen() {
  const { user } = useAuth();
  const groupsQuery = useMyGroups(user?.id);
  const groups = groupsQuery.data ?? [];
  const { selectedGroupId, selectGroup } = useGroupSelection(user?.id, groups);
  const leaderboardQuery = useWeeklyLeaderboard(selectedGroupId ?? undefined, user?.id);

  if (!user) return <Redirect href="/login" />;
  if (groupsQuery.isLoading) return <Screen variant="ranking"><LoadingState /></Screen>;
  if (groupsQuery.error) {
    return (
      <Screen variant="ranking">
        <ErrorState
          message={getErrorMessage(groupsQuery.error)}
          onRetry={() => groupsQuery.refetch()}
        />
      </Screen>
    );
  }

  const rows = leaderboardQuery.error ? [] : (leaderboardQuery.data ?? []);
  const selectedGroup = groups.find((membership) => membership.group_id === selectedGroupId);
  const myIndex = rows.findIndex((row) => row.user_id === user.id);
  const myRow = myIndex >= 0 ? rows[myIndex] : null;
  const periodLabel = getCurrentWeekLabel();
  const waitingForSelection = groups.length > 1 && !selectedGroupId;

  return (
    <Screen variant="ranking" scroll={false}>
      <FlatList
        data={selectedGroupId && !leaderboardQuery.error ? rows : []}
        keyExtractor={(row) => row.user_id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.itemGap} />}
        refreshing={groupsQuery.isFetching || leaderboardQuery.isFetching}
        onRefresh={() => {
          groupsQuery.refetch();
          if (selectedGroupId) leaderboardQuery.refetch();
        }}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.header}>
              <AppText variant="overline" style={styles.eyebrow}>ESTA SEMANA</AppText>
              <AppText variant="h1">Ranking del grupo</AppText>
              <AppText secondary>
                Descubre tu posición y qué aportó cada momento al grupo.
              </AppText>
              <AppText variant="caption" muted>{periodLabel}</AppText>
            </View>

            <GroupSelector
              groups={groups}
              selectedGroupId={selectedGroupId}
              onSelect={selectGroup}
            />

            {groups.length === 0 ? (
              <EmptyState
                title="Todavía no hay ranking"
                body="Crea un grupo y lanza una ronda para empezar."
              />
            ) : null}

            {waitingForSelection ? (
              <EmptyState
                title="Elige el grupo que quieres consultar"
                body="Cada grupo tiene su propio ranking semanal. Guardaremos tu elección para la próxima vez."
              />
            ) : null}

            {selectedGroup && leaderboardQuery.isLoading ? <LoadingState label="Calculando ranking..." /> : null}
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
                  row={myRow}
                />
                {myRow ? <ScoreBreakdown row={myRow} /> : null}
                <View style={styles.formula}>
                  <AppText variant="bodyStrong">Cómo se calcula</AppText>
                  <AppText variant="caption" muted>{SCORE_EXPLANATION}</AppText>
                </View>
                {!rows.length ? (
                  <EmptyState
                    title="Todo por decidir"
                    body="Lanza una ronda y mueve al grupo esta semana."
                  />
                ) : null}
                <RankingPodium rows={rows} />
                {rows.length ? (
                  <View style={styles.listTitle}>
                    <AppText variant="h2">Clasificación</AppText>
                    <AppText variant="caption" muted>{rows.length} personas</AppText>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <RankingListItem row={item} index={index} isCurrentUser={item.user_id === user.id} />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 74,
  },
  headerContent: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  eyebrow: {
    color: colors.accent.spark,
  },
  formula: {
    minHeight: 88,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.tint.sparkSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.tint.sparkBorder,
  },
  listTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemGap: {
    height: spacing.sm,
  },
});
