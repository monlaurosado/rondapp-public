import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Redirect, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { RondaLogo } from "@/components/brand/ronda-logo";
import { WeeklyScoreSummary } from "@/components/ranking/weekly-score-summary";
import { ActiveRoundHero } from "@/components/rondas/active-round-hero";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { FloatingRondaButton } from "@/components/ui/floating-ronda-button";
import { Icon } from "@/components/ui/icon";
import { ParallaxHeader } from "@/components/ui/parallax-header";
import { ParallaxScrollScreen } from "@/components/ui/parallax-scroll-screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state";
import { colors, radius, spacing } from "@/design/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useMyGroups } from "@/features/groups/hooks";
import { useGroupSelection } from "@/features/groups/selection";
import { getCurrentWeekLabel } from "@/features/ranking/format";
import { useWeeklyLeaderboard } from "@/features/ranking/hooks";
import { useActiveRounds } from "@/features/rounds/hooks";
import { formatTimeLeft } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const groupsQuery = useMyGroups(user?.id);
  const groups = groupsQuery.data ?? [];
  const { selectedGroupId } = useGroupSelection(user?.id, groups);
  const leaderboardQuery = useWeeklyLeaderboard(selectedGroupId ?? undefined, user?.id);
  const roundsQuery = useActiveRounds(user?.id);

  if (!user) return <Redirect href="/login" />;

  const refresh = () => {
    groupsQuery.refetch();
    roundsQuery.refetch();
    if (selectedGroupId) leaderboardQuery.refetch();
  };

  if (groupsQuery.isLoading || roundsQuery.isLoading) {
    return <ParallaxScrollScreen variant="home">{() => <LoadingState />}</ParallaxScrollScreen>;
  }

  if (groupsQuery.error || roundsQuery.error) {
    return (
      <ParallaxScrollScreen variant="home">
        {() => (
          <ErrorState
            message={getErrorMessage(groupsQuery.error ?? roundsQuery.error)}
            onRetry={refresh}
          />
        )}
      </ParallaxScrollScreen>
    );
  }

  const rounds = roundsQuery.data ?? [];
  const activeRound = rounds[0];
  const firstName = profile?.display_name?.trim().split(/\s+/)[0];
  const selectedGroup = groups.find((membership) => membership.group_id === selectedGroupId);
  const leaderboard = leaderboardQuery.data ?? [];
  const myIndex = leaderboard.findIndex((row) => row.user_id === user.id);
  const myRanking = myIndex >= 0 ? leaderboard[myIndex] : null;
  const welcomeMessage = rounds.length
    ? rounds.length === 1
      ? "Tienes una ronda activa."
      : `Tienes ${rounds.length} rondas activas.`
    : groups.length
      ? "Haz una foto y avisa a tu grupo."
      : "Empieza creando o uniéndote a un grupo.";

  return (
    <ParallaxScrollScreen
      variant="home"
      refreshing={groupsQuery.isFetching || roundsQuery.isFetching || leaderboardQuery.isFetching}
      onRefresh={refresh}
    >
      {(scrollY) => (
        <>
          <View style={styles.topBar}>
            <RondaLogo compact />
            <AnimatedPressable
              accessibilityLabel="Abrir tu perfil"
              haptic={false}
              onPress={() => router.push("/profile")}
              style={styles.profileButton}
            >
              <Avatar label={profile?.display_name ?? profile?.username ?? "R"} size={42} accent />
            </AnimatedPressable>
          </View>

          <View style={styles.welcome}>
            <AppText variant="h1">{firstName ? `Hola, ${firstName}.` : "Hola."}</AppText>
            <AppText secondary>{welcomeMessage}</AppText>
          </View>

          {activeRound ? (
            <ParallaxHeader scrollY={scrollY} style={styles.activeHeader}>
              <ActiveRoundHero
                round={activeRound}
                onPress={() => router.push(`/round/${activeRound.id}`)}
              />
            </ParallaxHeader>
          ) : groups.length ? (
            <ParallaxHeader scrollY={scrollY} style={styles.startHero}>
              <Image
                source={require("../../assets/social/ronda-nova-hero.jpg")}
                contentFit="cover"
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={[colors.overlay.photoLight, colors.overlay.photoStrong]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.startCopy}>
                <AppText variant="h2">Comparte la primera foto</AppText>
                <AppText secondary>Elige el grupo, haz la foto y la ronda quedará abierta.</AppText>
                <FloatingRondaButton
                  label="Crear una ronda"
                  onPress={() => router.push("/launch")}
                />
              </View>
            </ParallaxHeader>
          ) : (
            <EmptyState
              title="Necesitas un grupo"
              body="Crea uno o entra con un código para compartir tu primera foto."
              action="Ir a grupos"
              onPress={() => router.push("/groups")}
            />
          )}

          {groups.length ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppText variant="h2">Tu semana</AppText>
                <AppText variant="caption" muted>Ranking</AppText>
              </View>
              {groups.length > 1 && !selectedGroupId ? (
                <AnimatedPressable
                  accessibilityLabel="Elegir grupo para ver tu ranking semanal"
                  onPress={() => router.push("/ranking")}
                  style={styles.rankingChoice}
                >
                  <View style={styles.rankingIcon}>
                    <Icon name="chart.bar.fill" size={22} color={colors.text.inverse} />
                  </View>
                  <View style={styles.rankingCopy}>
                    <AppText variant="h3">Elige un grupo</AppText>
                    <AppText variant="caption" muted>
                      Cada grupo tiene su propia posición y puntuación semanal.
                    </AppText>
                  </View>
                  <Icon name="chevron.right" size={18} color={colors.text.muted} />
                </AnimatedPressable>
              ) : selectedGroup && leaderboardQuery.isLoading ? (
                <LoadingState label="Calculando tu semana..." />
              ) : selectedGroup && leaderboardQuery.error ? (
                <ErrorState
                  message={getErrorMessage(leaderboardQuery.error)}
                  onRetry={() => leaderboardQuery.refetch()}
                />
              ) : selectedGroup ? (
                <WeeklyScoreSummary
                  groupName={selectedGroup.group.name}
                  periodLabel={getCurrentWeekLabel()}
                  position={myIndex >= 0 ? myIndex + 1 : null}
                  row={myRanking}
                  onPress={() => router.push("/ranking")}
                />
              ) : null}
            </View>
          ) : null}

          {rounds.length > 1 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppText variant="h2">También activas</AppText>
                <AppText variant="caption" muted>{rounds.length - 1}</AppText>
              </View>
              <View style={styles.roundList}>
                {rounds.slice(1, 3).map((round) => (
                  <AnimatedPressable
                    accessibilityLabel={`Abrir ronda de ${round.group?.name ?? "tu grupo"}`}
                    key={round.id}
                    onPress={() => router.push(`/round/${round.id}`)}
                    style={styles.roundRow}
                  >
                    <View style={styles.roundIcon}>
                      <Icon name="camera.fill" size={20} color={colors.accent.primary} />
                    </View>
                    <View style={styles.roundCopy}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {round.group?.name ?? "Ronda"}
                      </AppText>
                      <AppText variant="caption" muted numberOfLines={1}>
                        {round.moment_count ?? 0} fotos · {formatTimeLeft(round.closes_at)}
                      </AppText>
                    </View>
                    <Icon name="chevron.right" size={18} color={colors.text.muted} />
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </ParallaxScrollScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  welcome: {
    gap: spacing.xs,
  },
  activeHeader: {
    minHeight: 340,
  },
  startHero: {
    minHeight: 300,
    borderRadius: radius.xl,
    overflow: "hidden",
    padding: spacing.lg,
    justifyContent: "flex-end",
  },
  startCopy: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  roundList: {
    gap: spacing.sm,
  },
  roundRow: {
    minHeight: 72,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  roundIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tint.amberSubtle,
  },
  roundCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  rankingChoice: {
    minHeight: 96,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.active,
  },
  rankingIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.spark,
  },
  rankingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
