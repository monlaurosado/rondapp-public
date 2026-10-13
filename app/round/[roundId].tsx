import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";

import { useToast } from "@/components/feedback/toast";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state";
import { FloatingRondaButton } from "@/components/ui/floating-ronda-button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Icon } from "@/components/ui/icon";
import { ParallaxHeroImage } from "@/components/ui/parallax-hero-image";
import { Screen } from "@/components/ui/screen";
import { colors, radius, spacing } from "@/design/tokens";
import { isProfileComplete } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-context";
import { useBlockUser } from "@/features/moderation/hooks";
import { MomentCard } from "@/features/rounds/components/moment-card";
import {
  useCloseRound,
  useDeleteMoment,
  useRound,
  useRoundMoments,
  useToggleRoundStar,
  useToggleReaction,
} from "@/features/rounds/hooks";
import { formatTimeLeft } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { buildNextParams, firstParam } from "@/lib/navigation";

export default function RoundDetailScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ roundId?: string | string[] }>();
  const roundId = firstParam(params.roundId);
  const { user, profile, isLoading: authLoading } = useAuth();
  const canLoadRound = Boolean(user && isProfileComplete(profile));
  const roundQuery = useRound(
    canLoadRound ? roundId : undefined,
    canLoadRound ? user?.id : undefined,
  );
  const momentsQuery = useRoundMoments(
    canLoadRound ? roundId : undefined,
    canLoadRound ? user?.id : undefined,
  );
  const closeRound = useCloseRound(user?.id);
  const toggleReaction = useToggleReaction(user?.id);
  const toggleStar = useToggleRoundStar(user?.id);
  const blockUser = useBlockUser(user?.id);
  const deleteMoment = useDeleteMoment(user?.id);
  const closeAttemptedRef = useRef<string | null>(null);
  const reactionLocksRef = useRef(new Set<string>());
  const starLocksRef = useRef(new Set<string>());
  const [clockNow, setClockNow] = useState(0);
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const round = roundQuery.data;
  const closed = round
    ? round.status === "closed" || new Date(round.closes_at).getTime() <= clockNow
    : false;
  const nextPath = roundId ? `/round/${roundId}` : null;

  useEffect(() => {
    if (!round || round.status !== "active") return;

    const closesAt = new Date(round.closes_at).getTime();
    const tick = () => setClockNow(Date.now());
    const immediate = setTimeout(tick, 0);
    const interval = setInterval(tick, 30_000);
    const timeout = setTimeout(tick, Math.max(0, closesAt - Date.now()) + 50);
    return () => {
      clearTimeout(immediate);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [round]);

  useEffect(() => {
    if (
      round?.status === "active" &&
      new Date(round.closes_at).getTime() <= Date.now() &&
      closeAttemptedRef.current !== round.id
    ) {
      closeAttemptedRef.current = round.id;
      closeRound.mutate(round.id, {
        onError: (error) => {
          closeAttemptedRef.current = null;
          showToast({
            kind: "error",
            title: "No hemos podido cerrar la ronda",
            message: getErrorMessage(error, "Se reintentará automáticamente."),
          });
        },
        onSettled: () => {
          roundQuery.refetch();
          momentsQuery.refetch();
        },
      });
    }
  }, [clockNow, closeRound, momentsQuery, round?.closes_at, round?.id, round?.status, roundQuery, showToast]);

  if (authLoading) {
    return <Screen variant="round"><LoadingState /></Screen>;
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

  if (!roundId) {
    return <Screen variant="round"><ErrorState message="Falta la ronda a mostrar." /></Screen>;
  }

  if (roundQuery.isLoading || momentsQuery.isLoading) {
    return <Screen variant="round"><LoadingState /></Screen>;
  }

  if (roundQuery.error || momentsQuery.error || !round) {
    return (
      <Screen variant="round">
        <ErrorState
          message={getErrorMessage(roundQuery.error ?? momentsQuery.error, "Ronda no encontrada.")}
          onRetry={() => {
            roundQuery.refetch();
            momentsQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  const moments = momentsQuery.data ?? [];
  const hasRoundStar = moments.some((moment) => moment.myFoton);
  const firstMoment = moments[0];
  const winner = round.winner_moment_id ? moments.find((moment) => moment.id === round.winner_moment_id) : null;
  const creator = round.creator?.display_name ?? round.creator?.username ?? "Alguien";
  const openMomentCapture = () => router.push({
    pathname: "/capture",
    params: {
      intent: "createMoment",
      groupId: round.group_id,
      roundId: round.id,
    },
  });
  const requestManualClose = () => {
    Alert.alert(
      "¿Cerrar la ronda ahora?",
      "No se podrán subir más fotos, reacciones ni Estrellas. Calcularemos la foto ganadora.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar ronda",
          style: "destructive",
          onPress: () => {
            closeAttemptedRef.current = round.id;
            closeRound.mutate(round.id, {
              onSuccess: () => showToast({
                kind: "success",
                title: "Ronda cerrada",
                message: "La foto ganadora ya está calculada.",
              }),
              onError: (error) => {
                closeAttemptedRef.current = null;
                showToast({
                  kind: "error",
                  title: "No se pudo cerrar",
                  message: getErrorMessage(error),
                });
              },
              onSettled: () => {
                roundQuery.refetch();
                momentsQuery.refetch();
              },
            });
          },
        },
      ],
    );
  };

  return (
    <Screen variant="round" scroll={false}>
      <Animated.FlatList
        data={moments}
        keyExtractor={(moment) => moment.id}
        contentInsetAdjustmentBehavior="automatic"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshing={roundQuery.isRefetching || momentsQuery.isRefetching}
        onRefresh={() => {
          roundQuery.refetch();
          momentsQuery.refetch();
        }}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.itemGap} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.hero}>
              <ParallaxHeroImage
                scrollY={scrollY}
                source={
                  firstMoment?.signedUrl
                    ? { uri: firstMoment.signedUrl }
                    : require("../../assets/social/ronda-nova-hero.jpg")
                }
                style={styles.heroImage}
              />
              <LinearGradient
                colors={[colors.overlay.photoLight, colors.overlay.photoMedium, colors.overlay.photoStrong]}
                style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
              />
              <View style={styles.heroTop}>
                <Badge tone={closed ? "muted" : "success"}>{closed ? "Cerrada" : "En directo"}</Badge>
                <AppText variant="overline" style={styles.time}>{closed ? "Ronda terminada" : formatTimeLeft(round.closes_at)}</AppText>
              </View>
              <View style={styles.heroBottom}>
                <AppText variant="overline" style={styles.eyebrow}>RONDA DE {creator.toUpperCase()}</AppText>
                <AppText variant="h1">{round.group?.name ?? "Ronda"}</AppText>
                <AppText secondary>{moments.length} {moments.length === 1 ? "momento" : "momentos"} compartidos</AppText>
              </View>
            </View>

            {!closed ? (
              <View style={styles.roundActions}>
                <FloatingRondaButton label="Subir foto-respuesta" onPress={openMomentCapture} />
                {round.created_by === user.id ? (
                  <Button
                    variant="secondary"
                    disabled={closeRound.isPending}
                    onPress={requestManualClose}
                  >
                    Cerrar ronda ahora
                  </Button>
                ) : null}
              </View>
            ) : (
              <Button variant="secondary" icon="chart.bar.fill" onPress={() => router.push("/ranking")}>Ver ranking</Button>
            )}

            <GlassPanel style={styles.starBalance}>
              <View style={styles.starBalanceIcon}>
                <Icon name="star.fill" size={21} color={colors.accent.spark} />
              </View>
              <View style={styles.starBalanceCopy}>
                <AppText variant="bodyStrong">
                  {hasRoundStar ? "Estrella usada · 0 disponibles" : "1 estrella disponible"}
                </AppText>
                <AppText variant="caption" muted>
                  {closed
                    ? "La votación de esta ronda está cerrada."
                    : "Elige una foto de otra persona. Puedes moverla o retirarla."}
                </AppText>
              </View>
            </GlassPanel>

            {winner ? (
              <GlassPanel style={styles.winner}>
                <View style={styles.winnerBolt}>
                  <AppText variant="stat" style={styles.winnerSymbol}>1</AppText>
                </View>
                <View style={styles.winnerCopy}>
                  <AppText variant="overline" style={styles.spark}>FOTO DE LA RONDA</AppText>
                  <AppText variant="h3">{winner.author?.display_name ?? winner.author?.username ?? "Alguien"}</AppText>
                  <AppText variant="caption" muted>
                    {winner.fotonCount} {winner.fotonCount === 1 ? "Estrella" : "Estrellas"} · {Object.values(winner.reactionCounts).reduce((sum, value) => sum + value, 0)} reacciones
                  </AppText>
                </View>
              </GlassPanel>
            ) : null}

            <View style={styles.sectionHeader}>
              <View>
                <AppText variant="h2">Momentos</AppText>
                <AppText variant="caption" muted>Reacciona o elige la foto ganadora con tu Estrella</AppText>
              </View>
              <AppText variant="caption" muted>{moments.length}</AppText>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Todavía no hay momentos"
            body={closed ? "Esta ronda terminó sin fotos." : "Sube el primero y avisa al grupo."}
            action={closed ? undefined : "Subir momento"}
            onPress={closed ? undefined : openMomentCapture}
          />
        }
        ListFooterComponent={
          closeRound.isPending ? <AppText variant="caption" style={styles.pending}>Cerrando ronda expirada...</AppText> : null
        }
        renderItem={({ item: moment }) => (
          <MomentCard
            moment={moment}
            round={round}
            userId={user.id}
            hasRoundStar={hasRoundStar}
            reactionLoading={toggleReaction.isPending}
            starLoading={toggleStar.isPending}
            onReact={(type) => {
              if (reactionLocksRef.current.has(moment.id)) return;
              reactionLocksRef.current.add(moment.id);
              toggleReaction.mutate(
                { moment, type },
                {
                  onError: (err) => showToast({ kind: "error", title: "No se pudo reaccionar", message: getErrorMessage(err) }),
                  onSettled: () => reactionLocksRef.current.delete(moment.id),
                },
              );
            }}
            onStar={() => {
              if (starLocksRef.current.has(round.id)) return;
              starLocksRef.current.add(round.id);
              const wasSelected = moment.myFoton;
              const wasMoving = hasRoundStar && !wasSelected;
              toggleStar.mutate(moment, {
                onSuccess: () => showToast({
                  kind: "success",
                  title: wasSelected
                    ? "Estrella retirada"
                    : wasMoving
                      ? "Estrella cambiada"
                      : "Estrella entregada",
                  message: wasSelected
                    ? "Vuelves a tener 1 estrella disponible."
                    : wasMoving
                      ? "La has movido a esta foto."
                      : "Puedes cambiarla mientras la ronda siga activa.",
                }),
                onError: (err) => showToast({
                  kind: "error",
                  title: "No se pudo cambiar tu Estrella",
                  message: getErrorMessage(err),
                }),
                onSettled: () => starLocksRef.current.delete(round.id),
              })
            }}
            onReport={() => router.push(`/modals/report?momentId=${moment.id}`)}
            onBlock={() =>
              blockUser.mutate(moment.user_id, {
                onSuccess: () => {
                  showToast({ kind: "success", title: "Usuario bloqueado", message: "Dejarás de ver su contenido." });
                  momentsQuery.refetch();
                },
                onError: (err) => showToast({ kind: "error", title: "Bloqueo fallido", message: getErrorMessage(err) }),
              })
            }
            onDelete={() =>
              deleteMoment.mutate(moment, {
                onSuccess: (result) => showToast({
                  kind: result.storageCleanupPending ? "info" : "success",
                  title: "Momento borrado",
                  message: result.storageCleanupPending
                    ? "La foto ya no aparece. El archivo se limpiará en segundo plano."
                    : "La foto se ha quitado de la ronda.",
                }),
                onError: (err) => showToast({ kind: "error", title: "No se pudo borrar", message: getErrorMessage(err) }),
              })
            }
          />
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
  listHeader: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  itemGap: {
    height: spacing.lg,
  },
  roundActions: {
    gap: spacing.sm,
  },
  hero: {
    height: 356,
    borderRadius: radius.xl,
    overflow: "hidden",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.active,
  },
  heroImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  time: {
    color: colors.text.primary,
  },
  heroBottom: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.accent.primary,
  },
  winner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface.card,
  },
  starBalance: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.tint.sparkSubtle,
    borderColor: colors.tint.sparkBorder,
  },
  starBalanceIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tint.sparkSoft,
  },
  starBalanceCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  winnerBolt: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.spark,
  },
  winnerSymbol: {
    color: colors.text.inverse,
  },
  winnerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  spark: {
    color: colors.accent.spark,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  pending: {
    color: colors.state.warning,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
});
