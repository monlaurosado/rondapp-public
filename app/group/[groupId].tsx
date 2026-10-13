import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Share, StyleSheet, View } from "react-native";

import { useToast } from "@/components/feedback/toast";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Icon } from "@/components/ui/icon";
import { ParallaxHeader } from "@/components/ui/parallax-header";
import { ParallaxScrollScreen } from "@/components/ui/parallax-scroll-screen";
import { colors, radius, spacing } from "@/design/tokens";
import { isProfileComplete } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-context";
import {
  useDeleteGroup,
  useGroup,
  useGroupMembers,
  useMyGroups,
  useSetGroupMuted,
} from "@/features/groups/hooks";
import { RoundCard } from "@/features/rounds/components/round-card";
import { useActiveRounds, useRecentRounds } from "@/features/rounds/hooks";
import { getJoinGroupUrl } from "@/lib/deep-links";
import { getErrorMessage } from "@/lib/errors";
import { buildNextParams, firstParam } from "@/lib/navigation";

function getGroupRoleLabel(role: string) {
  if (role === "owner") return "Propietario";
  if (role === "admin") return "Administrador";
  return "Miembro";
}

export default function GroupDetailScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { groupId } = useLocalSearchParams<{ groupId: string | string[] }>();
  const { user, profile, isLoading: authLoading } = useAuth();
  const cleanGroupId = firstParam(groupId)?.trim() ?? "";
  const nextPath = cleanGroupId ? `/group/${cleanGroupId}` : null;
  const canLoadGroup = Boolean(
    !authLoading && user && profile?.is_age_confirmed && isProfileComplete(profile),
  );
  const queryGroupId = canLoadGroup ? cleanGroupId || undefined : undefined;
  const groupQuery = useGroup(queryGroupId, canLoadGroup ? user?.id : undefined);
  const membersQuery = useGroupMembers(queryGroupId, canLoadGroup ? user?.id : undefined);
  const activeRoundsQuery = useActiveRounds(
    canLoadGroup && queryGroupId ? user?.id : undefined,
    queryGroupId,
  );
  const recentRoundsQuery = useRecentRounds(queryGroupId, canLoadGroup ? user?.id : undefined);
  const myGroupsQuery = useMyGroups(canLoadGroup ? user?.id : undefined);
  const muteMutation = useSetGroupMuted(canLoadGroup ? user?.id : undefined);
  const deleteGroupMutation = useDeleteGroup(canLoadGroup ? user?.id : undefined);
  const membership = myGroupsQuery.data?.find((item) => item.group_id === cleanGroupId);

  const refresh = () => {
    groupQuery.refetch();
    membersQuery.refetch();
    activeRoundsQuery.refetch();
    recentRoundsQuery.refetch();
  };

  if (authLoading) {
    return <ParallaxScrollScreen variant="group">{() => <LoadingState />}</ParallaxScrollScreen>;
  }

  if (!user) {
    return <Redirect href={{ pathname: "/login", params: buildNextParams(nextPath) }} />;
  }

  if (!profile?.is_age_confirmed) {
    return <Redirect href={{ pathname: "/age-gate", params: buildNextParams(nextPath) }} />;
  }

  if (!isProfileComplete(profile)) {
    return <Redirect href={{ pathname: "/complete-profile", params: buildNextParams(nextPath) }} />;
  }

  if (
    groupQuery.isLoading ||
    membersQuery.isLoading ||
    activeRoundsQuery.isLoading ||
    recentRoundsQuery.isLoading
  ) {
    return <ParallaxScrollScreen variant="group">{() => <LoadingState />}</ParallaxScrollScreen>;
  }

  if (
    groupQuery.error ||
    membersQuery.error ||
    activeRoundsQuery.error ||
    recentRoundsQuery.error
  ) {
    return (
      <ParallaxScrollScreen variant="group">
        {() => <ErrorState message={getErrorMessage(
          groupQuery.error ??
          membersQuery.error ??
          activeRoundsQuery.error ??
          recentRoundsQuery.error,
        )} onRetry={refresh} />}
      </ParallaxScrollScreen>
    );
  }

  const group = groupQuery.data;
  if (!group) {
    return <ParallaxScrollScreen variant="group">{() => <ErrorState message="Grupo no encontrado." />}</ParallaxScrollScreen>;
  }

  const members = membersQuery.data ?? [];
  const rounds = recentRoundsQuery.data ?? [];
  const activeRound = activeRoundsQuery.data?.[0];
  const isOwner = group.owner_id === user.id;

  const openRoundFlow = () => {
    router.push({
      pathname: "/capture",
      params: activeRound
        ? {
            intent: "createMoment",
            groupId: group.id,
            roundId: activeRound.id,
          }
        : { intent: "createRound", groupId: group.id },
    });
  };

  const confirmDeleteGroup = () => {
    Alert.alert(
      `¿Eliminar ${group.name}?`,
      "Se borrarán el grupo, todas sus rondas y todas sus fotos para cada miembro. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar grupo",
          style: "destructive",
          onPress: () => {
            deleteGroupMutation.mutate(group.id, {
              onSuccess: (result) => {
                router.replace("/groups");
                showToast({
                  kind: result.storageCleanupPending ? "info" : "success",
                  title: "Grupo eliminado",
                  message: result.storageCleanupPending
                    ? "El grupo ya no existe. La limpieza de fotos seguirá en segundo plano."
                    : "El grupo y todo su contenido se han eliminado.",
                });
              },
              onError: (error) => {
                showToast({
                  kind: "error",
                  title: "No se pudo eliminar el grupo",
                  message: getErrorMessage(error),
                });
              },
            });
          },
        },
      ],
    );
  };

  const copyInvite = async () => {
    try {
      await Clipboard.setStringAsync(getJoinGroupUrl(group.invite_code));
      showToast({ kind: "success", title: "Enlace copiado", message: "Ya puedes compartirlo con tu gente." });
    } catch (error) {
      showToast({
        kind: "error",
        title: "No se pudo copiar",
        message: getErrorMessage(error, "Inténtalo de nuevo en unos segundos."),
      });
    }
  };

  const shareInvite = async () => {
    const inviteUrl = getJoinGroupUrl(group.invite_code);
    try {
      await Share.share({
        title: `Únete a ${group.name} en Rondapp`,
        message: `Únete a ${group.name} en Rondapp: ${inviteUrl}`,
        url: inviteUrl,
      });
    } catch (error) {
      showToast({
        kind: "error",
        title: "No se pudo compartir",
        message: getErrorMessage(error, "Puedes copiar el enlace e intentarlo desde otra app."),
      });
    }
  };

  return (
    <ParallaxScrollScreen
      variant="group"
      refreshing={
        groupQuery.isFetching ||
        activeRoundsQuery.isFetching ||
        recentRoundsQuery.isFetching
      }
      onRefresh={refresh}
    >
      {(scrollY) => (
        <>
          <ParallaxHeader scrollY={scrollY} style={styles.hero}>
            <LinearGradient
              colors={[colors.tint.coolMedium, colors.tint.amberSoft, colors.surface.card]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTop}>
              <AppText variant="overline" style={styles.eyebrow}>GRUPO PRIVADO</AppText>
              <View style={styles.inviteCode}>
                <Icon name="checkmark.shield.fill" size={16} color={colors.accent.cool} />
                <AppText variant="overline">{group.invite_code}</AppText>
              </View>
            </View>
            <View style={styles.identity}>
              <Avatar label={group.name} size={82} accent />
              <AppText variant="h1">{group.name}</AppText>
              <AppText secondary>{members.length} {members.length === 1 ? "miembro" : "miembros"} · {rounds.length} rondas recientes</AppText>
            </View>
            <View style={styles.avatarStack}>
              {members.slice(0, 5).map((member, index) => (
                <View key={member.user_id} style={[styles.stackedAvatar, { marginLeft: index ? -10 : 0, zIndex: 5 - index }]}>
                  <Avatar label={member.profile?.display_name ?? member.profile?.username ?? "?"} size={38} />
                </View>
              ))}
            </View>
          </ParallaxHeader>

          <View style={styles.actions}>
            <Button icon="camera.fill" onPress={openRoundFlow}>
              {activeRound ? "Responder a la ronda activa" : "Lanzar ronda aquí"}
            </Button>
            <Button variant="secondary" icon="square.and.arrow.up" onPress={shareInvite}>Compartir invitación</Button>
            <Button variant="ghost" icon="doc.on.doc.fill" onPress={copyInvite}>Copiar enlace</Button>
          </View>

          <GlassPanel style={styles.membersPanel}>
            <View style={styles.sectionHeader}>
              <AppText variant="h2">El grupo</AppText>
              {membership ? (
                <Button
                  variant="ghost"
                  compact
                  icon={membership.muted ? "bell.fill" : "bell.slash.fill"}
                  loading={muteMutation.isPending}
                  onPress={() => muteMutation.mutate({ groupId: group.id, muted: !membership.muted })}
                >
                  {membership.muted ? "Activar" : "Silenciar"}
                </Button>
              ) : null}
            </View>
            {members.slice(0, 6).map((member) => (
              <View key={member.user_id} style={styles.memberRow}>
                <Avatar label={member.profile?.display_name ?? member.profile?.username ?? "?"} size={42} />
                <View style={styles.memberCopy}>
                  <AppText variant="bodyStrong">{member.profile?.display_name ?? member.profile?.username ?? "Usuario"}</AppText>
                  <AppText variant="caption" muted>{getGroupRoleLabel(member.role)}</AppText>
                </View>
              </View>
            ))}
          </GlassPanel>

          <View style={styles.sectionHeader}>
            <View>
              <AppText variant="h2">Rondas recientes</AppText>
              <AppText variant="caption" muted>Los momentos de este grupo</AppText>
            </View>
            <AppText variant="caption" muted>{rounds.length}</AppText>
          </View>

          {rounds.length === 0 ? (
            <EmptyState
              title="Aún no hay rondas"
              body="Sé quien empieza el plan en este grupo."
              action="Lanzar ronda"
              onPress={openRoundFlow}
            />
          ) : (
            rounds.map((round) => (
              <RoundCard key={round.id} round={round} onPress={() => router.push(`/round/${round.id}`)} />
            ))
          )}

          {isOwner ? (
            <GlassPanel style={styles.dangerPanel}>
              <View style={styles.dangerCopy}>
                <AppText variant="h3" style={styles.dangerTitle}>Eliminar grupo</AppText>
                <AppText variant="caption" muted>
                  Solo tú ves esta opción. Se eliminarán las rondas y fotos de todos los miembros.
                </AppText>
              </View>
              <Button
                variant="danger"
                icon="trash.fill"
                loading={deleteGroupMutation.isPending}
                onPress={confirmDeleteGroup}
              >
                Eliminar este grupo
              </Button>
            </GlassPanel>
          ) : null}
        </>
      )}
    </ParallaxScrollScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 286,
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: "hidden",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.accent.cool,
  },
  inviteCode: {
    minHeight: 36,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.overlay.photo,
  },
  identity: {
    gap: spacing.sm,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  stackedAvatar: {
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.background.deep,
  },
  actions: {
    gap: spacing.sm,
  },
  membersPanel: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface.card,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  memberRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  memberCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  dangerPanel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderColor: colors.state.error,
    backgroundColor: colors.tint.dangerSubtle,
  },
  dangerCopy: {
    gap: spacing.xs,
  },
  dangerTitle: {
    color: colors.state.error,
  },
});
